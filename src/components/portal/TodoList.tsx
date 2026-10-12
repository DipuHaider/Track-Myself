"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { apiFetch, ApiError } from "@/lib/api/client";

type Todo = {
  _id: string;
  title: string;
  done: boolean;
  dueAt: string | null;
};

const describe = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);

export default function TodoList({ variant = "card" }: { variant?: "card" | "plain" }) {
  const confirm = useConfirm();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch<Todo[]>("/api/user/todos")
      .then((rows) => { if (alive) setTodos(Array.isArray(rows) ? rows : []); })
      .catch((err) => { if (alive) toast.error(describe(err, "Could not load your to-dos.")); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  const add = async () => {
    const value = title.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const created = await apiFetch<Todo>("/api/user/todos", {
        method: "POST",
        json: { title: value, dueAt: dueAt || null },
      });
      setTodos((list) => [...list, created]);
      setTitle("");
      setDueAt("");
    } catch (err) {
      toast.error(describe(err, "Could not add that."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (todo: Todo) => {
    setTodos((list) => list.map((t) => (t._id === todo._id ? { ...t, done: !t.done } : t)));
    try {
      await apiFetch(`/api/user/todos/${todo._id}`, { method: "PATCH", json: { done: !todo.done } });
    } catch (err) {
      setTodos((list) => list.map((t) => (t._id === todo._id ? { ...t, done: todo.done } : t)));
      toast.error(describe(err, "Could not save that change."));
    }
  };

  const remove = async (todo: Todo) => {
    const ok = await confirm({
      title: "Delete this to-do?",
      message: `“${todo.title}” will be removed. This cannot be undone.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    const before = todos;
    setTodos((list) => list.filter((t) => t._id !== todo._id));
    try {
      await apiFetch(`/api/user/todos/${todo._id}`, { method: "DELETE" });
      toast.success("To-do deleted.");
    } catch (err) {
      setTodos(before);
      toast.error(describe(err, "Could not delete that."));
    }
  };

  const plain = variant === "plain";

  return (
    <section
      id="todos"
      data-tour="todos"
      className={plain ? "p-5" : "surface scroll-mt-24 rounded-xl border p-5"}
    >
      <div className="mb-4 flex items-center justify-between">
        {plain ? (
          <span className="text-muted text-xs">Everything here is saved to your account.</span>
        ) : (
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ListTodo size={17} className="text-[var(--primary)]" aria-hidden="true" />
            To-Do list
          </h2>
        )}
        <span className="text-muted text-xs">{remaining} open</span>
      </div>

      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder="Follow up with Zalando…"
          maxLength={300}
          aria-label="New to-do"
          className="surface-muted min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          aria-label="Due date (optional)"
          title="Due date — you'll get a notification when it is close"
          className="surface-muted shrink-0 rounded-lg border px-2 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy || !title.trim()}
          className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm disabled:opacity-50"
        >
          <Plus size={15} aria-hidden="true" />
          Add
        </button>
      </div>

      <ul className="mt-4 space-y-1.5">
        {loading && <li className="text-muted text-sm">Loading…</li>}
        {!loading && !todos.length && (
          <li className="text-muted text-sm">Nothing here yet — add your first follow-up above.</li>
        )}
        {todos.map((todo) => (
          <li key={todo._id} className="surface-muted flex items-center gap-3 rounded-lg border px-3 py-2">
            <button
              type="button"
              role="checkbox"
              aria-checked={todo.done}
              aria-label={todo.done ? `Mark "${todo.title}" as open` : `Mark "${todo.title}" as done`}
              onClick={() => toggle(todo)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded border transition"
              style={{
                background: todo.done ? "var(--primary)" : "transparent",
                borderColor: todo.done ? "var(--primary)" : "var(--border)",
                color: "#fff",
              }}
            >
              {todo.done && <Check size={13} aria-hidden="true" />}
            </button>

            <span className={`min-w-0 flex-1 text-sm ${todo.done ? "text-muted line-through" : ""}`}>
              {todo.title}
              {todo.dueAt && (
                <span className="text-muted ml-2 text-xs">
                  due {new Date(todo.dueAt).toLocaleDateString()}
                </span>
              )}
            </span>

            <button
              type="button"
              onClick={() => remove(todo)}
              aria-label={`Delete "${todo.title}"`}
              className="text-muted shrink-0 rounded p-1 transition hover:text-[var(--danger)]"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
