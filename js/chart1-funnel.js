// ============================================================================
// CHART1-FUNNEL.JS — Act 1: the fog, the window, the funnel
// ============================================================================
// The claim: a bigger crowd does not hand out better scores, it stops handing
// out bad ones. So the chart has to let the reader watch the FLOOR of the cloud
// rise. Everything here is built around that one gesture: a window as wide as
// the smallest crowd band, dragged to the right, with the numbers underneath
// updating as it moves.
//
// Layers, back to front:
//   gGrid    horizontal gridlines
//   gDots    one circle per game, low opacity: the fog
//   gBands   the five I-beams (10th-90th percentile) and their median dots
//   gLens    the window: a fill, two edges, a grab bar
//   gHot     a second copy of the fog, clipped to the window: the games you
//            are actually reading at this position
//
// Data: data.fog { x0, x1, dots: [[reviews, rating], ...] } — every game in the
// review-count plane, ~64 KB. The window's quantiles are computed in the
// browser from those dots, so every position is exact, not interpolated.
//
// Contract: announce('lens', { lo, hi, n, p10, median, p90 }) on every move.
// ============================================================================

import { data, announce } from './data.js';

const width = 960;
const height = 580;
const margin = { top: 26, right: 30, bottom: 80, left: 66 };
const innerW = width - margin.left - margin.right;
const innerH = height - margin.top - margin.bottom;

const BLUE = '#2c7fb8';
const DEEP = '#1b6ca8';
const INK = '#1c1c1c';
const MUTED = '#8b8b8b';
const GRID = '#e6e6e6';
const ACCENT = '#c0392b';

const fmtInt = d3.format(',');
const fmtShort = d3.format('~s');

// The axis stops at 400,000 reviews: nine games sit beyond it (the top two are
// past a million). They are clipped rather than squeezed in, and the caption
// says so, because stretching the axis to 3M would give a third of the width to
// nine games.
const X_MAX = 400000;

const svg = d3.select('#chart1')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('role', 'img')
    .attr('aria-label',
        'Every game plotted by how many reviews it has and its share of positive reviews. '
        + 'A window can be dragged along the review axis to read the score distribution '
        + 'of the games inside it.');

const gPlot = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
const gGrid = gPlot.append('g').attr('class', 'grid');
const gDots = gPlot.append('g').attr('class', 'dots');
const gBands = gPlot.append('g').attr('class', 'bands');
const gLens = gPlot.append('g').attr('class', 'lens');
const gHot = gPlot.append('g').attr('class', 'dots-hot')
    .attr('clip-path', 'url(#lens-clip)');

const clipRect = gPlot.append('defs').append('clipPath')
    .attr('id', 'lens-clip')
    .attr('clipPathUnits', 'userSpaceOnUse')
    .append('rect')
    .attr('y', 0)
    .attr('height', innerH);

const note = d3.select('#chart1-note');
const chartEl = d3.select('#chart1');

// window geometry, in log10(reviews) space
let x, y;
let logLo, logHi, lensAt;

/** Ratings of the games inside a review-count window: [lo, hi), like the bands.
 *  The 1e-6 keeps 10 ** log10(200) from landing at 200.00000000000003 and
 *  swallowing the game that has exactly 200 reviews. */
function ratingsIn(lo, hi) {
    const a = lo - 1e-6;
    const b = hi - 1e-6;
    const out = [];
    for (const [n, r] of data.fog.dots) if (n >= a && n < b) out.push(r);
    return out;
}

function readout(lo, hi) {
    const vals = ratingsIn(lo, hi).sort(d3.ascending);
    return {
        lo, hi, n: vals.length,
        p10: vals.length ? d3.quantile(vals, 0.1) : null,
        median: vals.length ? d3.quantile(vals, 0.5) : null,
        p90: vals.length ? d3.quantile(vals, 0.9) : null
    };
}

const round0 = v => (v == null ? '—' : Math.round(v));

function describe(r) {
    const head = `${fmtInt(Math.round(r.lo))}–${fmtInt(Math.round(r.hi))} reviews`;
    if (!r.n) return `${head} · no games here`;
    return `${head} · ${fmtInt(r.n)} games · 10th <b>${round0(r.p10)}</b>`
        + ` · median <b>${round0(r.median)}</b> · 90th <b>${round0(r.p90)}</b>`;
}

