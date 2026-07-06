import { useState, type ComponentType } from "react";
import { CoinsIcon, type Icon } from "@phosphor-icons/react";

import { RatesSettings } from "./RatesSettings";

type SettingsCategory = {
  id: string;
  label: string;
  description?: string;
  icon: Icon;
  Component: ComponentType;
};

// The settings categories, rendered in the inner sidebar. Add an entry here to
// expose a new section — no other wiring needed.
const CATEGORIES: SettingsCategory[] = [
  {
    id: "rates",
    label: "Tarife",
    description:
      "Stundensätze je Sitzungsart. Grundlage für Finanzen und Rechnungen.",
    icon: CoinsIcon,
    Component: RatesSettings,
  },
];

export function SettingsPage() {
  const [activeId, setActiveId] = useState(CATEGORIES[0].id);
  const active = CATEGORIES.find((c) => c.id === activeId) ?? CATEGORIES[0];
  const Body = active.Component;

  return (
    <div className="flex min-h-full">
      <nav className="w-56 shrink-0 border-r bg-sidebar p-2">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Einstellungen
        </p>
        <ul className="mt-1 space-y-0.5">
          {CATEGORIES.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  data-active={cat.id === active.id}
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground"
                >
                  <CatIcon className="size-4 shrink-0" />
                  <span className="truncate">{cat.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl p-6">
          <header className="mb-5">
            <h1 className="font-semibold">{active.label}</h1>
            {active.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {active.description}
              </p>
            )}
          </header>
          <Body />
        </div>
      </div>
    </div>
  );
}
