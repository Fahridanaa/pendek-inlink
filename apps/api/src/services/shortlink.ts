import { Effect, Data } from "effect";
import { findShortlinkByCode, createShortlink as createShortlinkRepo, incrementClickCount as incrementClickCountRepo } from "../repositories/shortlink.js";
import { generateCode } from "../utils/codeGenerator.js";

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown;
}> {}

export const generateUniqueCode = Effect.gen(function* () {
  let code = generateCode();
  let existing = yield* Effect.tryPromise({
    try: () => findShortlinkByCode(code),
    catch: (error) => new DatabaseError({ cause: error }),
  });

  while (existing) {
    code = generateCode();
    existing = yield* Effect.tryPromise({
      try: () => findShortlinkByCode(code),
      catch: (error) => new DatabaseError({ cause: error }),
    });
  }

  return code;
});

export const createShortlink = (code: string, url: string) =>
  Effect.tryPromise({
    try: async () => {
      const [result] = await createShortlinkRepo(code, url);
      return result;
    },
    catch: (error) => new DatabaseError({ cause: error }),
  });

export const incrementClickCount = (code: string) =>
  Effect.tryPromise({
    try: () => incrementClickCountRepo(code),
    catch: (error) => new DatabaseError({ cause: error }),
  });

export const getAndRedirect = (code: string) =>
  Effect.gen(function* () {
    const shortlink = yield* Effect.tryPromise({
      try: () => findShortlinkByCode(code),
      catch: (error) => new DatabaseError({ cause: error }),
    });

    if (!shortlink) {
      return yield* Effect.fail({ _tag: "NotFound" as const, code });
    }

    Effect.runFork(incrementClickCount(code));

    return shortlink.url;
  });
