# Alt Tab Studio — Design System

## Logo

### Concept: Tab Bracket
Le symbole ⇥ (Tab) stylisé : une flèche horizontale qui pointe vers un bracket/crochet.
Représente le "switch" (Alt+Tab) et l'action d'aller de l'avant.

### Mark (icône seule)
```
→ ⟩ ]
flèche + chevron + bracket vertical
```
- Flèche + chevron : teal `#0d9488`, stroke 5px, round caps
- Bracket : white 70% opacity (dark bg) / black 20% opacity (light bg), stroke 3px

### Logo + Texte
- Mark à gauche
- "Alt Tab" en bold 800, blanc/noir selon le fond
- "Studio" en teal `#0d9488`, weight 700, letter-spacing 3px
- Variante inline : "Alt Tab **Studio**" sur une seule ligne

### Couleurs
| Token | Value | Usage |
|-------|-------|-------|
| Teal | `#0d9488` | Accent principal, flèche, "Studio" |
| Teal dark | `#0a7c72` | Hover states |
| Dark bg | `#0a0a0a` | Fond principal |
| Light bg | `#fafafa` | Variante claire |
| Text | `#fafafa` | Texte sur dark |
| Text light | `#1a1a1a` | Texte sur light |

### Déclinaisons
- **Dark** : mark teal + bracket blanc — fond `#0a0a0a`
- **Light** : mark teal + bracket gris — fond `#fafafa`
- **Teal BG** : mark blanc + bracket blanc 50% — fond `#0d9488`
- **Favicon** : mark seul, simplifié
- **Avatar** : mark centré dans cercle ou carré arrondi

### Typographie
- **Font** : Inter (400, 500, 600, 700, 800)
- **Titres** : 800, letter-spacing -0.03em
- **Body** : 400-500
- **Mono** (code/accents) : system monospace

### Supports validés
- Carte de visite (dark & light)
- Browser tab (favicon)
- App icon (carré arrondi)
- Avatars sociaux (cercle & carré)
- Navbar (mark + texte inline)
