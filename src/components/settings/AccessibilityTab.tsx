"use client";

import { Accessibility } from "lucide-react";
import A11ySettingsBody from "@/components/shared/A11ySettingsBody";

export default function AccessibilityTab() {
  return (
    <section className="surface rounded-xl border p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Accessibility size={16} className="text-primary" aria-hidden="true" />
        Accessibility &amp; display
      </h2>
      <p className="text-muted mb-5 text-sm">
        Text size, colour scheme and reading aids. Changes apply immediately.
      </p>
      <A11ySettingsBody />
    </section>
  );
}
