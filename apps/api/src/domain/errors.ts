import { Data } from "effect";

export class NotFoundError extends Data.TaggedError("NotFoundError")<{
  readonly code: string;
}> {}

export class MaxAttemptsError extends Data.TaggedError("MaxAttemptsError")<{
  readonly attempts: number;
}> {}

export class InvalidUrlError extends Data.TaggedError("InvalidUrlError")<{
  readonly url: string;
}> {}

export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly cause: unknown;
}> {}

export class RequestParseError extends Data.TaggedError("RequestParseError")<{
  readonly cause: unknown;
}> {}

export class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly operation: string;
  readonly cause: unknown;
}> {}

export type ShortlinkServiceError = NotFoundError | MaxAttemptsError | InvalidUrlError;

export type RouteError = ValidationError | RequestParseError | ShortlinkServiceError;
