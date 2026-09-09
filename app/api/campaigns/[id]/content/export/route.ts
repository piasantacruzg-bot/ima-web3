import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { getCampaignExecutionRows, getTrackerItems } from "@/lib/execution";
import { toExportRow } from "@/lib/execution-export";

// One row per deliverable/Story instance (spec section 39) — never
// collapsed into a per-creator or per-campaign summary row.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await getCampaignExecutionRows(id);
  const exportRows = getTrackerItems(rows).map(toExportRow);

  if (format === "csv") {
    const csv = Papa.unparse(exportRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="campaign-content.csv"`,
      },
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Content");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="campaign-content.xlsx"`,
    },
  });
}
