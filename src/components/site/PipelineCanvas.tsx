"use client";

import { useEffect, useRef } from "react";

type Stage = { key: string; label: string; color: string };

const STAGES: Stage[] = [
  { key: "wishlist",  label: "Wishlist",  color: "#94a3b8" },
  { key: "submitted", label: "Submitted", color: "#3b82f6" },
  { key: "interview", label: "Interview", color: "#22d3ee" },
  { key: "offer",     label: "Offer",     color: "#34d399" },
];

const NODE_COUNT = 58;
const LINK_DISTANCE = 132;
const CURSOR_RADIUS = 190;
const CURSOR_PULL = 0.00042;
const RETURN_FORCE = 0.0016;
const DAMPING = 0.94;
const MAX_SPEED = 0.55;

type Node = {
  x: number; y: number;
  homeX: number; homeY: number;
  vx: number; vy: number;
  radius: number;
  stage: number;
  pulse: number;
};

export default function PipelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let nodes: Node[] = [];
    let frame = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    function seed() {
      const parent = canvas!.parentElement;
      width = parent?.clientWidth ?? window.innerWidth;
      height = parent?.clientHeight ?? 600;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const density = Math.max(24, Math.min(NODE_COUNT, Math.round((width * height) / 16000)));

      nodes = Array.from({ length: density }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const weighted = Math.random();
        return {
          x, y, homeX: x, homeY: y,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          radius: 1.6 + Math.random() * 2.2,
          stage: weighted > 0.93 ? 3 : weighted > 0.72 ? 2 : weighted > 0.34 ? 1 : 0,
          pulse: 0,
        };
      });
    }

    function advanceNearest(px: number, py: number) {
      let best: Node | null = null;
      let bestDist = 70 * 70;

      for (const node of nodes) {
        const dx = node.x - px;
        const dy = node.y - py;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          best = node;
        }
      }

      if (best) {
        best.stage = (best.stage + 1) % STAGES.length;
        best.pulse = 1;
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);

      for (const node of nodes) {
        if (pointer.active) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CURSOR_RADIUS && dist > 1) {
            const force = (1 - dist / CURSOR_RADIUS) * CURSOR_PULL * dist;
            node.vx += (dx / dist) * force * 16;
            node.vy += (dy / dist) * force * 16;
          }
        }

        node.vx += (node.homeX - node.x) * RETURN_FORCE;
        node.vy += (node.homeY - node.y) * RETURN_FORCE;
        node.vx *= DAMPING;
        node.vy *= DAMPING;

        const speed = Math.hypot(node.vx, node.vy);
        if (speed > MAX_SPEED) {
          node.vx = (node.vx / speed) * MAX_SPEED;
          node.vy = (node.vy / speed) * MAX_SPEED;
        }

        node.x += node.vx;
        node.y += node.vy;
        if (node.pulse > 0) node.pulse = Math.max(0, node.pulse - 0.018);
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > LINK_DISTANCE) continue;

          const strength = 1 - dist / LINK_DISTANCE;
          const forward = Math.abs(a.stage - b.stage) === 1;

          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.strokeStyle = forward
            ? `rgba(148, 197, 255, ${strength * 0.32})`
            : `rgba(148, 163, 184, ${strength * 0.13})`;
          ctx!.lineWidth = forward ? 1.1 : 0.7;
          ctx!.stroke();
        }
      }

      for (const node of nodes) {
        const stage = STAGES[node.stage];

        if (node.pulse > 0) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, node.radius + (1 - node.pulse) * 26, 0, Math.PI * 2);
          ctx!.strokeStyle = `${stage.color}${Math.round(node.pulse * 120).toString(16).padStart(2, "0")}`;
          ctx!.lineWidth = 1.4;
          ctx!.stroke();
        }

        ctx!.beginPath();
        ctx!.arc(node.x, node.y, node.radius + node.pulse * 1.6, 0, Math.PI * 2);
        ctx!.fillStyle = stage.color;
        ctx!.globalAlpha = node.stage === 0 ? 0.45 : 0.9;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        if (node.stage === 3) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
          ctx!.strokeStyle = `${stage.color}55`;
          ctx!.lineWidth = 1;
          ctx!.stroke();
        }
      }

      frame = requestAnimationFrame(draw);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active = true;
    }

    function onPointerLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    function onPointerDown(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      advanceNearest(e.clientX - rect.left, e.clientY - rect.top);
    }

    function onResize() {
      seed();
    }

    seed();

    if (reduced.matches) {
      draw();
      cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(draw);
      const host = canvas.parentElement ?? canvas;
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
      host.addEventListener("pointerdown", onPointerDown);
      window.addEventListener("resize", onResize);

      return () => {
        cancelAnimationFrame(frame);
        host.removeEventListener("pointermove", onPointerMove);
        host.removeEventListener("pointerleave", onPointerLeave);
        host.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", onResize);
      };
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
