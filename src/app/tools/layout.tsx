import SiteHeader from "@/components/site/SiteHeader";

export const metadata = { title: "Tools – TrackMyself" };

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">{children}</main>
    </div>
  );
}
