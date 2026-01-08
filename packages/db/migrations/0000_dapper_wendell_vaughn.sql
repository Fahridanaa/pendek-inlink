CREATE TABLE "shortlinks" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"url" text NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shortlinks_code_unique" UNIQUE("code")
);
