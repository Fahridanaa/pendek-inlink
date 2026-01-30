import { Effect } from "effect";
import { InvalidUrlError } from "../domain/errors.js";

export const normalizeUrl = (url: string) =>
  Effect.gen(function* () {
    const parsed = yield* Effect.try({
      try: () => new URL(url),
      catch: () => new InvalidUrlError({ url }),
    });

    const normalized = parsed.href.toLowerCase().replace(/\/$/, "");
    const withProtocol = normalized.startsWith("http") ? normalized : `https://${normalized}`;

    return withProtocol;
  });
