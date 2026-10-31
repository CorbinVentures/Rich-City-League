import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {rchTvPublicationBlockers} from '../src/lib/rch-tv-publication';

const candidate={title:'Virginia Hoops',media_type:'video',storage_path:'rch-tv-videos:some-file',thumbnail_path:'member/poster.jpg',rch_tv_category:'live_games'};
describe('RCH TV editorial publish readiness',()=>{
 it('does not allow missing video thumbnails',()=>{
  expect(rchTvPublicationBlockers({...candidate,thumbnail_path:null})).toContain('Generate or upload a thumbnail before publishing.');
 });
 it('does not publish uncategorized video to a hidden section',()=>{
  expect(rchTvPublicationBlockers({...candidate,rch_tv_category:'general'})).toContain('Assign a visible RCH TV section before publishing.');
 });
 it('requires a title and saved media reference',()=>{
  expect(rchTvPublicationBlockers({...candidate,title:' ',storage_path:null})).toHaveLength(2);
 });
 it('permits a properly described item to proceed to rights and playback review',()=>{
  expect(rchTvPublicationBlockers(candidate)).toEqual([]);
 });
 it('prevents admin publish actions from silently ignoring metadata problems',()=>{
  const source=readFileSync('src/app/admin/rch-tv/page.tsx','utf8');
  expect(source).toContain("rchTvPublicationBlockers(item)");
  expect(source).toContain("Cannot publish:");
  expect(source).toContain("Videos requiring publication QA");
 });
});
