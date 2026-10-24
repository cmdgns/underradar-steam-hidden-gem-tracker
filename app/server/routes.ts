import type { Express } from "express";
import type { Server } from "node:http";
import * as cheerio from "cheerio";
import { storage } from "./storage";
import type { Game } from "../shared/schema";

let lastAttempt: string | null = null;
let errors: string[] = [];
let refreshing = false;
const cooldown = 15 * 60 * 1000;
const num = (s: string) => Number(s.replace(/[^\d.]/g, ""));
export function parsePage(html: string, game: Game): Game {
  const $ = cheerio.load(html);
  const text = $("body").text().replace(/\s+/g, " ");
  const current = text.match(/([\d,]+)\s+players right now/i);
  const peak = text.match(/([\d,]+)\s+24-hour peak/i);
  if (!current || !peak)
    throw new Error("Player metrics missing; source may require verification");
  if (!text.includes(game.name)) throw new Error("Unexpected app page");
  const now = new Date().toISOString();
  const g = {
    ...game,
    players: num(current[1]),
    peak: num(peak[1]),
    observedAt: now,
    playerObservedAt: now,
    status: "verified" as const,
  };
  const followers = text.match(/([\d,]+)\s+followers\b/i);
  if (followers) {
    g.followers = num(followers[1]);
    g.followerObservedAt = now;
  }
  const rating = text.match(/([\d.]+)%\s+SteamDB Rating/i);
  if (rating) {
    g.rating = num(rating[1]);
    g.reviewObservedAt = now;
  }
  // Exact counts only. Never turn rounded "3k reviews" into an exact count.
  const reviews = text.match(/\b([\d,]+)\s+reviews\b/i);
  if (reviews) {
    g.reviews = num(reviews[1]);
    g.reviewObservedAt = now;
  }
  const usPrice = $('td.price-line[data-cc="us"]').first().next().clone();
  usPrice.find(".price-discount-minor").remove();
  const priceMatch = usPrice.text().match(/\$([\d,.]+)/);
  if (priceMatch) {
    g.price = num(priceMatch[1]);
    g.priceObservedAt = now;
  }
  if (game.price === 0 && /Is free on the store/.test(text)) {
    g.priceObservedAt = now;
  }
  const tags = $(".header-app-tags a")
    .map((_i, el) =>
      $(el)
        .text()
        .replace(/^[^\p{L}\p{N}]+/u, "")
        .trim(),
    )
    .get()
    .filter(Boolean);
  if (tags.length) {
    g.tags = tags;
    g.metadataObservedAt = now;
  }
  $("tr").each((_i, row) => {
    const cells = $(row).children("td");
    if (cells.first().text().trim() === "Store Genres") {
      g.genres = cells
        .eq(1)
        .text()
        .replace(/\(\d+\)/g, "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      g.metadataObservedAt = now;
    }
  });
  return g;
}
export async function registerRoutes(
  server: Server,
  app: Express,
): Promise<Server> {
  const feed = () => ({
    games: storage.games(),
    lastAttempt,
    refreshErrors: errors,
    cooldownUntil: lastAttempt
      ? new Date(Date.parse(lastAttempt) + cooldown).toISOString()
      : null,
  });
  app.get("/api/games", (_req, res) => res.json(feed()));
  app.post("/api/refresh", async (_req, res) => {
    if (refreshing)
      return res.status(409).json({ message: "A refresh is already running." });
    if (lastAttempt && Date.now() - Date.parse(lastAttempt) < cooldown)
      return res
        .status(429)
        .json({
          message:
            "SteamDB refresh is limited to once every 15 minutes. The last verified snapshot is retained.",
        });
    refreshing = true;
    lastAttempt = new Date().toISOString();
    errors = [];
    try {
      for (const g of storage.games()) {
        try {
          const response = await fetch(g.source, {
            headers: {
              "User-Agent":
                "UnderRadar/1.0 (personal research tracker; no authentication)",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok)
            throw new Error(`SteamDB returned HTTP ${response.status}`);
          storage.save(parsePage(await response.text(), g));
        } catch (e) {
          errors.push(
            `${g.name}: ${(e as Error).message}. Previous snapshot retained.`,
          );
          // Stop on an access denial. No challenge bypass or repeated requests.
          if (/HTTP (403|429|503)/.test((e as Error).message)) {
            errors.push(
              "Source access blocked. Refresh stopped without bypassing restrictions.",
            );
            break;
          }
          if (
            /timeout|timed out|fetch failed|aborted/i.test((e as Error).message)
          ) {
            errors.push(
              "Source network unavailable. Refresh stopped; existing evidence retained.",
            );
            break;
          }
        }
      }
      res.json(feed());
    } finally {
      refreshing = false;
    }
  });
  return server;
}
