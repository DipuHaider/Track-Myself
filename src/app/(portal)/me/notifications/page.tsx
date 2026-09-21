import NotificationsList from "@/components/notifications/NotificationsList";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-muted mt-1 text-sm">
          Ghost listings, duplicates, upcoming interviews and due to-dos are worked out live from
          your data, so they clear themselves once you deal with them. Account and issue updates
          stay until you dismiss them.
        </p>
      </div>

      <NotificationsList />
    </div>
  );
}
