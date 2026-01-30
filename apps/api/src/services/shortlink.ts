import { Effect } from "effect";
import { AppConfig } from "../config/index.js";
import { NotFoundError } from "../domain/errors.js";
import {
  findShortlinkByCode,
  createShortlink as createShortlinkRepo,
  incrementClickCount as incrementClickCountRepo,
  findShortlinkByUrl,
} from "../repositories/shortlink.js";
import { generateUniqueCode } from "./codeGeneration.js";
import { normalizeUrl } from "../utils/urlNormalizer.js";

// ini 2 biji pass through dari repo (gada logic jir)
export const createShortlink = createShortlinkRepo;
export const incrementClickCount = incrementClickCountRepo;

export const getAndRedirect = (code: string) =>
  Effect.gen(function* () {
    const shortlink = yield* findShortlinkByCode(code);

    if (!shortlink) {
      return yield* Effect.fail(new NotFoundError({ code }));
    }

    Effect.runFork(incrementClickCount(code));

    return shortlink.url;
  });

export const createOrGetShortlink = (url: string) =>
  Effect.gen(function* () {
    const config = yield* AppConfig;

    const normalizedUrl = yield* normalizeUrl(url);
    const existing = yield* findShortlinkByUrl(normalizedUrl);

    if (existing) {
      return {
        code: existing.code,
        shortUrl: `${config.baseUrl}/${existing.code}`,
        clicks: existing.clicks,
        isNew: false,
      };
    }

    const code = yield* generateUniqueCode;
    const newShortlink = yield* createShortlink(code, normalizedUrl);

    return {
      code: newShortlink.code,
      shortUrl: `${config.baseUrl}/${newShortlink.code}`,
      clicks: newShortlink.clicks || 0,
      isNew: true,
    };
  });
