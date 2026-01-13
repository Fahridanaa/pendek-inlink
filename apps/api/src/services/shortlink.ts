import { Effect, Data } from "effect";
import {
  findShortlinkByCode,
  createShortlink as createShortlinkRepo,
  incrementClickCount as incrementClickCountRepo,
  findShortlinkByUrl,
} from "../repositories/shortlink.js";
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

export const createOrGetShortlink = (url: string) =>
  Effect.gen(function* () {
    const existing = yield* Effect.tryPromise({
      try: () => findShortlinkByUrl(url),
      catch: (error) => new DatabaseError({ cause: error }),
    });

    if (existing) {
      return {
        code: existing.code,
        url: existing.url,
        clicks: existing.clicks,
        isNew: false,
      };
    }

    const code = yield* generateUniqueCode;

    const newShortlink = yield* createShortlink(code, url);

    return {
      code: newShortlink.code,
      url: newShortlink.url,
      clicks: newShortlink.clicks || 0,
      isNew: true,
    };
  });
