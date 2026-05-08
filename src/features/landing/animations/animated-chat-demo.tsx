'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { renderAnswer } from '../utils';

/**
 * Three-phase chat animation: question → thinking → typing answer with citations.
 * Cycles through three demo conversations on a loop. Triggers on scroll into view.
 */
export function AnimatedChatDemo() {
  const { t } = useTranslation();

  const CHAT_DEMOS = [
    {
      question: t('landing.chatQ1'),
      thinking: [t('landing.chatThinking1a'), t('landing.chatThinking1b'), t('landing.chatThinking1c')],
      answer: <>{renderAnswer(t('landing.chatAnswer1'))}</>,
      sources: ['Q3_Earnings.pdf', 'Board_Deck.pptx'],
    },
    {
      question: t('landing.chatQ2'),
      thinking: [t('landing.chatThinking2a'), t('landing.chatThinking2b'), t('landing.chatThinking2c')],
      answer: <>{renderAnswer(t('landing.chatAnswer2'))}</>,
      sources: ['HR_Handbook.pdf'],
    },
    {
      question: t('landing.chatQ3'),
      thinking: [t('landing.chatThinking3a'), t('landing.chatThinking3b'), t('landing.chatThinking3c')],
      answer: <>{renderAnswer(t('landing.chatAnswer3'))}</>,
      sources: ['CRM_Export.csv', 'Org_Chart.pdf'],
    },
  ];

  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState(0);
  const [thinkStep, setThinkStep] = useState(0);
  const [answerChars, setAnswerChars] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 0) {
      timer = setTimeout(() => {
        setThinkStep(0);
        setPhase(1);
      }, 1200);
    } else if (phase === 1) {
      const demo = CHAT_DEMOS[demoIdx];
      if (thinkStep < demo.thinking.length) {
        timer = setTimeout(() => setThinkStep((s) => s + 1), 700);
      } else {
        timer = setTimeout(() => {
          setAnswerChars(0);
          setPhase(2);
        }, 300);
      }
    } else if (phase === 2) {
      const total = 30;
      if (answerChars < total) {
        timer = setTimeout(() => setAnswerChars((c) => c + 1), 45);
      } else {
        timer = setTimeout(() => {
          setDemoIdx((i) => (i + 1) % CHAT_DEMOS.length);
          setPhase(0);
          setThinkStep(0);
          setAnswerChars(0);
        }, 3200);
      }
    }

    return () => clearTimeout(timer);
  }, [visible, phase, thinkStep, answerChars, demoIdx]);

  const demo = CHAT_DEMOS[demoIdx];
  const answerProgress = Math.min(answerChars / 30, 1);

  return (
    <div ref={ref} className="p-6 md:p-8 min-h-[260px] space-y-4">
      {/* User question */}
      <div className={`flex gap-3 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-400 shrink-0 mt-0.5">JD</div>
        <div className="bg-zinc-800/60 border border-white/[0.05] rounded-xl rounded-tl-sm px-3.5 py-2.5 max-w-xs">
          <p className="text-[13px] text-zinc-300">{demo.question}</p>
        </div>
      </div>

      {/* AI bubble */}
      {phase >= 1 && (
        <div className="flex gap-3 justify-end">
          <div className="max-w-sm">
            {phase === 1 && (
              <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl rounded-tr-sm px-3.5 py-3 space-y-1.5">
                <div className="h-1 w-full rounded-full bg-violet-500/15 overflow-hidden mb-2.5">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${(thinkStep / demo.thinking.length) * 100}%` }}
                  />
                </div>
                {demo.thinking.slice(0, thinkStep).map((step, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2 transition-all duration-400 ${i === thinkStep - 1 ? 'opacity-100' : 'opacity-40'}`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === thinkStep - 1 ? 'bg-violet-400 animate-pulse' : 'bg-violet-600'}`} />
                    <span className="text-[11px] font-mono text-zinc-400">{step}</span>
                  </div>
                ))}
                <div className="flex gap-1 pt-0.5 pl-3.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1 h-1 rounded-full bg-violet-400/60 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === 2 && (
              <div
                className="bg-violet-500/10 border border-violet-500/20 rounded-xl rounded-tr-sm px-3.5 py-2.5"
                style={{ opacity: 0.3 + answerProgress * 0.7 }}
              >
                <p
                  className="text-[13px] text-zinc-200 leading-relaxed"
                  style={{
                    clipPath: `inset(0 ${(1 - answerProgress) * 100}% 0 0)`,
                    transition: 'clip-path 1.4s cubic-bezier(0.16,1,0.3,1)',
                  }}
                >
                  {demo.answer}
                </p>
                {answerProgress > 0.7 && (
                  <div className="flex gap-1.5 mt-2.5 pt-2 border-t border-dashed border-violet-500/20 flex-wrap">
                    {demo.sources.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] px-2 py-0.5 rounded bg-black/30 text-zinc-500 border border-white/[0.04] font-mono animate-[fadeIn_0.4s_ease_forwards]"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-600 flex items-center justify-center text-[10px] font-bold text-zinc-950 shrink-0 mt-0.5">V</div>
        </div>
      )}
    </div>
  );
}