// --- axes and the fog -----------------------------------------------------

function build() {
    x = d3.scaleLog().domain([data.fog.x0, X_MAX]).range([0, innerW]);
    y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);

    logLo = Math.log10(data.fog.x0);
    logHi = Math.log10(X_MAX);
    // The window is exactly as wide, in log space, as the smallest crowd band
    // (50-200 reviews), so its first position IS that band.

    gGrid.selectAll('line')
        .data(y.ticks(5))
        .join('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', d => y(d)).attr('y2', d => y(d))
        .attr('stroke', GRID);

    const xTicks = [50, 100, 500, 1000, 10000, 100000, 400000];
    gPlot.append('g')
        .attr('class', 'axis axis-x')
        .attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues(xTicks).tickFormat(fmtShort).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill', MUTED).attr('font-size', 11))
        .call(g => g.selectAll('line').attr('stroke', MUTED));

    gPlot.append('g')
        .attr('class', 'axis axis-y')
        .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0))
        .call(g => g.selectAll('text').attr('fill', MUTED).attr('font-size', 11))
        .call(g => g.selectAll('line').remove());

    gPlot.append('text')
        .attr('x', innerW).attr('y', innerH + 40)
        .attr('text-anchor', 'end').attr('font-size', 11.5).attr('fill', INK)
        .text('number of reviews (log scale)');

    gPlot.append('text')
        .attr('transform', `translate(-48,${innerH / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', 11.5).attr('fill', INK)
        .text('share of positive reviews');

    gPlot.append('defs').append('clipPath')
        .attr('id', 'plot-clip')
        .attr('clipPathUnits', 'userSpaceOnUse')
        .append('rect')
        .attr('width', innerW).attr('height', innerH);

    gDots.attr('clip-path', 'url(#plot-clip)');

    gDots.selectAll('circle')
        .data(data.fog.dots)
        .join('circle')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 1.4)
        .attr('fill', BLUE)
        .attr('opacity', 0.11);

    gHot.selectAll('circle')
        .data(data.fog.dots)
        .join('circle')
        .attr('cx', d => x(d[0]))
        .attr('cy', d => y(d[1]))
        .attr('r', 2.0)
        .attr('fill', DEEP)
        .attr('opacity', 0.34);

    drawBands();
    drawLens();

    bandAt = 0;
    place(Math.log10(BANDS[0].lo), spanOf(BANDS[0]));
    refresh();
}

/** The five crowd bands: the funnel, drawn on top of the fog. */
function drawBands() {
    const rows = Object.entries(data.curves.bands).map(([label, s]) => ({ label, ...s }));

    gBands.append('path')
        .attr('d', d3.line()(rows.map(r => [x(r.median_reviews), y(r.median)])))
        .attr('fill', 'none')
        .attr('stroke', ACCENT)
        .attr('stroke-width', 2.6)
        .attr('stroke-dasharray', '7 6')
        .attr('opacity', 0.9);

    const g = gBands.selectAll('g.band').data(rows).join('g').attr('class', 'band');

    g.append('line')
        .attr('x1', d => x(d.median_reviews)).attr('x2', d => x(d.median_reviews))
        .attr('y1', d => y(d.p90)).attr('y2', d => y(d.p10))
        .attr('stroke', ACCENT).attr('stroke-width', 3.4)
        .attr('stroke-linecap', 'round');

    g.selectAll('line.cap')
        .data(d => [[d, d.p90], [d, d.p10]])
        .join('line')
        .attr('class', 'cap')
        .attr('x1', d => x(d[0].median_reviews) - 8)
        .attr('x2', d => x(d[0].median_reviews) + 8)
        .attr('y1', d => y(d[1])).attr('y2', d => y(d[1]))
        .attr('stroke', ACCENT).attr('stroke-width', 3.4)
        .attr('stroke-linecap', 'round');

    g.append('circle')
        .attr('cx', d => x(d.median_reviews)).attr('cy', d => y(d.median))
        .attr('r', 5.2).attr('fill', ACCENT)
        .attr('stroke', '#fff').attr('stroke-width', 1.6);

    g.append('title')
        .text(d => `${d.label} reviews · ${fmtInt(d.n)} games · median ${Math.round(d.median)}`
            + ` · 10th ${Math.round(d.p10)} · 90th ${Math.round(d.p90)}`);

    gPlot.append('text')
        .attr('x', 0).attr('y', innerH + 64)
        .attr('font-size', 10.5).attr('fill', MUTED)
        .text('bar = 10th–90th percentile of scores · dot = median · 5 games sit past 400,000');
}

// --- the window -----------------------------------------------------------

// The five crowd bands as review-count intervals. 10k+ is open-ended, so its
// window borrows the axis end (X_MAX) and the note says "10,000+".
const BAND_EDGES = [50, 200, 500, 2000, 10000, X_MAX];
const BANDS = Object.keys(data.curves.bands).map((label, i) => ({
    label,
    lo: BAND_EDGES[i],
    hi: BAND_EDGES[i + 1],
    stats: data.curves.bands[label]
}));

let lensFill, lensHit, lensBar, hoverLabel;
let lensW = Math.log10(200 / 50); // decades; starts on the 50-200 band
let bandAt = 0;                   // index into BANDS, null while dragging

const spanOf = b => Math.log10(b.hi) - Math.log10(b.lo);

function drawLens() {
    lensFill = gLens.append('rect')
        .attr('y', 0).attr('height', innerH)
        .attr('fill', BLUE).attr('opacity', 0.06)
        .attr('pointer-events', 'none');

    gLens.selectAll('line.edge')
        .data(['l', 'r'])
        .join('line')
        .attr('class', 'edge')
        .attr('y1', 0).attr('y2', innerH)
        .attr('stroke', BLUE).attr('stroke-width', 1.2)
        .attr('stroke-dasharray', '3 3')
        .attr('pointer-events', 'none');

    lensBar = gLens.append('rect')
        .attr('x', 0).attr('y', -1)
        .attr('width', 34).attr('height', 5).attr('rx', 2.5)
        .attr('fill', BLUE).attr('opacity', 0.9)
        .attr('pointer-events', 'none');

    // One click target per band, stacked in reading order. Clicking a column
    // moves the window there; there is nothing to drag, so the target is the
    // whole height of the plot.
    // Hover read-out: names the column before the reader commits to a click.
    hoverLabel = gLens.append('text')
        .attr('class', 'hover-label')
        .attr('y', 14)
        .attr('text-anchor', 'middle')
        .attr('font-size', 11)
        .attr('fill', INK)
        .attr('stroke', '#fff').attr('stroke-width', 3.5).attr('paint-order', 'stroke')
        .attr('pointer-events', 'none')
        .attr('opacity', 0);

    gLens.append('g')
        .attr('class', 'zones')
        .selectAll('rect')
        .data(BANDS)
        .join('rect')
        .attr('x', b => x(b.lo))
        .attr('width', b => Math.max(3, x(b.hi) - x(b.lo)))
        .attr('y', 0).attr('height', innerH)
        .attr('fill', BLUE).attr('opacity', 0)
        .attr('cursor', 'pointer')
        // Mouse affordance only: the slider below is the accessible control.
        .attr('aria-hidden', 'true')
        .attr('data-band', b => b.label)
        .on('mouseenter', function (ev, b) {
            d3.select(this).attr('opacity', 0.05);
            const cx = x(b.lo) + Math.max(3, x(b.hi) - x(b.lo)) / 2;
            hoverLabel
                .attr('x', Math.max(46, Math.min(innerW - 46, cx)))
                .text(b.hi >= X_MAX ? '10,000+ reviews' : `${fmtInt(b.lo)}–${fmtInt(b.hi)} reviews`)
                .attr('opacity', 1);
        })
        .on('mouseleave', function () {
            d3.select(this).attr('opacity', 0);
            hoverLabel.attr('opacity', 0);
        })
        .on('click', (ev, b) => {
            snapTo(BANDS.indexOf(b));
            const el = chartEl.node();
            if (el && el.focus) el.focus({ preventScroll: true });
        });

    // The window itself never takes pointer events, so it is not a hit target.
    lensHit = gLens.append('rect')
        .attr('y', 0).attr('height', innerH)
        .attr('fill', 'transparent')
        .attr('pointer-events', 'none');

    // Keyboard lives on the container div: clicking any column focuses it, so
    // the arrow keys keep working whatever the pointer just did.
    chartEl.on('keydown', ev => {
        const moves = {
            ArrowRight: bandAt + 1,
            ArrowLeft: bandAt - 1,
            Home: 0,
            End: BANDS.length - 1
        };
        if (!(ev.key in moves)) return;
        ev.preventDefault();
        snapTo(Math.max(0, Math.min(BANDS.length - 1, moves[ev.key])));
    });
}


const clampAt = v => Math.max(logLo, Math.min(logHi - lensW, v));

/** Which band's centre is closest to a log-space centre. */
function nearestBand(centre) {
    let best = 0;
    let bestD = Infinity;
    BANDS.forEach((b, i) => {
        const c = (Math.log10(b.lo) + Math.log10(b.hi)) / 2;
        const d = Math.abs(c - centre);
        if (d < bestD) { bestD = d; best = i; }
    });
    return best;
}

/** Move the window's geometry; no text, so it is cheap enough to animate. */
function place(at, w) {
    lensAt = at;
    lensW = w;
    const lo = Math.pow(10, at);
    const hi = Math.pow(10, at + w);
    const px = x(lo);
    const pw = Math.max(1.5, x(hi) - px);

    lensFill.attr('x', px).attr('width', pw);
    lensHit.attr('x', px).attr('width', pw);
    lensBar.attr('x', px + pw / 2 - 17);
    clipRect.attr('x', px).attr('width', pw);

    gLens.selectAll('line.edge')
        .attr('x1', d => (d === 'l' ? px : px + pw))
        .attr('x2', d => (d === 'l' ? px : px + pw));

    // The band under the window keeps a full-strength bar; the rest step back,
    // so the bar you are reading is the only one that competes with the fog.
    gBands.selectAll('g.band')
        .attr('opacity', (d, i) => (bandAt == null ? 0.8 : (i === bandAt ? 1 : 0.32)));
    // The connector stays legible whatever band is selected: it is the spine
    // of the funnel, not one of the five bars.
    gBands.selectAll('path').attr('opacity', 0.9);
}

let animTimer = null;

function halt() {
    if (animTimer) { animTimer.stop(); animTimer = null; }
}

/** Snap so the window's centre sits on a band's centre, and resize to it. */
function snapTo(i, { animate = true } = {}) {
    bandAt = i;
    const b = BANDS[i];
    const to = Math.log10(b.lo);
    const w = spanOf(b);

    halt();

    if (!animate || reduced()) {
        place(to, w);
        refresh();
        return;
    }

    const fromAt = lensAt;
    const fromW = lensW;
    const t0 = performance.now();
    const dur = 460;
    animTimer = d3.timer(() => {
        const k = Math.min(1, (performance.now() - t0) / dur);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        place(fromAt + (to - fromAt) * e, fromW + (w - fromW) * e);
        if (k >= 1) { animTimer = null; refresh(); return true; }
        return false;
    });
}

const reduced = () =>
    !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The band card under the chart: range, how many games, and how long they stay. */
function describeBand(b, r) {
    const range = b.hi >= X_MAX ? '10,000+ reviews' : `${fmtInt(b.lo)}–${fmtInt(b.hi)} reviews`;
    return `${range} · ${fmtInt(r.n)} games · the median game here has `
        + `<b>${fmtInt(b.stats.median_reviews)}</b> reviews · scores: 10th <b>${round0(r.p10)}</b>`
        + ` · median <b>${round0(r.median)}</b> · 90th <b>${round0(r.p90)}</b>`;
}

function refresh() {
    const lo = Math.pow(10, lensAt);
    const hi = Math.pow(10, lensAt + lensW);
    const r = readout(lo, hi);
    const band = bandAt == null ? null : BANDS[bandAt];

    note.html(band ? describeBand(band, r) : describe(r));

    chartEl
        .attr('aria-valuemin', Math.round(lo))
        .attr('aria-valuemax', Math.round(hi))
        .attr('aria-valuenow', Math.round(lo))
        .attr('aria-valuetext', note.text());

    announce('lens', {
        lo, hi, n: r.n, p10: r.p10, median: r.median, p90: r.p90,
        band: band ? band.label : null
    });
}

build();
