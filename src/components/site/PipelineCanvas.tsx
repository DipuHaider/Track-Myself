"use client";

import { useEffect, useRef } from "react";
import {
  BOLT_PRESETS, MITOSIS_SPEC, MITOSIS_TYPES,
  type BoltPreset, type MitosisType,
} from "@/lib/tools/boltPresets";

const STAGE_COLORS = ["#94a3b8", "#3b82f6", "#22d3ee", "#34d399"];

const BASE_NODES = 52;
const MAX_NODES = 190;
const LINK_DISTANCE = 130;
const LINK_DISTANCE_SQ = LINK_DISTANCE * LINK_DISTANCE;
const CURSOR_RADIUS = 190;
const DRIFT = 0.019;
const DAMPING = 0.982;
const MAX_SPEED = 0.42;
const HIT_RADIUS_SQ = 26 * 26;

type Node = {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  stage: number;
  phase: number;
  wobble: number;
  scale: number;
  pulse: number;
  born: number;
};

type Bolt = {
  preset: BoltPreset;
  arms: { x: number; y: number }[][];
  age: number;
};

type Mitosis = {
  type: MitosisType;
  x: number; y: number;
  radius: number;
  color: string;
  angle: number;
  age: number;
  duration: number;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function PipelineCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const host = canvas.parentElement ?? canvas;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let tick = 0;
    let nodes: Node[] = [];
    let bolts: Bolt[] = [];
    let splits: Mitosis[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    function makeNode(x: number, y: number, stage?: number): Node {
      const weighted = Math.random();
      return {
        x, y,
        vx: rand(-0.18, 0.18),
        vy: rand(-0.18, 0.18),
        radius: rand(1.5, 3.6),
        stage: stage ?? (weighted > 0.93 ? 3 : weighted > 0.72 ? 2 : weighted > 0.34 ? 1 : 0),
        phase: Math.random() * Math.PI * 2,
        wobble: rand(0.004, 0.013),
        scale: 1,
        pulse: 0,
        born: tick,
      };
    }

    function resize() {
      width = host.clientWidth || window.innerWidth;
      height = host.clientHeight || 640;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed() {
      resize();
      const count = Math.max(22, Math.min(BASE_NODES, Math.round((width * height) / 17000)));
      nodes = Array.from({ length: count }, () =>
        makeNode(Math.random() * width, Math.random() * height),
      );
    }

    function buildArm(preset: BoltPreset, ox: number, oy: number, angle: number) {
      const pts: { x: number; y: number }[] = [{ x: ox, y: oy }];
      const step = preset.reach / preset.segments;

      for (let i = 1; i <= preset.segments; i++) {
        const p = i / preset.segments;
        let a = angle;
        let r = step * i;

        switch (preset.shape) {
          case "spiral":
            a = angle + p * Math.PI * 2.4 * preset.spread;
            r = step * i * 0.8;
            break;
          case "helix":
            a = angle + Math.sin(p * Math.PI * 4) * 0.5;
            break;
          case "arc":
            a = angle + Math.sin(p * Math.PI) * 0.85 * preset.spread;
            break;
          case "zigzag":
            a = angle + (i % 2 === 0 ? 0.55 : -0.55) * preset.spread;
            break;
          case "ring":
          case "star":
          case "crackle":
            r = preset.reach * (preset.shape === "crackle" ? rand(0.45, 1) : 1) * p;
            break;
          case "filament":
            a = angle + Math.sin(p * Math.PI * 3 + preset.spread) * 0.35;
            break;
          default:
            break;
        }

        const jitter = preset.jitter * (1 - p * 0.35);
        pts.push({
          x: ox + Math.cos(a) * r + rand(-jitter, jitter),
          y: oy + Math.sin(a) * r + rand(-jitter, jitter),
        });
      }

      return pts;
    }

    function spawnBolt(x: number, y: number, presetIndex?: number) {
      const preset = BOLT_PRESETS[presetIndex ?? Math.floor(Math.random() * BOLT_PRESETS.length)];
      const base = Math.random() * Math.PI * 2;
      const arms: { x: number; y: number }[][] = [];

      for (let i = 0; i < preset.arms; i++) {
        const angle =
          preset.shape === "ring" || preset.shape === "star" || preset.shape === "crackle"
            ? base + (i / preset.arms) * Math.PI * 2
            : base + rand(-0.9, 0.9) * preset.spread;
        arms.push(buildArm(preset, x, y, angle));
      }

      bolts.push({ preset, arms, age: 0 });
      if (bolts.length > 26) bolts.shift();
    }

    function divide(node: Node) {
      const type = MITOSIS_TYPES[Math.floor(Math.random() * MITOSIS_TYPES.length)];
      const spec = MITOSIS_SPEC[type];
      const angle = Math.random() * Math.PI * 2;
      const color = STAGE_COLORS[node.stage];

      splits.push({
        type,
        x: node.x, y: node.y,
        radius: node.radius,
        color,
        angle,
        age: 0,
        duration: spec.duration,
      });

      for (let i = 0; i < spec.bolts; i++) spawnBolt(node.x, node.y);

      node.pulse = 1;
      node.vx += Math.cos(angle) * spec.separation;
      node.vy += Math.sin(angle) * spec.separation;

      for (let i = 0; i < spec.children; i++) {
        if (nodes.length >= MAX_NODES) break;
        const spin = angle + Math.PI + (i - (spec.children - 1) / 2) * 0.9;
        const child = makeNode(node.x, node.y, node.stage);
        child.radius = Math.max(1.3, node.radius * rand(0.68, 0.92));
        child.scale = 0;
        child.vx = Math.cos(spin) * spec.separation;
        child.vy = Math.sin(spin) * spec.separation;
        nodes.push(child);
      }

      while (nodes.length > MAX_NODES) nodes.shift();
    }

    function seedAt(x: number, y: number) {
      const born = Math.round(rand(2, 4));
      for (let i = 0; i < born; i++) {
        if (nodes.length >= MAX_NODES) nodes.shift();
        const a = Math.random() * Math.PI * 2;
        const d = rand(4, 30);
        const node = makeNode(x + Math.cos(a) * d, y + Math.sin(a) * d);
        node.scale = 0;
        node.vx = Math.cos(a) * 0.7;
        node.vy = Math.sin(a) * 0.7;
        nodes.push(node);
      }
      spawnBolt(x, y);
    }

    function drawBolts() {
      for (const bolt of bolts) {
        const { preset } = bolt;
        const life = bolt.age / preset.life;
        if (life >= 1) continue;

        const fade = 1 - life;
        const alpha = Math.sin(fade * Math.PI * 0.9);

        for (const arm of bolt.arms) {
          ctx!.beginPath();
          ctx!.moveTo(arm[0].x, arm[0].y);
          for (let i = 1; i < arm.length; i++) ctx!.lineTo(arm[i].x, arm[i].y);

          ctx!.strokeStyle = preset.color;
          ctx!.globalAlpha = alpha * 0.28;
          ctx!.lineWidth = preset.width + preset.glow * 0.35;
          ctx!.shadowBlur = preset.glow;
          ctx!.shadowColor = preset.color;
          ctx!.stroke();

          ctx!.globalAlpha = alpha;
          ctx!.lineWidth = preset.width;
          ctx!.shadowBlur = 0;
          ctx!.stroke();
        }

        ctx!.globalAlpha = 1;
      }

      bolts = bolts.filter((b) => b.age < b.preset.life);
    }

    function drawSplits() {
      for (const s of splits) {
        const t = s.age / s.duration;
        if (t >= 1) continue;

        const ease = 1 - Math.pow(1 - t, 3);
        const fade = 1 - t;
        ctx!.globalAlpha = fade;
        ctx!.strokeStyle = s.color;
        ctx!.fillStyle = s.color;

        if (s.type === "fission") {
          const gap = ease * s.radius * 6;
          const r = s.radius * (1 - t * 0.25);
          for (const dir of [-1, 1]) {
            ctx!.beginPath();
            ctx!.arc(s.x + Math.cos(s.angle) * gap * dir, s.y + Math.sin(s.angle) * gap * dir, r, 0, Math.PI * 2);
            ctx!.globalAlpha = fade * 0.5;
            ctx!.fill();
          }
          ctx!.globalAlpha = fade * (1 - ease);
          ctx!.lineWidth = Math.max(0.4, r * (1 - ease));
          ctx!.beginPath();
          ctx!.moveTo(s.x - Math.cos(s.angle) * gap, s.y - Math.sin(s.angle) * gap);
          ctx!.lineTo(s.x + Math.cos(s.angle) * gap, s.y + Math.sin(s.angle) * gap);
          ctx!.stroke();
        } else if (s.type === "budding") {
          const d = ease * s.radius * 5;
          ctx!.globalAlpha = fade * 0.55;
          ctx!.beginPath();
          ctx!.arc(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, s.radius * (0.3 + ease * 0.6), 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = fade * 0.35;
          ctx!.lineWidth = 0.8;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, s.radius + ease * 4, 0, Math.PI * 2);
          ctx!.stroke();
        } else if (s.type === "burst") {
          ctx!.lineWidth = 1.2 * fade;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * 34, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.globalAlpha = fade * 0.5;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * 20, 0, Math.PI * 2);
          ctx!.stroke();
        } else if (s.type === "pinch") {
          const gap = ease * s.radius * 4.2;
          const waist = Math.max(0.3, s.radius * (1 - ease) * 0.9);
          ctx!.globalAlpha = fade * 0.5;
          for (const dir of [-1, 1]) {
            ctx!.beginPath();
            ctx!.ellipse(
              s.x + Math.cos(s.angle) * gap * dir,
              s.y + Math.sin(s.angle) * gap * dir,
              s.radius * (1 + ease * 0.2), s.radius * (1 - ease * 0.15),
              s.angle, 0, Math.PI * 2,
            );
            ctx!.fill();
          }
          ctx!.globalAlpha = fade * 0.8;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, waist, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          const petals = 5;
          ctx!.lineWidth = 1.1;
          for (let i = 0; i < petals; i++) {
            const a = s.angle + (i / petals) * Math.PI * 2;
            ctx!.globalAlpha = fade * 0.6;
            ctx!.beginPath();
            ctx!.arc(s.x, s.y, s.radius + ease * 26, a, a + 0.7);
            ctx!.stroke();
          }
          ctx!.globalAlpha = fade * 0.3;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * 40, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.globalAlpha = 1;
      }

      splits = splits.filter((s) => s.age < s.duration);
    }

    function step() {
      tick++;
      ctx!.clearRect(0, 0, width, height);

      for (const node of nodes) {
        node.phase += node.wobble;
        node.vx += Math.cos(node.phase) * DRIFT;
        node.vy += Math.sin(node.phase * 1.3) * DRIFT;

        if (pointer.active) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const dist = Math.hypot(dx, dy);
          if (dist < CURSOR_RADIUS && dist > 1) {
            const force = (1 - dist / CURSOR_RADIUS) * 0.09;
            node.vx += (dx / dist) * force;
            node.vy += (dy / dist) * force;
          }
        }

        node.vx *= DAMPING;
        node.vy *= DAMPING;

        const speed = Math.hypot(node.vx, node.vy);
        if (speed > MAX_SPEED) {
          node.vx = (node.vx / speed) * MAX_SPEED;
          node.vy = (node.vy / speed) * MAX_SPEED;
        }

        node.x += node.vx;
        node.y += node.vy;

        const pad = 40;
        if (node.x < -pad) node.x = width + pad;
        if (node.x > width + pad) node.x = -pad;
        if (node.y < -pad) node.y = height + pad;
        if (node.y > height + pad) node.y = -pad;

        if (node.scale < 1) node.scale = Math.min(1, node.scale + 0.05);
        if (node.pulse > 0) node.pulse = Math.max(0, node.pulse - 0.02);
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dsq = dx * dx + dy * dy;
          if (dsq > LINK_DISTANCE_SQ) continue;

          const strength = 1 - Math.sqrt(dsq) / LINK_DISTANCE;
          const forward = Math.abs(a.stage - b.stage) === 1;

          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.strokeStyle = forward
            ? `rgba(148, 197, 255, ${strength * 0.3})`
            : `rgba(148, 163, 184, ${strength * 0.12})`;
          ctx!.lineWidth = forward ? 1.1 : 0.7;
          ctx!.stroke();
        }
      }

      drawSplits();

      for (const node of nodes) {
        const color = STAGE_COLORS[node.stage];
        const r = node.radius * node.scale;
        if (r <= 0.2) continue;

        if (node.pulse > 0) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, r + (1 - node.pulse) * 24, 0, Math.PI * 2);
          ctx!.strokeStyle = color;
          ctx!.globalAlpha = node.pulse * 0.5;
          ctx!.lineWidth = 1.3;
          ctx!.stroke();
          ctx!.globalAlpha = 1;
        }

        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = color;
        ctx!.globalAlpha = node.stage === 0 ? 0.45 : 0.9;
        ctx!.fill();
        ctx!.globalAlpha = 1;

        if (node.stage === 3) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, r + 5, 0, Math.PI * 2);
          ctx!.strokeStyle = `${color}55`;
          ctx!.lineWidth = 1;
          ctx!.stroke();
        }
      }

      drawBolts();

      for (const b of bolts) b.age++;
      for (const s of splits) s.age++;

      frame = requestAnimationFrame(step);
    }

    function localPoint(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onMove(e: PointerEvent) {
      const p = localPoint(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
    }

    function onLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
    }

    function onDown(e: PointerEvent) {
      const p = localPoint(e);
      let hit: Node | null = null;
      let bestSq = HIT_RADIUS_SQ;

      for (const node of nodes) {
        const dx = node.x - p.x;
        const dy = node.y - p.y;
        const dsq = dx * dx + dy * dy;
        if (dsq < bestSq) {
          bestSq = dsq;
          hit = node;
        }
      }

      if (hit) divide(hit);
      else seedAt(p.x, p.y);
    }

    seed();

    if (reduced) {
      ctx.clearRect(0, 0, width, height);
      step();
      cancelAnimationFrame(frame);
      window.addEventListener("resize", seed);
      return () => window.removeEventListener("resize", seed);
    }

    frame = requestAnimationFrame(step);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", resize);
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
