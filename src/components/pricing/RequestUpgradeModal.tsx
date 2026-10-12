"use client";

import { CheckCircle2, ExternalLink, Mail } from "lucide-react";
import ReportIssueModal, { type IssueReportRow } from "@/components/shared/ReportIssueModal";
import { premiumPriceLabel } from "@/components/pricing/PlanComparison";

export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "";
export const UPGRADE_PAY_URL = process.env.NEXT_PUBLIC_UPGRADE_PAY_URL?.trim() || "";

export default function RequestUpgradeModal({
  open, onClose, email, onSent,
}: {
  open: boolean;
  onClose: () => void;
  email?: string | null;
  onSent?: (report: IssueReportRow) => void;
}) {
  const price = premiumPriceLabel();
  const message = `I'd like to upgrade to Premium${price !== "Contact us" ? ` (${price})` : ""}.${
    email ? ` Account: ${email}.` : ""
  } Please tell me how to pay.`;

  return (
    <ReportIssueModal
      open={open}
      onClose={onClose}
      title="Request an upgrade"
      initialCategory="Upgrade request"
      lockCategory
      initialMessage={message}
      messageLabel="Anything we should know?"
      placeholder="Preferred payment method, billing name, or questions about Premium."
      submitLabel="Send upgrade request"
      onSent={onSent}
      renderSuccess={(close) => (
        <div className="flex flex-col items-center gap-3 p-8 text-center">
          <CheckCircle2 size={34} className="text-success" aria-hidden="true" />
          <p className="font-medium">Request received.</p>
          <p className="text-muted text-sm">
            We&apos;ll confirm by email and switch your account to Premium once payment is arranged.
            You can follow it under Settings → Plan.
          </p>
          {(SUPPORT_EMAIL || UPGRADE_PAY_URL) && (
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              {UPGRADE_PAY_URL && (
                <a
                  href={UPGRADE_PAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  Pay via Payoneer
                </a>
              )}
              {SUPPORT_EMAIL && (
                <a
                  href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("TrackMyself Premium upgrade")}`}
                  className="btn-secondary flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm"
                >
                  <Mail size={14} aria-hidden="true" />
                  Email us
                </a>
              )}
            </div>
          )}
          <button type="button" onClick={close} className="text-muted mt-2 text-sm hover:underline">
            Done
          </button>
        </div>
      )}
    />
  );
}
