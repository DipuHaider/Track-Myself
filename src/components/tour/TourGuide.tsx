"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import {
  TOUR_EVENT, TOUR_INTRO, TOUR_PENDING_KEY, TOUR_STEPS,
  type TourStep, type TourVariant,
} from "@/lib/tour";

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;
const TIP_W = 320;
const GAP = 14;

function measure(step: TourStep): Box | null {
  const el = document.querySelector(step.target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export default function TourGuide() {
  const [variant, setVariant] = useState<TourVariant>("free");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [running, setRunning] = useState(false);

  const start = useCallback((v: TourVariant) => {
    const list = TOUR_STEPS[v].filter((s) => document.querySelector(s.target));
    if (!list.length) return;
    setVariant(v);
    setSteps(list);
    setIndex(0);
    setRunning(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      const res = await fetch("/api/user/tour").catch(() => null);
      if (!res || !res.ok || cancelled) return;
      const data = await res.json().catch(() => null);
      if (!data || cancelled) return;

      let pending = false;
      try {
        pending = sessionStorage.getItem(TOUR_PENDING_KEY) === "1";
        if (pending) sessionStorage.removeItem(TOUR_PENDING_KEY);
      } catch {}

      if (!data.enabled) return;
      if (!pending && data.seen) return;
      setTimeout(() => {
        if (!cancelled) start(data.variant as TourVariant);
      }, 600);
    };

    boot();

    const onReplay = () => {
      fetch("/api/user/tour")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.enabled) start(d.variant as TourVariant);
        })
        .catch(() => {});
    };

    window.addEventListener(TOUR_EVENT, onReplay);
    return () => {
      cancelled = true;
      window.removeEventListener(TOUR_EVENT, onReplay);
    };
  }, [start]);

  const step = steps[index];

  useEffect(() => {
    if (!running || !step) return;

    const el = document.querySelector(step.target);
    const reduced = document.documentElement.hasAttribute("data-reduce-motion")
      || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });

    const sync = () => setBox(measure(step));
    const raf = requestAnimationFrame(sync);
    const timer = window.setTimeout(sync, 380);

    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
    };
  }, [running, step]);

  const finish = useCallback(
    (completed: boolean) => {
      setRunning(false);
      setBox(null);
      if (!completed) return;
      fetch("/api/user/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
      }).catch(() => {});
    },
    [variant],
  );

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(true);
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [running, steps.length, finish]);

  if (!running || !step || !box) return null;

  const last = index === steps.length - 1;
  const below = box.top + box.height + GAP + 190 < window.innerHeight;
  const tipTop = below ? box.top + box.height + GAP : Math.max(GAP, box.top - GAP - 190);
  const tipLeft = Math.min(
    Math.max(GAP, box.left + box.width / 2 - TIP_W / 2),
    Math.max(GAP, window.innerWidth - TIP_W - GAP),
  );

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="tour-veil" style={{ height: Math.max(0, box.top) }} />
      <div className="tour-veil" style={{ top: box.top + box.height, bottom: 0 }} />
      <div className="tour-veil" style={{ top: box.top, height: box.height, width: Math.max(0, box.left) }} />
      <div
        className="tour-veil"
        style={{ top: box.top, height: box.height, left: box.left + box.width, right: 0 }}
      />

      <div
        className="tour-ring"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
      />

      <div className="tour-tip" style={{ top: tipTop, left: tipLeft, width: TIP_W }}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="tour-count">
            {index + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => finish(true)}
            className="tour-skip"
            aria-label="Skip the tour"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>

        {index === 0 && (
          <p className="tour-intro">{TOUR_INTRO[variant].body}</p>
        )}

        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="tour-dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.id} data-active={i === index} />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => setIndex(index - 1)} className="tour-btn">
                <ArrowLeft size={14} aria-hidden="true" />
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (last ? finish(true) : setIndex(index + 1))}
              className="tour-btn tour-btn-primary"
            >
              {last ? <Check size={14} aria-hidden="true" /> : null}
              {last ? "Done" : "Next"}
              {!last ? <ArrowRight size={14} aria-hidden="true" /> : null}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
