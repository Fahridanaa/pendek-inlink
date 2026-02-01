import { Data, Effect } from "effect";

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

export class RateLimitError extends Data.TaggedError("RateLimitError")<{
  readonly limit: number;
  readonly resetTime: number;
  readonly secondsLeft: number;
}> {}

export type HttpErrorResult = {
  success: false;
  error: string;
  status: 400 | 404 | 500 | 503;
};

export type HttpError = BadRequestError | NotFoundError | ServiceUnavailableError | InternalServerError;

const toErrorResult = (message: string, status: HttpErrorResult["status"]): HttpErrorResult => ({
  success: false,
  error: message,
  status,
});

export const catchHttpErrors = <A, R>(effect: Effect.Effect<A, HttpError, R>) =>
  effect.pipe(
    Effect.catchTags({
      BadRequest: (e) => Effect.succeed(toErrorResult(e.message, 400)),
      NotFound: (e) => Effect.succeed(toErrorResult(e.message, 404)),
      ServiceUnavailable: (e) => Effect.succeed(toErrorResult(e.message, 503)),
      InternalError: (e) => Effect.succeed(toErrorResult(e.message, 500)),
    })
  );
