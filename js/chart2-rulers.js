// ============================================================================
// CHART2-RULERS.JS — Act 2: every kind of game is judged by its own ruler
// ============================================================================
// The claim: once you compare games with the same audience, 19 kinds of games
// are still 15 points apart, and that gap is not price, not age, not platform.
//
// One row per tag, sorted by adjusted score. Two readings of the same rows:
//
//   adjusted  dot + 95% CI of the tag's score net of its audience band
//   raw       the plain median score, to show how little the unadjusted view
//             separates them
//
// Data: taxonomy.v2_ranked is already sorted and carries
//   { tag, n, adj, adj_lo, adj_hi, raw, raw_lo, raw_hi }
//
// Interactions to build:
//   - the .mode-btn toggle in index.html announces 'mode'; this chart listens
//   - hover a row: fade the others, show its n and CI in #chart2-note
//   - click a row: announce('kind', tag) so Act 4 opens on that tag
// ============================================================================

import { onReady, listen, announce } from './data.js';

const width = 900;
const height = 560;
const margin = { top: 12, right: 96, bottom: 44, left: 118 };

const plotWidth = width - margin.left - margin.right;
const plotHeight = height - margin.top - margin.bottom;

const svg = d3.select('#chart2')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Nineteen kinds of games ranked by score, adjusted for audience size');

const gFrame = svg.append('g').attr('class', 'frame');
const gRows = svg.append('g').attr('class', 'rows')
    .attr('transform', `translate(${margin.left},${margin.top})`);
const gLabels = svg.append('g').attr('class', 'row-labels')
    .attr('transform', `translate(${margin.left},${margin.top})`);
const gCounts = svg.append('g').attr('class', 'row-counts')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const note = d3.select('#chart2-hint');

let rows = [];
let mode = 'adjusted';

onReady(({ taxonomy }) => {
    rows = taxonomy.v2_ranked;
    console.log('Act 2 rows', rows);

    gFrame.append('text')
        .attr('class', 'chart-placeholder')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Act 2 chart — not built yet');

    draw();
});

listen('mode', value => {
    mode = value;
    draw();
});

// --- the drawing (fill this in) --------------------------------------------

function draw() {
    // TODO 1 — scales.
    //   y: scaleBand over rows.map(r => r.tag), padding 0.35.
    //   x: linear over the extent of the active measure. In "adjusted" mode the
    //      domain must include every CI, not just every dot, or the whiskers
    //      get clipped.
    //
    // TODO 2 — the rows.
    //   Keyed join on tag (rows never change, so a simple join is fine).
    //   Draw: a thin CI line (class "whisker", lighter), then the dot. Colour
    //   the dot by sign — accent below zero, blue above — because the reader
    //   should see the split, not read 19 numbers.
    //
    // TODO 3 — the count column.
    //   Right-aligned n at plotWidth + 12, tabular numerals, muted. This is the
    //   "how many games is this" question every reader asks at this point.
    //
    // TODO 4 — the transition.
    //   Switching mode moves the dots and does not re-create them: a
    //   d3.transition of 600 ms on cx. The row order must NOT change between
    //   modes — that is the whole argument.
    //
    // TODO 5 — hover and click.
    //   pointerenter: fade every other row to 15% (toggle a class on the group),
    //   write "<tag>: adjusted +5.5 (95% CI 4.5 to 6.5), n=497" into note.
    //   pointerup: announce('kind', tag).
    //
    // TODO 6 — the zero line.
    //   A dashed vertical line at 0 with the label "the median game in the same
    //   band" — in adjusted mode only.
}
