import { getImageProps, type ImageProps } from 'next/image';
import { preload } from 'react-dom';

/**
 * `next/image` minus its inline `style`.
 *
 * The stock component writes `position:absolute; inset:0; color:transparent`
 * onto every <img>. This app keeps all of its CSS in global stylesheets, so the
 * same optimisation (resizing, srcset, lazy loading, priority preload) is used
 * through `getImageProps()` and the styling it would have inlined is in
 * `globals.css`, keyed on `data-nimg` exactly as the stock component marks its
 * output. (`apps/storefront/src/components/Image.tsx` is the same wrapper.)
 *
 * Use this and never `next/image` directly: `scripts/check-global-css.mjs`
 * fails the build on the import.
 */
export function Image(props: ImageProps) {
  const { props: attrs } = getImageProps(props);
  // `style` is what this component exists to drop.
  const { style: _style, ...img } = attrs;

  if (props.priority) {
    preload(img.src, {
      as: 'image',
      imageSrcSet: img.srcSet,
      imageSizes: img.sizes,
      crossOrigin: img.crossOrigin,
      referrerPolicy: img.referrerPolicy,
      fetchPriority: img.fetchPriority as 'high' | 'low' | 'auto' | undefined,
    });
  }

  // eslint-disable-next-line @next/next/no-img-element -- this is the sanctioned <img>: the props are next/image's own
  return <img {...img} alt={props.alt} data-nimg={props.fill ? 'fill' : '1'} />;
}
