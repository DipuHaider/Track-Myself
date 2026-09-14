import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word Text Editor — TrackMyself",
  description:
    "Fix the wording in a .docx without Word. Styles, images and layout are repacked untouched. Runs in your browser.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
