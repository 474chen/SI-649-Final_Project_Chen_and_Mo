// Act 4 — every kind of game at every size of crowd.
//
// One grid: nineteen kinds down, six crowds across. Each cell is a bullet —
// the thin line is the 10th-90th percentile, the thick bar is the middle half,
// the dot is the median — drawn on its own small scale (50-100) so cells are
// comparable across the whole grid and not just within a row.
//
// The data is precomputed in data/explorer.json (code/explorer.py); every cell
// also carries three real games, one near each end and one in the middle.
//
// Interact: hover previews, click pins, arrow keys walk the grid, Enter pins.

import { data, announce, listen, onReady } from './data.js';

const INK = '#1c1c1c';
const MUTED = '#6b6b6b';
const GRID = '#e6e6e6';
const BLUE = '#2c7fb8';
const CARD = d3.select('#game-cards');
const NOTE = d3.select('#chart4-note');

const COLS = ['All', '50-200', '200-500', '500-2k', '2k-10k', '10k+'];
const COL_LABEL = {
    'All': 'All',
    '50-200': '50–200',
    '200-500': '200–500',
    '500-2k': '500–2k',
    '2k-10k': '2k–10k',
    '10k+': '10k+',
};

const W = 1080;
const H = 640;
const M = { top: 76, right: 20, bottom: 40, left: 128 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;
const COL_W = PW / COLS.length;
const CELL_PAD = 22;                       // gap between the cell edge and the marks
const CELL_W = COL_W - CELL_PAD * 2;
const ROW_H = PH / 19;
const X_DOMAIN = [50, 100];                // fixed, so a wide cell reads as wide
const BAR_H = 7;

// A shaded-by-median ramp that stays readable at the low end: plain Blues goes
// almost white below 70 and those cells would disappear into the page.
const filled = d3.scaleSequential(t => d3.interpolateBlues(0.3 + 0.62 * t))
    .domain([66, 90]).clamp(true);

const svg = d3.select('#chart4').append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label',
        'Grid of nineteen kinds of game by six audience sizes. Each cell shows the '
        + '10th to 90th percentile, the middle half and the median score.');

const gHead = svg.append('g').attr('class', 'head');
const gRows = svg.append('g').attr('class', 'rows')
    .attr('transform', `translate(0,${M.top})`);
const gCells = svg.append('g').attr('class', 'cells')
    .attr('role', 'group')
    .attr('aria-label', 'Nineteen kinds of game by six audience sizes')
    .attr('transform', `translate(${M.left},${M.top})`);
const gFoot = svg.append('g').attr('class', 'foot');

let view = { hover: null, pin: null, isolate: null, focus: null };

// --- the cell itself ---------------------------------------------------------

function cellHtml(tag, band) {
    const c = data.explorer.rows[tag].by_band[band];
    const row = data.explorer.rows[tag];
    const label = `${tag} · ${bandLabel(band)}`;
    if (!c || !c.raw) {
        return `
            <p class="card-eyebrow">${esc(label)}</p>
            <p class="card-figure">${c ? c.n : 0} games</p>
            <p class="card-empty">Too few games at this size to describe — anything drawn
            from ${c ? c.n : 0} titles would be noise.</p>`;
    }
    const p = c.raw;
    const delta = p.p50 - row.by_band.All.raw.p50;
    const deltaTxt = band === 'All'
        ? '<dd>—</dd>'
        : `<dd class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}</dd>`;
    return `
        <p class="card-eyebrow">${esc(label)}</p>
        <p class="card-figure">${fmt(c.n)} games</p>
        <dl class="card-stats">
            <dt>median</dt><dd>${p.p50.toFixed(1)}</dd>
            <dt>middle half</dt><dd>${p.p25.toFixed(1)} – ${p.p75.toFixed(1)}</dd>
            <dt>10th – 90th</dt><dd>${p.p10.toFixed(1)} – ${p.p90.toFixed(1)}</dd>
            <dt>vs this kind</dt>${deltaTxt}
        </dl>
        <p class="card-label">Three games from this cell</p>
        <ul class="card-games">
            ${(c.examples || []).map(g => `
                <li>
                    <span class="g-name" title="${esc(g.name)}">${esc(g.name)}</span>
                    <span class="g-score">${g.rating.toFixed(1)}</span>
                    <span class="g-rev">${fmt(g.reviews)}</span>
                </li>`).join('')}
        </ul>`;
}

function bandLabel(band) {
    if (band === 'All') return 'all crowds';
    return `${COL_LABEL[band]} reviews`;
}

