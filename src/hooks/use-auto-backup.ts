import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { backupDatabase } from "@/lib/backup";

const FIFTEEN_MIN = 15 * 60 * 1000;

export function useAutoBackup() {
  useEffect(() => {
    const interval = setInterval(() => {
      backupDatabase().catch((e) => console.error("[backup] interval", e));
    }, FIFTEEN_MIN);

    // One last backup as the window closes: cancel the close, snapshot, then
    // close for real — but never trap the user if the backup fails.
    const win = getCurrentWindow();
    const unlisten = win.onCloseRequested(async (event) => {
      event.preventDefault();
      try {
        await backupDatabase();
      } catch (e) {
        console.error("[backup] on-close", e);
      } finally {
        await win.destroy();
      }
    });

    return () => {
      clearInterval(interval);
      unlisten.then((f) => f());
    };
  }, []);
}
