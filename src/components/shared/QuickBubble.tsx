"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Briefcase, Compass, LifeBuoy, ListTodo, Settings2, Sparkles } from "lucide-react";
import A11ySettingsModal from "@/components/shared/A11ySettingsModal";
import ReportIssueModal from "@/components/shared/ReportIssueModal";
import TodoModal from "@/components/portal/TodoModal";
import { TOUR_EVENT, TOUR_PENDING_KEY, scopeForPath } from "@/lib/tour";

const POS_KEY = "tm-bubble-pos";
const ORB = 48;
const EDGE = 16;
const DRAG_THRESHOLD = 4;
const ARROW_D = "M12 3.4 L18.4 11.3 L14.2 11.3 L14.2 20.6 L9.8 20.6 L9.8 11.3 L5.6 11.3 Z";

type Side = "left" | "right";
type Pos = { x: number; y: number; side: Side };

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  hint?: string;
  pulse?: boolean;
};

function clampY(y: number) {
  const max = window.innerHeight - ORB - EDGE;
  return Math.min(Math.max(y, EDGE), Math.max(EDGE, max));
}

function snap(x: number, y: number): Pos {
  const side: Side = x + ORB / 2 < window.innerWidth / 2 ? "left" : "right";
  return {
    side,
    x: side === "left" ? EDGE : window.innerWidth - ORB - EDGE,
    y: clampY(y),
  };
}

function readPos(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0, side: "right" };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Pos;
      if (typeof p?.x === "number" && typeof p?.y === "number") return snap(p.x, p.y);
    }
  } catch {}
  return snap(window.innerWidth, window.innerHeight - 140);
}

