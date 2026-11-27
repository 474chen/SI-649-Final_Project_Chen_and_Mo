// ============================================================================
// SCROLLY.JS — turns scrolling into a sequence of steps
// ============================================================================
// One job: decide which step of Act 1 is "current" and tell the other charts.
//
//   listen('step', ({ act, index }) => { ... })
//
// The observer's rootMargin shrinks the viewport to a thin band across the
// middle of the screen, so a step becomes active only when it reaches the
// middle — not when it first appears at the bottom.
// ============================================================================

import { announce } from './data.js';

const steps = Array.from(document.querySelectorAll('.step'));
const sections = Array.from(document.querySelectorAll('section[data-act]'));

if (steps.length) {
    const byIndex = new Map(steps.map(el => [Number(el.dataset.step), el]));
    const visible = new Set();

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            const index = Number(entry.target.dataset.step);
            if (entry.isIntersecting) visible.add(index);
            else visible.delete(index);

            if (!visible.size) return;

            // the topmost step inside the band wins
            const current = Math.min(...visible);
            steps.forEach(el => el.classList.toggle('is-active',
                Number(el.dataset.step) === current));
            announce('step', { act: 1, index: current });
        });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });

    byIndex.forEach(el => observer.observe(el));
}

// --- other acts: announce when a section takes over the screen ------------

if (sections.length) {
    const actObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const act = Number(entry.target.dataset.act);
            if (act && act !== 1) announce('act', act);
        });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

    sections.forEach(el => actObserver.observe(el));
}
