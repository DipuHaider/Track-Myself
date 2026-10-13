"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Accessibility, Bell, Crown, Database, Radar, ShieldCheck, UserCircle } from "lucide-react";
import SettingsTabs, { type SettingsTabDef } from "@/components/settings/SettingsTabs";
import ProfileTab from "@/components/settings/ProfileTab";
import SecurityTab from "@/components/settings/SecurityTab";
import AccessibilityTab from "@/components/settings/AccessibilityTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import PlanTab from "@/components/settings/PlanTab";
import DataTab from "@/components/settings/DataTab";
import JobHuntTab from "@/components/settings/JobHuntTab";
import VerifyEmailBanner from "@/components/portal/VerifyEmailBanner";
import Loading from "@/components/shared/Spinner";

const TABS = [
  { key: "profile", label: "Profile", icon: UserCircle },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "accessibility", label: "Accessibility", icon: Accessibility },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "job-hunt", label: "Job hunt", icon: Radar },
  { key: "plan", label: "Plan", icon: Crown },
  { key: "data", label: "Data", icon: Database },
] as const satisfies readonly SettingsTabDef<string>[];

type TabKey = (typeof TABS)[number]["key"];

const isTab = (v: string | null): v is TabKey => TABS.some((t) => t.key === v);

const PANELS: Record<TabKey, React.ComponentType> = {
  profile: ProfileTab,
  security: SecurityTab,
  accessibility: AccessibilityTab,
  notifications: NotificationsTab,
  "job-hunt": JobHuntTab,
  plan: PlanTab,
  data: DataTab,
};

function SettingsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get("tab");
  const tab: TabKey = isTab(raw) ? raw : "profile";
  const Panel = PANELS[tab];

  const setTab = (key: TabKey) => {
    router.replace(`${pathname}?tab=${key}`, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <VerifyEmailBanner />

      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted mt-1 text-sm">Your profile, sign-in, display preferences, plan and data.</p>
      </div>

      <SettingsTabs tabs={[...TABS]} active={tab} onChange={setTab} />

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="outline-none">
        <Panel />
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Loading padded={false} className="py-10" />}>
      <SettingsInner />
    </Suspense>
  );
}
