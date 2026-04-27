"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Header icon link to /saved with a count badge — same UX language as
 * an e-commerce cart icon. Reads the count from localStorage on mount
 * and listens to the `storage` event so the badge updates in other
 * tabs after a save. Inside the same tab a custom event
 * `snc:saved-changed` is dispatched by saved-recipes.ts on writes so
 * we refresh without a reload.
 */
export function SavedRecipesIcon() {
  const t = useTranslations("nav");
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const compute = async () => {
      const { listSavedSnacks, listSavedJuices } = await import(
        "@/lib/saved-recipes"
      );
      setCount(listSavedSnacks().length + listSavedJuices().length);
    };
    compute();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "snc:saved-recipes:v1" || e.key === null) compute();
    };
    const onLocal = () => compute();
    window.addEventListener("storage", onStorage);
    window.addEventListener("snc:saved-changed", onLocal);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("snc:saved-changed", onLocal);
    };
  }, []);

  return (
    <Link
      href="/saved"
      aria-label={t("savedRecipes")}
      title={t("savedRecipes")}
      className="relative inline-flex items-center justify-center size-9 rounded-md hover:bg-subtle transition-colors text-muted hover:text-foreground"
    >
      <ChefHat className="size-5" aria-hidden />
      {count != null && count > 0 && (
        <span
          aria-label={`${count} saved`}
          className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold leading-4 text-center"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
