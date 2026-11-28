// ============================================================================
// CHART2-RULERS.JS — Act 2: every kind of game is judged by its own ruler
// ============================================================================
// The claim: nineteen kinds of games are 15 points apart, but you only see the
// gap once you subtract the crowd that rates them. And that gap is not price,
// not age, not platform.
//
// Three beats, one per control:
//
//   1. net of crowd (default)  one row per kind, a dot for the median of "points
//      above or below what a game this big usually gets": visual novel +7.9,
//      open world -7.3, fifteen points apart.
//   2. raw score        the same nineteen rows on the score Steam shows. The
//      dots collapse into a band 12 points wide: without the crowd, kinds look
//      alike, and every bar is long -- players disagree inside every kind.
//   3. the band menu    pick one audience size; rows stay put while the bars
//      shrink. Order is unmoved -- that is the robustness check the reader
//      performs, not a claim we make.
//
// Row order never changes. It is sorted once by the net-of-crowd median, so a
// control can move marks but never rows.
//
// Data: data/explorer.json (code/explorer.py) carries, for each of 19 tags and
// 6 states, n plus quantiles in both readings:
//   raw  p10 p25 p50 p75 p90 of the score
//   adj  the same quantiles of score minus that game's own band median
// Cells under min_cell (15 games) carry n only and are greyed out.
// ============================================================================

import { onReady, listen, announce } from './data.js';

const W = 1080;
const H = 676;
const M = { top: 164, right: 16, bottom: 44, left: 156 };
const SIDE = 384;                        // the numbers column on the right
const PLOT_W = W - M.left - SIDE;        // 540
const PLOT_H = H - M.top - M.bottom;     // 490

const INK = '#1c1c1c';
const MUTED = '#6b6b6b';
const GRID = '#e6e6e6';
const ACCENT = '#c0392b';
const BLUE = '#2c7fb8';

// Fixed domains: an axis that rescales when a control changes would hide the
// change the control is there to show.
const X_RAW = [25, 100];
const X_ADJ = [-20, 14];
const TICKS_RAW = [30, 40, 50, 60, 70, 80, 90, 100];
const TICKS_ADJ = [-20, -10, 0, 10];

const SIDE_X = M.left + PLOT_W + 30;     // 726
const COL_GAMES = SIDE_X + 96;           // 808
const COL_CROWD = W - M.right;           // 1064
const CARD_Y = 10;
const CARD_H = 118;

const fmt = d3.format(',');
const num = d3.format('.1f');
const signed = d3.format('+.1f');

const reduceMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const svg = d3.select('#chart2')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Nineteen kinds of games, one row each, showing how far each kind '
        + 'sits from the median score of its own audience band');

const gHeader = svg.append('g').attr('class', 'header');
const gPlot = svg.append('g')
    .attr('class', 'plot')
    .attr('transform', `translate(${M.left},${M.top})`);
const gGrid = gPlot.append('g').attr('class', 'grid');
const gRef = gPlot.append('g').attr('class', 'ref');
const gRows = gPlot.append('g').attr('class', 'rows');
const gAxis = gPlot.append('g').attr('class', 'axis');
const gSide = svg.append('g')
    .attr('class', 'side')
    .attr('transform', `translate(0,${M.top})`);

const titleText = gHeader.append('text')
    .attr('x', 0).attr('y', 28)
    .attr('font-size', 13).attr('font-weight', 600).attr('fill', INK);
const keyRow = gHeader.append('g').attr('class', 'key').attr('transform', 'translate(0,56)');
const sentence = gHeader.append('text')
    .attr('x', 0).attr('y', 92)
    .attr('font-size', 11).attr('fill', MUTED);

// The detail card sits on the right of the image, where the reader's eye already
// is after the numbers column, and never moves -- nothing jumps under the
// pointer while it travels down the rows.
const card = gHeader.append('g').attr('class', 'card');
card.append('rect')
    .attr('x', SIDE_X).attr('y', CARD_Y)
    .attr('width', COL_CROWD - SIDE_X).attr('height', CARD_H)
    .attr('rx', 6)
    .attr('fill', '#fbfbfb').attr('stroke', '#ececec');
