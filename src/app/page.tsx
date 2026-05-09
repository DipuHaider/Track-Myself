import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="surface w-full max-w-xl rounded-xl border p-8 shadow-sm">
        <h1 className="text-3xl font-semibold">Track Myself</h1>
        <p className="text-muted mt-2">
          Organize applications, interviews, reminders, and progress from one
          dashboard.
        </p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary rounded-md px-4 py-2" href="/login">
            Login
          </Link>
          <Link className="surface-muted rounded-md border px-4 py-2" href="/register">
            Register
          </Link>
        </div>
      </section>
    </main>
  );
}
