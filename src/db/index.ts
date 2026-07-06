import Database from "@tauri-apps/plugin-sql";
import { drizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "./schema";

// One shared connection. The plugin stores the file in the app data dir.
export const sqlitePromise = Database.load("sqlite:arbeitsorganisator.db");

// Monotonic counter of data-changing statements. Every app write flows through
// this proxy, so the backup layer reads this to skip snapshots when nothing has
// changed since the last one. Counting here (rather than via SQLite's
// per-connection change counter) stays correct even if the plugin pools
// connections. Catches RETURNING writes too — Drizzle marks those as reads, but
// their SQL still starts with insert/update/delete.
let writeSeq = 0;
export function currentWriteSeq() {
  return writeSeq;
}
const WRITE_RE = /^\s*(insert|update|delete|replace|create|alter|drop)\b/i;

export const db = drizzle(
  async (sql, params, method) => {
    if (WRITE_RE.test(sql)) writeSeq++;
    const sqlite = await sqlitePromise;

    try {
      // Bare writes (INSERT/UPDATE/DELETE/DDL without RETURNING) -> "run".
      if (method === "run") {
        await sqlite.execute(sql, params);
        return { rows: [] };
      }

      // Reads — including INSERT/UPDATE ... RETURNING (Drizzle marks all/get).
      const rows = await sqlite.select<Record<string, unknown>[]>(sql, params);
      const values = rows.map((row) => Object.values(row));
      return { rows: method === "get" ? (values[0] ?? []) : values };
    } catch (error) {
      // Surface the exact failing statement instead of failing silently.
      console.error("[db] query failed", { sql, params, method, error });
      throw error;
    }
  },
  { schema },
);
