import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { getCampaignCreatorRows } from "@/lib/campaigns";

// Proposal-ready shortlist export (spec section 31): every shortlisted or
// selected creator on this campaign, generated server-side from the same
// data the selection workspace shows. PDF export is intentionally out of
// scope for this phase — CSV/XLSX cover the "prepare the architecture for
// a polished PDF later" requirement without building a templating layer
// nothing yet consumes.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await getCampaignCreatorRows(id);
  const shortlist = rows.filter(
    (r) => r.campaignCreator.selection_status === "shortlisted" || r.campaignCreator.selection_status === "selected"
  );

  const exportRows = shortlist.map((r) => ({
    creator: r.creator.display_name,
    status: r.campaignCreator.selection_status,
    platforms: r.stats.platforms.join(", "),
    followers: r.stats.followers,
    engagement_rate: r.stats.engagementRate,
    average_views: r.stats.averageViews,
    categories: r.creator.categories.join(", "),
    location: [r.creator.city, r.creator.country].filter(Boolean).join(", "),
    match_score: r.campaignCreator.match_score,
    proposed_fee: r.campaignCreator.proposed_fee,
    negotiated_fee: r.campaignCreator.negotiated_fee,
    currency: r.campaignCreator.currency,
  }));

  if (format === "csv") {
    const csv = Papa.unparse(exportRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-shortlist.csv"`,
      },
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Shortlist");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="campaign-shortlist.xlsx"`,
    },
  });
}
