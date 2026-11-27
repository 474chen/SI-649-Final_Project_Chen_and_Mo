# SI-649-Final_Project_Chen_and_Mo

The interactive article for the SI649 final project — working title *The Crowd That
Judges*. This repository root is the deliverable the reader opens (GitHub Pages serves
it as-is); everything that computes the numbers lives in the analysis repo that ships
with the report.

**Nothing is charted yet.** Each `js/chart*.js` builds its SVG, claims its layers and
stops at a placeholder, with the remaining work written down as numbered TODOs at the
bottom of the file. The data, the scroll machinery, the controls and the inter-chart
event bus are all in place, so a chart can be built without touching anything else.

## Files

```
index.html            the article: intro, four acts, method note
css/style.css         typography, the sticky graphic, controls, cards
js/data.js            loads the JSON, holds shared state, the announce/listen bus
js/scrolly.js         scroll position -> step index (Act 1)
js/chart1-funnel.js   Act 1  the fog, the lens, the five I-beams      [stub]
js/chart2-rulers.js   Act 2  19 kinds of games, adjusted vs raw       [stub]
js/chart3-cuts.js     Act 3  one chart, three cuts                    [stub]
js/chart4-explorer.js Act 4  kind x audience grid + three real cards  [stub]
data/*.json           copied from ../data by scripts/sync-data.mjs
scripts/sync-data.mjs copies the five JSON files the page fetches
```

## Running it

The page fetches JSON, so it needs a server — `file://` will not work.

```
node scripts/sync-data.mjs      # refresh data/ after changing the Python side
python -m http.server 8000      # then open http://localhost:8000
```

## Where the numbers come from

`../code/prepare.py` → `curves.json`, `density.json`, `games.json`, `meta.json`
`../code/taxonomy.py` → `taxonomy.json`

Nothing on the page averages anything. If a number is not in the JSON, it is not on
the page. That rule exists because every figure in the report had to be reproducible
from the scripts, and the page should not be able to disagree with the paper.

## The event bus

Charts never call each other. They announce what happened and whoever cares listens:

| channel | payload | who announces | who listens |
| --- | --- | --- | --- |
| `step` | `{ act, index }` | `scrolly.js` | Act 1 chart, notes |
| `lens` | `{ lo, hi, n, p10, median, p90 }` | Act 1 chart | reading under the chart |
| `band` | `'50-200' … null` | Act 1 drag, Act 4 select | Act 1 marks |
| `kind` | `'open world' … null` | Act 2 click | Act 4 select |
| `mode` | `'adjusted' \| 'raw'` | `data.js` (Act 2 buttons) | Act 2 chart |
| `grouping` | `'none' \| 'band' \| 'kind'` | `data.js` (Act 3 buttons) | Act 3 chart |
| `explorer` | `{ kind, band }` | Act 4 selects | Act 4 chart |

```js
import { announce, listen } from './data.js';
listen('kind', tag => { /* redraw */ });
```

## Building a chart

Open the stub and read the TODOs at the bottom; they are ordered. The pattern every
chart shares:

1. create the `<svg>` with a `viewBox` and an `aria-label` (no fixed pixel size — the
   CSS decides how wide it is);
2. wait for `onReady(...)` before touching data;
3. keep persistent layer groups (`gFrame`, `gDots`, …) and redraw inside them, so
   transitions have something to move;
4. put every user-visible state change through `announce`.

## Accessibility floor

- every chart has a real `aria-label`, and its state changes are mirrored into the
  `.graphic-note` / `.hint` elements, which are live text;
- controls are real `<button>` / `<select>` elements, so keyboard and screen readers
  work without extra code;
- `prefers-reduced-motion` turns transitions off;
- at 820px the sticky graphic becomes a short sticky panel and the steps scroll under
  it — no horizontal scrolling at any width.

## Deploying

GitHub Pages serves this folder as-is: no build step, no backend. Commit `data/*.json`
alongside the code, keep `../data/raw` and the zip out of the repository, and check the
published URL in an incognito window before submitting (that is the assignment's test).
