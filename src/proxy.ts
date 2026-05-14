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

    const isBackendRole = role === "superadmin" || role === "admin" || role === "editor";

    if (isBackendPath && !isBackendRole) {
      return NextResponse.redirect(new URL("/me", req.url));
    }

    // Editors cannot access settings — superadmin/admin only
    if (path === "/settings" && role !== "superadmin" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