function esc(s) {
    return String(s).replace(/[&<>"]/g, ch => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function fmt(n) {
    return d3.format(',')(n);
}

// --- layout ------------------------------------------------------------------

function drawHead() {
    gHead.append('text')
        .attr('x', M.left).attr('y', 30)
        .attr('font-size', 10).attr('letter-spacing', '0.06em')
        .attr('fill', MUTED)
        .text('AUDIENCE SIZE (REVIEWS)');

    COLS.forEach((band, i) => {
        const cx = M.left + i * COL_W + COL_W / 2;
        gHead.append('text')
            .attr('x', cx).attr('y', 58)
            .attr('text-anchor', 'middle')
            .attr('font-size', 11).attr('font-weight', i === 0 ? 600 : 500)
            .attr('fill', INK)
            .text(COL_LABEL[band]);
    });
}

function drawRows(tags) {
    tags.forEach((tag, r) => {
        const cy = r * ROW_H + ROW_H / 2;
        const g = gRows.append('g').attr('class', 'row-label').attr('data-tag', tag);
        g.append('rect')
            .attr('class', 'hit')
            .attr('x', 0).attr('y', r * ROW_H)
            .attr('width', M.left - 8).attr('height', ROW_H)
            .attr('fill', 'transparent')
            .attr('cursor', 'pointer');
        g.append('text')
            .attr('x', M.left - 14).attr('y', cy + 3.6)
            .attr('text-anchor', 'end')
            .attr('font-size', 10.5)
            .attr('fill', MUTED)
            .text(tag);
        g.on('click', () => {
            view.isolate = view.isolate === tag ? null : tag;
            paint();
        });
    });

    // faint row guides: without them the bullets float and the eye cannot
    // carry a row across six columns
    tags.forEach((_, r) => {
        gRows.append('line')
            .attr('x1', 0).attr('x2', W - M.right)
            .attr('y1', (r + 1) * ROW_H).attr('y2', (r + 1) * ROW_H)
            .attr('stroke', GRID).attr('stroke-opacity', 0.6);
    });

    gRows.append('line')
        .attr('x1', M.left + COL_W).attr('x2', M.left + COL_W)
        .attr('y1', 0).attr('y2', PH)
        .attr('stroke', GRID).attr('stroke-opacity', 0.9);
}

function drawCells(tags) {
    const x = d3.scaleLinear().domain(X_DOMAIN).range([0, CELL_W]);

    tags.forEach((tag, r) => {
        COLS.forEach((band, c) => {
            const cellData = data.explorer.rows[tag].by_band[band];
            const g = gCells.append('g')
                .attr('class', 'cell')
                .attr('data-tag', tag)
                .attr('data-band', band)
                .attr('transform', `translate(${c * COL_W},${r * ROW_H})`)
                .attr('tabindex', r === 0 && c === 0 ? 0 : -1)
                .attr('role', 'button');

            const aria = cellData && cellData.raw
                ? `${tag}, ${bandLabel(band)}: ${cellData.n} games, median `
                  + `${cellData.raw.p50.toFixed(1)} of 100`
                : `${tag}, ${bandLabel(band)}: too few games`;
            g.attr('aria-label', aria);

            g.append('rect')
                .attr('class', 'hit')
                .attr('x', 0).attr('y', 0)
                .attr('width', COL_W).attr('height', ROW_H)
                .attr('fill', 'transparent');

            if (!cellData || !cellData.raw) {
                g.append('text')
                    .attr('x', COL_W / 2).attr('y', ROW_H / 2 + 3.4)
                    .attr('text-anchor', 'middle')
                    .attr('font-size', 9).attr('fill', '#bbbbbb')
                    .text(`n=${cellData ? cellData.n : 0}`);
                g.classed('is-empty', true);
                return;
            }

            const p = cellData.raw;
            const cx = COL_W / 2;
            const left = cx - CELL_W / 2;
            const cy = ROW_H / 2;
            const col = filled(p.p50);

            g.append('line')
                .attr('class', 'whisker')
                .attr('x1', left + x(p.p10)).attr('x2', left + x(p.p90))
                .attr('y1', cy).attr('y2', cy)
                .attr('stroke', col).attr('stroke-width', 1.6)
                .attr('stroke-opacity', 0.45).attr('stroke-linecap', 'round');

            g.append('line')
                .attr('class', 'iqr')
                .attr('x1', left + x(p.p25)).attr('x2', left + x(p.p75))
                .attr('y1', cy).attr('y2', cy)
                .attr('stroke', col).attr('stroke-width', BAR_H)
                .attr('stroke-opacity', 0.85).attr('stroke-linecap', 'round');

            g.append('circle')
                .attr('class', 'median')
                .attr('cx', left + x(p.p50)).attr('cy', cy)
                .attr('r', 3.1)
                .attr('fill', INK).attr('stroke', '#ffffff').attr('stroke-width', 1.1);
        });
    });
}

function drawFoot() {
    const keys = [
        ['thin', '10th–90th percentile'],
        ['thick', 'middle half'],
        ['dot', 'median'],
    ];
    const g = gFoot.append('g').attr('transform', `translate(${M.left},${H - 12})`);
    let x = 0;
    for (const [kind, label] of keys) {
        if (kind === 'thin') {
            g.append('line').attr('x1', x).attr('x2', x + 26).attr('y1', -4).attr('y2', -4)
                .attr('stroke', MUTED).attr('stroke-width', 1.6).attr('stroke-opacity', 0.6);
            x += 26;
        } else if (kind === 'thick') {
            g.append('line').attr('x1', x).attr('x2', x + 22).attr('y1', -4).attr('y2', -4)
                .attr('stroke', MUTED).attr('stroke-width', BAR_H).attr('stroke-opacity', 0.55);
            x += 22;
        } else {
            g.append('circle').attr('cx', x + 3).attr('cy', -4).attr('r', 3.1).attr('fill', INK);
            x += 10;
        }
        x += 7;
        g.append('text').attr('x', x).attr('y', 0)
            .attr('font-size', 10).attr('fill', MUTED).text(label);
        x += label.length * 5.6 + 22;
    }
}

// --- state -------------------------------------------------------------------

function paint() {
    gCells.selectAll('g.cell').each(function () {
        const g = d3.select(this);
        const tag = g.attr('data-tag');
        const band = g.attr('data-band');
        const hovered = view.hover === `${tag}|${band}`;
        const pinned = view.pin === `${tag}|${band}`;
        const dimRow = view.isolate && view.isolate !== tag;
        g.classed('is-hover', hovered);
        g.classed('is-pinned', pinned);
        g.attr('opacity', dimRow ? 0.25 : 1);
        g.select('rect.hit')
            .attr('fill', pinned ? '#eaf3fa' : hovered ? '#f5fafd' : 'transparent')
            .attr('stroke', pinned ? BLUE : hovered ? '#a8cbe0' : 'none')
            .attr('stroke-width', pinned ? 1.4 : 1)
            .attr('stroke-opacity', hovered || pinned ? 1 : 0);
    });

    gRows.selectAll('g.row-label').each(function () {
        const g = d3.select(this);
        const tag = g.attr('data-tag');
        g.attr('opacity', view.isolate && view.isolate !== tag ? 0.25 : 1);
        g.select('text').attr('fill', view.isolate === tag ? INK : MUTED);
        g.select('text').attr('font-weight', view.isolate === tag ? 600 : 400);
    });
}

function show(tag, band) {
    CARD.html(cellHtml(tag, band));
}

function focusCell(tag, band) {
    view.focus = `${tag}|${band}`;
    gCells.selectAll('g.cell').attr('tabindex', function () {
        return d3.select(this).attr('data-tag') === tag
            && d3.select(this).attr('data-band') === band ? 0 : -1;
    });
    const node = gCells.selectAll('g.cell')
        .filter(function () {
            return d3.select(this).attr('data-tag') === tag
                && d3.select(this).attr('data-band') === band;
        }).node();
    if (node) node.focus({ preventScroll: true });
}

function select(tag, band, { pin = true } = {}) {
    view.pin = pin ? `${tag}|${band}` : null;
    show(tag, band);
    announce('explorer', { kind: tag, band });
    paint();
}

// --- wiring ------------------------------------------------------------------

onReady(({ explorer }) => {
    const tags = explorer.tags;

    drawHead();
    drawRows(tags);
    drawCells(tags);
    drawFoot();

    gCells.selectAll('g.cell')
        .on('pointerenter', function () {
            const g = d3.select(this);
            view.hover = `${g.attr('data-tag')}|${g.attr('data-band')}`;
            show(g.attr('data-tag'), g.attr('data-band'));
            paint();
        })
        .on('pointerleave', () => {
            view.hover = null;
            if (view.pin) {
                const [t, b] = view.pin.split('|');
                show(t, b);
            }
            paint();
        })
        .on('click', function () {
            const g = d3.select(this);
            const tag = g.attr('data-tag');
            const band = g.attr('data-band');
            focusCell(tag, band);
            select(tag, band);
        })
        .on('keydown', function (ev) {
            const g = d3.select(this);
            let r = tags.indexOf(g.attr('data-tag'));
            let c = COLS.indexOf(g.attr('data-band'));
            let handled = true;
            if (ev.key === 'ArrowDown') r = Math.min(tags.length - 1, r + 1);
            else if (ev.key === 'ArrowUp') r = Math.max(0, r - 1);
            else if (ev.key === 'ArrowRight') c = Math.min(COLS.length - 1, c + 1);
            else if (ev.key === 'ArrowLeft') c = Math.max(0, c - 1);
            else if (ev.key === 'Home') c = 0;
            else if (ev.key === 'End') c = COLS.length - 1;
            else if (ev.key === 'Enter' || ev.key === ' ') {
                select(g.attr('data-tag'), g.attr('data-band'));
            } else if (ev.key === 'Escape' && view.isolate) {
                view.isolate = null;
                paint();
            } else handled = false;
            if (handled) ev.preventDefault();
            if (['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(ev.key)) {
                const tag = tags[r];
                const band = COLS[c];
                focusCell(tag, band);
                show(tag, band);
            }
        });

    // Act 2's row click lands here: isolate that kind and pin its fattest crowd.
    listen('kind', tag => {
        if (!tags.includes(tag)) return;
        view.isolate = tag;
        const band = 'All';
        select(tag, band);
        focusCell(tag, band);
    });

    NOTE.text('Rows run from the lowest-scoring kind to the highest — the same order as '
        + 'Act 2, so the top of the grid is the bottom of that chart. 19 kinds × 6 crowds; '
        + 'two cells hold fewer than 15 games and are left empty.');

    // Start on the widest, best-populated cell so the card is never blank.
    select('open world', '10k+');
});
