export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, message, "bad_request");
  }
}
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message, "unauthorized");
  }
}
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message, "forbidden");
  }
}
export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message, "not_found");
  }
}
export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(409, message, "conflict");
  }
}
