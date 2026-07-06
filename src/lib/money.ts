// Money is stored as integer Rappen, convert for UI only

export function rappenToFrancs(rappen: number): string {
  return (rappen / 100).toFixed(2);
}

export function francsToRappen(francs: string | number): number {
  const n =
    typeof francs === "number"
      ? francs
      : Number(String(francs).replace(",", ".").trim());
  return Math.round((Number.isFinite(n) ? n : 0) * 100);
}

export function formatRappen(rappen: number, currency = "CHF"): string {
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(
    rappen / 100,
  );
}
