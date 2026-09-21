import TodoList from "@/components/portal/TodoList";

export default function TodosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">To-Do list</h1>
        <p className="text-muted mt-1 text-sm">
          Follow-ups, chases and reminders for your job hunt. Saved to your account, so they follow
          you between devices.
        </p>
      </div>

      <TodoList />
    </div>
  );
}