const cardName = card.append('text')
    .attr('x', SIDE_X + 14).attr('y', CARD_Y + 24)
    .attr('font-size', 13).attr('font-weight', 600).attr('fill', INK);
const cardLines = [0, 1, 2, 3].map(i => card.append('text')
    .attr('x', SIDE_X + 14).attr('y', CARD_Y + 48 + i * 19)
    .attr('font-size', 10).attr('fill', MUTED));

let rows = [];
let view = { mode: 'adjusted', band: 'All', hovered: null, selected: null };
let bandMedians = {};
let overallMedian = 78.9;

const xRaw = d3.scaleLinear().domain(X_RAW).range([0, PLOT_W]);
const xAdj = d3.scaleLinear().domain(X_ADJ).range([0, PLOT_W]);
const isAdj = () => view.mode === 'adjusted';
const x = () => (isAdj() ? xAdj : xRaw);

// --- geometry ---------------------------------------------------------------

const rowH = () => PLOT_H / rows.length;
const yOf = i => (i + 0.5) * rowH();

/** Quantiles for one row in the current state, or null when too few games. */
function cellOf(row) {
    const c = row.by_band[view.band];
    return c && c.raw ? (isAdj() ? c.adj : c.raw) : null;
}

function referenceOf() {
    if (isAdj()) return 0;
    return view.band === 'All' ? overallMedian : bandMedians[view.band];
}

onReady(({ explorer }) => {
    rows = explorer.tags.map(tag => ({ tag, ...explorer.rows[tag] }));
    bandMedians = explorer.band_medians;
    overallMedian = explorer.overall_median;
    view.selected = rows[0].tag;

    drawSideHeaders();
    drawKey();
    drawAxis();
    draw(false);
});

listen('mode', value => {
    view.mode = value;
    drawKey();
    drawAxis();
    draw(true);
});

listen('band', value => {
    view.band = value;
    drawKey();
    draw(true);
});

// --- drawing ----------------------------------------------------------------

function draw(animate) {
    if (!rows.length) return;
    const xs = x();
    const dur = animate && !reduceMotion ? 240 : 0;
    const t = sel => (dur ? sel.transition().duration(dur) : sel);

    drawRef();

    const row = gRows.selectAll('g.row')
        .data(rows, d => d.tag)
        .join(enter => {
            const g = enter.append('g').attr('class', 'row');
            g.append('line').attr('class', 'whisker');
            g.append('rect').attr('class', 'iqr');
            g.append('line').attr('class', 'lead');
            g.append('circle').attr('class', 'dot');
            g.append('rect').attr('class', 'hit').attr('fill', 'transparent');
            g.append('text').attr('class', 'label')
                .attr('x', -12).attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('font-size', 11.5).attr('fill', INK);
            g.on('pointerenter', (ev, d) => { view.hovered = d.tag; paint(); });
            g.on('pointerleave', () => { view.hovered = null; paint(); });
            g.on('click', (ev, d) => {
                view.selected = d.tag;
                paint();
                announce('kind', d.tag);
            });
            return g;
        })
        .attr('transform', (d, i) => `translate(0,${yOf(i)})`);

    row.select('.label').text(d => d.tag);
    row.select('.hit')
        .attr('x', -M.left + 8).attr('y', -rowH() / 2)
        .attr('width', PLOT_W + M.left - 8).attr('height', rowH());

    row.each(function (d) {
        const g = d3.select(this);
        const c = cellOf(d);
        const col = c && isAdj() && c.p50 < 0 ? ACCENT : BLUE;

        t(g.select('.whisker'))
            .attr('x1', c ? xs(c.p10) : xs(referenceOf()))
            .attr('x2', c ? xs(c.p90) : xs(referenceOf()))
            .attr('y1', 0).attr('y2', 0)
            .attr('stroke', col).attr('stroke-width', 1.7);
        g.select('.whisker').attr('opacity', c && !isAdj() ? 0.55 : 0);

        t(g.select('.iqr'))
            .attr('x', c ? xs(c.p25) : 0)
            .attr('width', c ? Math.max(1, xs(c.p75) - xs(c.p25)) : 0)
            .attr('y', -3.6).attr('height', 7.2).attr('rx', 1.6)
            .attr('fill', col);
        g.select('.iqr').attr('opacity', c && !isAdj() ? 0.62 : 0);

        // In the net view the mark is a lollipop: the question is only where the
        // kind sits, so a hair from zero carries the eye and the bar stays home.
        t(g.select('.lead'))
            .attr('x1', xs(0))
            .attr('x2', c ? xs(c.p50) : xs(0))
            .attr('y1', 0).attr('y2', 0)
            .attr('stroke', col).attr('stroke-width', 1.7);
        g.select('.lead').attr('opacity', c && isAdj() ? 0.8 : 0);

        t(g.select('.dot'))
            .attr('cx', c ? xs(c.p50) : xs(0))
            .attr('r', 5.2)
            .attr('fill', col)
            .attr('stroke', '#fff').attr('stroke-width', 1.6);
        g.select('.dot').attr('opacity', c ? 1 : 0);
    });

    drawSide();
    paint();
}

