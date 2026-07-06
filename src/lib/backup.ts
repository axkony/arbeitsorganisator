import { invoke } from "@tauri-apps/api/core";
import { sqlitePromise, currentWriteSeq } from "@/db";

// Seeded to -1 so the first backup of each app session always runs (a baseline
// snapshot of the current data), then subsequent snapshots only when the data
// actually changed since the last one.
let lastBackedUpSeq = -1;

export async function backupDatabase(): Promise<void> {
  const seq = currentWriteSeq();
  if (seq === lastBackedUpSeq) return; // no writes since last backup → skip
  const path = await invoke<string>("prepare_backup_path");
  const sqlite = await sqlitePromise;
  await sqlite.execute(`VACUUM INTO '${path.replace(/'/g, "''")}'`);
  lastBackedUpSeq = seq; // advance only after a successful snapshot
}
