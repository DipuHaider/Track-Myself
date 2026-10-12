import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";

export const metadata = {
  title: "Pricing",
  alternates: { canonical: "/pricing" },
  description:
    "Track every application for free. Premium adds every CV format, PDF export, per-application documents, more stored versions and a larger AI allowance.",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 pb-20 pt-24">{children}</main>
      <SiteFooter />
    </div>
  );
}
