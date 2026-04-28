#!/usr/bin/env node
// One-shot script: adds a `bait` namespace to every messages/*.json with
// localized title + intro + nav label. Idempotent — re-running is a no-op.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "messages");

const TRANSLATIONS = {
  en: {
    bait: {
      title: "Poké Bait maker",
      intro:
        "Drop bait seasonings into the cooking pot to brew a Poké Bait. Hang it on a Poké Rod and water spawns are biased the same way a Snack biases land spawns. type, egg group, nature, IVs, shiny, hidden ability, rarity bucket.",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  fr: {
    bait: {
      title: "Atelier Poké Bait",
      intro:
        "Place des bait seasonings dans le pot de cuisson pour préparer un Poké Bait. Accroche-le sur une Poké Rod et il influence les apparitions aquatiques comme un Snack influence celles au sol. type, egg group, nature, IVs, shiny, talent caché, palier de rareté.",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  es: {
    bait: {
      title: "Fabricante de Poké Bait",
      intro:
        "Añade bait seasonings a la olla para preparar un Poké Bait. Engánchalo en una Poké Rod y sesga las apariciones acuáticas igual que un Snack lo hace con las terrestres.",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  de: {
    bait: {
      title: "Poké-Bait-Werkstatt",
      intro:
        "Wirf Bait-Seasonings in den Kochtopf, um einen Poké Bait zu brauen. An einer Poké Rod befestigt, beeinflusst er Wasserspawns so wie ein Snack die Landspawns.",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  pt: {
    bait: {
      title: "Oficina de Poké Bait",
      intro:
        "Coloque bait seasonings na panela para preparar um Poké Bait. Pendure-o na Poké Rod e ele enviesa os spawns aquáticos como um Snack enviesa os terrestres.",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  ja: {
    bait: {
      title: "ポケベイト工房",
      intro:
        "クッキングポットにベイトシーズニングを入れて Poké Bait を作ります。Poké Rod に取り付けると、Snack が地上のスポーンを操作するのと同じように水中のスポーンを操作します。",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
  zh: {
    bait: {
      title: "Poké Bait 工坊",
      intro:
        "把 bait seasonings 放入烹饪锅以制作 Poké Bait。将其挂在 Poké Rod 上,它能像 Snack 影响地面生成那样,影响水中生成。",
      navLabel: "Bait",
    },
    nav: { bait: "Bait" },
  },
};

for (const file of readdirSync(dir)) {
  if (!file.endsWith(".json")) continue;
  const locale = file.replace(/\.json$/, "");
  const trans = TRANSLATIONS[locale];
  if (!trans) {
    console.log(`skip ${file} — no translation`);
    continue;
  }
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, "utf8"));
  data.bait = { ...(data.bait ?? {}), ...trans.bait };
  data.nav = { ...(data.nav ?? {}), ...trans.nav };
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`updated ${file}`);
}
