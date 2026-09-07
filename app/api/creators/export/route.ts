import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { getAllMatchingCreators, type CreatorSortKey } from "@/lib/creators";
import type { CreatorStatus, CreatorType, SocialPlatform } from "@/types/database";

// Exports creators matching the *current* filters (spec section 19) — not
// just the page currently on screen. Two formats, both generated
// server-side from the same query used by the list page.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format = params.get("format") === "xlsx" ? "xlsx" : "csv";

  const numberParam = (key: string) => {
    const v = params.get(key);
    return v ? Number(v) : undefined;
  };

  const creators = await getAllMatchingCreators(
    {
      search: params.get("q") || undefined,
      platform: (params.get("platform") as SocialPlatform) || undefined,
      country: params.get("country") || undefined,
      category: params.get("category") || undefined,
      niche: params.get("niche") || undefined,
      tag: params.get("tag") || undefined,
      creatorType: (params.get("type") as CreatorType) || undefined,
      status: (params.get("status") as CreatorStatus) || undefined,
      minFollowers: numberParam("minFollowers"),
      maxFollowers: numberParam("maxFollowers"),
      minEngagement: numberParam("minEngagement"),
      maxEngagement: numberParam("maxEngagement"),
      minBrandFit: numberParam("minBrandFit"),
      maxBrandFit: numberParam("maxBrandFit"),
      minRating: numberParam("minRating"),
      maxRating: numberParam("maxRating"),
      includeArchived: params.get("archived") === "1",
    },
    (params.get("sort") as CreatorSortKey) || "recently_added"
  );

  const rows = creators.map((c) => ({
    display_name: c.display_name,
    first_name: c.first_name,
    last_name: c.last_name,
    email: c.email,
    phone: c.phone,
    country: c.country,
    state_province: c.state_province,
    city: c.city,
    creator_type: c.creator_type,
    status: c.status,
    categories: c.categories.join(", "),
    niches: c.niches.join(", "),
    tags: (c.tags ?? []).join(", "),
    primary_platform: c.primary_platform,
    primary_username: c.primary_username,
    followers: c.max_followers,
    engagement_rate: c.avg_engagement_rate,
    average_views: c.max_average_views,
    estimated_reach: c.max_estimated_reach,
    brand_fit_score: c.brand_fit_score,
    internal_rating: c.internal_rating,
    campaign_count: c.campaign_count,
  }));

  if (format === "csv") {
    const csv = Papa.unparse(rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="creators-export.csv"`,
      },
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Creators");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="creators-export.xlsx"`,
    },
  });
}
