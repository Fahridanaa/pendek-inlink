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

export interface ShortlinkResponse {
  code: string;
  shortUrl: string;
  clicks: number;
  isNew: boolean;
}

interface ShortlinkEntity {
  code: string;
  clicks: number;
}

// private helper
const formatShortlinkResponse = (shortlink: ShortlinkEntity, baseUrl: string, isNew: boolean): ShortlinkResponse => ({
  code: shortlink.code,
  shortUrl: `${baseUrl}/${shortlink.code}`,
  clicks: shortlink.clicks || 0,
  isNew,
});

const createNewShortlink = (normalizedUrl: string) =>
  Effect.gen(function* () {
    const code = yield* generateUniqueCode;
    return yield* createShortlinkRepo(code, normalizedUrl);
  });

// public
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

    const shortlink = existing ? existing : yield* createNewShortlink(normalizedUrl);

    const isNew = !existing;
    return formatShortlinkResponse(shortlink, config.baseUrl, isNew);
  });
