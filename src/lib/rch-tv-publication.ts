import {rchMediaKind} from './rch-tv-media';
/** Minimum editorial metadata required before a video can be listed publicly.
 * This is NOT a full proof of distribution rights, transcoding or playback.
 */
export type RchTvPublishCandidate = {
 title:string;media_type:string;storage_path:string|null;
 thumbnail_path:string|null;rch_tv_category:string|null;
};
export function rchTvPublicationBlockers(item:RchTvPublishCandidate):string[]{
 const problems:string[]=[];
 if(!item.title?.trim())problems.push('Add a video title.');
 if(!item.storage_path?.trim())problems.push('A saved media file or valid embed is required.');
 if(rchMediaKind(item.media_type)==='video'){
  if(!item.thumbnail_path?.trim())problems.push('Generate or upload a thumbnail before publishing.');
  if(!item.rch_tv_category || item.rch_tv_category==='general')
    problems.push('Assign a visible RCH TV section before publishing.');
 }
 return problems;
}
