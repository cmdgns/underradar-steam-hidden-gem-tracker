import { useState, useMemo, useEffect } from "react";
import {
  QueryClientProvider,
  useQuery,
  useMutation,
} from "@tanstack/react-query";
import { queryClient, apiRequest } from "./lib/queryClient";
import {
  Search,
  ArrowUpRight,
  ArrowDown,
  ArrowUp,
  SlidersHorizontal,
  RefreshCw,
  Download,
  X,
  Bookmark,
  Check,
  ChevronDown,
  Info,
  ArrowRight,
  Plus,
  Scale,
  Radio,
  ExternalLink,
} from "lucide-react";
import type { Game, Feed } from "../../shared/schema";

const n = (v: number | null) =>
  v === null ? "N/A" : v.toLocaleString("en-US");
const pct = (v: number | null) =>
  v === null ? "Pending" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const money = (v: number) => (v === 0 ? "Free" : `$${v.toFixed(2)}`);
const date = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const timestamp = (v: string) =>
  new Date(v).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
const ratingLabel = (g: Game) =>
  g.rating === null
    ? "Not available"
    : g.rating >= 85
      ? "Strong reception"
      : g.rating >= 70
        ? "Positive reception"
        : g.rating >= 60
          ? "Divided reception"
          : "Mixed reception";
type SortKey =
  | "name"
  | "players"
  | "peak"
  | "followers"
  | "followerGrowth"
  | "rating"
  | "price"
  | "velocity";
