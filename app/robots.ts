import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/private/", "/cart", "/account", "/checkout"],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/admin/", "/private/", "/cart", "/account", "/checkout"],
      },
    ],
    sitemap: "https://vassoo.com/sitemap.xml",
  }
}
