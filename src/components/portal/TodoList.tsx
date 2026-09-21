"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ListTodo, Plus, Trash2 } from "lucide-react";

type Todo = {
  _id: string;
  title: string;
  done: boolean;
  dueAt: string | null;
};

export default function TodoList({ variant = "card" }: { variant?: "card" | "plain" }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/todos")
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => setTodos(Array.isArray(rows) ? rows : []))
      .catch(() => setError("Could not load your to-dos"))
      .finally(() => setLoading(false));
  }, []);

  const remaining = useMemo(() => todos.filter((t) => !t.done).length, [todos]);

  const add = async () => {
    const value = title.trim();
    if (!value || busy) return;

    setBusy(true);
    setError("");
    const res = await fetch("/api/user/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value, dueAt: dueAt || null }),
    }).catch(() => null);
    setBusy(false);

    if (!res || !res.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Could not add that");
      return;
    }

    const created = await res.json();
    setTodos((list) => [...list, created]);
    setTitle("");
    setDueAt("");
  };

  const toggle = async (todo: Todo) => {
    setTodos((list) => list.map((t) => (t._id === todo._id ? { ...t, done: !t.done } : t)));
    const res = await fetch(`/api/user/todos/${todo._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    }).catch(() => null);

    if (!res || !res.ok) {
      setTodos((list) => list.map((t) => (t._id === todo._id ? { ...t, done: todo.done } : t)));
      setError("Could not save that change");
    }
  };

  const remove = async (todo: Todo) => {
    const before = todos;
    setTodos((list) => list.filter((t) => t._id !== todo._id));
    const res = await fetch(`/api/user/todos/${todo._id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setTodos(before);
      setError("Could not delete that");
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

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

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
              className="text-muted shrink-0 rounded p-1 transition hover:text-red-500"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
