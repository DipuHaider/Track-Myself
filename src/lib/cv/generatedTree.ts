import type { CVFileMeta } from "@/types/cv";

/**
 * Groups generated documents into the folder tree the library renders:
 *
 *   CV / Resume / Cover Letter  →  year  →  month  →  day  →  files
 *
 * Nothing here needs a schema change beyond genDate: the type comes from
 * genDocType and the date from genDate, which is written once at generation from
 * the same value as the filename. uploadedAt is UTC, so grouping on it would put a
 * document generated at 23:30 in Dhaka in a folder that disagrees with its own name.
 */

export type DocFolder = "CV" | "Resume" | "Cover Letter" | "Other";

export const FOLDER_ORDER: DocFolder[] = ["CV", "Resume", "Cover Letter", "Other"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type TreeNode = {
  key: string;
  label: string;
  count: number;
  children: TreeNode[];
  files: CVFileMeta[];
};

export function folderForDocType(file: CVFileMeta): DocFolder {
  const kind = file.genDocType || file.category || "cv";
  if (kind === "cover-letter") return "Cover Letter";
  if (kind === "resume") return "Resume";
  if (kind === "cv") return "CV";
  return "Other";
}

/** genDate first; legacy rows fall back to uploadedAt read in UTC. */
export function dateParts(file: CVFileMeta): { y: string; m: string; d: string } {
  const iso = /^\d{4}-\d{2}-\d{2}/.test(file.genDate ?? "")
    ? (file.genDate as string).slice(0, 10)
    : String(file.uploadedAt ?? "").slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return { y, m, d };
  }
  return { y: "Undated", m: "", d: "" };
}

export function monthLabel(m: string): string {
  const i = Number(m) - 1;
  return MONTHS[i] ?? m;
}

export function buildGeneratedTree(files: CVFileMeta[]): TreeNode[] {
  const byFolder = new Map<string, Map<string, Map<string, CVFileMeta[]>>>();

  for (const file of files) {
    const folder = folderForDocType(file);
    const { y, m, d } = dateParts(file);
    const year = y;
    const month = m || "—";
    const day = d || "—";

    if (!byFolder.has(folder)) byFolder.set(folder, new Map());
    const years = byFolder.get(folder)!;
    if (!years.has(year)) years.set(year, new Map());
    const months = years.get(year)!;
    const dayKey = `${month}/${day}`;
    if (!months.has(dayKey)) months.set(dayKey, []);
    months.get(dayKey)!.push(file);
  }

  const desc = (a: string, b: string) => b.localeCompare(a);

  return FOLDER_ORDER.filter((f) => byFolder.has(f)).map((folder) => {
    const years = byFolder.get(folder)!;

    const yearNodes: TreeNode[] = [...years.keys()].sort(desc).map((year) => {
      const dayMap = years.get(year)!;

      /* Regroup the flat month/day keys into month → day. */
      const months = new Map<string, Map<string, CVFileMeta[]>>();
      for (const [key, list] of dayMap) {
        const [month, day] = key.split("/");
        if (!months.has(month)) months.set(month, new Map());
        months.get(month)!.set(day, list);
      }

      const monthNodes: TreeNode[] = [...months.keys()].sort(desc).map((month) => {
        const days = months.get(month)!;
        const dayNodes: TreeNode[] = [...days.keys()].sort(desc).map((day) => {
          const list = days.get(day)!.slice().sort((a, b) =>
            String(b.uploadedAt ?? "").localeCompare(String(a.uploadedAt ?? "")),
          );
          return {
            key: `${folder}/${year}/${month}/${day}`,
            label: day === "—" ? "Unknown day" : `${Number(day)} ${monthLabel(month)}`,
            count: list.length,
            children: [],
            files: list,
          };
        });

        return {
          key: `${folder}/${year}/${month}`,
          label: month === "—" ? "Unknown month" : monthLabel(month),
          count: dayNodes.reduce((n, x) => n + x.count, 0),
          children: dayNodes,
          files: [],
        };
      });

      return {
        key: `${folder}/${year}`,
        label: year,
        count: monthNodes.reduce((n, x) => n + x.count, 0),
        children: monthNodes,
        files: [],
      };
    });

    return {
      key: folder,
      label: folder,
      count: yearNodes.reduce((n, x) => n + x.count, 0),
      children: yearNodes,
      files: [],
    };
  });
}
