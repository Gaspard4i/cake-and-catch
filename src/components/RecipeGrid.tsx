import { ItemIcon } from "./ItemIcon";
import type { GridCell } from "@/lib/parsers/recipe";

function cellId(cell: GridCell): string | null {
  if (!cell) return null;
  if (cell.item) return cell.item;
  if (cell.tag) return `c:${cell.tag.replace(/^c:|^cobblemon:|^minecraft:/, "")}`;
  return null;
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
          row.map((cell, x) => {
            const id = cellId(cell);
            return (
              <div
                key={`${y}-${x}`}
                title={id ?? "empty"}
                className="size-14 rounded-md border border-border bg-card flex items-center justify-center"
              >
                {id ? <ItemIcon id={id} size={40} /> : null}
              </div>
            );
          }),
        )}
      </div>
      {seasoningSlot && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="size-10 rounded-md border-2 border-dashed border-accent bg-card flex items-center justify-center text-[9px] font-semibold text-accent">
            S
          </span>
          <span>Seasoning slot</span>
        </div>
      )}
    </div>
  );
}
