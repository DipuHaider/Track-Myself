"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { heroField, type HeroNode } from "@/lib/hero/heroField";
import {
  BASE_RADIUS, BASE_SPEED, BASE_TURN, BURST_MS, CHOMP_MAX, CLONE_EAT_MS, CLONE_RADIUS,
  CLONE_SEEK_RADIUS, CLONE_SPAWN_GAP_MS, CLONE_SPEED, CLONE_TTL_MS, CLONE_TURN, EAT_FACTOR,
  RETARGET_FRAMES, SPAWN_MS, TRAIL_FRAMES,
  createLoadTracker, densestCells, eatIntervalMs, nearestNode, nextRage, wantClones,
} from "@/lib/hero/pacman";

const RING_MAX = 64;
const WRAP_PAD = 60;

type PacState = "spawning" | "alive" | "bursting";

type Pac = {
  group: THREE.Group;
  upper: THREE.Group;
  lower: THREE.Group;
  rig: THREE.Group;
  eye: THREE.Mesh;
  owned: THREE.MeshPhongMaterial[];
  radius: number;
  speed: number;
  turn: number;
  x: number;
  y: number;
  heading: number;
  chompRate: number;
  wander: number;
  isClone: boolean;
  target: HeroNode | null;
  cellX: number;
  cellY: number;
  hasCell: boolean;
  nextEatAt: number;
  bornAt: number;
  state: PacState;
  stateAt: number;
  tick: number;
};

type Ring = {
  active: boolean;
  x: number;
  y: number;
  born: number;
  life: number;
  from: number;
  to: number;
  color: THREE.Color;
};

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jawProfile() {
  const points = [new THREE.Vector2(0, 0)];
  for (let i = 0; i <= 14; i++) {
    const a = (Math.PI / 2) * (1 - i / 14);
    points.push(new THREE.Vector2(Math.sin(a), Math.cos(a)));
  }
  return points;
}

