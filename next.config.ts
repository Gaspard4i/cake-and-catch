import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Variant sprites (mega/gmax/regional/cosmetic) are hot-linked
    // from pokemondb. We pass them through the optimizer so the page
    // gets cached + responsive resizing, instead of bypassing it.
    remotePatterns: [
      { protocol: "https", hostname: "img.pokemondb.net" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
};

export default withNextIntl(nextConfig);
