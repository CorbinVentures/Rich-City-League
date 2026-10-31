import {describe,it,expect} from 'vitest';
import {registrationVisitorFingerprint} from '../src/lib/rch-sites-registration-security';
const secret='test-only-not-a-real-key-0123456789abcdef0123456789';
describe('RCH Sites public registration abuse protection',()=>{
  it('hashes a trusted Vercel-proxy IP without returning the address',()=>{
    const headers=new Headers({'x-vercel-forwarded-for':'203.0.113.18','x-forwarded-for':'192.0.2.33'});
    const fingerprint=registrationVisitorFingerprint(headers,{onVercel:true,secret});
    expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(fingerprint).not.toContain('203.0.113.18');
    expect(fingerprint).toBe(registrationVisitorFingerprint(headers,{onVercel:true,secret}));
  });
  it('rejects missing secrets, spoof-only headers and invalid visitor addresses',()=>{
    expect(registrationVisitorFingerprint(new Headers({'x-forwarded-for':'203.0.113.1'}),
      {onVercel:true,secret})).toBeNull();
    expect(registrationVisitorFingerprint(new Headers({'x-vercel-forwarded-for':'203.0.113.1,198.51.100.2'}),
      {onVercel:true,secret})).toBeNull();
    expect(registrationVisitorFingerprint(new Headers({'x-vercel-forwarded-for':'203.0.113.1'}),
      {onVercel:true,secret:'too-short'})).toBeNull();
    expect(registrationVisitorFingerprint(new Headers({'x-vercel-forwarded-for':'not-an-ip'}),
      {onVercel:true,secret})).toBeNull();
  });
  it('distinguishes visitors, rotates with secret and supports IPv6',()=>{
    const ip='2001:db8::1';
    const headers=new Headers({'x-vercel-forwarded-for':ip});
    const a=registrationVisitorFingerprint(headers,{onVercel:true,secret});
    const b=registrationVisitorFingerprint(headers,{onVercel:true,secret:secret+'new'});
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(a).not.toBe(b);
  });
});