function paint() {
    const active = view.hovered || view.selected;
    gRows.selectAll('g.row').each(function (d) {
        const g = d3.select(this);
        const empty = !cellOf(d);
        const near = !view.hovered || d.tag === view.hovered;
        g.attr('opacity', (empty ? 0.3 : 1) * (near ? 1 : 0.26));
        g.select('.label')
            .attr('font-weight', d.tag === active ? 600 : 400)
            .attr('fill', d.tag === active ? INK : '#3b3b3b');
    });
    drawCard(active || rows[0].tag);
}

function drawCard(tag) {
    const row = rows.find(r => r.tag === tag) || rows[0];
    const c = cellOf(row);
    cardName.text(row.tag);
    cardLines[0].text(`${fmt(row.games)} games · typical crowd `
        + `${fmt(row.median_reviews)} reviews`);

    if (!c) {
        cardLines[1].text(`only ${row.by_band[view.band].n} games in this band`);
        cardLines[2].text('too few to draw a distribution');
        cardLines[3].text('');
        return;
    }
    if (isAdj()) {
        cardLines[1].text(`median ${signed(c.p50)} points against its own crowd`);
        cardLines[2].text(`middle half ${signed(c.p25)} to ${signed(c.p75)}`);
    } else {
        cardLines[1].text(`median ${num(c.p50)} · middle half ${num(c.p25)}–${num(c.p75)}`);
        cardLines[2].text(`10th–90th ${num(c.p10)}–${num(c.p90)}`);
    }
    cardLines[3].text((row.examples || [])
        .map(e => `${clip(e.name, 21)} ${num(e.rating)} (${fmt(e.reviews)})`)
        .join('  ·  '));
}

