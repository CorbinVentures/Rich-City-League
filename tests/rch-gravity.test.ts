import { describe, expect, it } from 'vitest';
import {
  gravityCandidateEligible,
  rankGravityCandidates,
  scoreGravityCandidate,
  type GravityCandidate,
} from '../src/lib/rch-gravity';

const NOW = Date.parse('2026-10-16T16:00:00Z');

function candidate(id: string, overrides: Partial<GravityCandidate> = {}): GravityCandidate {
  return {id, category: 'run', city: 'Richmond', startsAt: '2026-10-17T17:00:00Z', ...overrides};
}

describe('RCH Gravity shared ranking', () => {
  it('prioritizes a real match for an explicit basketball goal', () => {
    const run = candidate('run');
    const unrelated = candidate('other', {category: 'organization'});
    const ranked = rankGravityCandidates([unrelated, run], {goal: 'hoop', intent: 'play', now: NOW, city: 'Richmond'});
    expect(ranked[0].id).toBe('run');
    expect(scoreGravityCandidate(run, {goal: 'hoop', now: NOW}).reasons).toContain('Matches your basketball goals');
  });

  it('does not surface cancelled, hidden, blocked or expired activities', () => {
    const items = [
      candidate('good'),
      candidate('full', {unavailable: true}),
      candidate('hidden'),
      candidate('blocked', {ownerId: 'blocked-owner'}),
      candidate('past', {startsAt: '2026-10-15T12:00:00Z'}),
      candidate('finished', {endsAt: '2026-10-16T11:00:00Z'}),
    ];
    const context = {now: NOW, hiddenIds: ['hidden'], blockedOwnerIds: ['blocked-owner']};
    expect(rankGravityCandidates(items, context).map(x => x.id)).toEqual(['good']);
    expect(gravityCandidateEligible(candidate('full', {unavailable: true}), context)).toBe(false);
  });

  it('prioritizes followed creators and saved opportunities without fake engagement', () => {
    const followed = candidate('followed', {category: 'post', startsAt: null, createdAt: '2026-10-16T15:00:00Z', ownerId: 'friend'});
    const stranger = {...followed, id: 'stranger', ownerId: 'other'};
    expect(scoreGravityCandidate(followed, {now: NOW, followingIds: ['friend']}).score)
      .toBeGreaterThan(scoreGravityCandidate(stranger, {now: NOW, followingIds: ['friend']}).score);
    expect(scoreGravityCandidate(candidate('saved', {isSaved: true}), {now: NOW}).score)
      .toBeGreaterThan(scoreGravityCandidate(candidate('unsaved'), {now: NOW}).score);
  });

  it('diversifies the first six results instead of showing only a single category or creator', () => {
    const items = Array.from({length: 6}, (_, i) => candidate('run-' + i, {ownerId: 'same', popularity: 20}));
    items.push(candidate('training', {category: 'training', ownerId: 'other', popularity: 0}));
    const ranked = rankGravityCandidates(items, {now: NOW});
    expect(ranked.slice(0, 3).some(item => item.category === 'training')).toBe(true);
    expect(ranked).toHaveLength(items.length);
  });

  it('keeps scores deterministic across repeated reads in the same context', () => {
    const item = candidate('stable');
    const context = {now: NOW, userId: 'reader'};
    expect(scoreGravityCandidate(item, context)).toEqual(scoreGravityCandidate(item, context));
    expect(rankGravityCandidates([candidate('one'),candidate('two')], context))
      .toEqual(rankGravityCandidates([candidate('one'),candidate('two')], context));
  });

  it('does not penalize members for having no location, preferences, or engagement history', () => {
    const score = scoreGravityCandidate(candidate('new-user'), {now: NOW});
    expect(score.score).toBeGreaterThan(0);
    expect(score.score).toBeLessThanOrEqual(1);
  });
});
