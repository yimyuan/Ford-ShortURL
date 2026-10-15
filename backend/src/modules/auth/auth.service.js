import { randomUUID, timingSafeEqual } from 'node:crypto';
import { config } from '../../config.js';
import { AppError } from '../../errors/app-error.js';
import { usersRepository } from '../users/users.repository.js';
import { toUserDto } from '../users/users.dto.js';
import { parseCredentials } from './auth.dto.js';
import { authRepository } from './auth.repository.js';
import { hashPassword, verifyPassword } from '../../security/password.js';
import { accessTokenCodec } from '../../security/access-token.js';
import { createRefreshToken, hashRefreshToken } from '../../security/refresh-token.js';
import { getSupabase } from '../../infrastructure/supabase.js';
import { assertDatabaseResult } from '../admin/admin.repository.js';

const dummyHash = `scrypt$131072$8$1$${'0'.repeat(32)}$${'0'.repeat(128)}`;
const invalid = () => new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired login');
function splitRefresh(value) {
  if (
    typeof value !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.[A-Za-z0-9_-]{43}$/.test(
      value,
    )
  )
    throw invalid();
  return value.split('.');
}
export function createAuthService({
  users = usersRepository,
  sessions = authRepository,
  codec = accessTokenCodec,
  hash = hashPassword,
  verify = verifyPassword,
  settings = config,
  now = () => Math.floor(Date.now() / 1000),
  changePassword = async (args) => {
    const { error } = await (await getSupabase())
      .rpc('change_own_password', args)
      .abortSignal(AbortSignal.timeout(15000));
    assertDatabaseResult(error);
  },
} = {}) {
  const assertReady = () => codec.assertReady();
  function assertUser(user, session) {
    if (
      !user ||
      user.is_active !== true ||
      !['user', 'admin'].includes(user.role) ||
      (session &&
        (session.userId !== user.id ||
          String(session.authVersion) !== String(user.auth_version ?? 0)))
    )
      throw invalid();
  }
  async function issue(user) {
    assertUser(user);
    const sessionId = randomUUID();
    const refreshToken = `${sessionId}.${createRefreshToken()}`;
    const expiresAt = now() + settings.refreshTokenTtl;
    const accessToken = codec.sign({ userId: user.id, sessionId });
    await sessions.createFamily(sessionId, {
      userId: user.id,
      authVersion: String(user.auth_version ?? 0),
      refreshHash: hashRefreshToken(refreshToken),
      expiresAt,
    });
    return { user: toUserDto(user), accessToken, refreshToken, refreshExpiresAt: expiresAt };
  }
  return {
    async changePassword(identity, input) {
      if (
        input?.confirmed !== true ||
        typeof input.currentPassword !== 'string' ||
        typeof input.newPassword !== 'string' ||
        input.newPassword.length < 10 ||
        Buffer.byteLength(input.newPassword) > 1024 ||
        Buffer.byteLength(input.currentPassword) > 1024 ||
        input.currentPassword === input.newPassword
      )
        throw new AppError(
          422,
          'INVALID_PASSWORD',
          'กรุณายืนยันและตั้งรหัสผ่านใหม่อย่างน้อย 10 ตัวอักษร ให้ต่างจากรหัสเดิม',
        );
      const user = await users.findById(identity.id);
      if (!user?.is_active || !(await verify(input.currentPassword, user.password_hash)))
        throw new AppError(422, 'PASSWORD_INCORRECT', 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      const passwordHash = await hash(input.newPassword);
      await changePassword({
        p_user: user.id,
        p_version: String(user.auth_version ?? 0),
        p_password_hash: passwordHash,
      });
    },
    async login(input) {
      assertReady();
      const { email, password } = parseCredentials(input);
      const user = await users.findByEmail(email);
      const valid = await verify(password, user?.password_hash || dummyHash);
      if (!valid || !user || !user.is_active)
        throw new AppError(401, 'INVALID_LOGIN', 'Email or password is incorrect');
      return issue(user);
    },
    async register(input) {
      assertReady();
      const { email, password } = parseCredentials(input);
      let passwordHash;
      try {
        passwordHash = await hash(password);
      } catch (error) {
        if (error.code === 'INVALID_PASSWORD')
          throw new AppError(
            422,
            'INVALID_PASSWORD',
            'Password must contain at least 10 characters',
          );
        throw error;
      }
      // Roles and activation flags are assigned exclusively by the repository/database.
      const user = await users.create({ email, passwordHash });
      return issue(user);
    },
    async verifyIdentity(token) {
      const claims = codec.verify(token);
      const session = await sessions.findFamily(claims.sid);
      if (!session || session.expiresAt <= now() || session.userId !== claims.sub) throw invalid();
      const user = await users.findById(claims.sub);
      try {
        assertUser(user, session);
      } catch (error) {
        await sessions.revokeFamily(claims.sid);
        throw error;
      }
      return toUserDto(user);
    },
    async refresh(cookies) {
      assertReady();
      const token = cookies?.shorturl_refresh;
      const [sessionId] = splitRefresh(token);
      const nextToken = `${sessionId}.${createRefreshToken()}`;
      const oldHash = hashRefreshToken(token);
      const nextHash = hashRefreshToken(nextToken);
      const session = await sessions.findFamily(sessionId);
      if (!session || session.expiresAt <= now()) throw invalid();
      if (
        typeof session.refreshHash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(session.refreshHash) ||
        !timingSafeEqual(Buffer.from(session.refreshHash, 'hex'), Buffer.from(oldHash, 'hex'))
      ) {
        // Atomic comparison revokes replayed families; never revoke a newer login by a non-atomic write.
        await sessions.rotateRefreshToken(sessionId, oldHash, nextHash, now());
        throw invalid();
      }
      const user = await users.findById(session.userId);
      try {
        assertUser(user, session);
      } catch (error) {
        await sessions.revokeFamily(sessionId);
        throw error;
      }
      const accessToken = codec.sign({ userId: user.id, sessionId });
      // Finish database reads before rotating so temporary database failures remain retryable.
      if (!(await sessions.rotateRefreshToken(sessionId, oldHash, nextHash, now())))
        throw invalid();
      return {
        user: toUserDto(user),
        accessToken,
        refreshToken: nextToken,
        refreshExpiresAt: session.expiresAt,
      };
    },
    async logout(cookies) {
      const token = cookies?.shorturl_refresh;
      if (!token) return;
      let sessionId;
      try {
        [sessionId] = splitRefresh(token);
      } catch {
        return;
      }
      // Possession of a refresh cookie can always revoke its own family, including stale tokens.
      await sessions.revokeFamily(sessionId);
    },
  };
}
export const authService = createAuthService();
