import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  doublePrecision,
} from "drizzle-orm/pg-core";

/**
 * Loopback schema
 * Reels are saved short-form video links. The AI distills their content into
 * study notes + spaced-repetition flashcards so the knowledge sticks.
 */

export const reels = pgTable("reels", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform"), // youtube | tiktok | instagram | vimeo | twitter | other
  videoId: text("video_id"),
  author: text("author"),
  thumbnailUrl: text("thumbnail_url"),
  status: text("status").notNull().default("processing"), // processing | ready | failed
  title: text("title"),
  summary: text("summary"),
  keyPoints: jsonb("key_points").$type<string[]>(),
  tags: jsonb("tags").$type<string[]>(),
  rawContent: text("raw_content"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id")
    .references(() => reels.id, { onDelete: "cascade" })
    .notNull(),
  content: text("content").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const flashcards = pgTable("flashcards", {
  id: serial("id").primaryKey(),
  reelId: integer("reel_id")
    .references(() => reels.id, { onDelete: "cascade" })
    .notNull(),
  front: text("front").notNull(),
  back: text("back").notNull(),
  // SM-2 spaced-repetition state
  ease: doublePrecision("ease").notNull().default(2.5),
  intervalDays: integer("interval_days").notNull().default(0),
  repetitions: integer("repetitions").notNull().default(0),
  dueAt: timestamp("due_at", { withTimezone: true }).defaultNow().notNull(),
  lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Reel = typeof reels.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Flashcard = typeof flashcards.$inferSelect;