export default function PacmanLayer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let width = mount.clientWidth || window.innerWidth;
    let height = mount.clientHeight || 640;

    let renderer: THREE.WebGLRenderer;
    try {
      const startDpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: startDpr < 1.5,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(startDpr);
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      mount.appendChild(renderer.domElement);
    } catch {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, width, 0, -height, 1, 1000);
    camera.position.set(0, 0, 500);

    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(0.4, 0.7, 1).multiplyScalar(500);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x4169e1, 0.8);
    fillLight.position.set(-0.6, -0.3, 0.4).multiplyScalar(500);
    scene.add(fillLight);

    const jawGeo = new THREE.LatheGeometry(jawProfile(), 36);
    const eyeGeo = new THREE.SphereGeometry(1, 10, 8);
    const crestGeo = new THREE.TorusGeometry(1, 0.11, 6, 24, Math.PI);
    const bandGeo = new THREE.TorusGeometry(1, 0.06, 6, 28);
    const ringGeo = new THREE.RingGeometry(0.72, 1, 36);

    const bodyBase = new THREE.MeshPhongMaterial({
      color: 0xffd93b, emissive: 0x3a2e00, specular: 0x333333, shininess: 40,
    });
    const rageBase = new THREE.MeshPhongMaterial({
      color: 0xb01030, emissive: 0x3a0008, specular: 0x552222, shininess: 60,
    });
    const crestBase = new THREE.MeshPhongMaterial({
      color: 0xc87f2a, emissive: 0x2a1600, specular: 0x8a6a30, shininess: 90,
    });
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0x101426, shininess: 10 });

    const ringMat = new THREE.MeshBasicMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const rings = new THREE.InstancedMesh(ringGeo, ringMat, RING_MAX);
    rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    rings.renderOrder = -1;
    rings.frustumCulled = false;
    scene.add(rings);

    const ringPool: Ring[] = [];
    for (let i = 0; i < RING_MAX; i++) {
      ringPool.push({
        active: false, x: 0, y: 0, born: 0, life: 1, from: 0, to: 0,
        color: new THREE.Color(0xffffff),
      });
    }

    const dummy = new THREE.Object3D();
    const scratch = new THREE.Color();
    const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < RING_MAX; i++) {
      rings.setMatrixAt(i, hidden);
      rings.setColorAt(i, scratch.setRGB(0, 0, 0));
    }

    const eatColor = new THREE.Color(0x9ad8ff);
    const rageColor = new THREE.Color(0xff6b7a);

    function addRing(x: number, y: number, from: number, to: number, life: number, color: THREE.Color) {
      let slot = -1;
      let oldest = Infinity;
      for (let i = 0; i < RING_MAX; i++) {
        if (!ringPool[i].active) {
          slot = i;
          break;
        }
        if (ringPool[i].born < oldest) {
          oldest = ringPool[i].born;
          slot = i;
        }
      }
      if (slot < 0) return;

      const ring = ringPool[slot];
      ring.active = true;
      ring.x = x;
      ring.y = y;
      ring.born = performance.now();
      ring.life = life;
      ring.from = from;
      ring.to = to;
      ring.color.copy(color);
    }

    function buildPac(isClone: boolean): Pac {
      const group = new THREE.Group();
      const upper = new THREE.Group();
      const lower = new THREE.Group();
      const rig = new THREE.Group();

      const owned: THREE.MeshPhongMaterial[] = [];
      let body = bodyBase;
      let crestMat = crestBase;

      if (isClone) {
        body = rageBase.clone();
        crestMat = crestBase.clone();
        body.transparent = true;
        crestMat.transparent = true;
        owned.push(body, crestMat);
      }

      const upperMesh = new THREE.Mesh(jawGeo, body);
      const lowerMesh = new THREE.Mesh(jawGeo, body);
      lowerMesh.rotation.x = Math.PI;
      upper.add(upperMesh);
      lower.add(lowerMesh);

      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.setScalar(0.11);
      eye.position.set(0.185, 0.536, 0.865);
      rig.add(eye);

      if (isClone) {
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.scale.set(1.14, 1.14, 0.34);
        rig.add(crest);

        const band = new THREE.Mesh(bandGeo, crestMat);
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.45;
        band.scale.setScalar(0.96);
        rig.add(band);
      }

      group.add(upper, lower, rig);
      group.rotation.x = 0.25;
      scene.add(group);

      const now = performance.now();

      return {
        group, upper, lower, rig, eye, owned,
        radius: isClone ? CLONE_RADIUS : BASE_RADIUS,
        speed: isClone ? CLONE_SPEED : BASE_SPEED,
        turn: isClone ? CLONE_TURN : BASE_TURN,
        x: width * 0.5,
        y: height * 0.5,
        heading: rand(0, Math.PI * 2),
        chompRate: isClone ? 0.021 : 0.014,
        wander: rand(0, Math.PI * 2),
        isClone,
        target: null,
        cellX: 0,
        cellY: 0,
        hasCell: false,
        nextEatAt: 0,
        bornAt: now,
        state: isClone ? "spawning" : "alive",
        stateAt: now,
        tick: Math.floor(rand(0, RETARGET_FRAMES)),
      };
    }

    function destroyPac(pac: Pac) {
      scene.remove(pac.group);
      for (const mat of pac.owned) mat.dispose();
    }

    const base = buildPac(false);
    const clones: Pac[] = [];
    let rage = false;
    let lastSpawnAt = 0;

    const tracker = createLoadTracker();
    let last = performance.now();
    let frame = 0;
    let lost = false;

    function steer(pac: Pac, tx: number, ty: number) {
      const desired = Math.atan2(ty - pac.y, tx - pac.x);
      let diff = desired - pac.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      pac.heading += Math.max(-pac.turn, Math.min(pac.turn, diff));
    }

    function advance(pac: Pac) {
      pac.x += Math.cos(pac.heading) * pac.speed;
      pac.y += Math.sin(pac.heading) * pac.speed;

      if (pac.x < -WRAP_PAD) pac.x = width + WRAP_PAD;
      if (pac.x > width + WRAP_PAD) pac.x = -WRAP_PAD;
      if (pac.y < -WRAP_PAD) pac.y = height + WRAP_PAD;
      if (pac.y > height + WRAP_PAD) pac.y = -WRAP_PAD;
    }

    function tryEat(pac: Pac, nodes: readonly HeroNode[], now: number) {
      if (now < pac.nextEatAt) return false;

      const field = heroField();
      if (!field) return false;

      const reach = pac.radius * EAT_FACTOR;
      const reachSq = reach * reach;

      for (const node of nodes) {
        const dx = node.x - pac.x;
        const dy = node.y - pac.y;
        if (dx * dx + dy * dy > reachSq) continue;
        if (!field.consume(node)) continue;

        if (pac.target === node) pac.target = null;
        addRing(node.x, node.y, 2, pac.radius * 0.9, 340, pac.isClone ? rageColor : eatColor);
        return true;
      }

      return false;
    }

    function drawPac(pac: Pac, now: number, scale: number) {
      const phi = (1 - Math.cos(now * pac.chompRate)) * 0.5 * CHOMP_MAX;
      pac.upper.rotation.z = phi;
      pac.lower.rotation.z = -phi;
      pac.group.position.set(pac.x, -pac.y, 0);
      pac.group.rotation.z = -pac.heading;
      pac.rig.rotation.z = pac.heading;
      pac.eye.position.x = Math.cos(pac.heading) < 0 ? -0.185 : 0.185;
      pac.group.scale.setScalar(pac.radius * scale);
    }

    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);

      const dt = now - last;
      last = now;
      tracker.sample(dt);

      const field = heroField();
      if (!field) {
        renderer.render(scene, camera);
        return;
      }

      const nodes = field.nodes();
      const n = nodes.length;
      const load = tracker.load();

      rage = nextRage(rage, n, load);
      const want = wantClones(rage, n, load);

      if (clones.length < want && now - lastSpawnAt > CLONE_SPAWN_GAP_MS) {
        const born = buildPac(true);
        born.x = base.x;
        born.y = base.y;
        born.heading = base.heading + rand(-1.2, 1.2);
        clones.push(born);
        lastSpawnAt = now;
        field.burst(base.x, base.y, 0.9);
        addRing(base.x, base.y, 4, BASE_RADIUS * 2.4, 420, rageColor);
      }

      base.tick++;
      const cells = base.tick % RETARGET_FRAMES === 0 ? densestCells(nodes, width, height) : null;

      if (now >= base.nextEatAt) {
        if (!base.target || nodes.indexOf(base.target) < 0) {
          base.target = nearestNode(nodes, base.x, base.y);
        }
        if (base.target) steer(base, base.target.x, base.target.y);
        advance(base);
        if (tryEat(base, nodes, now)) base.nextEatAt = now + eatIntervalMs(n, load);
      } else {
        base.wander += 0.013;
        base.heading += Math.sin(base.wander) * 0.02;
        base.target = null;
        advance(base);
      }
      drawPac(base, now, 1);

      for (let i = clones.length - 1; i >= 0; i--) {
        const pac = clones[i];
        pac.tick++;

        if (pac.state === "bursting") {
          const t = Math.min(1, (now - pac.stateAt) / BURST_MS);
          pac.group.rotation.z += 0.35;
          pac.group.scale.setScalar(pac.radius * (1 + t * 0.5));
          for (const mat of pac.owned) mat.opacity = 1 - t;
          if (t >= 1) {
            destroyPac(pac);
            clones.splice(i, 1);
          }
          continue;
        }

        if (now - pac.bornAt >= CLONE_TTL_MS || i >= want) {
          pac.state = "bursting";
          pac.stateAt = now;
          field.burst(pac.x, pac.y, 1);
          for (let k = 0; k < 3; k++) {
            addRing(pac.x, pac.y, 3, CLONE_RADIUS * (2.2 + k * 0.9), 320 + k * 110, rageColor);
          }
          continue;
        }

        if (cells && cells.length) {
          const cell = cells[Math.min(cells.length - 1, i)];
          pac.cellX = cell.x;
          pac.cellY = cell.y;
          pac.hasCell = true;
        }

        const near = nearestNode(nodes, pac.x, pac.y, CLONE_SEEK_RADIUS);
        if (near) steer(pac, near.x, near.y);
        else if (pac.hasCell) steer(pac, pac.cellX, pac.cellY);

        advance(pac);
        if (tryEat(pac, nodes, now)) pac.nextEatAt = now + CLONE_EAT_MS;

        if (pac.tick % TRAIL_FRAMES === 0) {
          addRing(pac.x, pac.y, pac.radius * 0.5, pac.radius * 0.1, 350, rageColor);
        }

        const grow = pac.state === "spawning" ? Math.min(1, (now - pac.bornAt) / SPAWN_MS) : 1;
        if (grow >= 1) pac.state = "alive";
        drawPac(pac, now, 0.2 + grow * 0.8);
      }

      for (let i = 0; i < RING_MAX; i++) {
        const ring = ringPool[i];
        if (!ring.active) {
          rings.setMatrixAt(i, hidden);
          continue;
        }

        const t = (now - ring.born) / ring.life;
        if (t >= 1) {
          ring.active = false;
          rings.setMatrixAt(i, hidden);
          rings.setColorAt(i, scratch.setRGB(0, 0, 0));
          continue;
        }

        const size = ring.from + (ring.to - ring.from) * t;
        dummy.position.set(ring.x, -ring.y, 0);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(size, size, 1);
        dummy.updateMatrix();
        rings.setMatrixAt(i, dummy.matrix);

        const alpha = (1 - t) * (1 - t);
        rings.setColorAt(i, scratch.copy(ring.color).multiplyScalar(alpha));
      }

      rings.instanceMatrix.needsUpdate = true;
      if (rings.instanceColor) rings.instanceColor.needsUpdate = true;

      renderer.render(scene, camera);
    };

    function resize() {
      const w = mount!.clientWidth;
      const h = mount!.clientHeight;
      if (!w || !h) return;

      width = w;
      height = h;
      camera.right = width;
      camera.bottom = -height;
      camera.updateProjectionMatrix();

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (renderer.getPixelRatio() !== dpr) renderer.setPixelRatio(dpr);
      renderer.setSize(width, height);
    }

    function onContextLost(e: Event) {
      e.preventDefault();
      lost = true;
      cancelAnimationFrame(frame);
    }

    function onVisibility() {
      last = performance.now();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    document.addEventListener("visibilitychange", onVisibility);

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      document.removeEventListener("visibilitychange", onVisibility);

      for (const pac of clones) destroyPac(pac);
      destroyPac(base);

      jawGeo.dispose();
      eyeGeo.dispose();
      crestGeo.dispose();
      bandGeo.dispose();
      ringGeo.dispose();
      bodyBase.dispose();
      rageBase.dispose();
      crestBase.dispose();
      eyeMat.dispose();
      ringMat.dispose();
      rings.dispose();
      scene.clear();

      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      if (!lost) renderer.forceContextLoss();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
