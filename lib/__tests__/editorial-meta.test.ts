import sample from '@/content/editorial/preview/2026-11-22.json';
import { isMetaReport, monthKey, monthSlug } from '../editorial-meta';
jest.mock('../editorial-store',()=>({readReport:jest.fn()}));
test('the live preview snapshot satisfies the reader contract',()=>expect(isMetaReport(sample)).toBe(true));
test.each([undefined, '50', NaN, -1, 101])('rejects corrupt usage %p',usageRate=>{
  expect(isMetaReport({...sample,decks:[{...sample.decks[0],usageRate}]})).toBe(false);
});
test('canonical month slugs round trip',()=>{
  expect(monthKey(monthSlug('2026-11'))).toBe('2026-11');
  expect(monthKey('november-2026-extra')).toBeNull();
});
