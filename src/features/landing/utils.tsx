import type { ReactNode } from 'react';

/**
 * Splits a string with <highlight>…</highlight> tags into mixed text + JSX.
 * Used by chat-answer rendering across animations.
 */
export function renderAnswer(raw: string): ReactNode[] {
  return raw.split(/(<highlight>.*?<\/highlight>)/g).map((part, i) => {
    const m = part.match(/^<highlight>(.*?)<\/highlight>$/);
    return m ? (
      <span key={i} className="text-violet-300 font-semibold">{m[1]}</span>
    ) : (
      part
    );
  });
}
