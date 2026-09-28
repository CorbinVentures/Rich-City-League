import { describe, expect, it } from 'vitest';
import { MOTION_SPECS } from '../../scripts/lib/basketball-motion-specs.mjs';

type SetShotFrame = {
  ball: number[];
  hands: { l: { target: number[] }; r: { target: number[] } };
  armPole: { l: number[]; r: number[] };
};

const setShot = MOTION_SPECS['set-shot'].frame as unknown as (p: number) => SetShotFrame;

describe('RCL set-shot basketball mechanics', () => {
  it('keeps the ball on a visible right-handed shooting line instead of the facial midline', () => {
    for (const p of [0.18, 0.3, 0.46, 0.58]) {
      const frame = setShot(p);
      expect(frame.ball[0]).toBeGreaterThan(0.095);
      expect(frame.hands.r.target[0]).toBeGreaterThan(frame.hands.l.target[0]);
    }
  });

  it('keeps the shooting wrist directly under and slightly behind the ball', () => {
    for (const p of [0.18, 0.3, 0.46, 0.58]) {
      const frame = setShot(p);
      const ball = frame.ball;
      const shooting = frame.hands.r.target;
      expect(Math.abs(shooting[0] - ball[0])).toBeLessThan(0.02);
      expect(ball[1] - shooting[1]).toBeGreaterThan(0.115);
      expect(ball[1] - shooting[1]).toBeLessThan(0.145);
      expect(ball[2] - shooting[2]).toBeGreaterThan(0.035);
      expect(ball[2] - shooting[2]).toBeLessThan(0.065);
    }
  });

  it('places the guide wrist on the lower-side quadrant instead of at or above ball center', () => {
    for (const p of [0.18, 0.3, 0.46, 0.58]) {
      const frame = setShot(p);
      const ball = frame.ball;
      const guide = frame.hands.l.target;
      expect(ball[0] - guide[0]).toBeGreaterThan(0.13);
      expect(ball[0] - guide[0]).toBeLessThan(0.16);
      expect(ball[1] - guide[1]).toBeGreaterThan(0.04);
      expect(ball[1] - guide[1]).toBeLessThan(0.07);
      expect(Math.abs(ball[2] - guide[2])).toBeLessThan(0.015);
    }
  });

  it('keeps the guide hand attached through set point and peels only after extension begins', () => {
    const setPoint = setShot(0.56);
    const earlyRise = setShot(0.62);
    const release = setShot(0.78);
    expect(Math.abs((earlyRise.ball[0] - earlyRise.hands.l.target[0]) - (setPoint.ball[0] - setPoint.hands.l.target[0]))).toBeLessThan(0.025);
    expect(release.hands.l.target[0]).toBeLessThan(setPoint.hands.l.target[0] - 0.07);
    expect(release.hands.l.target[1]).toBeLessThan(setPoint.hands.l.target[1]);
    expect(release.hands.r.target[0]).toBeGreaterThan(release.hands.l.target[0]);
  });

  it('keeps the shooting elbow pole nearly vertical and the guide elbow modestly wider', () => {
    const frame = setShot(0.56);
    expect(Math.abs(frame.armPole.l[0])).toBeGreaterThanOrEqual(0.35);
    expect(Math.abs(frame.armPole.r[0])).toBeLessThanOrEqual(0.06);
    expect(frame.armPole.r[1]).toBeLessThanOrEqual(-0.4);
  });

  it('finishes up the same shooting line rather than wrapping across the head', () => {
    const setPoint = setShot(0.56);
    const follow = setShot(0.84);
    expect(Math.abs(follow.hands.r.target[0] - setPoint.ball[0])).toBeLessThan(0.03);
    expect(follow.hands.r.target[1]).toBeGreaterThan(setPoint.ball[1] + 0.12);
    expect(follow.hands.r.target[2]).toBeGreaterThan(setPoint.ball[2]);
  });
});