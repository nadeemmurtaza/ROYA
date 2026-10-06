import { notFound } from 'next/navigation';

/** Any URL under a locale that no page claims lands on the locale's own not-found page. */
export default function CatchAll() {
  notFound();
}
