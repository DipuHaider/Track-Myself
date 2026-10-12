import type { ReactNode } from "react";
import { NOINDEX } from "@/lib/seo";

export const metadata = { title: "Verify your email", ...NOINDEX };

export default function VerifyEmailLayout({ children }: { children: ReactNode }) {
  return children;
}
