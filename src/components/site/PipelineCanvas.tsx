"use client";

import { useEffect, useRef } from "react";
import {
  BIRTH_BOLT_FRAMES, BOLT_MAX_RADIUS, BOLT_PRESETS, MITOSIS_SPEC, MITOSIS_TYPES,
  SPLIT_BOLT_FRAMES, boltColor,
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
const HIT_RADIUS_SQ = 34 * 34;
const CHARGE_MS = 1100;

type Node = {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  stage: number;
  phase: number;
  wobble: number;
  scale: number;
  pulse: number;
};

type Bolt = {
  preset: BoltPreset;
  arms: { x: number; y: number }[][];
  age: number;
  delay: number;
  life: number;
  intensity: number;
};

type Mitosis = {
  type: MitosisType;
  node: Node | null;
  x: number; y: number;
  radius: number;
  color: string;
  angle: number;
  age: number;
  duration: number;
  reach: number;
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
    let nodes: Node[] = [];
    let bolts: Bolt[] = [];
    let splits: Mitosis[] = [];

    const pointer = { x: -9999, y: -9999, active: false };
    const press = { active: false, x: 0, y: 0, start: 0, target: null as Node | null };

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
            r = preset.reach * p;
            break;
          case "crackle":
            r = preset.reach * rand(0.45, 1) * p;
            break;
          case "filament":
            a = angle + Math.sin(p * Math.PI * 3 + preset.spread) * 0.35;
            break;
          default:
            break;
        }

        const jitter = preset.jitter * (1 - p * 0.35);
        let dx = Math.cos(a) * r + rand(-jitter, jitter);
        let dy = Math.sin(a) * r + rand(-jitter, jitter);

        const reach = Math.hypot(dx, dy);
        if (reach > BOLT_MAX_RADIUS) {
          dx = (dx / reach) * BOLT_MAX_RADIUS;
          dy = (dy / reach) * BOLT_MAX_RADIUS;
        }

        pts.push({ x: ox + dx, y: oy + dy });
      }

      return pts;
    }

    function spawnBoltSequence(
      x: number,
      y: number,
      totalFrames: number,
      intensity: number,
    ) {
      const count = 2 + Math.floor(Math.random() * 3);
      const slot = totalFrames / count;

      for (let i = 0; i < count; i++) {
        const preset = BOLT_PRESETS[Math.floor(Math.random() * BOLT_PRESETS.length)];
        const base = Math.random() * Math.PI * 2;
        const arms: { x: number; y: number }[][] = [];
        const radial = preset.shape === "ring" || preset.shape === "star" || preset.shape === "crackle";

        const ox = x + rand(-4, 4);
        const oy = y + rand(-4, 4);

        for (let a = 0; a < preset.arms; a++) {
          const angle = radial
            ? base + (a / preset.arms) * Math.PI * 2
            : base + rand(-0.9, 0.9) * preset.spread;
          arms.push(buildArm(preset, ox, oy, angle));
        }

        bolts.push({
          preset,
          arms,
          age: 0,
          delay: Math.round(slot * i * 0.82),
          life: Math.round(slot * rand(1.15, 1.5)),
          intensity,
        });
      }

      while (bolts.length > 40) bolts.shift();
    }

    function divide(node: Node, intensity: number) {
      const type = MITOSIS_TYPES[Math.floor(Math.random() * MITOSIS_TYPES.length)];
      const spec = MITOSIS_SPEC[type];
      const angle = Math.random() * Math.PI * 2;

      splits.push({
        type,
        node,
        x: node.x, y: node.y,
        radius: Math.max(node.radius, 4),
        color: STAGE_COLORS[node.stage],
        angle,
        age: 0,
        duration: spec.duration,
        reach: spec.reach,
      });

      spawnBoltSequence(
        node.x, node.y,
        Math.round(rand(SPLIT_BOLT_FRAMES[0], SPLIT_BOLT_FRAMES[1])),
        intensity,
      );

      node.pulse = 1;
      node.vx += Math.cos(angle) * spec.separation;
      node.vy += Math.sin(angle) * spec.separation;

      for (let i = 0; i < spec.children; i++) {
        if (nodes.length >= MAX_NODES) nodes.shift();
        const spin = angle + Math.PI + (i - (spec.children - 1) / 2) * 0.9;
        const child = makeNode(node.x, node.y, node.stage);
        child.radius = Math.max(1.4, node.radius * rand(0.7, 0.95));
        child.scale = 0;
        child.vx = Math.cos(spin) * spec.separation;
        child.vy = Math.sin(spin) * spec.separation;
        nodes.push(child);
      }
    }

    function seedAt(x: number, y: number, intensity: number) {
      const born = 2 + Math.round(intensity * 3);
      for (let i = 0; i < born; i++) {
        if (nodes.length >= MAX_NODES) nodes.shift();
        const a = Math.random() * Math.PI * 2;
        const d = rand(4, 22);
        const node = makeNode(x + Math.cos(a) * d, y + Math.sin(a) * d);
        node.scale = 0;
        node.vx = Math.cos(a) * 0.7;
        node.vy = Math.sin(a) * 0.7;
        nodes.push(node);
      }

      spawnBoltSequence(
        x, y,
        Math.round(rand(BIRTH_BOLT_FRAMES[0], BIRTH_BOLT_FRAMES[1])),
        intensity,
      );
    }

    function chargeIntensity() {
      return Math.min(1, (performance.now() - press.start) / CHARGE_MS);
    }

    function drawCharge() {
      if (!press.active) return;
      const t = chargeIntensity();
      const r = 5 + t * 20;

      ctx!.beginPath();
      ctx!.arc(press.x, press.y, r, 0, Math.PI * 2);
      ctx!.strokeStyle = boltColor(t, 0.75);
      ctx!.lineWidth = 1.4;
      ctx!.shadowBlur = 10 * t;
      ctx!.shadowColor = boltColor(t, 0.8);
      ctx!.stroke();
      ctx!.shadowBlur = 0;

      ctx!.beginPath();
      ctx!.arc(press.x, press.y, r * 0.35, 0, Math.PI * 2);
      ctx!.fillStyle = boltColor(t, 0.35 + t * 0.4);
      ctx!.fill();
    }

    function drawBolts() {
      for (const bolt of bolts) {
        if (bolt.age < bolt.delay) continue;
        const t = (bolt.age - bolt.delay) / bolt.life;
        if (t >= 1) continue;

        const alpha = Math.sin((1 - t) * Math.PI * 0.85);
        const { preset } = bolt;

        for (const arm of bolt.arms) {
          ctx!.beginPath();
          ctx!.moveTo(arm[0].x, arm[0].y);
          for (let i = 1; i < arm.length; i++) ctx!.lineTo(arm[i].x, arm[i].y);

          ctx!.strokeStyle = boltColor(bolt.intensity, alpha * 0.3);
          ctx!.lineWidth = preset.width + preset.glow * 0.3;
          ctx!.shadowBlur = preset.glow;
          ctx!.shadowColor = boltColor(bolt.intensity, 0.85);
          ctx!.stroke();

          ctx!.strokeStyle = boltColor(Math.max(0, bolt.intensity - 0.35), alpha);
          ctx!.lineWidth = preset.width;
          ctx!.shadowBlur = 0;
          ctx!.stroke();
        }
      }

      bolts = bolts.filter((b) => b.age < b.delay + b.life);
    }

    function drawSplits() {
      for (const s of splits) {
        const t = s.age / s.duration;
        if (t >= 1) continue;

        const ease = 1 - Math.pow(1 - t, 3);
        const fade = t < 0.12 ? t / 0.12 : 1 - (t - 0.12) / 0.88;
        const r = s.radius;
        const reach = s.reach;

        ctx!.strokeStyle = s.color;
        ctx!.fillStyle = s.color;
        ctx!.globalAlpha = fade;

        if (s.type === "fission") {
          const gap = ease * reach * 0.5;
          for (const dir of [-1, 1]) {
            ctx!.globalAlpha = fade * 0.55;
            ctx!.beginPath();
            ctx!.arc(s.x + Math.cos(s.angle) * gap * dir, s.y + Math.sin(s.angle) * gap * dir, r * 2.1, 0, Math.PI * 2);
            ctx!.fill();
          }
          ctx!.globalAlpha = fade * (1 - ease) * 0.9;
          ctx!.lineWidth = Math.max(0.6, r * 2 * (1 - ease));
          ctx!.beginPath();
          ctx!.moveTo(s.x - Math.cos(s.angle) * gap, s.y - Math.sin(s.angle) * gap);
          ctx!.lineTo(s.x + Math.cos(s.angle) * gap, s.y + Math.sin(s.angle) * gap);
          ctx!.stroke();
        } else if (s.type === "budding") {
          const d = ease * reach * 0.55;
          ctx!.globalAlpha = fade * 0.6;
          ctx!.beginPath();
          ctx!.arc(s.x + Math.cos(s.angle) * d, s.y + Math.sin(s.angle) * d, r * (0.7 + ease * 1.4), 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = fade * 0.45;
          ctx!.lineWidth = 1.1;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, r * 1.6 + ease * 8, 0, Math.PI * 2);
          ctx!.stroke();
        } else if (s.type === "burst") {
          ctx!.lineWidth = 1.6;
          ctx!.globalAlpha = fade * 0.85;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * reach, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.globalAlpha = fade * 0.45;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * reach * 0.6, 0, Math.PI * 2);
          ctx!.stroke();
          ctx!.globalAlpha = fade * 0.7;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, r * 2.4 * (1 - ease * 0.5), 0, Math.PI * 2);
          ctx!.fill();
        } else if (s.type === "pinch") {
          const gap = ease * reach * 0.45;
          const waist = Math.max(0.4, r * 1.8 * (1 - ease));
          ctx!.globalAlpha = fade * 0.55;
          for (const dir of [-1, 1]) {
            ctx!.beginPath();
            ctx!.ellipse(
              s.x + Math.cos(s.angle) * gap * dir,
              s.y + Math.sin(s.angle) * gap * dir,
              r * 2.2 * (1 + ease * 0.25), r * 1.9 * (1 - ease * 0.15),
              s.angle, 0, Math.PI * 2,
            );
            ctx!.fill();
          }
          ctx!.globalAlpha = fade * 0.9;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, waist, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          const petals = 5;
          ctx!.lineWidth = 1.5;
          for (let i = 0; i < petals; i++) {
            const a = s.angle + (i / petals) * Math.PI * 2 + ease * 0.6;
            ctx!.globalAlpha = fade * 0.7;
            ctx!.beginPath();
            ctx!.arc(s.x, s.y, r * 2 + ease * reach * 0.55, a, a + 0.72);
            ctx!.stroke();
          }
          ctx!.globalAlpha = fade * 0.35;
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, ease * reach, 0, Math.PI * 2);
          ctx!.stroke();
        }

        ctx!.globalAlpha = 1;
      }

      splits = splits.filter((s) => s.age < s.duration);
    }

    function step() {
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

        if (node.scale < 1) node.scale = Math.min(1, node.scale + 0.022);
        if (node.pulse > 0) node.pulse = Math.max(0, node.pulse - 0.012);
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

      for (const s of splits) {
        if (s.node) {
          s.x = s.node.x;
          s.y = s.node.y;
        }
      }

      drawSplits();

      for (const node of nodes) {
        const color = STAGE_COLORS[node.stage];
        const r = node.radius * node.scale;
        if (r <= 0.2) continue;

        if (node.pulse > 0) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, r + (1 - node.pulse) * 30, 0, Math.PI * 2);
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
      drawCharge();

      for (const b of bolts) b.age++;
      for (const s of splits) s.age++;

      frame = requestAnimationFrame(step);
    }

    function localPoint(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function nodeAt(x: number, y: number) {
      let hit: Node | null = null;
      let bestSq = HIT_RADIUS_SQ;
      for (const node of nodes) {
        const dx = node.x - x;
        const dy = node.y - y;
        const dsq = dx * dx + dy * dy;
        if (dsq < bestSq) {
          bestSq = dsq;
          hit = node;
        }
      }
      return hit;
    }

    function onMove(e: PointerEvent) {
      const p = localPoint(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      if (press.active) {
        press.x = p.x;
        press.y = p.y;
      }
    }

    function onLeave() {
      pointer.active = false;
      pointer.x = -9999;
      pointer.y = -9999;
      press.active = false;
    }

    function onDown(e: PointerEvent) {
      const p = localPoint(e);
      press.active = true;
      press.x = p.x;
      press.y = p.y;
      press.start = performance.now();
      press.target = nodeAt(p.x, p.y);
    }

    function onUp() {
      if (!press.active) return;
      const intensity = chargeIntensity();
      press.active = false;

      if (press.target && nodes.includes(press.target)) divide(press.target, intensity);
      else seedAt(press.x, press.y, intensity);

      press.target = null;
    }

    seed();

    if (reduced) {
      step();
      cancelAnimationFrame(frame);
      window.addEventListener("resize", seed);
      return () => window.removeEventListener("resize", seed);
    }

    frame = requestAnimationFrame(step);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onLeave);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onLeave);
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
