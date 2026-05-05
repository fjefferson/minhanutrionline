import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/planos", "/register", "/login"],
        disallow: [
          "/dashboard/",
          "/admin/",
          "/checkout/",
          "/perfil/",
          "/chat/",
          "/glp1/",
          "/consultas/",
          "/conta/",
        ],
      },
    ],
    sitemap: "https://minhanutrionline.com.br/sitemap.xml",
  };
}
