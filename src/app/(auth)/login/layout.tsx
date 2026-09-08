import { NOINDEX } from "@/lib/seo";

export const metadata = {
  title: "Sign in",
  ...NOINDEX,
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
