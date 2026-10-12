"use client";

import ErrorPanel from "@/components/shared/ErrorPanel";

export default function AuthError(props: { error: Error & { digest?: string }; retry?: () => void; reset?: () => void }) {
  return (
    <div className="min-h-screen px-6 pt-16">
      <ErrorPanel {...props} zone="sign-in page" homeHref="/login" homeLabel="Sign in" />
    </div>
  );
}
