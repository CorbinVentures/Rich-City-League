import {createHmac} from 'node:crypto';
import {isIP} from 'node:net';

/** Rate limit keys are unguessable HMACs, never raw user IPs or emails.
 * In production, only trust Vercel's overwritten proxy address header.
 */
export function registrationVisitorFingerprint(
  headers:Pick<Headers,'get'>,
  context:{onVercel:boolean;secret:string|undefined},
):string|null{
  if(!context.secret||context.secret.length<32)return null;
  const ip=context.onVercel
    ?headers.get('x-vercel-forwarded-for')
    :process.env.NODE_ENV==='production'?null:headers.get('x-forwarded-for');
  if(!ip||isIP(ip.trim())===0)return null;
  return createHmac('sha256',context.secret).update(ip.trim()).digest('hex');
}
