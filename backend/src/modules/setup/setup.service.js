import { hashPassword } from '../../security/password.js';
import { parseSetupAdminInput, toPrimaryAdminDto } from './setup.dto.js';

export function createSetupService(repository, { hash = hashPassword } = {}) {
 return {
  async getPrimaryAdmin() {
   return toPrimaryAdminDto(await repository.findPrimaryAdmin());
  },
  async createPrimaryAdmin(input) {
   const { email, password } = parseSetupAdminInput(input);
   const passwordHash = await hash(password);
   const id = await repository.createPrimaryAdmin({ email, passwordHash });
   return toPrimaryAdminDto({ id, email, role: 'admin', is_primary_admin: true, is_active: true });
  }
 };
}
