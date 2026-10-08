'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError, apiAuthed } from '@/lib/api';

/** `httpStatus` is the API's answer when there was one (a 404 is "that is not there", not "try again"). */
type State<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; httpStatus?: number };

/** One signed-in read, with a retry. A failed read is a state to show, never a thrown error. */
export function useAuthedQuery<T>(path: string, query?: Record<string, unknown>) {
  const [state, setState] = useState<State<T>>({ status: 'loading' });
  const key = JSON.stringify(query ?? {});

  const load = useCallback(() => {
    let live = true;
    setState({ status: 'loading' });
    apiAuthed<T>(path, { query: query as Record<string, unknown> | undefined })
      .then((data) => live && setState({ status: 'ready', data }))
      .catch(
        (error) =>
          live && setState({ status: 'error', httpStatus: error instanceof ApiError ? error.status : undefined }),
      );
    return () => {
      live = false;
    };
    // `key` stands for `query`: the object is new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key]);

  useEffect(() => load(), [load]);

  return { state, reload: load, setData: (data: T) => setState({ status: 'ready', data }) };
}
