import type {Metadata} from 'next';
import {RchSitesDemoClient} from '@/components/sites/RchSitesDemoClient';

export const metadata:Metadata={
  title:'Demo Basketball Academy | RCH Sites interactive example',
  description:'Explore a fictional adult basketball organization website and sample management tools. No actual organization, subscription, registrations, or billing.',
  robots:{index:false,follow:false,nocache:true},
};
export default function WebsiteCreatorDemoPage(){
  return <RchSitesDemoClient/>;
}
