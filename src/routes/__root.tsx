import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { useAutoBackup } from "@/hooks/use-auto-backup";
import { useUpdater } from "@/hooks/use-updater";
import {
  CaretLeftIcon,
  CaretRightIcon,
  SidebarIcon,
} from "@phosphor-icons/react";
import { useEffect, useState, type CSSProperties } from "react";
import { listen } from "@tauri-apps/api/event";

import AppSidebar from "@/components/app-sidebar";
import { RightSidebar } from "@/components/right-sidebar";
import { GlobalDialogs } from "@/components/global-dialogs";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createRootRoute({
  component: RootLayout,
});

// Lives inside SidebarProvider so it can call useSidebar(): wires the native
// menu item (Cmd+B) → toggle the left sidebar.
function LeftSidebarMenuListener() {
  const { toggleSidebar } = useSidebar();
  useEffect(() => {
    const unlisten = listen("menu:left_sidebar_open", () => toggleSidebar());
    return () => {
      unlisten.then((f) => f());
    };
  }, [toggleSidebar]);
  return null;
}

function RootLayout() {
  useAutoBackup();
  useUpdater();
  const router = useRouter();
  const [rightOpen, setRightOpen] = useState(true);

  useEffect(() => {
    const unlisten = listen("menu:right_sidebar_open", () =>
      setRightOpen((o) => !o),
    );
    return () => {
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        className="h-svh overflow-hidden"
        style={
          {
            "--header-height": "2.5rem",
            "--right-width": "16rem",
          } as CSSProperties
        }
      >
        <LeftSidebarMenuListener />
        <header className="fixed inset-x-0 top-0 z-30 flex h-(--header-height) items-center gap-2 border-b bg-background px-4">
          <div>
            <SidebarTrigger />
            <Button
              variant="ghost"
              className="size-7 p-0"
              onClick={() => router.history.back()}
              aria-label="Zurück"
            >
              <CaretLeftIcon className="size-4" />
            </Button>
            <Button
              variant="ghost"
              className="size-7 p-0"
              onClick={() => router.history.forward()}
              aria-label="Vorwärts"
            >
              <CaretRightIcon className="size-4" />
            </Button>
          </div>
          <span className="text-center font-semibold">Arbeitsorganisator</span>

          <Button
            variant="ghost"
            className="ml-auto size-7 p-0"
            onClick={() => setRightOpen((o) => !o)}
            aria-label="Rechtes Panel ein-/ausklappen"
          >
            <SidebarIcon className="size-4 -scale-x-100" />
          </Button>
        </header>

        <AppSidebar />

        <SidebarInset
          className={cn(
            "min-w-0 pt-(--header-height) transition-[padding] duration-200 ease-linear",
            rightOpen && "pr-(--right-width)",
          )}
        >
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <Outlet />
          </div>
        </SidebarInset>

        {/* Right sidebar — empty for now */}
        <aside
          className={cn(
            "fixed top-(--header-height) right-0 bottom-0 z-20 overflow-hidden border-l bg-sidebar transition-[width] duration-200 ease-linear",
            rightOpen ? "w-(--right-width)" : "w-0",
          )}
        >
          <RightSidebar />
        </aside>
      </SidebarProvider>

      <GlobalDialogs />
      <Toaster />
    </TooltipProvider>
  );
}
