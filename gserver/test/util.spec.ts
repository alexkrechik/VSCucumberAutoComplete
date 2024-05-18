import { getSortPrefix } from '../src/util';

describe('getSortPrefix', () => {
  const data = [
    { num: 0, res: 'ZZZZZ' },
    { num: 1, res: 'ZZZZY' },
    { num: 25, res: 'ZZZZA' },
    { num: 26, res: 'ZZZYZ' },
    { num: 676, res: 'ZZYZZ' },
    { num: 727, res: 'ZZYYA' },
  ];
  data.forEach((d) => {
    it(`should get "${d.res}" prefix from "${d.num}" string`, () => {
      expect(getSortPrefix(d.num, 5)).toStrictEqual(d.res);
    });
  });
});
