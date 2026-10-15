import { AppError } from '../errors/app-error.js';
export function notFoundHandler(_req, res) {
 res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
}

export function errorHandler(error, _req, res, next) {
 if (res.headersSent) return next(error);
 if (error instanceof AppError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
 const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
 res.status(status).json({ error: {
  code: status === 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST',
  message: status === 500 ? 'Internal server error' : 'Invalid request body'
 } });
}
