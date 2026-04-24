#!/usr/bin/env bash
# Fetch aprijuice sprites from wiki.cobblemon.com into public/textures/aprijuice/.
# One-shot script; run with bash. Skips files already present.
set -eu
OUT=public/textures/aprijuice
mkdir -p "$OUT"

QUALITIES=(plain tasty delicious)
COLOURS=(red blue pink yellow green black white)

for q in "${QUALITIES[@]}"; do
  for c in "${COLOURS[@]}"; do
    Q="$(echo "$q" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
    C="$(echo "$c" | awk '{print toupper(substr($0,1,1)) substr($0,2)}')"
    slug="${q}_${c}_aprijuice"
    out="$OUT/$slug.png"
    if [ -f "$out" ]; then
      echo "skip $slug"
      continue
    fi
    title="File:${Q}_${C}_Aprijuice.png"
    url=$(curl -fsSL "https://wiki.cobblemon.com/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=url&format=json" \
      | grep -oE '"url":"[^"]+"' | head -1 | sed -E 's/^"url":"(.+)"$/\1/')
    if [ -z "$url" ]; then
      echo "NO URL for $title"
      continue
    fi
    echo "fetch $slug ← $url"
    curl -fsSL "$url" -o "$out"
  done
done

echo "done — files in $OUT:"
ls -1 "$OUT" | wc -l
