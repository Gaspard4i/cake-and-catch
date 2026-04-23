import type { GridCell } from "@/lib/parsers/recipe";

function prettify(ref: GridCell): string {
  if (!ref) return "";
  if (ref.item) return ref.item.replace(/^cobblemon:|^minecraft:/, "").replaceAll("_", " ");
  if (ref.tag) return `#${ref.tag.replace(/^cobblemon:|^minecraft:|^c:/, "").replaceAll("_", " ")}`;
  return "";
}

export function RecipeGrid({
  grid,
  seasoningSlot = false,
}: {
  grid: GridCell[][] | null | undefined;
  seasoningSlot?: boolean;
}) {
  if (!grid) return null;
  return (
    <div className="inline-flex flex-col gap-3">
      <div className="inline-grid grid-cols-3 gap-1 p-2 rounded-lg border border-border bg-subtle">
        {grid.flatMap((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              title={prettify(cell) || "empty"}
              className="size-14 rounded-md border border-border bg-card flex items-center justify-center text-[9px] text-center p-1 leading-tight text-muted capitalize break-words"
            >
              {prettify(cell)}
            </div>
          )),
        )}
      </div>
      {seasoningSlot && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="size-8 rounded-md border-2 border-dashed border-accent bg-card flex items-center justify-center text-[9px] font-semibold text-accent">
            S
          </span>
          <span>Seasoning slot</span>
        </div>
      )}
    </div>
  );
}
