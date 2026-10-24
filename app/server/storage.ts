import { snapshots, type Game } from "../shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { desc, eq } from "drizzle-orm";
import { seed } from "./seed";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");
// Additive initialization; no existing tables are altered.
sqlite.exec(
  "CREATE TABLE IF NOT EXISTS snapshots (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id INTEGER NOT NULL, observed_at TEXT NOT NULL, payload TEXT NOT NULL)",
);
const db = drizzle(sqlite);
class Storage {
  constructor() {
    for (const g of seed)
      if (!db.select().from(snapshots).where(eq(snapshots.appId, g.id)).get())
        this.save(g);
  }
  save(g: Game) {
    db.insert(snapshots)
      .values({
        appId: g.id,
        observedAt: g.observedAt,
        payload: JSON.stringify(g),
      })
      .run();
  }
  games(): Game[] {
    return seed.map((g) => {
      const rows = db
        .select()
        .from(snapshots)
        .where(eq(snapshots.appId, g.id))
        .orderBy(desc(snapshots.observedAt))
        .all();
      const newest: Game = JSON.parse(rows[0].payload);
      const older = rows.find((r) => {
        const h =
          (Date.parse(newest.playerObservedAt) - Date.parse(r.observedAt)) /
          3600000;
        return h >= 6 && h <= 48;
      });
      newest.proxy =
        newest.peak > 0
          ? Math.min(100, (100 * newest.players) / newest.peak)
          : 0;
      newest.velocity = null;
      newest.followerGrowth = null;
      newest.elapsedHours = null;
      newest.velocityBasis = "Awaiting player observations 6–48 hours apart";
      if (older) {
        const past: Game = JSON.parse(older.payload);
        const h =
          (Date.parse(newest.playerObservedAt) -
            Date.parse(past.playerObservedAt)) /
          3600000;
        if (h >= 6 && h <= 48 && past.players > 0) {
          newest.velocity =
            (((newest.players - past.players) / past.players) * 100 * 24) / h;
          newest.elapsedHours = h;
          newest.velocityBasis = `Player growth normalized to 24 hours over ${h.toFixed(1)} hours; not a forecast`;
        }
      }
      const pastFollower = rows
        .map((r) => JSON.parse(r.payload) as Game)
        .find((p) => {
          if (!newest.followerObservedAt || !p.followerObservedAt) return false;
          const h =
            (Date.parse(newest.followerObservedAt) -
              Date.parse(p.followerObservedAt)) /
            3600000;
          return h >= 6 && h <= 48 && p.followers !== null && p.followers > 0;
        });
      if (pastFollower && newest.followers !== null) {
        const h =
          (Date.parse(newest.followerObservedAt!) -
            Date.parse(pastFollower.followerObservedAt!)) /
          3600000;
        newest.followerGrowth =
          (((newest.followers - pastFollower.followers!) /
            pastFollower.followers!) *
            100 *
            24) /
          h;
      }
      return newest;
    });
  }
}
export const storage = new Storage();
