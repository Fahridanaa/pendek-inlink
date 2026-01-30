import { Effect, Option } from "effect";
import { MaxAttemptsError } from "../domain/errors.js";
import { findShortlinkByCode } from "../repositories/shortlink.js";
import { generateCode } from "../utils/codeGenerator.js";

const CODE_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 5;

// private helper
const tryGenerateUnique = Effect.gen(function* () {
  const code = yield* Effect.sync(() => generateCode(Math.random)(CODE_LENGTH));
  const existing = yield* findShortlinkByCode(code);

  return existing ? Option.none() : Option.some(code);
});

// public
export const generateUniqueCode = tryGenerateUnique.pipe(
  Effect.repeat({
    while: (result) => Option.isNone(result),
    times: MAX_GENERATION_ATTEMPTS - 1,
  }),
  Effect.flatMap((result) =>
    Option.match(result, {
      onNone: () => Effect.fail(new MaxAttemptsError({ attempts: MAX_GENERATION_ATTEMPTS })),
      onSome: (code) => Effect.succeed(code),
    }),
  ),
);
