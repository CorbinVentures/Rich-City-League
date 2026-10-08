import { redirect } from 'next/navigation';

export default async function ReferralJoinPage({params}:{params:Promise<{code:string}>}){
  const {code}=await params;
  const normalized=decodeURIComponent(code||'').trim().toLowerCase();
  redirect('/auth/sign-up?invite='+encodeURIComponent(normalized));
}
