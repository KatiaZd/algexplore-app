export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message?: string,
    details?: unknown
  ) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.details = details;

    Error.captureStackTrace?.(this, AppError);
  }

  static notFound(message = 'Route not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden') {
    return new AppError(403, 'FORBIDDEN', message);
  }
}