function AppInner() {
  const { data, isLoading, error } = useQuery<Feed>({
    queryKey: ["/api/games"],
  });
  const [search, setSearch] = useState(""),
    [scope, setScope] = useState("all"),
    [genre, setGenre] = useState("All genres");
  const [min, setMin] = useState(""),
    [max, setMax] = useState("10000"),
    [sort, setSort] = useState<SortKey>("velocity"),
    [asc, setAsc] = useState(false);
  const [watched, setWatched] = useState<number[]>([]),
    [compared, setCompared] = useState<number[]>([]),
    [showCompare, setShowCompare] = useState(false);
  const [detail, setDetail] = useState<Game | null>(null),
    [method, setMethod] = useState(false),
    [onlyMeasured, setOnlyMeasured] = useState(false);
  const [notice, setNotice] = useState("");
  const refresh = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/refresh");
      return r.json() as Promise<Feed>;
    },
    onSuccess: (feed) => {
      queryClient.setQueryData(["/api/games"], feed);
      setNotice(
        feed.refreshErrors.length
          ? "SteamDB could not complete the refresh. Your previous snapshots are safe."
          : "New source observations recorded.",
      );
    },
    onError: (e) => setNotice((e as Error).message),
  });
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDetail(null);
        setMethod(false);
        setShowCompare(false);
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, []);
  useEffect(() => {
    if (!detail && !method && !showCompare) return;
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = document.querySelector(".modal") as HTMLElement | null;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialog) return;
      const els = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,[tabindex="0"]',
        ),
      );
      const first = els[0],
        last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [Boolean(detail), method, showCompare]);
  const games = data?.games || [];
  const genres = [
    ...new Set(games.flatMap((g) => [...g.genres, ...g.tags])),
  ].sort();
  const measured = games.filter((g) => g.velocity !== null).length;
  const allRanked = [...games].sort((a, b) => b.proxy - a.proxy);
  const leader = allRanked[0];
  const invalid = Number(min || 0) > Number(max || Infinity);
  const filtered = useMemo(() => {
    return games
      .filter(
        (g) =>
          (scope !== "demos" || g.kind === "Demo") &&
          (scope !== "releases" || g.kind === "Game") &&
          (scope !== "watchlist" || watched.includes(g.id)) &&
          (genre === "All genres" ||
            g.genres.includes(genre) ||
            g.tags.includes(genre)) &&
          g.players >= Number(min || 0) &&
          g.players <= Number(max || Infinity) &&
          (!onlyMeasured || g.velocity !== null) &&
          `${g.name} ${g.developer} ${g.genres.join(" ")} ${g.tags.join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
      .sort((a, b) => {
        let av: any = a[sort],
          bv: any = b[sort];
        if (sort === "velocity") {
          if (av === null && bv === null) {
            av = a.proxy;
            bv = b.proxy;
          } else if (av === null) return 1;
          else if (bv === null) return -1;
        }
        if (av === null) return bv === null ? 0 : 1;
        if (bv === null) return -1;
        const result = typeof av === "string" ? av.localeCompare(bv) : av - bv;
        return asc ? result : -result;
      });
  }, [games, scope, watched, genre, min, max, onlyMeasured, search, sort, asc]);
  const selected = games.filter((g) => compared.includes(g.id));
  function toggleWatch(id: number) {
    setWatched((w) =>
      w.includes(id) ? w.filter((i) => i !== id) : [...w, id],
    );
  }
  function toggleCompare(id: number) {
    setCompared((c) =>
      c.includes(id)
        ? c.filter((i) => i !== id)
        : c.length < 3
          ? [...c, id]
          : c,
    );
  }
  function changeSort(k: SortKey) {
    if (sort === k) setAsc(!asc);
    else {
      setSort(k);
      setAsc(k === "name" || k === "price");
    }
  }
  function reset() {
    setGenre("All genres");
    setMin("");
    setMax("10000");
    setSearch("");
    setOnlyMeasured(false);
    setScope("all");
  }
  function exportCSV() {
    const columns = [
      "name",
      "app_id",
      "type",
      "release",
      "players",
      "24h_peak",
      "followers",
      "follower_growth_pct_per_day",
      "player_velocity_pct_per_day",
      "activity_proxy_pct",
      "steamdb_rating",
      "reviews",
      "price_usd",
      "genres",
      "tags",
      "status",
      "observed_at",
      "player_observed_at",
      "follower_observed_at",
      "source",
      "price_source",
    ];
    const rows = filtered.map((g) => [
      g.name,
      g.id,
      g.kind,
      g.release,
      g.players,
      g.peak,
      g.followers,
      g.followerGrowth,
      g.velocity,
      g.proxy.toFixed(2),
      g.rating,
      g.reviews,
      g.price,
      g.genres.join("; "),
      g.tags.join("; "),
      g.status,
      g.observedAt,
      g.playerObservedAt,
      g.followerObservedAt,
      g.source,
      g.priceSource,
    ]);
    const csv = [columns, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "underradar-october-2026.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  function sortHead(k: SortKey, label: string, sub?: string) {
    return (
      <th aria-sort={sort === k ? (asc ? "ascending" : "descending") : "none"}>
        <button data-testid={`sort-${k}`} onClick={() => changeSort(k)}>
          {label}
          {sort === k ? (
            asc ? (
              <ArrowUp size={13} />
            ) : (
              <ArrowDown size={13} />
            )
          ) : (
            <ChevronDown size={12} />
          )}
        </button>
        {sub && <small>{sub}</small>}
      </th>
    );
  }
  return (
    <div className="app-shell">
      <a className="skip" href="#main">
        Skip to tracker
      </a>
      <header className="topbar">
        <div className="wordmark">
          under<span>radar</span>
          <span className="brand-period">.</span>
        </div>
        <div className="product-label">INDEPENDENT GAMES. EARLY SIGNALS.</div>
        <div className="header-right">
          <span className="steam-label">
            <Radio size={15} /> Steam discovery
          </span>
          <button
            data-testid="methodology-header"
            className="quiet-btn"
            onClick={() => setMethod(true)}
          >
            How it works <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <main id="main">
        <div className="breadcrumb">
          DISCOVERY / STEAM / <span>OCTOBER 2026</span>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span className="tiny-square" /> THE BREAKOUT WATCH
            </div>
            <h1>Find the next quietly great game.</h1>
            <p>
              A small-game radar for October releases and trending demos. Less
              noise, better signals.
            </p>
          </div>
          <button
            className="outline-btn"
            data-testid="export-csv"
            onClick={exportCSV}
            disabled={!filtered.length}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
        <div className="coverage-line">
          <span className="status-dot" />
          <span>SteamDB snapshots</span>
          <span className="muted">·</span>
          <span className="muted">
            {games.length} curated titles ·{" "}
            {games.length
              ? timestamp(games.map((g) => g.playerObservedAt).sort()[0])
              : "October 2026"}
          </span>
          <span className="coverage-right">
            {measured}/{games.length} with measured velocity{" "}
            <button
              className="inline-info"
              aria-label="About measured velocity"
              data-testid="about-velocity"
              onClick={() => setMethod(true)}
            >
              <Info size={14} />
            </button>
          </span>
        </div>
        {isLoading ? (
          <div className="load-state">Loading the October watch…</div>
        ) : error ? (
          <div className="error-state">
            The feed is unavailable.{" "}
            <button
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ["/api/games"] })
              }
            >
              Retry loading
            </button>
          </div>
        ) : (
          <>
            {leader && (
              <section className="signal-overview" aria-label="Signal overview">
                <article className="spotlight">
                  <img
                    src={leader.image}
                    alt={`${leader.name} Steam artwork`}
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <div className="spotlight-content">
                    <div className="eyebrow">
                      HIGHEST ACTIVITY PROXY{" "}
                      <span className="pill">{leader.kind.toUpperCase()}</span>
                    </div>
                    <h2>{leader.name}</h2>
                    <p>
                      {n(leader.players)} players at the last observation.{" "}
                      {leader.proxy.toFixed(1)}% of its 24-hour peak.
                    </p>
                    <button
                      className="text-btn"
                      data-testid="spotlight-detail"
                      onClick={() => setDetail(leader)}
                    >
                      Inspect the signal <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="spotlight-score">
                    <b>{leader.proxy.toFixed(1)}</b>
                    <span>ACTIVITY PROXY / 100</span>
                  </div>
                </article>
                <article className="signal-note">
                  <div className="eyebrow">
                    <SlidersHorizontal size={14} /> SIGNAL, NOT HYPE
                  </div>
                  <h2>Momentum needs a second look.</h2>
                  <p>
                    One snapshot shows activity, not growth. Velocity unlocks
                    after two observations at least 6 hours apart.
                  </p>
                  <button
                    className="text-btn"
                    data-testid="methodology-card"
                    onClick={() => setMethod(true)}
                  >
                    See the ranking method <ArrowUpRight size={15} />
                  </button>
                </article>
              </section>
            )}
            <section className="tracker" aria-label="Game tracker">
              <div
                className="tracker-tabs"
                role="tablist"
                aria-label="Title type"
              >
                {[
                  ["all", "All discoveries", games.length],
                  [
                    "releases",
                    "October releases",
                    games.filter((g) => g.kind === "Game").length,
                  ],
                  [
                    "demos",
                    "Trending demos",
                    games.filter((g) => g.kind === "Demo").length,
                  ],
                  ["watchlist", "Watchlist", watched.length],
                ].map(([key, label, count]) => (
                  <button
                    role="tab"
                    aria-selected={scope === key}
                    key={key}
                    data-testid={`tab-${key}`}
                    className={scope === key ? "active" : ""}
                    onClick={() => setScope(String(key))}
                  >
                    {key === "watchlist" && <Bookmark size={14} />} {label}{" "}
                    <span>{count}</span>
                  </button>
                ))}
              </div>
              <div className="filter-grid">
                <div className="genre-filter">
                  <label htmlFor="genre">
                    <SlidersHorizontal size={14} /> GENRE & TAGS
                  </label>
                  <select
                    id="genre"
                    data-testid="filter-genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  >
                    <option>All genres</option>
                    {genres.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                  <span className="filter-hint">
                    Explore by what you like to play.
                  </span>
                </div>
                <div className="players-filter">
                  <label htmlFor="min-players">
                    CURRENT CONCURRENT PLAYERS{" "}
                    <span>Find your kind of hidden gem</span>
                  </label>
                  <div className="player-controls">
                    <input
                      id="min-players"
                      data-testid="filter-min"
                      aria-label="Minimum players"
                      type="number"
                      min="0"
                      value={min}
                      placeholder="0"
                      onChange={(e) => setMin(e.target.value)}
                    />
                    <span>to</span>
                    <input
                      data-testid="filter-max"
                      aria-label="Maximum players"
                      type="number"
                      min="0"
                      value={max}
                      placeholder="No limit"
                      onChange={(e) => setMax(e.target.value)}
                    />
                    <input
                      className="player-slider"
                      data-testid="filter-slider"
                      aria-label="Maximum concurrent players slider"
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                  value={Math.min(10000, max === "" ? 10000 : Number(max))}
                      onChange={(e) => setMax(e.target.value)}
                    />
                  </div>
                  <span className={`filter-hint ${invalid ? "warning" : ""}`}>
                    {invalid
                      ? "Minimum must not exceed maximum."
                      : "Under 10,000 players by default. Change either limit."}
                  </span>
                </div>
                <button
                  className="quiet-btn reset-btn"
                  data-testid="reset-filters"
                  onClick={reset}
                >
                  Reset filters
                </button>
              </div>
              <div className="table-toolbar">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    data-testid="search-games"
                    aria-label="Search games"
                    placeholder="Search a title, studio, or tag…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button
                      aria-label="Clear search"
                      data-testid="clear-search"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="toolbar-right">
                  <label className="measured-toggle">
                    <input
                      type="checkbox"
                      data-testid="measured-only"
                      checked={onlyMeasured}
                      onChange={(e) => setOnlyMeasured(e.target.checked)}
                    />{" "}
                    Measured only
                  </label>
                  <button
                    className="refresh-btn"
                    data-testid="refresh-data"
                    disabled={refresh.isPending}
                    onClick={() => refresh.mutate()}
                  >
                    <RefreshCw
                      size={14}
                      className={refresh.isPending ? "spinning" : ""}
                    />
                    {refresh.isPending ? "Checking source…" : "Refresh source"}
                  </button>
                </div>
              </div>
              {notice || data?.refreshErrors.length ? (
                <div className="source-warning" role="status">
                  <Info size={16} />
                  <div>
                    {notice || "Source access was limited."}
                    {data?.refreshErrors.length ? (
                      <details>
                        <summary>Show source status</summary>
                        {data.refreshErrors.map((e, i) => (
                          <p key={i}>{e}</p>
                        ))}
                      </details>
                    ) : null}
                  </div>
                  {!data?.refreshErrors.length && (
                    <button
                      aria-label="Dismiss status"
                      onClick={() => setNotice("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ) : null}
              <div className="table-caption">
                <span>
                  <b>{filtered.length}</b> discoveries{" "}
                  <span className="muted">/ {games.length} tracked</span>
                </span>
                <span className="ranking-label">
                  <span className="proxy-dot" />
                  {sort === "velocity"
                    ? "Velocity first · activity proxy fallback"
                    : "Custom sort"}
                  <button
                    className="inline-info"
                    data-testid="ranking-info"
                    aria-label="Explain ranking"
                    onClick={() => setMethod(true)}
                  >
                    <Info size={13} />
                  </button>
                </span>
              </div>
              <div className="mobile-table-hint">
                Swipe the table to explore all metrics <ArrowRight size={12} />
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th className="select-head">
                        <span className="sr-only">Compare</span>
                        <Scale size={15} />
                      </th>
                      <th className="rank-head">#</th>
                      {sortHead("name", "GAME")}
                      {sortHead("players", "PLAYERS NOW")}
                      {sortHead("peak", "24H PEAK")}
                      <th
                        aria-sort={
                          sort === "followerGrowth" || sort === "followers"
                            ? asc
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <button
                          data-testid="sort-followerGrowth"
                          onClick={() => changeSort("followerGrowth")}
                        >
                          FOLLOWER GROWTH <ChevronDown size={12} />
                        </button>
                        <button
                          className="sub-sort"
                          data-testid="sort-followers"
                          onClick={() => changeSort("followers")}
                        >
                          Total followers{" "}
                          {sort === "followers" ? (
                            asc ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )
                          ) : (
                            <ChevronDown size={10} />
                          )}
                        </button>
                      </th>
                      {sortHead("rating", "REVIEW SCORE", "SteamDB weighted")}
                      {sortHead("price", "PRICE", "USD · snapshot")}
                      {sortHead("velocity", "VELOCITY", "%/day or proxy")}
                      <th>
                        <span className="sr-only">Watch</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((g, i) => (
                      <tr
                        key={g.id}
                        data-testid={`row-${g.id}`}
                        className={
                          compared.includes(g.id) ? "row-selected" : ""
                        }
                      >
                        <td className="select-cell">
                          <input
                            type="checkbox"
                            aria-label={`Compare ${g.name}`}
                            data-testid={`compare-${g.id}`}
                            checked={compared.includes(g.id)}
                            disabled={
                              compared.length >= 3 && !compared.includes(g.id)
                            }
                            onChange={() => toggleCompare(g.id)}
                          />
                        </td>
                        <td className="rank-cell">
                          {String(i + 1).padStart(2, "0")}
                        </td>
                        <td className="game-cell">
                          <button
                            className="game-open"
                            data-testid={`detail-${g.id}`}
                            onClick={() => setDetail(g)}
                          >
                            <img
                              src={g.image}
                              alt=""
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.visibility = "hidden";
                              }}
                            />
                            <span className="game-name">
                              <strong>{g.name}</strong>
                              <span>
                                {date(g.release)}{" "}
                                <span className="dot-separator">·</span>{" "}
                                {g.kind === "Demo" ? (
                                  <span className="demo-badge">Demo</span>
                                ) : g.genres.includes("Early Access") ? (
                                  "Early Access"
                                ) : (
                                  "Full release"
                                )}
                              </span>
                              <span className="genre-preview">
                                {(g.tags.length
                                  ? g.tags
                                  : g.genres.filter((t) => t !== "Indie")
                                )
                                  .slice(0, 2)
                                  .join(" · ")}
                              </span>
                            </span>
                          </button>
                        </td>
                        <td className="numeric">
                          <a
                            href={g.source}
                            target="_blank"
                            rel="noreferrer"
                            title={`Observed ${timestamp(g.playerObservedAt)}`}
                          >
                            {n(g.players)}
                          </a>
                          <span className="mini-label">snapshot</span>
                        </td>
                        <td className="numeric muted-number">{n(g.peak)}</td>
                        <td className="growth-cell">
                          <span
                            className={
                              g.followerGrowth === null ? "muted" : "positive"
                            }
                          >
                            {g.followerGrowth === null
                              ? "Awaiting history"
                              : `${pct(g.followerGrowth)} /day`}
                          </span>
                          <small>
                            {g.followers === null
                              ? "Followers unavailable"
                              : `${n(g.followers)} followers`}
                          </small>
                        </td>
                        <td className="rating-cell">
                          <span
                            className={
                              g.rating !== null && g.rating >= 80
                                ? "positive"
                                : g.rating !== null && g.rating < 70
                                  ? "warning"
                                  : ""
                            }
                          >
                            {g.rating === null
                              ? "N/A"
                              : `${g.rating.toFixed(2)}%`}
                          </span>
                          <small>
                            {g.reviews === null
                              ? "No score available"
                              : `${n(g.reviews)} reviews`}
                          </small>
                        </td>
                        <td
                          className={`price-cell ${g.price === 0 ? "free" : ""}`}
                        >
                          <a
                            href={g.priceSource}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {money(g.price)}
                          </a>
                        </td>
                        <td className="velocity-cell">
                          <span
                            className={
                              g.velocity !== null ? "positive" : "proxy-number"
                            }
                          >
                            {g.velocity !== null
                              ? pct(g.velocity)
                              : g.proxy.toFixed(1)}{" "}
                            <small>
                              {g.velocity !== null ? "/day" : "proxy"}
                            </small>
                          </span>
                          {g.velocity === null ? (
                            <svg
                              className="proxy-meter"
                              viewBox="0 0 80 5"
                              aria-label={`${g.proxy.toFixed(1)} percent of 24-hour peak`}
                            >
                              <line x1="0" y1="2.5" x2="80" y2="2.5" />
                              <circle
                                cx={Math.max(3, g.proxy * 0.77)}
                                cy="2.5"
                                r="2.5"
                              />
                            </svg>
                          ) : (
                            <small className="mini-label">measured</small>
                          )}
                        </td>
                        <td>
                          <button
                            className={`watch-btn ${watched.includes(g.id) ? "saved" : ""}`}
                            aria-label={`${watched.includes(g.id) ? "Unwatch" : "Watch"} ${g.name}`}
                            aria-pressed={watched.includes(g.id)}
                            data-testid={`watch-${g.id}`}
                            onClick={() => toggleWatch(g.id)}
                          >
                            <Bookmark
                              size={17}
                              fill={
                                watched.includes(g.id) ? "currentColor" : "none"
                              }
                            />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!filtered.length && (
                  <div className="empty-state">
                    <Search size={25} />
                    <h2>
                      {onlyMeasured
                        ? "The history is still taking shape."
                        : "Nothing on this frequency."}
                    </h2>
                    <p>
                      {onlyMeasured
                        ? "No title has two observations 6–48 hours apart yet. Turn off “Measured only” to explore snapshot activity."
                        : "Try a broader genre, player range, or search."}
                    </p>
                    <button
                      className="primary-btn"
                      data-testid="empty-reset"
                      onClick={reset}
                    >
                      Show all discoveries <ArrowRight size={15} />
                    </button>
                  </div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  <span className="proxy-dot" /> Proxy = players now ÷ 24h peak
                  × 100. Not growth.
                </span>
                <button
                  className="text-btn"
                  data-testid="methodology-footer"
                  onClick={() => setMethod(true)}
                >
                  Methodology & sources <ArrowUpRight size={14} />
                </button>
              </div>
            </section>
            <footer className="page-footer">
              <span>Small audiences. Big possibilities.</span>
              <span>
                Curated cohort, not every October release. Prices and counts can
                change.{" "}
                <a
                  href="https://steamdb.info/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Data: SteamDB <ArrowUpRight size={12} />
                </a>
              </span>
            </footer>
          </>
        )}
        {compared.length > 0 && (
          <div className="compare-tray">
            <div>
              <Scale size={17} />
              <strong>{compared.length} selected</strong>
              <span className="muted">Compare up to 3 games</span>
            </div>
            <div>
              <button
                className="quiet-btn"
                data-testid="clear-comparison"
                onClick={() => setCompared([])}
              >
                Clear
              </button>
              <button
                className="primary-btn"
                data-testid="open-comparison"
                onClick={() => setShowCompare(true)}
                disabled={compared.length < 2}
              >
                Compare signals <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </main>
      {(detail || method || showCompare) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setDetail(null);
            setMethod(false);
            setShowCompare(false);
          }}
        >
          <section
            className={`modal ${showCompare ? "compare-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={
              showCompare
                ? "Compare games"
                : detail
                  ? detail.name
                  : "Ranking methodology"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close-modal"
              data-testid="close-modal"
              aria-label="Close dialog"
              autoFocus
              onClick={() => {
                setDetail(null);
                setMethod(false);
                setShowCompare(false);
              }}
            >
              <X size={19} />
            </button>
            {detail ? (
              <>
                <img
                  className="detail-art"
                  src={detail.image}
                  alt={`${detail.name} Steam header`}
                />
                <div className="modal-body">
                  <div className="eyebrow">
                    {detail.kind} / {date(detail.release)}, 2026
                  </div>
                  <h2>{detail.name}</h2>
                  <p className="muted">{detail.developer}</p>
                  <div className="detail-metrics">
                    {[
                      ["Players now", n(detail.players)],
                      ["24-hour peak", n(detail.peak)],
                      [
                        "Player velocity",
                        detail.velocity === null
                          ? "Awaiting history"
                          : pct(detail.velocity) + "/day",
                      ],
                      [
                        "Follower growth",
                        detail.followerGrowth === null
                          ? "Awaiting history"
                          : pct(detail.followerGrowth) + "/day",
                      ],
                      ["Followers", n(detail.followers)],
                      [
                        "SteamDB score",
                        detail.rating === null
                          ? "N/A"
                          : detail.rating.toFixed(2) + "%",
                      ],
                      ["Reviews", n(detail.reviews)],
                      ["Price · USD snapshot", money(detail.price)],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <span>{k}</span>
                        <b>{v}</b>
                      </div>
                    ))}
                  </div>
                  <div className="detail-tags">
                    {[...new Set([...detail.genres, ...detail.tags])].map(
                      (t) => (
                        <span key={t}>{t}</span>
                      ),
                    )}
                  </div>
                  <p className="method-note">
                    Activity proxy: {detail.proxy.toFixed(1)}/100.{" "}
                    {detail.velocityBasis}. {ratingLabel(detail)}; SteamDB score
                    is not Steam’s raw positive-review percentage.
                  </p>
                  {detail.note && <p className="method-note">{detail.note}</p>}
                  <div className="provenance">
                    <h3>Evidence & freshness</h3>
                    <p>
                      Players: {timestamp(detail.playerObservedAt)}.{" "}
                      {detail.status === "verified"
                        ? "Direct source observation."
                        : "Source snapshot collected for this tracker."}
                    </p>
                    <p>
                      Price:{" "}
                      {detail.priceObservedAt
                        ? timestamp(detail.priceObservedAt)
                        : "research snapshot, 24 Oct 2026, approximately 00:16 UTC"}
                      . Reviews:{" "}
                      {detail.reviewObservedAt
                        ? timestamp(detail.reviewObservedAt)
                        : "research snapshot, 24 Oct 2026, approximately 00:16 UTC"}
                      . Genres and tags:{" "}
                      {detail.metadataObservedAt
                        ? timestamp(detail.metadataObservedAt)
                        : "research snapshot, 24 Oct 2026, approximately 00:16 UTC"}
                      .
                    </p>
                    <p>
                      Followers:{" "}
                      {detail.followerObservedAt
                        ? timestamp(detail.followerObservedAt)
                        : "not exposed by this app page"}
                      . No follower values are borrowed from parent games.
                    </p>
                    <div className="detail-links">
                      <a
                        className="outline-btn"
                        href={detail.source}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="source-charts"
                      >
                        SteamDB charts <ExternalLink size={14} />
                      </a>
                      <a
                        className="outline-btn"
                        href={detail.priceSource}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SteamDB price <ExternalLink size={14} />
                      </a>
                      <a
                        className="primary-btn"
                        href={`https://store.steampowered.com/app/${detail.id}/`}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="source-steam"
                      >
                        View on Steam <ArrowUpRight size={15} />
                      </a>
                    </div>
                    <p className="source-url-fallback">
                      If the preview blocks a new tab, copy or select this chart
                      URL:
                      <input
                        aria-label="SteamDB charts URL"
                        value={detail.source}
                        readOnly
                        onFocus={(e) => e.target.select()}
                      />
                    </p>
                  </div>
                </div>
              </>
            ) : method ? (
              <div className="modal-body methodology">
                <div className="eyebrow">READ THE SIGNAL CORRECTLY</div>
                <h2>Activity is a clue. Velocity is a change.</h2>
                <p>
                  All eight games have October 2026 store release dates,
                  including demos and one 1.0 release. This is a curated
                  discovery cohort, not a complete catalog or a guarantee that a
                  game is undiscovered.
                </p>
                <h3>Measured player velocity</h3>
                <code>
                  ((current − previous) / previous) × 100 × (24 / hours)
                </code>
                <p>
                  Requires two genuine source observations 6–48 hours apart and
                  a nonzero baseline. Expressed as % per day. A normalized rate
                  is not a forecast; time zones, demo events, launch spikes and
                  small baselines can distort it.
                </p>
                <h3>Follower growth</h3>
                <p>
                  The same daily-rate formula, applied only to the same app’s
                  follower counts. One follower total cannot establish growth.
                  Demo followers are not replaced with a parent game’s
                  followers.
                </p>
                <h3>When history is missing</h3>
                <code>
                  Activity proxy = current players / 24-hour peak × 100
                </code>
                <p>
                  This measures activity relative to today’s high, not
                  acceleration, growth, retention, or historical trend. Measured
                  games rank first by player velocity; unmeasured games follow,
                  ordered by proxy. Their numeric units are never treated as
                  interchangeable.
                </p>
                <h3>Source access & refresh</h3>
                <p>
                  Source links point to the exact SteamDB app pages. Refresh
                  requests a fresh public-page observation, no more than once
                  per 15 minutes. If SteamDB blocks access or requires sign-in,
                  refresh stops and preserves the last successful snapshot.
                  There is no background refresh or scheduled collector.
                </p>
                <h3>Price & reviews</h3>
                <p>
                  Prices are U.S. Dollar region snapshots, not converted
                  regional dollar prices. Review scores are SteamDB’s weighted
                  rating, not the percentage of positive Steam reviews. Missing
                  values remain N/A.
                </p>
                <h3>Storage</h3>
                <p>
                  Source observations are retained in the preview server’s
                  SQLite database. This is not guaranteed long-term archival
                  hosting. Watchlist and comparison selections last for the
                  current page session.
                </p>
                <a
                  className="text-btn"
                  href="https://steamdb.info/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore SteamDB <ArrowUpRight size={15} />
                </a>
              </div>
            ) : (
              <div className="modal-body">
                <div className="eyebrow">SIDE-BY-SIDE SCOUTING</div>
                <h2>Compare the signals.</h2>
                <p className="muted">
                  Same metrics. Same caveats. Your shortlist.
                </p>
                <div
                  className="comparison-grid"
                  style={{
                    gridTemplateColumns: `repeat(${selected.length}, minmax(0,1fr))`,
                  }}
                >
                  {selected.map((g) => (
                    <article key={g.id}>
                      <img src={g.image} alt={`${g.name} Steam artwork`} />
                      <h3>{g.name}</h3>
                      {[
                        ["Players now", n(g.players)],
                        ["24h peak", n(g.peak)],
                        [
                          "Player velocity",
                          g.velocity === null
                            ? "Pending"
                            : pct(g.velocity) + "/day",
                        ],
                        [
                          "Follower growth",
                          g.followerGrowth === null
                            ? "Pending"
                            : pct(g.followerGrowth) + "/day",
                        ],
                        ["Followers", n(g.followers)],
                        ["Activity proxy", g.proxy.toFixed(1) + "/100"],
                        [
                          "SteamDB rating",
                          g.rating === null ? "N/A" : g.rating.toFixed(2) + "%",
                        ],
                        ["Review count", n(g.reviews)],
                        ["USD price", money(g.price)],
                      ].map(([k, v]) => (
                        <div className="comparison-metric" key={k}>
                          <span>{k}</span>
                          <b>{v}</b>
                        </div>
                      ))}
                      <p className="method-note">
                        {timestamp(g.playerObservedAt)}
                      </p>
                      <a
                        className="text-btn"
                        href={g.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        SteamDB evidence <ArrowUpRight size={13} />
                      </a>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
