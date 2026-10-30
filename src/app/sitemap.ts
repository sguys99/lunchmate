// sitemap.xml (T4.28, PRD APP-04). 공개 색인 페이지만. 규칙은 features/landing/seo.ts.
import type { MetadataRoute } from "next";
import { sitemapFor } from "@/features/landing/seo";
import { siteUrl } from "@/lib/env/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapFor(siteUrl());
}
