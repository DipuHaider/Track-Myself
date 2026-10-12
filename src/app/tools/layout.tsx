import SiteHeader from "@/components/site/SiteHeader";

export const metadata = {
  title: { default: "Tools", template: "%s · TrackMyself" },
  description: "Eight free browser tools for job hunting: background remover, profile image generator, banner generator, JD analyser, image optimizer, PDF splitter, PDF editor and DOCX editor. Your files never leave your device.",
  alternates: { canonical: "/tools" },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 pt-20 pb-16">{children}</main>
    </div>
  );
}
