import { redirect } from 'next/navigation';

export default function SocialStoriesPage(){
  redirect('/social?view=stories');
}
