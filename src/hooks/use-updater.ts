import { useEffect } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { backupDatabase } from "@/lib/backup";

export function useUpdater() {
  useEffect(() => {
    (async () => {
      try {
        const update = await check();
        if (!update) return;
        await backupDatabase().catch(() => {}); // snapshot right before updating
        await update.downloadAndInstall();
        await relaunch();
      } catch (e) {
        console.error("[updater]", e);
      }
    })();
  }, []);
}
