import { describe, expect, it } from '@jest/globals';
import { corsHeaders } from '../supabase/functions/_shared/http';

describe('Supabase Edge Function CORS headers', () => {
  it('allows the headers and methods used by the installed Supabase SDK', () => {
    const allowedHeaders = corsHeaders['Access-Control-Allow-Headers']
      .split(',')
      .map((header) => header.trim().toLowerCase());
    const allowedMethods = corsHeaders['Access-Control-Allow-Methods']
      .split(',')
      .map((method) => method.trim());

    expect(allowedHeaders).toEqual(
      expect.arrayContaining([
        'authorization',
        'x-client-info',
        'apikey',
        'content-type',
        'x-retry-count',
        'traceparent',
        'tracestate',
        'baggage',
      ]),
    );
    expect(allowedMethods).toEqual(
      expect.arrayContaining([
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ]),
    );
  });
});
