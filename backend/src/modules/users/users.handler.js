import { usersService } from './users.service.js';
export async function getMe(req, res) { res.json(await usersService.getMe(req.user)); }
