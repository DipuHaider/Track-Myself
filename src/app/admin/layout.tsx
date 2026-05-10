import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export default function AdminLayout({ children: _ }: { children: ReactNode }) {
  redirect("/dashboard");
}
