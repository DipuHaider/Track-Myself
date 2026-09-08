import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/me",
          "/me/",
          "/dashboard",
          "/dashboard/",
          "/applications",
          "/analytics",
          "/settings",
          "/profile",
          "/users",
          "/admin",
          "/admin/",
          "/redirect",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
