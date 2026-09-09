import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  parseImportFile,
  validateImportFile,
  ImportFileError,
  MAX_IMPORT_FILE_SIZE_BYTES,
} from "@/lib/import/parse-file";

function csvFile(content: string, name = "creators.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

function xlsxFile(sheets: Record<string, string[][]>, name = "creators.xlsx"): File {
  const workbook = XLSX.utils.book_new();
  for (const [sheetName, rows] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("validateImportFile", () => {
  it("accepts .csv, .xls, .xlsx", () => {
    expect(() => validateImportFile(csvFile("a,b\n1,2", "x.csv"))).not.toThrow();
    expect(() => validateImportFile(csvFile("a,b\n1,2", "x.xlsx"))).not.toThrow();
    expect(() => validateImportFile(csvFile("a,b\n1,2", "x.xls"))).not.toThrow();
  });

  it("rejects an unsupported extension", () => {
    expect(() => validateImportFile(csvFile("a,b\n1,2", "x.txt"))).toThrow(ImportFileError);
  });

  it("rejects an empty file", () => {
    expect(() => validateImportFile(csvFile("", "empty.csv"))).toThrow(ImportFileError);
  });

  it("rejects a file over the size cap", () => {
    const big = new File([new Uint8Array(MAX_IMPORT_FILE_SIZE_BYTES + 1)], "big.csv", {
      type: "text/csv",
    });
    expect(() => validateImportFile(big)).toThrow(ImportFileError);
  });
});

describe("parseImportFile — CSV", () => {
  it("parses headers and rows", async () => {
    const file = csvFile("Name,Email\nMaria Perez,maria@example.com\nJoao Silva,joao@example.com");
    const parsed = await parseImportFile(file);
    expect(parsed.fileType).toBe("csv");
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0].headers).toEqual(["Name", "Email"]);
    expect(parsed.sheets[0].rows).toEqual([
      { Name: "Maria Perez", Email: "maria@example.com" },
      { Name: "Joao Silva", Email: "joao@example.com" },
    ]);
  });

  it("deduplicates repeated headers", async () => {
    const file = csvFile("Name,Email,Email\nA,a@x.com,a2@x.com");
    const parsed = await parseImportFile(file);
    expect(parsed.sheets[0].headers).toEqual(["Name", "Email", "Email (2)"]);
  });

  it("skips blank lines", async () => {
    const file = csvFile("Name,Email\nMaria,maria@x.com\n\nJoao,joao@x.com");
    const parsed = await parseImportFile(file);
    expect(parsed.sheets[0].rows).toHaveLength(2);
  });

  it("throws when there is no header row", async () => {
    const file = csvFile("");
    await expect(parseImportFile(file)).rejects.toThrow(ImportFileError);
  });
});

describe("parseImportFile — XLSX", () => {
  it("parses a single sheet", async () => {
    const file = xlsxFile({
      Creators: [
        ["Name", "Followers"],
        ["Maria Perez", "85000"],
        ["Joao Silva", "12000"],
      ],
    });
    const parsed = await parseImportFile(file);
    expect(parsed.fileType).toBe("xlsx");
    expect(parsed.sheets).toHaveLength(1);
    expect(parsed.sheets[0].name).toBe("Creators");
    expect(parsed.sheets[0].headers).toEqual(["Name", "Followers"]);
    expect(parsed.sheets[0].rows).toEqual([
      { Name: "Maria Perez", Followers: "85000" },
      { Name: "Joao Silva", Followers: "12000" },
    ]);
  });

  it("parses multiple sheets", async () => {
    const file = xlsxFile({
      Instagram: [
        ["Name", "IG Followers"],
        ["Maria Perez", "85000"],
      ],
      TikTok: [
        ["Name", "TikTok Followers"],
        ["Maria Perez", "40000"],
      ],
    });
    const parsed = await parseImportFile(file);
    expect(parsed.sheets.map((s) => s.name)).toEqual(["Instagram", "TikTok"]);
    expect(parsed.sheets[1].headers).toEqual(["Name", "TikTok Followers"]);
  });

  it("skips a sheet with no header row rather than failing the whole file", async () => {
    const file = xlsxFile({
      Empty: [],
      Creators: [
        ["Name"],
        ["Maria Perez"],
      ],
    });
    const parsed = await parseImportFile(file);
    expect(parsed.sheets.map((s) => s.name)).toEqual(["Creators"]);
  });
});
