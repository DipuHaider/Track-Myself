import SiteHeader from "@/components/site/SiteHeader";
import HeroSection from "@/components/site/HeroSection";
import TrendingSection from "@/components/site/TrendingSection";
import JobSitesSection from "@/components/site/JobSitesSection";
import CVBuilderSection from "@/components/site/CVBuilderSection";
import ToolsSection from "@/components/site/ToolsSection";
import CallToAction from "@/components/site/CallToAction";
import SiteFooter from "@/components/site/SiteFooter";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/favicon.svg`,
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free plan with unlimited application tracking and all CV formats",
      },
      featureList: [
        "Ten-stage application pipeline",
        "Automatic ghost-job and duplicate detection",
        "Interview stage tracking",
        "ATS, Europass and Designer CV export as Word documents",
        "Background remover, profile image and banner generators",
      ],
    },
  ],
};

export const metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader />
      <HeroSection />
      <TrendingSection />
      <JobSitesSection />
      <CVBuilderSection />
      <ToolsSection />
      <CallToAction />
      <SiteFooter />
    </>
  );
}
