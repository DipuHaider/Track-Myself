import { ensureIndexes } from "@/lib/migrations/ensureIndexes";
import { normaliseEmails } from "@/lib/migrations/normaliseEmails";
import { backfillEmailVerified } from "@/lib/migrations/backfillEmailVerified";
import { purgePreviewCvFiles } from "@/lib/migrations/purgePreviewCvFiles";
import { backfillDocumentApplicationId } from "@/lib/migrations/backfillDocumentApplicationId";
import { backfillInterviewUserId } from "@/lib/migrations/backfillInterviewUserId";
import { dropReminders } from "@/lib/migrations/dropReminders";

export type MigrationResult = Record<string, number | string | boolean | string[] | Record<string, string[]>>;

export type Migration = {
  description: string;
  run(): Promise<MigrationResult>;
};

/* Every entry is idempotent: running it twice yields the same database. New
   migrations register here and are triggered by a superadmin from Settings →
   Maintenance or `POST /api/admin/migrations/<name>`; nothing runs on deploy. */
export const MIGRATIONS: Record<string, Migration> = {
  "ensure-indexes": {
    description: "Build or sync every declared index (safe to repeat).",
    run: async () => ({ indexes: await ensureIndexes() }),
  },
  "normalise-emails": {
    description: "Lowercase and trim every email; reports case-variant conflicts without merging them.",
    run: normaliseEmails,
  },
  "backfill-email-verified": {
    description: "Stamp accounts created before email verification existed as verified at their creation date.",
    run: backfillEmailVerified,
  },
  "purge-preview-cvfiles": {
    description: "Remove the byte-less preview-draft rows that used to live in CVFile (drafts now expire in AiDraft).",
    run: purgePreviewCvFiles,
  },
  "backfill-document-application-id": {
    description: "Link each attachment Document to the application that references it, so forever-deletes cascade.",
    run: backfillDocumentApplicationId,
  },
  "backfill-interview-user-id": {
    description: "Stamp each interview round with its owner, removing rounds whose application no longer exists.",
    run: backfillInterviewUserId,
  },
  "drop-reminders": {
    description: "Drop the unused reminders collection.",
    run: dropReminders,
  },
};

export function migrationNames(): string[] {
  return Object.keys(MIGRATIONS);
}
