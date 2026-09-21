"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, LifeBuoy, ListTodo, Settings2, Sparkles } from "lucide-react";
import A11ySettingsModal from "@/components/shared/A11ySettingsModal";
import ReportIssueModal from "@/components/shared/ReportIssueModal";

const POS_KEY = "tm-bubble-pos";
const ORB = 48;
const EDGE = 16;
const DRAG_THRESHOLD = 4;

type Side = "left" | "right";
type Pos = { x: number; y: number; side: Side };

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
  const shellRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0 });

  const [pos, setPos] = useState<Pos | null>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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

  const clearHover = useCallback(() => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

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
      clearHover();
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

  const onEnter = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || drag.current.active) return;
    clearHover();
    hoverTimer.current = window.setTimeout(() => setOpen(true), 140);
  };

  const onLeave = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || pinned) return;
    clearHover();
    hoverTimer.current = window.setTimeout(() => setOpen(false), 220);
  };

  const go = (href: string) => {
    setOpen(false);
    setPinned(false);
    router.push(href);
  };

  if (!pos) return null;

  const above = pos.y > window.innerHeight / 2;

  const items = [
    { icon: <ListTodo size={15} aria-hidden="true" />, label: "To-Do list", onClick: () => go("/me#todos") },
    { icon: <Briefcase size={15} aria-hidden="true" />, label: "My Applications", onClick: () => go("/me/applications") },
    { icon: <LifeBuoy size={15} aria-hidden="true" />, label: "Report an issue", onClick: () => { setOpen(false); setPinned(false); setShowReport(true); } },
    { icon: <Settings2 size={15} aria-hidden="true" />, label: "Accessibility", onClick: () => { setOpen(false); setPinned(false); setShowSettings(true); } },
  ];

  return (
    <>
      <div
        ref={shellRef}
        className="quick-bubble-shell"
        data-dragging={dragging}
        style={{
          left: pos.x,
          top: pos.y,
          alignItems: pos.side === "left" ? "flex-start" : "flex-end",
          flexDirection: above ? "column-reverse" : "column",
        }}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        <button
          type="button"
          className="quick-bubble-orb"
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
                onClick={item.onClick}
              >
                <span className="quick-bubble-icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {showReport && <ReportIssueModal open onClose={() => setShowReport(false)} />}
      {showSettings && <A11ySettingsModal open onClose={() => setShowSettings(false)} />}
    </>
  );
}
