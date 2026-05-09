const STATUS_CLASS: Record<string, string> = {
  "Wishlist":              "status-wishlist",
  "Submitted":             "status-submitted",
  "No Response":           "status-no-resp",
  "Interview Scheduled":   "status-interview",
  "Active - Written":      "status-active",
  "Active - HR":           "status-active",
  "Active - Technical":    "status-active",
  "Active - Cultural Fit": "status-active",
  "Offer Received":        "status-offer",
  "Rejected":              "status-rejected",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? "status-wishlist";
  return (
    <span className={`role-badge ${cls} whitespace-nowrap`}>{status}</span>
  );
}
