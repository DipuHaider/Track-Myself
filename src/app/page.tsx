import SiteHeader from "@/components/site/SiteHeader";
import HeroSection from "@/components/site/HeroSection";
import TrendingSection from "@/components/site/TrendingSection";
import CallToAction from "@/components/site/CallToAction";
import SiteFooter from "@/components/site/SiteFooter";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <HeroSection />
      <TrendingSection />
      <CallToAction />
      <SiteFooter />
    </>
  );
}
