import {describe,it,expect} from 'vitest';
import {filterVercelPageview} from './vercel-filter';

const origin='https://richcityhoops.com';
const page=(url:string)=>({type:'pageview',url});

describe('Vercel Analytics privacy filter',()=>{
  it('removes query params, fragments and campaign tokens before sending',()=>{
    expect(filterVercelPageview(page(origin+'/runs?member=secret#private'),origin,'/runs',true,false))
      .toEqual(page(origin+'/runs'));
  });
  it('declines third-party analytics without opt-in or with DNT/GPC',()=>{
    expect(filterVercelPageview(page(origin+'/'),origin,'/',false,false)).toBeNull();
    expect(filterVercelPageview(page(origin+'/'),origin,'/',true,true)).toBeNull();
  });
  it('drops account and detail URLs, including when an old script remains mounted',()=>{
    for(const pathname of ['/messages','/admin','/command','/auth/sign-in','/profile','/settings/privacy','/players/example','/runs/new','/fantasy']){
      expect(filterVercelPageview(page(origin+pathname),origin,pathname,true,false)).toBeNull();
      expect(filterVercelPageview(page(origin+'/runs'),origin,pathname,true,false)).toBeNull();
    }
  });
  it('rejects cross-origin and custom tracking events',()=>{
    expect(filterVercelPageview(page('https://unknown.example/runs'),origin,'/runs',true,false)).toBeNull();
    expect(filterVercelPageview({type:'event',url:origin+'/runs'},origin,'/runs',true,false)).toBeNull();
  });
  it('tracks only approved public routes',()=>{
    expect(filterVercelPageview(page(origin+'/news'),origin,'/news',true,false))
      .toEqual(page(origin+'/news'));
  });
});
