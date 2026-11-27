// ============================================================================
// CHART1-FUNNEL.JS — Act 1: the fog, the lens, the funnel
// ============================================================================
// The claim: a bigger crowd does not hand out better scores, it stops handing
// out bad ones. The chart has to make the reader watch the FLOOR of the
// distribution rise, not the median.
//
// Layers, back to front (the groups below already exist):
//   gFrame   x/y axes and the grid
//   gDots    one circle per game (5,605 of them, 18% opacity)
//   gLens    a draggable window over the x axis; the dots inside it light up
//            from a second copy of gDots clipped to the window (see TODO 3)
//   gMarks   the five I-beams (p10–p90) and the median dots
//
// Data: data.density[50] is the precomputed grid (cells + one dot per game),
// so the fog does not need the 1.6 MB games.json.
//
// Interactions to build:
//   - scroll steps 0..3 (listen('step')): reveal the fog, cut one band, hand
//     the lens to the reader, then show the five marks
//   - drag the lens: announce('lens', {...}) so the note under the chart and
//     any other listener can follow
//   - keyboard: ←/→ move the lens one notch, Shift+←/→ jump to a band edge
//   - click a band: announce('band', label)
// ============================================================================

import { onReady, listen, announce, bands } from './data.js';

const width = 900;
const height = 560;
const margin = { top: 24, right: 28, bottom: 52, left: 62 };

const svg = d3.select('#chart1')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'A field of 5,605 games by review count and score');

const gFrame = svg.append('g').attr('class', 'frame');
const gDots = svg.append('g').attr('class', 'dots');
const gLens = svg.append('g').attr('class', 'lens-layer');
const gMarks = svg.append('g').attr('class', 'marks');

const note = d3.select('#chart1-note');

let stepsShown = 0;

onReady(({ curves, density }) => {
    console.log('Act 1 data', {
        threshold: curves.thresholds,
        bands: bands().map(b => b.label),
        dots: density[50].dots.length,
        grid: density[50].grid
    });

    // Placeholder until the chart is built: keeps the page honest about what
    // is missing without pretending to draw data.
    gFrame.append('text')
        .attr('class', 'chart-placeholder')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Act 1 chart — not built yet');

    draw();
});

listen('step', ({ index }) => {
    stepsShown = index;
    draw();
});

listen('band', band => {
    console.log('chart 1 hears band', band);
});

// --- the drawing (fill this in) --------------------------------------------

function draw() {
    // TODO 1 — scales.
    //   x: log scale over [0.5, 2000] hours? No: over review counts, which the
    //      density grid already spans as x0..x1 (see density[50].x0/x1).
    //   y: linear over [0, 100].
    //   Put the axes in gFrame, class "axis", with axis labels.
    //
    // TODO 2 — the fog.
    //   One <circle> per entry in density[50].dots, r = 2, class "dot".
    //   Use a keyed join with no key (index) since the data never changes.
    //
    // TODO 3 — the lens.
    //   A <rect class="lens"> over gLens whose width is one notch in x space,
    //   plus a clipPath of the same rect. Draw the lit copy of the dots inside
    //   a <g clip-path="url(#lensClip)"> so a drag only moves one rect.
    //
    // TODO 4 — the drag.
    //   Overlay an invisible rect covering the plot area, pointer-events: all.
    //   On pointerdown/pointermove, quantise the position to the precomputed
    //   notches (TODO 6) and move the lens. On pointerup, announce('band', ...)
    //   if the lens snapped to one of the five bands.
    //
    // TODO 5 — the five marks.
    //   For each band in bands(): a vertical line from p10 to p90 (class
    //   "whisker"), two caps (class "whisker-cap"), a dot at the median
    //   (class "median-dot"). Reveal them one at a time as stepsShown reaches
    //   3, and join the medians with a dashed path (class "median-line").
    //   Position them at the band's median_reviews.
    //
    // TODO 6 — the readout.
    //   The lens needs n / p10 / median / p90 for the window under it. Do not
    //   compute them in the browser: ask for a small precomputed table
    //   (60 notches) and add it to prepare.py as curves["lens"].
    //
    // TODO 7 — accessibility.
    //   The lens should be focusable (tabindex="0") and respond to arrow keys;
    //   every change should update note.text(...) so a screen reader hears
    //   "50 to 200 reviews: 1,213 games, bottom 10% 41, median 68".
}
