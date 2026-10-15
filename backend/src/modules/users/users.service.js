import { usersRepository } from './users.repository.js';
import { toUserDto } from './users.dto.js';
export function createUsersService(repository = usersRepository) {
 return { async getMe(identity) { return toUserDto(await repository.findById(identity.id)); } };
}
export const usersService = createUsersService();
