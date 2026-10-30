// robots.txt (T4.28, PRD APP-04). 규칙은 features/landing/seo.ts.
import type { MetadataRoute } from "next";
import { robotsFor } from "@/features/landing/seo";
import { siteUrl } from "@/lib/env/site";

export default function robots(): MetadataRoute.Robots {
  return robotsFor(siteUrl());
}
