import { describe, expect, it } from 'vitest';
import { MOTION_SPECS } from '../../scripts/lib/basketball-motion-specs.mjs';

type SetShotFrame = {
  ball: number[];
  hands: { l: { target: number[] }; r: { target: number[] } };
  armPole: { l: number[]; r: number[] };
};

const setShot = MOTION_SPECS['set-shot'].frame as unknown as (p: number) => SetShotFrame;

describe('RCL set-shot basketball mechanics', () => {
  it('authors the basketball first and keeps the shooting wrist directly under/behind it', () => {
    for (const p of [0.18, 0.3, 0.46, 0.58]) {
      const frame = setShot(p);
      const ball = frame.ball;
      const shooting = frame.hands.r.target;
      expect(Math.abs(shooting[0] - ball[0])).toBeLessThan(0.025);
      expect(ball[1] - shooting[1]).toBeGreaterThan(0.11);
      expect(ball[1] - shooting[1]).toBeLessThan(0.16);
      expect(ball[2] - shooting[2]).toBeGreaterThan(0.04);
      expect(ball[2] - shooting[2]).toBeLessThan(0.08);
    }
  });

  it('keeps the guide wrist on the side of the ball instead of underneath it', () => {
    for (const p of [0.18, 0.3, 0.46, 0.58]) {
      const frame = setShot(p);
      const ball = frame.ball;
      const guide = frame.hands.l.target;
      expect(ball[0] - guide[0]).toBeGreaterThan(0.14);
      expect(Math.abs(ball[1] - guide[1])).toBeLessThan(0.035);
      expect(Math.abs(ball[2] - guide[2])).toBeLessThan(0.03);
    }
  });

  it('keeps right-handed shooting and guide roles from swapping', () => {
    for (const p of [0.2, 0.4, 0.56, 0.64]) {
      const frame = setShot(p);
      expect(frame.hands.r.target[0]).toBeGreaterThan(frame.hands.l.target[0]);
      expect(frame.hands.r.target[1]).toBeLessThan(frame.ball[1]);
      expect(frame.hands.l.target[0]).toBeLessThan(frame.ball[0]);
    }
  });

  it('keeps the guide hand with the ball through set point, then peels it laterally during release', () => {
    const setPoint = setShot(0.52);
    const earlyRise = setShot(0.58);
    const release = setShot(0.74);
    expect(Math.abs((earlyRise.ball[0] - earlyRise.hands.l.target[0]) - (setPoint.ball[0] - setPoint.hands.l.target[0]))).toBeLessThan(0.025);
    expect(release.hands.l.target[0]).toBeLessThan(setPoint.hands.l.target[0] - 0.07);
    expect(release.hands.l.target[1]).toBeLessThan(setPoint.hands.l.target[1]);
    expect(release.hands.r.target[0]).toBeGreaterThan(release.hands.l.target[0]);
  });

  it('uses a compact downward shooting elbow pole and a wider guide elbow pole', () => {
    const frame = setShot(0.5);
    expect(Math.abs(frame.armPole.l[0])).toBeGreaterThanOrEqual(0.5);
    expect(Math.abs(frame.armPole.r[0])).toBeLessThanOrEqual(0.18);
    expect(frame.armPole.r[1]).toBeLessThanOrEqual(-0.32);
  });
});