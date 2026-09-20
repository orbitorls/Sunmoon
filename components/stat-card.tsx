"use client";

import type { ReactNode } from "react";

/**
 * Shared "stat card" presentation.
 *
 * The dashboard grew the same tiny label + big-value block in several places:
 * the location selector stat row, the today-panel stat grid, and the tide
 * status hero. This component reproduces that markup exactly while letting each
 * call site keep its own outer wrapper (plain div, shadcn Card, or none) and its
 * own value layout, so the rendered output stays byte-for-byte identical to the
 * previous inline markup.
 */

/** Default label styling shared by the dashboard stat grids. */
export const STAT_CARD_LABEL_CLASS =
  "text-[11px] font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-400";

export type StatCardProps = {
  /** The stat label shown above (or below, with labelAfter) the value. */
  label: ReactNode;
  /** The value content (numbers, icons, extra lines). */
  children: ReactNode;
  /**
   * Class for the outer container. When omitted, the label and value are
   * rendered without a wrapper element, for callers that already provide their
   * own card/container (e.g. a shadcn Card/CardContent) around them.
   */
  className?: string;
  /**
   * Overrides the label element class entirely. When omitted the shared
   * `STAT_CARD_LABEL_CLASS` is used.
   */
  labelClassName?: string;
  /** Render the label after the value instead of before it. */
  labelAfter?: boolean;
};

export function StatCard({
  label,
  children,
  className,
  labelClassName,
  labelAfter = false,
}: StatCardProps) {
  const labelNode = (
    <div className={labelClassName ?? STAT_CARD_LABEL_CLASS}>{label}</div>
  );

  const body = labelAfter ? (
    <>
      {children}
      {labelNode}
    </>
  ) : (
    <>
      {labelNode}
      {children}
    </>
  );

  if (className === undefined) {
    return <>{body}</>;
  }

  return <div className={className}>{body}</div>;
}

export default StatCard;
