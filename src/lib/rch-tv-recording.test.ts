import { describe, expect, it } from 'vitest';
import { recordingConfig } from './rch-tv-recording';

describe('RCH TV Egress feature gating', () => {
  const configured = {
    RCH_TV_RECORDING_ENABLED: 'true',
    LIVEKIT_URL: 'wss://test.livekit.cloud',
    LIVEKIT_API_KEY: 'test-key',
    LIVEKIT_API_SECRET: 'test-secret',
    RCH_TV_RECORDING_S3_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
    RCH_TV_RECORDING_S3_REGION: 'auto',
    RCH_TV_RECORDING_S3_BUCKET: 'private-rch-recordings',
    RCH_TV_RECORDING_S3_ACCESS_KEY: 'access',
    RCH_TV_RECORDING_S3_SECRET_KEY: 'secret',
  };
  it('defaults disabled and never activates for mistyped flags', () => {
    expect(recordingConfig({}).state).toBe('disabled');
    expect(recordingConfig({...configured,RCH_TV_RECORDING_ENABLED:'yes'}).state).toBe('disabled');
  });
  it('requires all recording credentials and secure endpoints', () => {
    expect(recordingConfig(configured).state).toBe('available');
    expect(recordingConfig({...configured,RCH_TV_RECORDING_S3_SECRET_KEY:''}).state).toBe('misconfigured');
    expect(recordingConfig({...configured,RCH_TV_RECORDING_S3_ENDPOINT:'http://localhost:54321'}).state).toBe('misconfigured');
    expect(recordingConfig({...configured,LIVEKIT_URL:'http://livestream.example'}).state).toBe('misconfigured');
    expect(recordingConfig({...configured,LIVEKIT_URL:'wss://user:password@test.livekit.cloud'}).state).toBe('misconfigured');
  });
});
