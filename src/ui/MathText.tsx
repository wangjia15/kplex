import { Fragment, useEffect, useRef } from "react";
import { finishRenderMath, loadMathJax, renderMath } from "obsidian";
import { splitMath } from "./mathSegments";

/** One formula, typeset by Obsidian's own MathJax instance. */
function MathSpan({ source, display }: { source: string; display: boolean }) {
  const host = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let active = true;
    void loadMathJax().then(() => {
      if (!active || !host.current) return;
      host.current.empty();
      host.current.append(renderMath(source, display));
      return finishRenderMath();
    }).catch(() => {
      // MathJax is unavailable: leave the formula source visible rather than an empty gap.
      if (active && host.current) host.current.setText(source);
    });
    return () => { active = false; };
  }, [source, display]);

  return <span ref={host} className={display ? "kplex-math is-display" : "kplex-math"} />;
}

/** Annotation text with its LaTeX formulas rendered in place. */
export function MathText({ text }: { text: string }) {
  const segments = splitMath(text);
  if (segments.length === 1 && !segments[0].math) return <>{text}</>;
  return <>{segments.map((segment, index) => segment.math
    ? <MathSpan key={index} source={segment.value} display={segment.display} />
    : <Fragment key={index}>{segment.value}</Fragment>)}</>;
}
