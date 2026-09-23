import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { NOINDEX } from "@/lib/seo";

export const metadata = NOINDEX;

export default function AdminLayout({ children: _ }: { children: ReactNode }) {
  redirect("/dashboard");
}
