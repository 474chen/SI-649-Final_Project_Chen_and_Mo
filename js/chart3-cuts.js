// ============================================================================
// Act 3 — the same playtime line, cut three ways.
//
// One metric (median share of positive reviews), one set of eleven playtime
// bins. What changes is only which lines are drawn: the pool, five crowds, or
// two kinds of game. The composition strips underneath say who is in each bin
// and move with the cut, because that composition is the explanation.
// ============================================================================

import { data, announce, listen, onReady } from './data.js';

const W = 1120;
const H = 548;
const M = { top: 96, right: 34, bottom: 128, left: 72 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

const INK = '#1c1c1c';
const MUTED = '#8b8b8b';
const GRID = '#e6e6e6';
const ACCENT = '#c0392b';
const BLUE = '#2c7fb8';

const BAND_COLOR = {
    '50-200': '#c6dbe9',
    '200-500': '#8fbdd8',
    '500-2k': '#5b9bc4',
    '2k-10k': '#2c7fb8',
    '10k+': '#1b4f72'
};
const BAND_LABEL = {
    '50-200': '50–200 reviews',
    '200-500': '200–500',
    '500-2k': '500–2,000',
    '2k-10k': '2,000–10,000',
    '10k+': '10,000+'
};
const KIND_COLOR = { long: ACCENT, short: BLUE, other: MUTED };
const KIND_LABEL = {
    long: 'Open-ended',
    short: 'Chaptered',
    other: 'Other kinds'
};
// The member kinds are named in the legend: "long-form" was a claim, not a
// description, and a reader cannot check it without leaving the page.
const KIND_MEMBERS = {
    long: 'open world · survival · FPS · sandbox',
    short: 'puzzle · visual novel · point & click · platformer',
    other: 'sports · fantasy · racing · stealth · RTS · horror · space · turn-based · roguelike · sci-fi'
};

// A bin with fewer than this many games is drawn as a gap rather than a dot:
// a fifteen-game median swings ten points and would read as a fact.
const MIN_N = 25;

const view = { grouping: 'none', bin: null };

// --- series ----------------------------------------------------------------

function seriesFor(grouping) {
    const s = data.act3.series;
    if (grouping === 'band') {
        return data.act3.bands.map(b => ({
            key: `band:${b}`,
            label: BAND_LABEL[b],
            color: BAND_COLOR[b],
            rows: s.band[b]
        }));
    }
    if (grouping === 'kind') {
        return data.act3.kinds.map(k => ({
            key: `kind:${k}`,
            label: KIND_LABEL[k],
            color: KIND_COLOR[k],
            rows: s.kind[k]
        }));
    }
    return [{ key: 'all', label: 'all games', color: INK, rows: s.all }];
}

/** rows come per bin and may skip bins entirely (a crowd with no games there). */
function points(rows, nBins) {
    const byBin = new Map(rows.map(r => [r.bin, r]));
    return d3.range(nBins).map(i => {
        const r = byBin.get(i);
        const ok = r && r.n >= MIN_N && r.median != null;
        return {
            i, n: r ? r.n : 0, m: ok ? r.median : null,
            lo: ok ? r.ci_lo : null, hi: ok ? r.ci_hi : null,
            net: ok && r.net != null ? r.net : null,
        };
    });
}

// --- drawing ---------------------------------------------------------------

const nBins = data.act3.bin_labels.length;

const x = d3.scalePoint().domain(d3.range(nBins)).range([0, PW]).padding(0.42);
const y = d3.scaleLinear().domain([55, 95]).range([PH, 0]);

const svg = d3.select('#chart3')
    .append('svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('role', 'img')
    .attr('aria-label', 'Median review score for eleven playtime bins, '
        + 'drawn once as one line and then split by crowd size or by kind of game.');

const root = svg.append('g').attr('transform', `translate(${M.left},${M.top})`);
const gGrid = root.append('g');
const gGhost = root.append('g');
const gBands = root.append('g');
const gSeries = root.append('g');
const gRule = root.append('g').style('display', 'none');
const gAxis = root.append('g');
const gStrips = root.append('g');
const gLegend = root.append('g');
const gHit = root.append('g');

const line = d3.line()
    .defined(d => d.m != null)
    .x(d => x(d.i))
    .y(d => y(d.m));

const area = d3.area()
    .defined(d => d.m != null)
    .x(d => x(d.i))
    .y0(d => y(d.lo))
    .y1(d => y(d.hi));

// gridlines + y axis (static)
(function frame() {
    const ticks = [60, 70, 80, 90];
    gGrid.selectAll('line')
        .data(ticks)
        .join('line')
        .attr('x1', 0).attr('x2', PW)
        .attr('y1', d => y(d)).attr('y2', d => y(d))
        .attr('stroke', GRID);

    gAxis.append('g')
        .selectAll('text')
        .data(ticks)
        .join('text')
        .attr('x', -12).attr('y', d => y(d))
        .attr('text-anchor', 'end').attr('dominant-baseline', 'middle')
        .attr('font-size', 11).attr('fill', MUTED)
        .text(d => d);

    gAxis.append('line')
        .attr('x1', 0).attr('x2', PW).attr('y1', PH).attr('y2', PH)
        .attr('stroke', '#c9c9c9');

    gAxis.append('text')
        .attr('transform', `translate(-56,${PH / 2}) rotate(-90)`)
        .attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', MUTED)
        .text('% positive reviews');

    gAxis.append('g')
        .selectAll('text')
        .data(data.act3.bin_labels)
        .join('text')
        .attr('x', (d, i) => x(i)).attr('y', PH + 17)
        .attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', MUTED)
        .text(d => d);

    gAxis.append('text')
        .attr('x', PW).attr('y', PH + 96)
        .attr('text-anchor', 'end').attr('font-size', 11).attr('fill', MUTED)
        .text('median playtime of owners');
})();

// n strip and composition strip share the x scale with the plot above.
const nMax = d3.max(data.act3.series.all, d => d.n);
const N_Y = PH + 30;
const N_H = 20;
const MIX_Y = PH + 62;
const MIX_H = 14;

function drawStrips() {
    const bins = data.act3.mix;
    const step = x.step();
    const bw = step * 0.46;

    gStrips.selectAll('text.strip-label').remove();
    gStrips.append('text').attr('class', 'strip-label')
        .attr('x', -12).attr('y', N_Y + N_H - 1.5)
        .attr('text-anchor', 'end').attr('font-size', 10).attr('fill', MUTED)
        .text('games');
    gStrips.append('text').attr('class', 'strip-label')
        .attr('x', -12).attr('y', MIX_Y + MIX_H - 2)
        .attr('text-anchor', 'end').attr('font-size', 10).attr('fill', MUTED)
        .text('mix');

    // how many games sit in each bin
    gStrips.selectAll('rect.nbar')
        .data(bins, d => d.bin)
        .join('rect')
        .attr('class', 'nbar')
        .attr('x', d => x(d.bin) - bw / 2)
        .attr('width', bw)
        .attr('y', d => N_Y + N_H - Math.max(3, Math.sqrt(d.n / nMax) * N_H))
        .attr('height', d => Math.max(3, Math.sqrt(d.n / nMax) * N_H))
        .attr('fill', '#d7d7d7');

    gStrips.selectAll('text.nlab')
        .data(bins.filter(d => d.bin === nBins - 1), d => d.bin)
        .join('text')
        .attr('class', 'nlab')
        .attr('x', d => x(d.bin) + bw / 2 + 6)
        .attr('y', N_Y + N_H - 2)
        .attr('font-size', 9.5).attr('fill', MUTED)
        .text(d => `${d.n}`);

    // composition of each bin, in the colours of the current cut
    const keys = view.grouping === 'kind' ? data.act3.kinds : data.act3.bands;
    const share = view.grouping === 'kind' ? 'share_kind' : 'share_band';
    const colour = view.grouping === 'kind' ? KIND_COLOR : BAND_COLOR;

    gStrips.selectAll('g.mixbin').remove();
    const g = gStrips.selectAll('g.mixbin')
        .data(bins, d => d.bin)
        .join('g')
        .attr('class', 'mixbin');

    let acc;
    g.each(function (d) {
        const seg = keys.map(k => ({ k, v: d[share][k] ?? 0 })).filter(s => s.v > 0);
        acc = 0;
        const total = d3.sum(seg, s => s.v) || 1;
        seg.forEach(s => {
            const w = (s.v / total) * bw;
            d3.select(this).append('rect')
                .attr('x', x(d.bin) - bw / 2 + acc)
                .attr('y', MIX_Y)
                .attr('width', Math.max(w, 0.6))
                .attr('height', MIX_H)
                .attr('fill', colour[s.k]);
            acc += w;
        });
    });
}

function drawLegend(series) {
    gLegend.selectAll('*').remove();
    const total = x => x.rows.reduce((a, r) => a + (r.n || 0), 0);

    // One row is enough when the labels are short (one line, or five audiences).
    if (view.grouping !== 'kind') {
        gLegend.attr('transform', 'translate(0,-40)');
        let cursor = 0;
        for (const s of series) {
            const g = gLegend.append('g').attr('transform', `translate(${cursor},0)`);
            g.append('line')
                .attr('x1', 0).attr('x2', 18).attr('y1', 0).attr('y2', 0)
                .attr('stroke', s.color).attr('stroke-width', 3).attr('stroke-linecap', 'round');
            g.append('circle').attr('cx', 9).attr('cy', 0).attr('r', 3.4).attr('fill', s.color);
            const t = g.append('text')
                .attr('x', 25).attr('y', 4)
                .attr('font-size', 11).attr('fill', INK)
                .text(s.label);
            cursor += 25 + t.node().getComputedTextLength() + 26;
        }
        return;
    }

    // Three rows, each naming its members: the grouping is the claim, so it
    // has to be checkable in place. Fixed columns, so the three rows line up
    // and the layout does not depend on text measurement.
    const COL_NAME = 170;
    const COL_N = 520;
    const WRAP = 340;
    gLegend.attr('transform', 'translate(0,-88)');
    let y = 0;
    for (const s of series) {
        const g = gLegend.append('g').attr('transform', `translate(0,${y})`);
        g.append('line')
            .attr('x1', 0).attr('x2', 18).attr('y1', 0).attr('y2', 0)
            .attr('stroke', s.color).attr('stroke-width', 3).attr('stroke-linecap', 'round');
        g.append('circle').attr('cx', 9).attr('cy', 0).attr('r', 3.4).attr('fill', s.color);
        g.append('text')
            .attr('x', 25).attr('y', 4)
            .attr('font-size', 11).attr('font-weight', 600).attr('fill', INK)
            .text(s.label);
        g.append('text')
            .attr('x', COL_N).attr('y', 4)
            .attr('font-size', 10).attr('fill', MUTED)
            .text(`${d3.format(',')(total(s))} games`);

        // Members are wrapped by hand (no text measurement), because the longest
        // list is ten kinds and the row would otherwise run under the counts.
        const words = (KIND_MEMBERS[s.key.replace('kind:', '')] || '').split(' · ');
        const lines = [];
        let cur = '';
        for (const w of words) {
            const next = cur ? `${cur} · ${w}` : w;
            if (next.length * 6.15 > WRAP && cur) { lines.push(cur); cur = w; }
            else cur = next;
        }
        if (cur) lines.push(cur);
        lines.forEach((txt, i) => {
            g.append('text')
                .attr('x', COL_NAME).attr('y', 4 + i * 14)
                .attr('font-size', 10.5).attr('fill', MUTED)
                .text(txt);
        });
        y += Math.max(20, 14 * lines.length + 6);
    }
}

function drawSeries() {
    const series = seriesFor(view.grouping);
    drawLegend(series);

    // the undivided line stays on screen as a reference for the two splits
    const base = view.grouping === 'none' ? null : points(data.act3.series.all, nBins);
    gGhost.selectAll('path')
        .data(base ? [base] : [])
        .join('path')
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', MUTED)
        .attr('stroke-width', 1.8)
        .attr('stroke-dasharray', '6 5')
        .attr('opacity', 0.75);

    const groups = gSeries.selectAll('g.series')
        .data(series, d => d.key)
        .join(
            enter => {
                const g = enter.append('g').attr('class', 'series').attr('opacity', 0);
                g.append('g').attr('class', 'ci');
                g.append('path').attr('class', 'ln').attr('fill', 'none')
                    .attr('stroke-width', 2.8).attr('stroke-linecap', 'round')
                    .attr('stroke-linejoin', 'round');
                g.append('g').attr('class', 'dots');
                return g;
            },
            update => update,
            exit => exit.remove()
        );

    groups.each(function (s) {
        const pts = points(s.rows, nBins);
        const g = d3.select(this);
        // 95% interval as a thin whisker per bin: the thin left-hand bins carry
        // most of the uncertainty, and a fill would hide that behind a wash.
        g.select('g.ci')
            .selectAll('line')
            .data(pts.filter(d => d.m != null && d.hi > d.lo), d => d.i)
            .join('line')
            .attr('x1', d => x(d.i)).attr('x2', d => x(d.i))
            .attr('y1', d => y(d.lo)).attr('y2', d => y(d.hi))
            .attr('stroke', s.color).attr('stroke-width', 1.6)
            .attr('stroke-linecap', 'round').attr('opacity', 0.5);
        g.select('path.ln')
            .attr('d', line(pts))
            .attr('stroke', s.color);
        g.select('g.dots')
            .selectAll('circle')
            .data(pts.filter(d => d.m != null), d => d.i)
            .join('circle')
            .attr('cx', d => x(d.i))
            .attr('cy', d => y(d.m))
            .attr('r', 3.6)
            .attr('fill', s.color)
            .attr('stroke', 'white')
            .attr('stroke-width', 1.2);
    });

    groups.transition().duration(320).attr('opacity', 1);
    drawStrips();
    drawHits();
    updateNote();
}

// --- hover -----------------------------------------------------------------

function drawHits() {
    const step = x.step();
    gHit.selectAll('rect')
        .data(d3.range(nBins))
        .join('rect')
        .attr('x', i => x(i) - step / 2)
        .attr('y', 0)
        .attr('width', step)
        .attr('height', PH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('pointerenter', (ev, i) => {
            view.bin = i;
            gRule.style('display', null);
            gRule.selectAll('*').remove();
            gRule.append('line')
                .attr('x1', x(i)).attr('x2', x(i))
                .attr('y1', 0).attr('y2', PH)
                .attr('stroke', '#9a9a9a').attr('stroke-width', 1).attr('stroke-dasharray', '3 3');
            updateNote();
        })
        .on('pointerleave', () => {
            view.bin = null;
            gRule.style('display', 'none');
            updateNote();
        });
}

function updateNote() {
    const note = document.querySelector('#chart3-note');
    if (!note) return;
    const labels = data.act3.bin_labels;

    if (view.bin == null) {
        note.textContent = 'Median share of positive reviews per playtime bin · '
            + 'hover a column to read every line at once, with its distance from its own crowd.';
        return;
    }

    const i = view.bin;
    const series = seriesFor(view.grouping);
    const vals = [];
    for (const s of series) {
        const p = points(s.rows, nBins)[i];
        if (p.m != null) vals.push({ label: s.label, v: p.m, net: p.net, color: s.color });
    }
    const mix = data.act3.mix.find(m => m.bin === i);
    // The chart keeps raw scores on its axis; the small number is the same point
    // measured against that series' own crowd, which is what Act 2 taught.
    const chips = vals
        .map(v => {
            const net = v.net == null ? ''
                : `<em>${v.net > 0 ? '+' : '−'}${Math.abs(v.net).toFixed(1)}</em>`;
            return `<span class="chip" title="${v.label} · ${v.v.toFixed(1)}% positive, `
                + `${v.net == null ? 'no crowd figure' : (v.net > 0 ? '+' : '') + v.net.toFixed(1) + ' points vs its own crowd'}">`
                + `<i style="background:${v.color}"></i>${v.v.toFixed(1)} ${net}</span>`;
        })
        .join('');

    note.innerHTML = `<b>${labels[i]}</b> · ${mix ? mix.n.toLocaleString() : '?'} games `
        + `<span class="chips">${chips}</span>`
        + '<span class="chip-key">small number = points vs. that line\'s own crowd</span>';
}

// --- wiring ----------------------------------------------------------------

onReady(() => {
    drawSeries();
});

listen('grouping', v => {
    view.grouping = v === 'band' || v === 'kind' ? v : 'none';
    drawSeries();
});
