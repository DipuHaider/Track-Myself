import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/serverAuth";
import { privateMetadata } from "@/lib/seo";
import ConnectExtension from "./ConnectExtension";

export const metadata = privateMetadata("Connect the extension");

const EXTENSION_ID = /^[a-p]{32}$/;

export default async function ConnectExtensionPage({
  searchParams,
}: {
  searchParams: Promise<{ ext?: string }>;
}) {
  const { ext = "" } = await searchParams;
  const allowed = (process.env.EXTENSION_IDS ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  const known = EXTENSION_ID.test(ext) && (!allowed.length || allowed.includes(ext));
  const extensionId = known ? ext : "";

  const user = await getSessionUser();
  if (!user) {
    const back = `/extension/connect${extensionId ? `?ext=${extensionId}` : ""}`;
    redirect(`/login?from=${encodeURIComponent(back)}`);
  }

  return <ConnectExtension extensionId={extensionId} email={user.email ?? ""} />;
}
