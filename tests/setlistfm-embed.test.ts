import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@jest/globals';
import {
  detectAndParseSetlist,
  parseSetlistCsv,
  parseSetlistJson,
  setlistFmResponseToParsed,
} from '../src/features/setlist/parse';
import { parseSetlistFmEmbed } from '../src/features/setlist/parse/setlistfmEmbed';

const realEmbed = readFileSync(
  join(process.cwd(), 'fixtures/setlists/embed-my-chemical-romance.html'),
  'utf8',
);
const pageUrl =
  'https://www.setlist.fm/setlist/my-chemical-romance/2026/hollywood-bowl-los-angeles-ca-3b4f5c50.html';

describe('setlist.fm embed parser', () => {
  it('parses the saved real embed and its visible event hint', () => {
    expect(parseSetlistFmEmbed(realEmbed)).toEqual({
      setlistId: '3b4f5c50',
      sourceUrl: pageUrl,
      eventHint: {
        artist: 'My Chemical Romance',
        venue: 'Hollywood Bowl',
        city: 'Los Angeles',
        region: 'CA',
        country: 'USA',
        year: 2026,
      },
      warnings: [],
    });
  });

  it('accepts a bare page URL and a URL surrounded by text', () => {
    expect(parseSetlistFmEmbed(pageUrl)?.setlistId).toBe('3b4f5c50');
    expect(
      parseSetlistFmEmbed(`Found this: ${pageUrl} thanks!`)?.sourceUrl,
    ).toBe(pageUrl);
  });

  it('accepts a widget image or edit URL without mistaking artist pages for setlists', () => {
    expect(
      parseSetlistFmEmbed(
        'https://www.setlist.fm/widgets/setlist-image-v1?id=3b4f5c50',
      )?.setlistId,
    ).toBe('3b4f5c50');
    expect(
      parseSetlistFmEmbed(
        'https://www.setlist.fm/edit?setlist=3b4f5c50&step=song',
      )?.setlistId,
    ).toBe('3b4f5c50');
    expect(
      parseSetlistFmEmbed(
        'https://www.setlist.fm/setlists/my-chemical-romance-3bd6bcd4.html',
      ),
    ).toBeNull();
    expect(() =>
      detectAndParseSetlist(
        'https://www.setlist.fm/setlists/my-chemical-romance-3bd6bcd4.html',
      ),
    ).toThrow(/not a setlist page/i);
  });

  it('extracts the ID from setlist.fm BBCode edit links', () => {
    const parsed = parseSetlistFmEmbed(
      '[url=https://www.setlist.fm/edit?setlist=534e2bb9&amp;step=song]Edit this setlist[/url] | [url=https://www.setlist.fm/setlists/gorillaz-13d681d1.html]More Gorillaz setlists[/url]',
    );
    expect(parsed).toMatchObject({
      setlistId: '534e2bb9',
      sourceUrl: 'https://www.setlist.fm/edit?setlist=534e2bb9&step=song',
    });
  });

  it('prefers the page ID and warns when embedded IDs disagree', () => {
    const parsed = parseSetlistFmEmbed(
      `<a href="${pageUrl}">page</a><img src="https://www.setlist.fm/widgets/setlist-image-v1?id=aaaaaaaa"><a href="https://www.setlist.fm/edit?setlist=bbbbbbbb">edit</a>`,
    );
    expect(parsed?.setlistId).toBe('3b4f5c50');
    expect(parsed?.warnings).toHaveLength(1);
  });

  it.each([
    'http://www.setlist.fm/setlist/artist/2026/place-3b4f5c50.html',
    'https://www.setlist.fm.evil.com/setlist/artist/2026/place-3b4f5c50.html',
  ])('rejects unsafe URL %s', (url) => {
    expect(() => parseSetlistFmEmbed(url)).toThrow(/secure link/i);
  });

  it('ignores script text and event-handler attributes without executing them', () => {
    const parsed = parseSetlistFmEmbed(
      `<script>location.href="${pageUrl}"</script><img onerror="alert(1)" src="https://www.setlist.fm/widgets/setlist-image-v1?id=3b4f5c50">`,
    );
    expect(parsed?.setlistId).toBe('3b4f5c50');
    expect(parsed?.eventHint.artist).toBeNull();
    expect(
      parseSetlistFmEmbed(
        `<img onerror="fetch('https://www.setlist.fm/widgets/setlist-image-v1?id=3b4f5c50')">`,
      ),
    ).toBeNull();
    expect(() =>
      detectAndParseSetlist(
        `<script>location.href="${pageUrl}"</script><img onerror="alert(1)">`,
      ),
    ).toThrow(/not a setlist\.fm setlist/i);
  });

  it('leaves empty and unrelated text for the regular format detector', () => {
    expect(parseSetlistFmEmbed('')).toBeNull();
    expect(parseSetlistFmEmbed('Song one\nSong two')).toBeNull();
    expect(detectAndParseSetlist('Song one\nSong two')).toMatchObject({
      format: 'text',
      setlist: { songs: [{ title: 'Song one' }, { title: 'Song two' }] },
    });
  });

  it('keeps JSON and CSV imports on the ordinary parsers', () => {
    expect(
      parseSetlistJson({ songs: ['Song A', { title: 'Song B' }] }).songs,
    ).toHaveLength(2);
    expect(
      parseSetlistCsv('song,set\nSong A,Set 1\nSong B,Encore').songs,
    ).toEqual([
      { title: 'Song A', setName: 'Set 1', encore: false },
      { title: 'Song B', setName: 'Encore', encore: true },
    ]);
  });

  it('converts the official API date and song sets into the editable preview model', () => {
    const parsedEmbed = parseSetlistFmEmbed(pageUrl);
    if (!parsedEmbed)
      throw new Error('Expected the canonical page URL to parse.');
    const parsed = setlistFmResponseToParsed(
      {
        id: '3b4f5c50',
        url: pageUrl,
        eventDate: '14-06-2026',
        artist: { name: 'My Chemical Romance' },
        venue: { name: 'Hollywood Bowl', city: { name: 'Los Angeles' } },
        sets: {
          set: [
            {
              name: 'Set 1',
              song: [{ name: 'Song A' }],
            },
            {
              name: 'Encore',
              encore: 1,
              song: [{ name: 'Song B' }],
            },
          ],
        },
      },
      parsedEmbed,
    );
    expect(parsed).toMatchObject({
      source: 'setlistfm',
      sourceUrl: pageUrl,
      eventDate: '2026-06-14',
      eventYear: 2026,
      songs: [
        { title: 'Song A', setName: 'Set 1', encore: false },
        { title: 'Song B', setName: 'Encore', encore: true },
      ],
    });
  });

  it('accepts a single set object in the official sets.set response', () => {
    const parsedEmbed = parseSetlistFmEmbed(pageUrl);
    if (!parsedEmbed)
      throw new Error('Expected the canonical page URL to parse.');

    expect(
      setlistFmResponseToParsed(
        {
          id: '3b4f5c50',
          sets: {
            set: {
              name: 'Main Set',
              song: [{ name: 'Song A' }],
            },
          },
        },
        parsedEmbed,
      ).songs,
    ).toEqual([{ title: 'Song A', setName: 'Main Set', encore: false }]);
  });
});
