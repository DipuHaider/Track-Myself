"use client";

export type HeroNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  stage: number;
  phase: number;
  wobble: number;
  scale: number;
  pulse: number;
};

export type HeroField = {
  nodes(): readonly HeroNode[];
  consume(node: HeroNode): boolean;
  burst(x: number, y: number, intensity: number): void;
};

let field: HeroField | null = null;

export function publishHeroField(next: HeroField) {
  field = next;
  return () => {
    if (field === next) field = null;
  };
}

export function heroField() {
  return field;
}
