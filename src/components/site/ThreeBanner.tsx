"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const PARTICLE_COUNT = 130;
const CONNECTION_DIST = 2.8;
const MOUSE_RADIUS = 4;
const MOUSE_FORCE = 0.0006;
const MAX_LINES = PARTICLE_COUNT * 6;

export default function ThreeBanner() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current!;
    let width = container.clientWidth;
    let height = container.clientHeight;

    // Renderer (transparent so CSS gradient shows through)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 9;

    // Particles —— mix of two colors for depth
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const velocities: { x: number; y: number }[] = [];

    const c1 = new THREE.Color(0xa78bfa); // violet-400
    const c2 = new THREE.Color(0x60a5fa); // blue-400

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

      const t = Math.random();
      const c = c1.clone().lerp(c2, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      velocities.push({
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
      });
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.07,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });
    scene.add(new THREE.Points(particleGeo, particleMat));

    // Line segments for connections
    const linePositions = new Float32Array(MAX_LINES * 6);
    const lineGeo = new THREE.BufferGeometry();
    const linePosAttr = new THREE.BufferAttribute(linePositions, 3);
    lineGeo.setAttribute("position", linePosAttr);
    lineGeo.setDrawRange(0, 0);

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x8b5cf6,
      transparent: true,
      opacity: 0.25,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    // Mouse → world-space coordinates
    const mouse = { wx: 0, wy: 0 };
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / width) * 2 - 1;
      const ny = -((e.clientY - rect.top) / height) * 2 + 1;
      const halfFov = (camera.fov * Math.PI) / 360;
      const worldH = camera.position.z * Math.tan(halfFov) * 2;
      mouse.wx = nx * (worldH / 2) * camera.aspect;
      mouse.wy = ny * (worldH / 2);
    };
    container.addEventListener("mousemove", onMouseMove);

    const pos = particleGeo.attributes.position.array as Float32Array;
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      let li = 0;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;

        // Move
        pos[ix] += velocities[i].x;
        pos[ix + 1] += velocities[i].y;

        // Mouse attraction
        const dx = mouse.wx - pos[ix];
        const dy = mouse.wy - pos[ix + 1];
        const distSq = dx * dx + dy * dy;
        if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          velocities[i].x += (dx / dist) * MOUSE_FORCE;
          velocities[i].y += (dy / dist) * MOUSE_FORCE;
        }

        // Speed cap
        const spd = Math.sqrt(velocities[i].x ** 2 + velocities[i].y ** 2);
        if (spd > 0.025) {
          velocities[i].x = (velocities[i].x / spd) * 0.025;
          velocities[i].y = (velocities[i].y / spd) * 0.025;
        }

        // Wrap boundaries
        if (pos[ix] > 11) pos[ix] = -11;
        else if (pos[ix] < -11) pos[ix] = 11;
        if (pos[ix + 1] > 7) pos[ix + 1] = -7;
        else if (pos[ix + 1] < -7) pos[ix + 1] = 7;

        // Connect nearby particles
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          if (li >= MAX_LINES) break;
          const jx = j * 3;
          const ddx = pos[ix] - pos[jx];
          const ddy = pos[ix + 1] - pos[jx + 1];
          if (Math.sqrt(ddx * ddx + ddy * ddy) < CONNECTION_DIST) {
            linePositions[li * 6] = pos[ix];
            linePositions[li * 6 + 1] = pos[ix + 1];
            linePositions[li * 6 + 2] = pos[ix + 2];
            linePositions[li * 6 + 3] = pos[jx];
            linePositions[li * 6 + 4] = pos[jx + 1];
            linePositions[li * 6 + 5] = pos[jx + 2];
            li++;
          }
        }
      }

      particleGeo.attributes.position.needsUpdate = true;
      linePosAttr.needsUpdate = true;
      lineGeo.setDrawRange(0, li * 2);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      particleGeo.dispose();
      lineGeo.dispose();
      particleMat.dispose();
      lineMat.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
