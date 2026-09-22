import { NOINDEX } from "@/lib/seo";

export const metadata = {
  title: "Choose a new password",
  ...NOINDEX,
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
