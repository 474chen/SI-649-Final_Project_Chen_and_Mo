// ============================================================================
// CHART4-EXPLORER.JS — Act 4: look up your own game
// ============================================================================
// The claim, handed to the reader: pick a kind and a crowd size and see where
// the distribution sits, then look at three real games from that cell.
//
// Data: data.explorer is the 19 tags x 5 audience bands grid, precomputed by
//       ../code/explorer.py: cells carry n plus p10/median/p90 when n >= 15.
//       games.json (lazy) has one record per game for the cards.
//
// Interactions to build:
//   - #kind-select and #band-select (populated below) -> announce('explorer')
//   - clicking a row in chart 2 announces 'kind' -> this select follows
//   - the cells grey out when n < 15 instead of showing a number
// ============================================================================

import { onReady, listen, announce, bands, ranked, loadGames } from './data.js';

const width = 780;
const height = 460;
const margin = { top: 12, right: 90, bottom: 56, left: 96 };

const svg = d3.select('#chart4')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label', 'Scores by kind of game and audience size, with examples');

const gFrame = svg.append('g').attr('class', 'frame');
const gCells = svg.append('g').attr('class', 'cells')
    .attr('transform', `translate(${margin.left},${margin.top})`);

const kindSelect = d3.select('#kind-select');
const bandSelect = d3.select('#band-select');
const cards = d3.select('#game-cards');
const note = d3.select('#chart4-hint');

onReady(({ explorer }) => {
    // Both selects are real controls from the start, so the page is not a dead
    // end while the chart is being built.
    kindSelect.selectAll('option')
        .data(ranked().map(r => r.tag))
        .join('option')
        .attr('value', d => d)
        .text(d => d);

    bandSelect.selectAll('option')
        .data(['all', ...bands().map(b => b.label)])
        .join('option')
        .attr('value', d => d)
        .text(d => (d === 'all' ? 'any audience size' : d));

    console.log('Act 4 cells', explorer.cells.length, 'min cell', explorer.min_cell);

    gFrame.append('text')
        .attr('class', 'chart-placeholder')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .text('Act 4 chart — not built yet');

    cards.html('<p class="hint">Three real games from the selected cell will appear here.</p>');

    draw();
});

kindSelect.on('change', event => notify());
bandSelect.on('change', event => notify());

// Chart 2 can push a tag in here.
listen('kind', tag => {
    if (!tag) return;
    kindSelect.property('value', tag);
    notify();
});

function notify() {
    announce('explorer', {
        kind: kindSelect.property('value'),
        band: bandSelect.property('value')
    });
    draw();
}

// --- the drawing (fill this in) --------------------------------------------

function draw() {
    // TODO 1 — the grid.
    //   19 rows (explorer.tags) by 5 bands (explorer.bands). Cell colour from
    //   the same diverging scale as the report figure 11, so page and paper
    //   read alike. Cells without quantiles are the greyed ones.
    //
    // TODO 2 — small-n handling.
    //   n < 15: fill with the grid colour and draw a dot instead of a number.
    //   Two cells are in that state (stealth 50-200 = 7, visual novel 10k+ = 11).
    //
    // TODO 3 — the selection.
    //   The selected row and column get a 1px ink outline; everything else
    //   drops to 60% opacity. Do it with classes, not with a re-render.
    //
    // TODO 4 — the cards.
    //   await loadGames(), filter to the cell's tag and band, sort by n_reviews
    //   descending, take the median three (not the top three: the point is a
    //   typical game, not the best one). Render name, score, reviews, hours.
    //   textContent, never innerHTML, for anything from the data.
    //
    // TODO 5 — the readout.
    //   note.text(...) with the cell's n, median and 10-90 range, as in Act 1.
}
