import { Data } from "effect";

export class BadRequestError extends Data.TaggedError("BadRequest")<{
  readonly message: string;
}> {}

export class NotFoundError extends Data.TaggedError("NotFound")<{
  readonly message: string;
}> {}

export class ServiceUnavailableError extends Data.TaggedError("ServiceUnavailable")<{
  readonly message: string;
}> {}

export class InternalServerError extends Data.TaggedError("InternalError")<{
  readonly message: string;
}> {}
