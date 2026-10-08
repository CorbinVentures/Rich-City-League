import { describe, expect, it } from 'vitest';
import { audiusStreamUrl, normalizeAudiusTrack, profileTrackId } from './profile-music';

describe('profile music', () => {
  it('accepts saved Audius identifiers and rejects legacy or unsafe URLs', () => {
    expect(profileTrackId('audius:Abc_123-X')).toBe('Abc_123-X');
    expect(profileTrackId('https://www.youtube.com/watch?v=test')).toBeNull();
    expect(profileTrackId('audius:../unsafe')).toBeNull();
    expect(profileTrackId('audius:')).toBeNull();
  });

  it('produces an Audius streaming endpoint', () => {
    expect(audiusStreamUrl('Abc12')).toBe('https://api.audius.co/v1/tracks/Abc12/stream?app_name=RichCityHoops');
  });

  it('normalizes an accessible track for the editor and player', () => {
    expect(normalizeAudiusTrack({
      id: 'Tr4ck',
      title: 'My Song',
      user: { name: 'The Artist' },
      permalink: 'https://audius.co/the-artist/my-song',
      artwork: { '150x150': 'https://cdn.audius.co/cover.jpg' },
      duration: 205,
      is_streamable: true,
    })).toEqual({
      id: 'Tr4ck',
      title: 'My Song',
      artist: 'The Artist',
      permalink: 'https://audius.co/the-artist/my-song',
      artworkUrl: 'https://cdn.audius.co/cover.jpg',
      duration: 205,
    });
  });

  it('excludes unavailable and gated music', () => {
    expect(normalizeAudiusTrack({ id: 'One1', title: 'Locked', is_stream_gated: true })).toBeNull();
    expect(normalizeAudiusTrack({ id: 'One1', title: 'Disabled', is_streamable: false })).toBeNull();
    expect(normalizeAudiusTrack({ id: 'One1', title: 'Paid', access: { stream: false } })).toBeNull();
  });
});
