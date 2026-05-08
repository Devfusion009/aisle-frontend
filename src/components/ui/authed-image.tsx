'use client';

import { useEffect, useState, ImgHTMLAttributes } from 'react';
import api from '@/lib/api';

/**
 * Fetch a JWT-protected image through the authenticated axios client and
 * expose it as a blob URL suitable for binding to an `<img src>`. Browsers
 * never attach the Authorization header to plain `<img>` requests, so any
 * media endpoint that requires JWT must be loaded through this hook.
 *
 * @param path Path relative to the API base URL — e.g. `/tenant/logo/<id>`.
 *             Pass `null`/`undefined` to keep the slot empty.
 * @returns The blob URL while loaded, otherwise `null`.
 */
export function useAuthedImage(path: string | null | undefined): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      setObjectUrl(null);
      return;
    }

    let cancelled = false;
    let createdUrl: string | null = null;

    api
      .get(path, { responseType: 'blob' })
      .then((res) => {
        if (cancelled) return;
        createdUrl = URL.createObjectURL(res.data);
        setObjectUrl(createdUrl);
      })
      .catch(() => {
        if (!cancelled) setObjectUrl(null);
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [path]);

  return objectUrl;
}

type AuthedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  /** Path relative to the API base URL — e.g. `/tenant/logo/<id>`. */
  src: string | null | undefined;
};

/**
 * Drop-in `<img>` replacement that resolves the source through
 * {@link useAuthedImage}. Renders nothing until the bytes are loaded.
 */
export function AuthedImage({ src, ...rest }: AuthedImageProps) {
  const objectUrl = useAuthedImage(src);
  if (!objectUrl) return null;
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  return <img {...rest} src={objectUrl} />;
}
