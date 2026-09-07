import dbConnect from "@/lib/db";
import AccessControl from "@/models/AccessControl";
import {
  ACTION_ROLES,
  DASHBOARD_ACTIONS,
  LOCKED_ACTIONS,
  ROLES,
  type DashboardAction,
  type Role,
} from "@/lib/permissions";

export type AccessMatrix = Record<DashboardAction, Role[]>;

const MATRIX_TTL_MS = 60 * 1000;

let cache: { matrix: AccessMatrix; updatedBy: string; updatedAt: string | null; at: number } | null = null;

export function defaultMatrix(): AccessMatrix {
  const out = {} as AccessMatrix;
  for (const action of DASHBOARD_ACTIONS) out[action] = [...ACTION_ROLES[action]];
  return out;
}

function normalise(raw: Record<string, unknown> | undefined): AccessMatrix {
  const out = defaultMatrix();
  if (!raw) return out;

  for (const action of DASHBOARD_ACTIONS) {
    const value = raw[action];
    if (!Array.isArray(value)) continue;

    const roles = value.filter((r): r is Role => ROLES.includes(r as Role));
    out[action] = LOCKED_ACTIONS.includes(action) ? [...ACTION_ROLES[action]] : roles;

    if (!out[action].includes("superadmin")) out[action] = ["superadmin", ...out[action]];
  }

  return out;
}

export function invalidateAccessMatrix() {
  cache = null;
}

export async function getAccessControl(force = false) {
  if (!force && cache && Date.now() - cache.at < MATRIX_TTL_MS) return cache;

  await dbConnect();
  const doc = (await AccessControl.findOne({ key: "default" }).lean()) as
    | { matrix?: Record<string, unknown>; updatedBy?: string; updatedAt?: Date }
    | null;

  const raw = doc?.matrix instanceof Map
    ? Object.fromEntries(doc.matrix as unknown as Map<string, unknown>)
    : (doc?.matrix as Record<string, unknown> | undefined);

  cache = {
    matrix: normalise(raw),
    updatedBy: doc?.updatedBy ?? "",
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    at: Date.now(),
  };

  return cache;
}

export async function getAccessMatrix(): Promise<AccessMatrix> {
  return (await getAccessControl()).matrix;
}

export async function canDoServer(role: string | null | undefined, action: DashboardAction) {
  if (!role) return false;
  const matrix = await getAccessMatrix();
  return (matrix[action] as string[]).includes(role);
}

export async function getAllowedActions(role: string | null | undefined): Promise<DashboardAction[]> {
  if (!role) return [];
  const matrix = await getAccessMatrix();
  return DASHBOARD_ACTIONS.filter((action) => (matrix[action] as string[]).includes(role));
}

export async function saveAccessMatrix(
  input: Record<string, unknown>,
  actor: { id: string; email?: string | null; role: Role },
) {
  const current = await getAccessMatrix();
  const next = normalise(input);

  for (const action of LOCKED_ACTIONS) next[action] = current[action];

  await dbConnect();
  await AccessControl.findOneAndUpdate(
    { key: "default" },
    { $set: { matrix: next, updatedBy: actor.email ?? actor.id } },
    { upsert: true, new: true },
  );

  invalidateAccessMatrix();
  return getAccessControl(true);
}

export async function resetAccessMatrix(actor: { id: string; email?: string | null }) {
  await dbConnect();
  await AccessControl.findOneAndUpdate(
    { key: "default" },
    { $set: { matrix: defaultMatrix(), updatedBy: actor.email ?? actor.id } },
    { upsert: true, new: true },
  );

  invalidateAccessMatrix();
  return getAccessControl(true);
}
