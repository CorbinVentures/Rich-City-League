import { describe, expect, it } from 'vitest';
import { MOTION_SPECS } from '../../scripts/lib/basketball-motion-specs.mjs';

const setShot = MOTION_SPECS['set-shot'].frame as (p: number) => {
  hands: { l: { target: number[] }; r: { target: number[] } };
  armPole: { l: number[]; r: number[] };
};

describe('RCL set-shot arm mechanics', () => {
  it('keeps shooting and guide hands clearly separated through the pocket and rise', () => {
    for (const p of [0.28, 0.4, 0.52, 0.62]) {
      const frame = setShot(p);
      const left = frame.hands.l.target;
      const right = frame.hands.r.target;
      expect(right[0] - left[0]).toBeGreaterThan(0.27);
      expect(right[0]).toBeGreaterThan(left[0]);
    }
  });

  it('keeps the shooting hand underneath the guide hand during the loading pocket', () => {
    for (const p of [0.22, 0.3, 0.38]) {
      const frame = setShot(p);
      expect(frame.hands.r.target[1]).toBeLessThan(frame.hands.l.target[1]);
    }
  });

  it('stacks the shooting side vertically before the ball release window', () => {
    const setPoint = setShot(0.56);
    const release = setShot(0.64);
    expect(setPoint.hands.r.target[1] - setPoint.hands.l.target[1]).toBeGreaterThan(0.15);
    expect(release.hands.r.target[1] - release.hands.l.target[1]).toBeGreaterThan(0.35);
  });

  it('peels the guide hand strongly away instead of crossing the shooting arm', () => {
    const setPoint = setShot(0.5);
    const release = setShot(0.64);
    expect(release.hands.l.target[0]).toBeLessThan(setPoint.hands.l.target[0] - 0.12);
    expect(release.hands.l.target[1]).toBeLessThan(setPoint.hands.l.target[1]);
    expect(release.hands.r.target[0]).toBeGreaterThan(release.hands.l.target[0]);
  });

  it('uses a compact downward shooting elbow pole and a wider guide elbow pole', () => {
    const frame = setShot(0.5);
    expect(Math.abs(frame.armPole.l[0])).toBeGreaterThanOrEqual(0.5);
    expect(Math.abs(frame.armPole.r[0])).toBeLessThanOrEqual(0.22);
    expect(frame.armPole.r[1]).toBeLessThanOrEqual(-0.3);
  });
});
