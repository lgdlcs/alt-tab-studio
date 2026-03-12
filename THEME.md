# THEME.md — Config thème Alt Tab Studio

## Forcer le thème jour (pour dev/test)
Ajouter `?theme=day` à l'URL ou dans script.js mettre `FORCE_THEME = 'day'`

## Variables modifiables

### Jour (light)
- `--bg`: #e8eff7 (fond principal bleuté)
- `--bg-alt`: #dce6f0 (sections alternées)
- `--primary`: #0d9488 (teal accent)
- `--noise-opacity`: 0.04 (grain subtil)
- `--blob-1`: rgba(13,148,136,0.12) (teal glow)
- `--blob-2`: rgba(59,130,246,0.08) (blue glow)
- `--blob-3`: rgba(168,85,247,0.06) (purple glow)

### Nuit (dark)
- `--bg`: #0c1525 (fond deep blue)
- `--bg-alt`: #111d32 (sections alternées)
- `--primary`: #14b8a6 (teal bright)
- `--noise-opacity`: 0.035
- `--blob-1`: rgba(20,184,166,0.08) (teal glow)
- `--blob-2`: rgba(59,130,246,0.06) (blue glow)
- `--blob-3`: rgba(168,85,247,0.05) (purple glow)

## Blobs
3 gradients radiaux flous en position fixed. Ils ne bougent pas (statiques).
Positions: top-left, center-right, bottom-left.

## Grain
Image noise.png (150x150) en repeat, opacity très basse.
Overlay sur tout le body via ::after pseudo-element.

## Règle
Toute modif CSS doit être appliquée aux DEUX thèmes (day + night).
Tester avec `?theme=day` et `?theme=night` dans l'URL.
