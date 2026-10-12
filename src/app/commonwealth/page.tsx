import type { Metadata } from 'next';
import CommonwealthExperience from '@/components/commonwealth/CommonwealthExperience';

export const metadata:Metadata={
  title:'The Commonwealth | Virginia Basketball Competition | RCH',
  description:'Form a local crew, organize verified court challenges and build a real Virginia basketball legacy with Rich City Hoops.',
  alternates:{canonical:'/commonwealth'}
};

export default function CommonwealthPage(){return <CommonwealthExperience/>;}
