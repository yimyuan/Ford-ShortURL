import { renderLinkQr } from '../links/qr.renderer.js';
import { AppError } from '../../errors/app-error.js';
import { parseUserId } from './admin.dto.js';
import { parseLinkId, toLinkDto } from '../links/links.dto.js';
import { parseLinkAction } from './admin-links.dto.js';
import { adminLinksRepository } from './admin-links.repository.js';
import { usersRepository } from '../users/users.repository.js';
import { toUserDto } from '../users/users.dto.js';
import { publicLinkUrl } from '../links/public-url.js';
import { config } from '../../config.js';
export function createAdminLinksService(
  repository = adminLinksRepository,
  users = usersRepository,
  settings = config,
  renderQr = renderLinkQr,
) {
  const assertAdmin = (identity) => {
    if (identity?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Admin access required');
  };
  const dto = (link, owner) => ({
    ...toLinkDto(link),
    shortUrl: publicLinkUrl(link.short_code, settings),
    isActive: link.is_active,
    lastClickedAt: link.last_clicked_at ?? null,
    version: String(link.management_version),
    status: !link.is_active ? 'inactive' : !owner.isActive ? 'owner_suspended' : 'active',
  });
  async function detail(identity, ownerId, id) {
    assertAdmin(identity);
    parseUserId(ownerId);
    parseLinkId(id);
    const [owner, link] = await Promise.all([
      users.findById(ownerId),
      repository.detail(ownerId, id),
    ]);
    if (!owner) throw new AppError(404, 'USER_NOT_FOUND', 'ไม่พบบัญชีเจ้าของลิงก์');
    if (!link) throw new AppError(404, 'LINK_NOT_FOUND', 'ไม่พบลิงก์ของเจ้าของบัญชีนี้');
    return {
      owner: toUserDto(owner),
      link: dto(link, toUserDto(owner)),
      canManage:
        identity.isPrimaryAdmin === true || owner.role !== 'admin' || owner.id === identity.id,
    };
  }
  return {
    async owners(identity, query) {
      assertAdmin(identity);
      return repository.owners(identity.id, query);
    },
    async list(identity, ownerId, query) {
      assertAdmin(identity);
      parseUserId(ownerId);
      const data = await repository.list(identity.id, ownerId, query);
      return { ...data, items: data.items.map((link) => dto(link, data.owner)) };
    },
    detail,
    async qr(identity, ownerId, id) {
      const data = await detail(identity, ownerId, id);
      return renderQr(data.link.shortUrl, data.link.qrStyle);
    },
    async manage(identity, ownerId, id, input) {
      assertAdmin(identity);
      parseUserId(ownerId);
      parseLinkId(id);
      input = parseLinkAction(input);
      return repository.manage({
        p_actor: identity.id,
        p_owner: ownerId,
        p_link: id,
        p_action: input.action,
        p_version: input.version,
        p_code_confirmation: input.codeConfirmation ?? null,
      });
    },
  };
}
export const adminLinksService = createAdminLinksService();
