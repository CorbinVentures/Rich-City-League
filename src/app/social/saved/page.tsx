import { redirect } from 'next/navigation';

export default function SocialSavedPage(){
  redirect('/social?view=saved');
}
