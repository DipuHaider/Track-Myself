import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req: NextRequestWithAuth) {
    const role = req.nextauth.token?.role as string | undefined;
    const { pathname } = req.nextUrl;

    const isStaff =
      role === "superadmin" || role === "admin" || role === "editor";

    if (!isStaff) {
      return NextResponse.redirect(new URL("/me", req.url));
    }

    // Settings: admin/superadmin only — editors are redirected to overview
    if (pathname === "/settings" && role !== "superadmin" && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analytics",
    "/applications/:path*",
    "/profile",
    "/settings",
  ],
};