export default function QuickBubble() {
  const router = useRouter();
  const { status } = useSession();
  const signedIn = status === "authenticated";
  const shellRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0 });

  const [pos, setPos] = useState<Pos | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTodos, setShowTodos] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tourUnseen, setTourUnseen] = useState(false);
  const tourChecked = useRef(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setPos(readPos()));
    const onResize = () => setPos((p) => (p ? snap(p.side === "left" ? 0 : window.innerWidth, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!signedIn || tourChecked.current) return;
    tourChecked.current = true;

    let cancelled = false;
    fetch("/api/user/tour")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setTourUnseen(Boolean(d?.enabled) && !d?.seen);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!pinned) return;
    const onDown = (e: PointerEvent) => {
      if (shellRef.current?.contains(e.target as Element)) return;
      setPinned(false);
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPinned(false);
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { active: true, moved: false, dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    const nx = e.clientX - drag.current.dx;
    const ny = e.clientY - drag.current.dy;

    if (!drag.current.moved) {
      if (Math.abs(nx - (pos?.x ?? 0)) < DRAG_THRESHOLD && Math.abs(ny - (pos?.y ?? 0)) < DRAG_THRESHOLD) return;
      drag.current.moved = true;
      setDragging(true);
      setOpen(false);
      setPinned(false);
    }

    setPos((p) => (p ? { ...p, x: nx, y: ny } : p));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag.current.active) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const moved = drag.current.moved;
    drag.current.active = false;
    drag.current.moved = false;
    setDragging(false);

    if (!moved) {
      setPinned((v) => !v);
      setOpen((v) => !v);
      return;
    }

    setPos((p) => {
      if (!p) return p;
      const next = snap(p.x, p.y);
      try { localStorage.setItem(POS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const startTour = () => {
    setOpen(false);
    setPinned(false);
    if (scopeForPath(window.location.pathname)) {
      window.dispatchEvent(new Event(TOUR_EVENT));
      return;
    }
    try { sessionStorage.setItem(TOUR_PENDING_KEY, "1"); } catch {}
    router.push(signedIn ? "/me" : "/");
  };

  const go = (href: string) => {
    setOpen(false);
    setPinned(false);
    router.push(href);
  };

  if (!pos) return null;

  const above = pos.y > window.innerHeight / 2;

  const askToSignIn = () => {
    setOpen(false);
    setPinned(false);
    const from = window.location.pathname + window.location.search;
    router.push(`/login?from=${encodeURIComponent(from)}`);
  };

  const items: MenuItem[] = [
    ...(signedIn
      ? [
          { icon: <ListTodo size={15} aria-hidden="true" />, label: "To-Do list", onClick: () => { setOpen(false); setPinned(false); setShowTodos(true); } },
          { icon: <Briefcase size={15} aria-hidden="true" />, label: "My Applications", onClick: () => go("/me/applications") },
        ]
      : []),
    {
      icon: <LifeBuoy size={15} aria-hidden="true" />,
      label: "Report an issue",
      onClick: signedIn
        ? () => { setOpen(false); setPinned(false); setShowReport(true); }
        : askToSignIn,
      hint: signedIn ? undefined : "Sign in",
    },
    ...(signedIn
      ? [
          { icon: <Compass size={15} aria-hidden="true" />, label: "Take the tour", onClick: () => { setTourUnseen(false); startTour(); }, pulse: tourUnseen },
        ]
      : []),
    { icon: <Settings2 size={15} aria-hidden="true" />, label: "Accessibility", onClick: () => { setOpen(false); setPinned(false); setShowSettings(true); } },
  ];

  const pct = Math.round(progress * 100);
  const showTop = progress > 0.02;

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      || document.documentElement.hasAttribute("data-reduce-motion");
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <>
      {showTop && (
        <button type="button" className="quick-bubble-top" onClick={toTop} aria-label={`Back to top — ${pct}% scrolled`}>
          <svg viewBox="0 0 24 24" className="quick-bubble-arrow" aria-hidden="true">
            <defs>
            <clipPath id="tm-arrow-clip">
              <path d={ARROW_D} />
            </clipPath>
            <linearGradient id="tm-arrow-fill" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--neon-1)" />
              <stop offset="100%" stopColor="var(--neon-2)" />
            </linearGradient>
            </defs>

            <g clipPath="url(#tm-arrow-clip)">
            <rect className="water" x="0" y={24 - 24 * progress} width="24" height="24" fill="url(#tm-arrow-fill)" />
            <rect className="surface-line" x="0" y={24 - 24 * progress} width="24" height="0.9" fill="var(--neon-2)" />
            </g>

            <path d={ARROW_D} fill="none" stroke="var(--neon-1)" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
        </button>
      )}


      <div
        ref={shellRef}
        className="quick-bubble-shell"
        data-dragging={dragging}
        style={{
          ...(dragging
            ? { left: pos.x }
            : pos.side === "left"
              ? { left: EDGE }
              : { right: EDGE }),
          /* Anchored by the bottom in the lower half so the menu grows upward;
             anchoring by top there pushes the orb off the bottom of the screen. */
          ...(above && !dragging
            ? { bottom: Math.max(EDGE, window.innerHeight - pos.y - ORB) }
            : { top: pos.y }),
          alignItems: pos.side === "left" ? "flex-start" : "flex-end",
          flexDirection: above ? "column-reverse" : "column",
        }}
      >
        <button
          type="button"
          className="quick-bubble-orb"
          data-tour="bubble"
          data-pulse={tourUnseen ? "extra" : "normal"}
          aria-label="Quick actions"
          aria-expanded={open}
          aria-haspopup="menu"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <Sparkles size={20} aria-hidden="true" />
        </button>

        {open && !dragging && (
          <div className="quick-bubble-menu anim-panel" role="menu">
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className="quick-bubble-item"
                data-pulse={item.pulse ? "true" : undefined}
                onClick={item.onClick}
              >
                <span className="quick-bubble-icon">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="quick-bubble-hint">{item.hint}</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {showTodos && <TodoModal open onClose={() => setShowTodos(false)} />}
      {showReport && <ReportIssueModal open onClose={() => setShowReport(false)} />}
      {showSettings && <A11ySettingsModal open onClose={() => setShowSettings(false)} />}
    </>
  );
}
