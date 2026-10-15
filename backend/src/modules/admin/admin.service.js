import { randomBytes } from 'node:crypto';
import { hashPassword } from '../../security/password.js';
import { adminRepository } from './admin.repository.js';
import { parseUserId, parseAdminAction } from './admin.dto.js';
import { AppError } from '../../errors/app-error.js';
import { usersRepository } from '../users/users.repository.js';
import { linksRepository } from '../links/links.repository.js';
import { toUserDto } from '../users/users.dto.js';
import { toLinkDto } from '../links/links.dto.js';

export function createAdminService(
  users = usersRepository,
  links = linksRepository,
  management = adminRepository,
  hash = hashPassword,
) {
  function requireAdmin(identity) {
    if (identity?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin access required');
  }
  return {
    async listUsers(identity, query) {
      requireAdmin(identity);
      const result = await users.list(query);
      return { ...result, items: result.items.map(toUserDto) };
    },
    async impact(identity, id) {
      requireAdmin(identity);
      parseUserId(id);
      const target = await management.impact(id);
      if (
        target.is_primary_admin ||
        target.id === identity.id ||
        (target.role === 'admin' && !identity.isPrimaryAdmin)
      )
        throw new AppError(403, 'ADMIN_FORBIDDEN', 'บัญชีนี้ได้รับการป้องกัน');
      return {
        user: toUserDto(target),
        version: String(target.auth_version),
        linkCount: target.linkCount,
      };
    },
    async updateUser(identity, id, input) {
      requireAdmin(identity);
      parseUserId(id);
      input = parseAdminAction(input);
      if (input.action === 'change_role' && !identity.isPrimaryAdmin)
        throw new AppError(403, 'ADMIN_FORBIDDEN', 'บัญชีหลักเท่านั้นที่เปลี่ยนสิทธิ์ได้');
      await this.impact(identity, id);
      const temporaryPassword =
        input.action === 'reset_password' ? randomBytes(18).toString('base64url') : undefined;
      const result = await management.manage({
        p_actor: identity.id,
        p_target: id,
        p_action: input.action,
        p_version: input.version,
        p_role: input.action === 'change_role' ? input.role : null,
        p_password_hash: temporaryPassword ? await hash(temporaryPassword) : null,
        p_email_confirmation: input.emailConfirmation ?? null,
        p_link_count: input.linkCount ?? null,
      });
      return { ...result, ...(temporaryPassword ? { temporaryPassword } : {}) };
    },
    async history(identity, query) {
      requireAdmin(identity);
      return management.history(query);
    },
    async summary(identity) {
      requireAdmin(identity);
      return management.summary(identity.id);
    },
    async listLinks(identity, query) {
      requireAdmin(identity);
      const result = await links.list(query);
      return {
        ...result,
        items: result.items.map((link) => ({ ...toLinkDto(link), isActive: link.is_active })),
      };
    },
  };
}
export const adminService = createAdminService();
