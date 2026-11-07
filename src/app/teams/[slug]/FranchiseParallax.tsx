'use client';

import { useEffect } from 'react';

export function FranchiseParallax({ stageId }: { stageId: string }) {
  useEffect(() => {
    const stage = Array.from(document.querySelectorAll<HTMLElement>('[data-franchise-stage]'))
      .find((element) => element.dataset.franchiseStage === stageId);
    if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layers = Array.from(stage.querySelectorAll<HTMLElement>('[data-depth]'));
    let frame = 0;
    const reset = () => {
      if (frame) window.cancelAnimationFrame(frame);
      layers.forEach((layer) => {
        layer.style.setProperty('--parallax-x', '0px');
        layer.style.setProperty('--parallax-y', '0px');
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = stage.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        layers.forEach((layer) => {
          const depth = Number(layer.dataset.depth) || 0.25;
          layer.style.setProperty('--parallax-x', `${(x * depth * 16).toFixed(1)}px`);
          layer.style.setProperty('--parallax-y', `${(y * depth * 12).toFixed(1)}px`);
        });
      });
    };

    stage.addEventListener('pointermove', move, { passive: true });
    stage.addEventListener('pointerleave', reset, { passive: true });
    return () => {
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerleave', reset);
      reset();
    };
  }, [stageId]);

  return null;
}
