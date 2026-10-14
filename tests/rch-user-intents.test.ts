import {describe,expect,it} from 'vitest';
import {getRCHIntent,isRCHIntent,RCH_INTENTS,RCH_INTENT_IDS,searchRCHActions} from '../src/lib/rch-user-intents';

describe('RCH user-first navigation',()=>{
 it('offers distinct goals instead of a long unordered menu',()=>{
  expect(RCH_INTENT_IDS).toEqual(['play','watch','connect','create','grow']);
  expect(new Set(RCH_INTENT_IDS).size).toBe(RCH_INTENT_IDS.length);
  expect(RCH_INTENTS.every(i=>i.actions.length===3)).toBe(true);
 });
 it('keeps navigation links local, usable and unique',()=>{
  const actions=RCH_INTENTS.flatMap(i=>i.actions);
  expect(new Set(actions.map(a=>a.id)).size).toBe(actions.length);
  expect(actions.every(a=>a.href.startsWith('/')&&!a.href.startsWith('//'))).toBe(true);
  expect(actions.every(a=>a.title.length&&a.detail.length&&a.keywords.length)).toBe(true);
 });
 it('matches natural basketball language to real destinations',()=>{
  expect(searchRCHActions('join a run').some(a=>a.href==='/runs')).toBe(true);
  expect(searchRCHActions('watch games').some(a=>a.href==='/games')).toBe(true);
  expect(searchRCHActions('post a clip').some(a=>a.href==='/create/social?mode=clip')).toBe(true);
  expect(searchRCHActions('creator filmmaker').some(a=>a.href==='/media/creators')).toBe(true);
  expect(searchRCHActions('organization promote').some(a=>a.href==='/network/partners')).toBe(true);
  expect(searchRCHActions('veryunlikelysearchxxxx')).toEqual([]);
 });
 it('never treats an unknown preference as a valid account role',()=>{
  expect(isRCHIntent('watch')).toBe(true);
  expect(isRCHIntent('admin')).toBe(false);
  expect(getRCHIntent('play').actions[0].href).toBe('/runs');
 });
});
