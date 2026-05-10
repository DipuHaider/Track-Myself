import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    const isBackendPath =
      path.startsWith("/dashboard") ||
      path.startsWith("/applications") ||
      path.startsWith("/analytics") ||
      path.startsWith("/profile") ||
      path.startsWith("/settings");

    if (isBackendPath && role !== "admin" && role !== "editor") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  },
);

export const config = {
  matcher: [
    "/me/:path*",
    "/dashboard/:path*",
    "/applications/:path*",
    "/analytics/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
