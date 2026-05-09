import ThemeToggle from "@/components/layout/ThemeToggle";

export default function Header() {
  return (
    <header className="surface flex items-center justify-between border-b px-5 py-3">
      <h1 className="text-lg font-semibold">Job Application Tracker</h1>
      <div className="flex items-center gap-3">
        <p className="text-muted text-sm">Stay consistent daily</p>
        <ThemeToggle />
      </div>
    </header>
  );
}
