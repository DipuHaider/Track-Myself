"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import {
  TOUR_AUTO_AUDIENCE, TOUR_EVENT, TOUR_INTRO, TOUR_PENDING_KEY,
  scopeForPath, stepsFor,
  type TourAudience, type TourScope, type TourStep,
} from "@/lib/tour";

type TourState = {
  enabled: Record<TourScope, boolean>;
  audience: TourAudience;
  premium: boolean;
  seen: TourScope[];
};

type Box = { top: number; left: number; width: number; height: number };

const PAD = 8;
const TIP_W = 320;
const GAP = 14;

function visible(selector: string) {
  const el = document.querySelector(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

function measure(step: TourStep): Box | null {
  const el = document.querySelector(step.target);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
}

export default function TourGuide() {
  const pathname = usePathname();
  const scope = scopeForPath(pathname ?? "/");

  const [activeScope, setActiveScope] = useState<TourScope>("home");
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [running, setRunning] = useState(false);
  const state = useRef<TourState | null>(null);
  const autoDone = useRef<Set<TourScope>>(new Set());

  const start = useCallback((next: TourScope, premium: boolean) => {
    const list = stepsFor(next, premium).filter((s) => visible(s.target));
    if (!list.length) return;
    setActiveScope(next);
    setSteps(list);
    setIndex(0);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;

    const load = async () => {
      if (state.current) return state.current;
      const res = await fetch("/api/user/tour").catch(() => null);
      if (!res || !res.ok) return null;
      const data = (await res.json().catch(() => null)) as TourState | null;
      if (data) state.current = data;
      return data;
    };

    const waitForFirstStep = (next: TourScope, premium: boolean) => {
      const first = stepsFor(next, premium)[0];
      const deadline = Date.now() + 10000;
      const attempt = () => {
        if (cancelled) return;
        if (visible(first.target) || Date.now() > deadline) {
          start(next, premium);
          return;
        }
        window.setTimeout(attempt, 250);
      };
      window.setTimeout(attempt, 400);
    };

    const boot = async () => {
      const data = await load();
      if (!data || cancelled) return;
      if (!data.enabled[scope]) return;

      let pending = false;
      try {
        pending = sessionStorage.getItem(TOUR_PENDING_KEY) === "1";
        if (pending) sessionStorage.removeItem(TOUR_PENDING_KEY);
      } catch {}

      if (!pending) {
        if (autoDone.current.has(scope)) return;
        if (data.seen.includes(scope)) return;
        if (data.audience !== TOUR_AUTO_AUDIENCE[scope]) return;
      }
      autoDone.current.add(scope);
      waitForFirstStep(scope, data.premium);
    };

    boot();

    const onReplay = async () => {
      const data = await load();
      if (!data || cancelled || !data.enabled[scope]) return;
      start(scope, data.premium);
    };

    window.addEventListener(TOUR_EVENT, onReplay);
    return () => {
      cancelled = true;
      window.removeEventListener(TOUR_EVENT, onReplay);
    };
  }, [scope, start]);

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
    const bail = window.setTimeout(() => {
      if (measure(step)) return;
      setIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, 1200);

    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.clearTimeout(bail);
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
    };
  }, [running, step, steps.length]);

  const finish = useCallback(
    (completed: boolean) => {
      setRunning(false);
      setBox(null);
      if (!completed) return;
      if (state.current && !state.current.seen.includes(activeScope)) {
        state.current.seen.push(activeScope);
      }
      fetch("/api/user/tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: activeScope }),
      }).catch(() => {});
    },
    [activeScope],
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
          <p className="tour-intro">{TOUR_INTRO[activeScope]}</p>
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
