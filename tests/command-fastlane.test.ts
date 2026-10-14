import {describe,expect,it} from 'vitest';
import {actionById,areaSuggestions,commandActions,findCommandActions} from '../src/lib/command/fastlane';

describe('Command Center Fast Lane routing',()=>{
 it('finds user language instead of requiring department names',()=>{
  expect(findCommandActions('sell snacks')[0]?.id).toBe('sale');
  expect(findCommandActions('make trailer')[0]?.id).toBe('storyboard');
  expect(findCommandActions('halftime')[0]?.id).toBe('show');
  expect(findCommandActions('gym rental').some(a=>a.id==='gym-search')).toBe(true);
  expect(findCommandActions('franchise valuation')[0]?.id).toBe('franchise');
 });
 it('maps every shortcut to a known operational destination',()=>{
  const areas=new Set(Object.keys(areaSuggestions));
  const ids=new Set(commandActions.map(a=>a.id));
  expect(ids.size).toBe(commandActions.length);
  for(const action of commandActions){
   expect(areas.has(action.area)).toBe(true);
   if(action.kind)expect(['budgets','ledger','venues','bookings','inventory','concession_sales','trades','tasks']).toContain(action.kind);
  }
  for(const suggestions of Object.values(areaSuggestions))for(const id of suggestions)expect(ids.has(id)).toBe(true);
 });
 it('keeps revenue, game operations and legacy entries separate',()=>{
  expect(actionById('game-revenue')?.kind).toBeUndefined();
  expect(actionById('storyboard')?.kind).toBeUndefined();
  expect(actionById('sale')?.kind).toBe('concession_sales');
  expect(actionById('income')?.defaults?.direction).toBe('income');
  expect(actionById('expense')?.defaults?.direction).toBe('expense');
 });
 it('handles empty and impossible searches',()=>{
  expect(findCommandActions('')).toHaveLength(commandActions.length);
  expect(findCommandActions('nonexistentcommandzzz')).toEqual([]);
  expect(findCommandActions('   halftime   ').some(a=>a.id==='show')).toBe(true);
 });
});
