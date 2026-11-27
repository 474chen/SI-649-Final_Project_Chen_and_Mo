// ============================================================================
// DATA.JS — loads the precomputed data and links the four charts
// ============================================================================
// Nothing on this page is aggregated in the browser. Every number comes from
// the Python pipeline in ../code/:
//
//   prepare.py     -> data/curves.json, density.json, games.json, meta.json
//   stats.py       -> (report only, plots/09)
//   taxonomy.py    -> data/taxonomy.json
//
// Linking charts (same pattern as lab 6):
//
//   import { announce, listen } from './data.js';
//   announce('lens', { lo: 50, hi: 200 });     // where it happens
//   listen('lens', range => { ... });          // everywhere that reacts
//
// The channels used in this project:
//
//   'step'      { act, index }            the step that just became active (scrolly)
//   'lens'      { lo, hi, n, p10, median, p90 }   Act 1, the review-count window
//   'band'      '50-200' | ... | null     a pinned audience band (Act 1 -> Act 2/4)
//   'kind'      'open world' | ... | null the selected tag (Act 2 -> Act 4)
//   'grouping'  'none' | 'band' | 'kind'  how Act 3 cuts the same chart
//   'explorer'  { kind, band }            Act 4's current cell
//
// Shapes of the loaded objects (top level only; the arrays are documented in
// ../code/README.md and shown by console.log once the page loads):
//
//   data.curves.thresholds        [50, 200, 1000]
//   data.curves.global[50]        { n, by_bin: [{ bin, n, median, mean, ci_lo, ci_hi }], strata }
//   data.curves.bands['50-200']   { n, median, p10, p90, sd, share_le60, share_ge90,
//                                   median_reviews, sampling_sd }
//   data.curves.genres[50].Action { n, by_bin: [...] }
//   data.curves.bin_edges / bin_centres / bin_labels
//   data.density[50]              { x0, x1, grid: [cols, rows], max,
//                                   cells: [{ h, r, c }], dots: [[x, y], ...] }
//   data.taxonomy.v2_ranked       [19 tags, adjusted score + CI + raw + n]
//   data.taxonomy.mech_tags       [18 tags x 5 playtime bins]
//   data.taxonomy.length_by_kind  [3 groups x 4 bins]
//   data.taxonomy.play_modes      [5 rows]
//   data.taxonomy.power           { alone: [...], joint: [...] }
//   data.explorer                 { tags: [...], bands: [...], min_cell: 15,
//                                   cells: [{ tag, band, n, p10, median, p90 }] }
//                                 the 19 x 5 grid Act 4 draws; cells with n below
//                                 min_cell carry no quantiles, only n
//   data.meta                     filter definition, coverage numbers, caveats
//
// games.json is 1.6 MB and only Act 4 needs it, so it is fetched lazily.
// ============================================================================

const BASE = 'data/';

const [curves, density, meta, taxonomy, explorer] = await Promise.all([
    d3.json(`${BASE}curves.json`),
    d3.json(`${BASE}density.json`),
    d3.json(`${BASE}meta.json`),
    d3.json(`${BASE}taxonomy.json`),
    d3.json(`${BASE}explorer.json`)
]);

export const data = { curves, density, meta, taxonomy, explorer };

// --- lazy per-game records (Act 4 cards) ------------------------------------

let gamesPromise = null;

/** Resolves to the 5,605 game records. Fetched once, on first use. */
export function loadGames() {
    gamesPromise = gamesPromise ?? d3.json(`${BASE}games.json`);
    return gamesPromise;
}

// --- shared state ----------------------------------------------------------

/** The single threshold the essay uses. curves.json also has 200 and 1000. */
export const THRESHOLD = 50;

export const state = {
    threshold: THRESHOLD,
    step: -1,
    band: null,
    kind: null,
    mode: 'adjusted',
    grouping: 'none'
};

// --- helpers the charts share ----------------------------------------------

/** The five audience bands in ascending order, with their stats attached. */
export function bands() {
    return Object.entries(curves.bands).map(([label, stat]) => ({ label, ...stat }));
}

/** 19 tags, ranked by adjusted score (already sorted by taxonomy.py). */
export function ranked() {
    return taxonomy.v2_ranked;
}

/** The 11 playtime bins, labelled. */
export function bins() {
    return curves.bin_labels.map((label, i) => ({
        index: i,
        label,
        centre: curves.bin_centres[i],
        lo: curves.bin_edges[i],
        hi: curves.bin_edges[i + 1]
    }));
}

// --- linking charts --------------------------------------------------------

const channels = new Map();
const readyFns = [];

/** Tell every chart that listens to `name` about a new value. */
export function announce(name, value) {
    (channels.get(name) ?? []).forEach(fn => fn(value));
}

/** Call fn(value) every time some chart announces `name`. */
export function listen(name, fn) {
    if (!channels.has(name)) channels.set(name, []);
    channels.get(name).push(fn);
}

/** Call fn(data) once the JSON is loaded. */
export function onReady(fn) {
    readyFns.push(fn);
    fn(data);
}

// --- wire the page controls here, once, so the charts stay dumb ------------

// Modules with top-level await can outlive DOMContentLoaded, so wire the
// controls as soon as the document is usable rather than assuming the event
// has not fired yet.
function wireControls() {
    // Act 2: adjusted vs raw
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('is-on'));
            btn.classList.add('is-on');
            state.mode = btn.dataset.mode;
            announce('mode', btn.dataset.mode);
        });
    });

    // Act 3: the three-way cut
    document.querySelectorAll('.group-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.group-btn').forEach(b => b.classList.remove('is-on'));
            btn.classList.add('is-on');
            state.grouping = btn.dataset.grouping;
            announce('grouping', state.grouping);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireControls);
} else {
    wireControls();
}
