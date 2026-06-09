// === Metas mensais — adapter dual ===
// • Local: SQLite (better-sqlite3) em data/goals.db
// • Produção (Vercel): Postgres quando POSTGRES_URL / DATABASE_URL existe
//   (FS efêmero da Vercel não persiste SQLite).
import "server-only";
import path from "node:path";
import type { Goals } from "@/lib/types";

const PG_URL = process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? "";
const USE_PG = PG_URL.length > 0;

const DEFAULTS: Goals = {
  invest: 60000, leads: 400, cpl: 160, oport: 110,
  cpo: 560, tx_conv: 0.25, ganho: 28, cpf: 2200, oport_perdidas: 50,
};

const SLUGS = new Set([
  "invest", "leads", "cpl", "oport", "cpo", "tx_conv", "ganho", "cpf", "oport_perdidas",
]);

function withDefaults(goals: Goals): Goals {
  const out = { ...goals };
  for (const [k, v] of Object.entries(DEFAULTS)) if (out[k] === undefined) out[k] = v;
  return out;
}

// ── SQLite (local) ──────────────────────────────────────────────────────
type SqliteDb = import("better-sqlite3").Database;
let _sqlite: SqliteDb | null = null;

async function sqlite(): Promise<SqliteDb> {
  if (_sqlite) return _sqlite;
  const Database = (await import("better-sqlite3")).default;
  const dbPath = path.join(process.cwd(), "data", "goals.db");
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS monthly_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL, metric TEXT NOT NULL, value REAL NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')))`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_month_metric ON monthly_goals(month, metric)`);
  _sqlite = db;
  return db;
}

// ── Postgres (produção) ─────────────────────────────────────────────────
type PgPool = import("pg").Pool;
let _pg: PgPool | null = null;
let _pgReady: Promise<void> | null = null;

async function pg(): Promise<PgPool> {
  if (_pg) {
    await _pgReady;
    return _pg;
  }
  const { Pool } = await import("pg");
  _pg = new Pool({
    connectionString: PG_URL,
    ssl: PG_URL.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  _pgReady = _pg
    .query(`
      CREATE TABLE IF NOT EXISTS monthly_goals (
        id SERIAL PRIMARY KEY,
        month TEXT NOT NULL, metric TEXT NOT NULL, value DOUBLE PRECISION NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(month, metric))`)
    .then(() => undefined);
  await _pgReady;
  return _pg;
}

// ── API pública ─────────────────────────────────────────────────────────
export async function getGoals(month: string): Promise<Goals> {
  const goals: Goals = {};
  if (USE_PG) {
    const pool = await pg();
    const res = await pool.query<{ metric: string; value: number }>(
      "SELECT metric, value FROM monthly_goals WHERE month = $1",
      [month],
    );
    for (const r of res.rows) goals[r.metric] = Number(r.value);
  } else {
    const db = await sqlite();
    const rows = db
      .prepare("SELECT metric, value FROM monthly_goals WHERE month = ?")
      .all(month) as Array<{ metric: string; value: number }>;
    for (const r of rows) goals[r.metric] = r.value;
  }
  return withDefaults(goals);
}

export async function saveGoals(month: string, body: Record<string, unknown>): Promise<void> {
  const entries = Object.entries(body).filter(([slug, val]) => SLUGS.has(slug) && val != null);
  if (entries.length === 0) return;

  if (USE_PG) {
    const pool = await pg();
    for (const [slug, val] of entries) {
      await pool.query(
        `INSERT INTO monthly_goals (month, metric, value, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (month, metric) DO UPDATE
         SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [month, slug, Number(val)],
      );
    }
  } else {
    const db = await sqlite();
    const stmt = db.prepare(`
      INSERT INTO monthly_goals (month, metric, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(month, metric) DO UPDATE
      SET value = excluded.value, updated_at = excluded.updated_at`);
    const tx = db.transaction(() => {
      for (const [slug, val] of entries) stmt.run(month, slug, Number(val));
    });
    tx();
  }
}
