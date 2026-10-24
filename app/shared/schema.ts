import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull(),
  observedAt: text("observed_at").notNull(),
  payload: text("payload").notNull(),
});
export const insertSnapshotSchema = createInsertSchema(snapshots).omit({
  id: true,
});
export type InsertSnapshot = z.infer<typeof insertSnapshotSchema>;
export type Snapshot = typeof snapshots.$inferSelect;
export type Game = {
  id: number;
  name: string;
  developer: string;
  kind: "Demo" | "Game";
  release: string;
  note?: string;
  genres: string[];
  tags: string[];
  players: number;
  peak: number;
  followers: number | null;
  rating: number | null;
  reviews: number | null;
  price: number;
  image: string;
  source: string;
  priceSource: string;
  observedAt: string;
  playerObservedAt: string;
  followerObservedAt: string | null;
  status: "snapshot" | "verified";
  velocity: number | null;
  followerGrowth: number | null;
  elapsedHours: number | null;
  proxy: number;
  velocityBasis: string;
  priceObservedAt?: string;
  reviewObservedAt?: string;
  metadataObservedAt?: string;
};
export type Feed = {
  games: Game[];
  lastAttempt: string | null;
  refreshErrors: string[];
  cooldownUntil: string | null;
};
