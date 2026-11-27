// ============================================================================
// CHART3-CUTS.JS — Act 3: three ways to cut the same chart
// ============================================================================
// The claim: the familiar "scores rise with playtime" line is a composition
// effect. Hold one variable fixed and the slope disappears.
//
// One chart, three cuts, chosen by the .group-btn buttons in index.html:
//
//   none   every game in one line          -> the textbook upward slope
//   band   five lines, one per audience     -> the slope was mostly who plays
//   kind   two lines, long-form vs short    -> what is left is which game
//
// Data: curves.global[50].by_bin is the "none" line
//         [{ bin, n, median, mean, ci_lo, ci_hi }]
//       curves.global[50].strata[band] is the "band" cut (5 bands x 11 bins)
//       taxonomy.length_by_kind is long-format, not a matrix:
//         [{ group, bin, n, median, lo, hi }] for 3 groups x 4 coarse bins
//         (the long/short groups only exist for 5-20h, 20-100h, 100-500h, >500h —
//          the <5h bin has too few games in those kinds, so the x axis of the
//          "kind" state is 4 points, not 11. Do not fake the first bin.)
//
// Interactions to build:
//   - the three buttons announce 'grouping'; this chart listens
//   - hover a bin: tooltip with n for the active series
//   - a small caption in #chart3-note that states what was just held fixed
// ============================================================================

import { onReady, listen } from './data.js';

const width = 860;
const height = 500;
const margin = { top: 20, right: 120, bottom: 52, left: 64 };

const svg = d3.select('#chart3')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'The same playtime and score chart drawn three ways');

const gFrame = svg.append('g').attr('class', 'frame');
const gSeries = svg.append('g').attr('class', 'series')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const note = d3.select('#chart3-note');

let grouping = 'none';

onReady(({ curves, taxonomy }) => {
    console.log('Act 3 data', {
        byBin: curves.global[50].by_bin,
        strata: curves.global[50].strata,
        byKind: taxonomy.length_by_kind
    });

    gFrame.append('text')
        .attr('class', 'chart-placeholder')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Act 3 chart — not built yet');

    draw();
});

listen('grouping', value => {
    grouping = value;
    draw();
});

// --- the drawing (fill this in) --------------------------------------------

function draw() {
    // TODO 1 — the axes stay identical in all three states.
    //   x: the 11 playtime bins (curves.bin_labels), ordinal — not a log scale,
    //      because the bins are already log-spaced and uneven in width.
    //   y: shared, fixed domain (say 55 to 95) so the three states are
    //      comparable. Rescaling y per state would fake the disappearance.
    //
    // TODO 2 — state "none".
    //   One path through by_bin medians + one dot per bin. This is the line the
    //   reader saw in the opening and it should look like a success story.
    //
    // TODO 3 — state "band".
    //   Five paths, one per audience band, using a sequential blue. The lines
    //   stack and flatten: the reader's own hands did that, not our claim.
    //
    // TODO 4 — state "kind".
    //   Two or three paths from length_by_kind (long-form, short-form, all) with
    //   a direct label at the right end instead of a legend.
    //
    // TODO 5 — the transition.
    //   Same x positions, new y: keyed by series name so paths morph rather
    //   than redraw. 700 ms, ease-out. Remove idle series with a fade, never a
    //   pop.
    //
    // TODO 6 — the caption.
    //   note.text(...) should say what is being held fixed in the current state,
    //   e.g. "same chart, cut by audience size: within a band the line is flat".
    //   This is the sentence that makes the interaction an argument.
}
