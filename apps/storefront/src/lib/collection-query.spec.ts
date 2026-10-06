import { DEFAULT_SORT, parseCollectionQuery } from './collection-query';

describe('parseCollectionQuery', () => {
  it('reads a clean query', () => {
    expect(parseCollectionQuery({ category: 'bridal', sort: 'price_asc', page: '2' })).toEqual({
      category: 'bridal',
      sort: 'price_asc',
      page: 2,
    });
  });

  it('falls back to defaults for anything it does not understand', () => {
    expect(parseCollectionQuery({ sort: 'cheapest', page: '-3', category: '../etc' })).toEqual({
      category: undefined,
      sort: DEFAULT_SORT,
      page: 1,
    });
    expect(parseCollectionQuery({ page: 'abc' }).page).toBe(1);
    expect(parseCollectionQuery({ page: '999999' }).page).toBe(1);
  });

  it('takes the first of a repeated parameter', () => {
    expect(parseCollectionQuery({ category: ['evening', 'bridal'] }).category).toBe('evening');
  });
});
