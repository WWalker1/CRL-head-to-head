import { rememberPlayerTag, recentTagsSnapshot, parseRecentTags, clearRecentTags } from '../recent-player-tags';
beforeEach(() => localStorage.clear());
it('stores five unique normalized tags, with the latest first and a clear action', () => {
  for (const tag of ['P00', 'P02', 'P08', 'P09', 'P0Y', 'P0Q', 'p0y']) rememberPlayerTag(tag);
  expect(parseRecentTags(recentTagsSnapshot())).toEqual(['#P0Y', '#P0Q', '#P09', '#P08', '#P02']);
  clearRecentTags(); expect(parseRecentTags(recentTagsSnapshot())).toEqual([]);
});
it('handles malformed storage without showing untrusted content', () => {
  expect(parseRecentTags('{broken')).toEqual([]);
  expect(parseRecentTags('["<script>",5,null,"p0y"]')).toEqual(['#P0Y']);
});
