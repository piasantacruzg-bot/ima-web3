import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { getAllExecutionRows, getTrackerItems } from "@/lib/execution";
import { toExportRow } from "@/lib/execution-export";

// Global content export across every campaign — same one-row-per-item
// shape as the per-campaign export (spec section 39), just unfiltered by
// campaign.
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";

  const rows = await getAllExecutionRows();
  const exportRows = getTrackerItems(rows).map(toExportRow);

  if (format === "csv") {
    const csv = Papa.unparse(exportRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="content-tracker.csv"`,
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
      "Content-Disposition": `attachment; filename="content-tracker.xlsx"`,
    },
  });
}
