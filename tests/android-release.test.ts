import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const twa = JSON.parse(read('android/twa-manifest.json')) as {
  packageId: string;
  host: string;
  signingKey: { path: string; alias: string };
  webManifestUrl: string;
  fullScopeUrl: string;
  startUrl: string;
  minSdkVersion: number;
  fingerprints: Array<{ value: string }>;
};
const links = JSON.parse(read('public/.well-known/assetlinks.json')) as Array<{
  relation: string[];
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] };
}>;
const workflow = read('.github/workflows/android-apk.yml');

describe('free Android release pipeline', () => {
  it('associates richcityhoops.com with the same signing fingerprint used for Android', () => {
    expect(twa.packageId).toBe('com.richcityhoops.app');
    expect(twa.host).toBe('www.richcityhoops.com');
    expect(twa.webManifestUrl).toBe('https://www.richcityhoops.com/manifest.webmanifest');
    expect(twa.fullScopeUrl).toBe('https://www.richcityhoops.com/');
    expect(twa.startUrl).toContain('/social');
    expect(twa.minSdkVersion).toBeGreaterThanOrEqual(24);
    expect(twa.signingKey.alias).toBe('rch_release');
    expect(links[0].target.package_name).toBe(twa.packageId);
    expect(twa.fingerprints).toHaveLength(1);
    expect(twa.fingerprints[0].value).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    expect(links[0].relation).toContain('delegate_permission/common.handle_all_urls');
    expect(links[0].target.sha256_cert_fingerprints).toEqual(twa.fingerprints.map(f => f.value));
  });

  it('requires externally stored release secrets and does not publish unsigned APKs', () => {
    expect(workflow).toContain('RCH_ANDROID_KEYSTORE_BASE64');
    expect(workflow).toContain('RCH_ANDROID_KEYSTORE_PASSWORD');
    expect(workflow).toContain("github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'");
    expect(workflow).toContain("github.event_name == 'pull_request'");
    expect(workflow).toContain('bubblewrap build --skipSigning');
    expect(workflow).toContain('RCH-Android.apk.sha256');
  });
});
