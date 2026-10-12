export function normaliseEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}
