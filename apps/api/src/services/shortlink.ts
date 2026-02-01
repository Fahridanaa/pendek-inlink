import { Effect } from "effect";
import { AppConfig } from "../config/index.js";
import {
  BadRequestError,
  NotFoundError as AppNotFoundError,
  ServiceUnavailableError,
  InternalServerError,
} from "../application/errors.js";
import { NotFoundError as DomainNotFoundError } from "../domain/errors.js";
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

const validateCustomSlug = (slug: string) =>
  Effect.gen(function* () {
    const existing = yield* findShortlinkByCode(slug);
    if (existing) {
      return yield* Effect.fail(new BadRequestError({ message: "Slug custom sudah dipakai!" }));
    }
    return slug;
  });

const createCustomShortlink = (normalizedUrl: string, customSlug: string) =>
  Effect.gen(function* () {
    yield* validateCustomSlug(customSlug);
    return yield* createShortlinkRepo(customSlug, normalizedUrl);
  });

// public
// ini 2 biji pass through dari repo (gada logic jir)
export const createShortlink = createShortlinkRepo;
export const incrementClickCount = incrementClickCountRepo;

export const getAndRedirect = (code: string) =>
  Effect.gen(function* () {
    const shortlink = yield* findShortlinkByCode(code);

    if (!shortlink) {
      return yield* Effect.fail(new DomainNotFoundError({ code }));
    }

    Effect.runFork(incrementClickCount(code));

    return shortlink.url;
  }).pipe(
    Effect.catchTags({
      NotFoundError: (e) => Effect.fail(new AppNotFoundError({ message: `Kode tidak ditemukan: ${e.code}` })),
      RepositoryError: (e) => {
        console.error("Database error:", e.cause);
        return Effect.fail(new InternalServerError({ message: "Database error" }));
      },
    }),
  );

export const createOrGetShortlink = (url: string, customSlug?: string) =>
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const normalizedUrl = yield* normalizeUrl(url);

    const existing = yield* findShortlinkByUrl(normalizedUrl);

    if (existing) {
      return formatShortlinkResponse(existing, config.baseUrl, false);
    }

    const shortlink = customSlug
      ? yield* createCustomShortlink(normalizedUrl, customSlug)
      : yield* createNewShortlink(normalizedUrl);

    return formatShortlinkResponse(shortlink, config.baseUrl, true);
  }).pipe(
    Effect.catchTags({
      InvalidUrlError: (e) => Effect.fail(new BadRequestError({ message: `URL tidak valid: ${e.url}` })),
      MaxAttemptsError: () => Effect.fail(new ServiceUnavailableError({ message: "Gagal membuat kode unik" })),
      RepositoryError: (e) => {
        console.error("Database error:", e.cause);
        return Effect.fail(new InternalServerError({ message: "Database error" }));
      },
    }),
  );
