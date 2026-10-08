import { resolveServerApiUrl } from './api-url-model';

describe('resolveServerApiUrl', () => {
  it('uses an explicit API_INTERNAL_URL as it stands, without a trailing slash', () => {
    expect(resolveServerApiUrl({ internalUrl: 'http://api:3001/api/v1/', publicPath: '/api/v1' })).toBe(
      'http://api:3001/api/v1',
    );
  });

  it('builds the address from a service binding by adding the public API path', () => {
    expect(resolveServerApiUrl({ serviceUrl: 'https://roya-api.vercel.internal', publicPath: '/api/v1' })).toBe(
      'https://roya-api.vercel.internal/api/v1',
    );
    expect(resolveServerApiUrl({ serviceUrl: 'https://roya-api.vercel.internal/', publicPath: '/api/v1/' })).toBe(
      'https://roya-api.vercel.internal/api/v1',
    );
  });

  it('prefers the explicit address over the binding', () => {
    expect(
      resolveServerApiUrl({
        internalUrl: 'https://api.example.com/api/v1',
        serviceUrl: 'https://roya-api.vercel.internal',
        publicPath: '/api/v1',
      }),
    ).toBe('https://api.example.com/api/v1');
  });

  it('falls back to the local API when nothing is set', () => {
    expect(resolveServerApiUrl({ publicPath: '/api/v1' })).toBe('http://localhost:3001/api/v1');
    expect(resolveServerApiUrl({ internalUrl: '  ', serviceUrl: '', publicPath: '/api/v1' })).toBe(
      'http://localhost:3001/api/v1',
    );
  });

  it('does not join a binding to a public address that is not a path', () => {
    // NEXT_PUBLIC_API_URL can be a whole URL when the API is hosted elsewhere; a binding cannot be appended to that.
    expect(
      resolveServerApiUrl({
        serviceUrl: 'https://roya-api.vercel.internal',
        publicPath: 'https://api.example.com/api/v1',
      }),
    ).toBe('http://localhost:3001/api/v1');
  });
});