function clip(s, n) {
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// --- frame ------------------------------------------------------------------

function drawRef() {
    const xs = x();
    const at = referenceOf();
    gRef.selectAll('*').remove();
    gRef.append('line')
        .attr('x1', xs(at)).attr('x2', xs(at)).attr('y1', -14).attr('y2', PLOT_H)
        .attr('stroke', MUTED).attr('stroke-width', 1).attr('stroke-dasharray', '4 4');
    gRef.append('text')
        .attr('x', xs(at) + 5).attr('y', -5)
        .attr('font-size', 9.5).attr('fill', MUTED)
        .text(isAdj() || view.band !== 'All'
            ? (isAdj() ? '0 = the median game in this crowd' : `${num(at)} = the median game in this crowd`)
            : `${num(at)} = the median game`);
}

function drawAxis() {
    const xs = x();
    const ticks = isAdj() ? TICKS_ADJ : TICKS_RAW;

    gGrid.selectAll('line')
        .data(ticks).join('line')
        .attr('x1', d => xs(d)).attr('x2', d => xs(d))
        .attr('y1', 0).attr('y2', PLOT_H)
        .attr('stroke', GRID).attr('stroke-width', 1);

    gAxis.attr('transform', `translate(0,${PLOT_H})`).selectAll('*').remove();
    gAxis.selectAll('text')
        .data(ticks).join('text')
        .attr('x', d => xs(d)).attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', MUTED)
        .text(d => (isAdj() && d > 0 ? `+${d}` : `${d}`));
    gAxis.append('text')
        .attr('x', PLOT_W).attr('y', 38)
        .attr('text-anchor', 'end')
        .attr('font-size', 10.5).attr('fill', INK)
        .text(isAdj() ? 'points above or below its own crowd' : 'share of positive reviews');
}

function drawKey() {
    keyRow.selectAll('*').remove();
    const where = view.band === 'All' ? 'all 5,605 games' : `${view.band} reviews`;
    titleText.text(`${isAdj() ? 'Net of crowd' : 'Raw score'} · ${where}`);
    const empty = rows.filter(r => !cellOf(r)).length;
    const hint = d3.select('#chart2-hint');
    if (!hint.empty()) {
        hint.text(`${rows.length} kinds · 5,605 games · `
            + (empty ? `${empty} row${empty > 1 ? 's' : ''} too small at this crowd` : 'all rows drawn'));
    }
    sentence.text(isAdj()
        ? 'One row per kind. Rows keep their all-games order as you switch crowds; zero is what a game of that size usually scores.'
        : 'Same rows, same all-games order. The bar is how far apart a kind scores; the dot is its median.');

    if (isAdj()) {
        keyRow.append('line')
            .attr('x1', 0).attr('x2', 24).attr('y1', 0).attr('y2', 0)
            .attr('stroke', BLUE).attr('stroke-width', 1.2).attr('opacity', 0.6);
        keyRow.append('circle').attr('cx', 24).attr('cy', 0).attr('r', 5.2).attr('fill', BLUE);
        keyRow.append('text').attr('x', 36).attr('y', 3.5)
            .attr('font-size', 10).attr('fill', MUTED)
            .text('how far the kind sits from its crowd  ·  blue above, red below');
    } else {
        keyRow.append('line')
            .attr('x1', 0).attr('x2', 30).attr('y1', 0).attr('y2', 0)
            .attr('stroke', BLUE).attr('stroke-width', 1.7).attr('opacity', 0.55);
        keyRow.append('rect')
            .attr('x', 8).attr('y', -3.3).attr('width', 14).attr('height', 6.6)
            .attr('rx', 1.5).attr('fill', BLUE).attr('opacity', 0.62);
        keyRow.append('circle').attr('cx', 15).attr('cy', 0).attr('r', 5.2).attr('fill', BLUE);
        keyRow.append('text').attr('x', 44).attr('y', 3.5)
            .attr('font-size', 10).attr('fill', MUTED)
            .text('10th–90th  ·  middle half  ·  median');
    }
}

function drawSideHeaders() {
    gSide.append('text')
        .attr('x', COL_GAMES).attr('y', -12)
        .attr('text-anchor', 'end').attr('font-size', 9.5).attr('fill', MUTED)
        .text('games');
    gSide.append('text')
        .attr('x', COL_CROWD).attr('y', -12)
        .attr('text-anchor', 'end').attr('font-size', 9.5).attr('fill', MUTED)
        .text('typical crowd (median reviews)');
}

/**
 * The numbers column. The first thing a reader asks here is "how many games is
 * this, and how big is a typical crowd for it", so both are printed for every
 * row instead of hiding behind a hover.
 */
function drawSide() {
    const games = gSide.selectAll('text.row-games').data(rows, d => d.tag);
    games.join('text')
        .attr('class', 'row-games')
        .attr('x', COL_GAMES).attr('text-anchor', 'end')
        .attr('font-size', 10).attr('fill', MUTED)
        .attr('y', (d, i) => yOf(i) + 3.5)
        .text(d => fmt(d.games));

    gSide.selectAll('text.row-crowd')
        .data(rows, d => d.tag)
        .join('text')
        .attr('class', 'row-crowd')
        .attr('x', COL_CROWD).attr('text-anchor', 'end')
        .attr('font-size', 10).attr('fill', INK)
        .attr('y', (d, i) => yOf(i) + 3.5)
        .text(d => fmt(d.median_reviews));
}
