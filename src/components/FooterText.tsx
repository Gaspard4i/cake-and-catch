"use client";

import { useTranslations } from "next-intl";

export function FooterText() {
  const t = useTranslations("footer");
  return (
    <>
      {t("dataFrom")}{" "}
      <a
        href="https://gitlab.com/cable-mc/cobblemon"
        className="underline hover:text-foreground"
        target="_blank"
        rel="noreferrer"
      >
        {t("modSource")}
      </a>{" "}
      {t("and")}{" "}
      <a
        href="https://wiki.cobblemon.com"
        className="underline hover:text-foreground"
        target="_blank"
        rel="noreferrer"
      >
        {t("wikiSource")}
      </a>
      .
    </>
  );
}
