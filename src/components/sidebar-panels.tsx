import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";

export type SidebarPanel = {
  id: string;
  title: string;
  content: ReactNode;
};

// Smallest an open panel may shrink to while dragging (keeps header + a sliver).
const MIN_PANEL_PX = 80;

export function SidebarPanels({
  panels,
  defaultOpenIds,
}: {
  panels: SidebarPanel[];
  defaultOpenIds?: string[];
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(defaultOpenIds ?? panels.map((p) => p.id)),
  );
  // flex-grow weight per open panel; heights are proportional to these.
  const [weights, setWeights] = useState<Record<string, number>>(() =>
    Object.fromEntries(panels.map((p) => [p.id, 1])),
  );

  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setWeights((w) => ({ ...w, [id]: 1 })); // reopened panel starts even
      }
      return next;
    });
  }

  function startResize(e: ReactPointerEvent, aboveId: string, belowId: string) {
    e.preventDefault();
    const aboveEl = panelRefs.current[aboveId];
    const belowEl = panelRefs.current[belowId];
    if (!aboveEl || !belowEl) return;

    // Snapshot at drag start. Only these two weights change and their sum is
    // preserved, so every other panel keeps its size — the math stays a simple
    // redistribution of the combined space of these two.
    const startY = e.clientY;
    const aboveH = aboveEl.getBoundingClientRect().height;
    const belowH = belowEl.getBoundingClientRect().height;
    const totalH = aboveH + belowH;
    const totalW = (weights[aboveId] ?? 1) + (weights[belowId] ?? 1);

    function onMove(ev: PointerEvent) {
      let delta = ev.clientY - startY;
      delta = Math.max(
        MIN_PANEL_PX - aboveH,
        Math.min(belowH - MIN_PANEL_PX, delta),
      );
      const newAboveW = ((aboveH + delta) / totalH) * totalW;
      setWeights((w) => ({
        ...w,
        [aboveId]: newAboveW,
        [belowId]: totalW - newAboveW,
      }));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    // h-full + overflow-hidden: the column itself never scrolls.
    <div className="flex h-full w-(--right-width) flex-col overflow-hidden">
      {panels.map((panel, i) => {
        const isOpen = openIds.has(panel.id);
        const next = panels[i + 1];
        const showDivider = isOpen && next != null && openIds.has(next.id);

        return (
          <div
            key={panel.id}
            ref={(el) => {
              panelRefs.current[panel.id] = el;
            }}
            className={cn(
              "flex flex-col",
              !showDivider && "border-b",
              isOpen ? "min-h-0" : "shrink-0",
            )}
            // Open: grow by weight from a 0 basis → height ∝ weight.
            style={
              isOpen
                ? {
                    flexGrow: weights[panel.id] ?? 1,
                    flexShrink: 1,
                    flexBasis: 0,
                  }
                : undefined
            }
          >
            <button
              type="button"
              onClick={() => toggle(panel.id)}
              className="flex shrink-0 items-center gap-1 px-3 py-2 text-left hover:bg-accent"
            >
              {isOpen ? (
                <CaretDownIcon className="size-3.5 text-muted-foreground" />
              ) : (
                <CaretRightIcon className="size-3.5 text-muted-foreground" />
              )}
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {panel.title}
              </span>
            </button>

            {isOpen && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {panel.content}
              </div>
            )}

            {showDivider && (
              <div
                onPointerDown={(e) => startResize(e, panel.id, next.id)}
                className="h-1.5 shrink-0 cursor-row-resize bg-border transition-colors hover:bg-primary/40"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
