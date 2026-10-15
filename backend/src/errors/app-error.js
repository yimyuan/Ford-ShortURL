export class AppError extends Error {
 constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
export function notImplemented(feature) {
 throw new AppError(501, 'NOT_IMPLEMENTED', `${feature} is not implemented yet`);
}
