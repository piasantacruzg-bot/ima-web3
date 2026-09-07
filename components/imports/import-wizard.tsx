"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseImportFile,
  ImportFileError,
  type ParsedImportFile,
  type ParsedSheet,
} from "@/lib/import/parse-file";
import {
  detectColumns,
  TARGET_FIELD_LABELS,
  SOCIAL_PLATFORMS,
  SOCIAL_TARGET_FIELDS,
  type ImportTargetField,
} from "@/lib/import/column-detection";
import {
  normalizeImportRow,
  type ColumnMappingEntry,
  type NormalizedCreatorRowInput,
} from "@/lib/import/normalize-row";
import { validateNormalizedRow } from "@/lib/import/validate-row";
import { getImportMergeFields, type ImportMergeFieldKey } from "@/lib/import/merge-decision";
import { matchImportRows, commitImportBatch, type CommitImportRowInput } from "@/app/(app)/imports/actions";
import type { CreatorMatch } from "@/lib/import/match-creator";
import type { ImportRowAction, SocialPlatform } from "@/types/database";

const STEPS = [
  "Upload",
  "Select Sheets",
  "Map Columns",
  "Normalize",
  "Review Matches",
  "Review Errors",
  "Preview",
  "Import",
  "Results",
] as const;

interface SheetMapping {
  sheetName: string;
  platformOverride: SocialPlatform | "";
  columns: ColumnMappingEntry[];
}

interface RowState {
  index: number;
  sourceSheet: string;
  rawData: Record<string, string>;
  normalizedData: NormalizedCreatorRowInput;
  warnings: string[];
  errors: string[];
  matches: CreatorMatch[];
  matchedCreatorId: string | null;
  action: ImportRowAction;
  mergeDecisions: Partial<Record<ImportMergeFieldKey, "existing" | "imported">>;
}

const MATCH_CHUNK_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [fileType, setFileType] = useState<"csv" | "xlsx">("csv");
  const [sourceName, setSourceName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set());
  const [sheetMappings, setSheetMappings] = useState<SheetMapping[]>([]);
  const [rows, setRows] = useState<RowState[]>([]);
  const [creatorNames, setCreatorNames] = useState<Record<string, { display_name: string; email: string | null; city: string | null }>>({});
  const [isMatching, setIsMatching] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [resultBatchId, setResultBatchId] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<"new" | "existing" | "duplicates" | "all">("all");
  const [confirmChecked, setConfirmChecked] = useState(false);

  // --- Step 1: Upload ---------------------------------------------------

  async function handleFileSelected(file: File) {
    setUploadError(null);
    try {
      const result = await parseImportFile(file);
      setParsed(result);
      setFileName(result.fileName);
      setFileType(result.fileType);
      setSourceName(result.fileName.replace(/\.(csv|xlsx?|xls)$/i, ""));
      setSelectedSheets(new Set(result.sheets.map((s) => s.name)));
      setStep(1);
    } catch (err) {
      setUploadError(err instanceof ImportFileError ? err.message : "Could not read this file.");
    }
  }

  // --- Step 2 -> 3: build initial column mappings for selected sheets ---

  function proceedToMapColumns() {
    if (!parsed) return;
    const sheets = parsed.sheets.filter((s) => selectedSheets.has(s.name));
    const mappings: SheetMapping[] = sheets.map((sheet) => {
      const detected = detectColumns(sheet.headers);
      return {
        sheetName: sheet.name,
        platformOverride: "",
        columns: detected.map((d) => ({
          header: d.header,
          field: d.field,
          platform: d.platform,
          includeAsCustomField: d.field === null,
        })),
      };
    });
    setSheetMappings(mappings);
    setStep(2);
  }

  function updateColumnMapping(sheetName: string, header: string, patch: Partial<ColumnMappingEntry>) {
    setSheetMappings((prev) =>
      prev.map((m) =>
        m.sheetName !== sheetName
          ? m
          : {
              ...m,
              columns: m.columns.map((c) => (c.header === header ? { ...c, ...patch } : c)),
            }
      )
    );
  }

  function updateSheetPlatform(sheetName: string, platform: SocialPlatform | "") {
    setSheetMappings((prev) => prev.map((m) => (m.sheetName === sheetName ? { ...m, platformOverride: platform } : m)));
  }

  // --- Step 3 -> 4: normalize every row of every selected sheet ---------

  function proceedToNormalize() {
    if (!parsed) return;
    const bySheet = new Map<string, ParsedSheet>(parsed.sheets.map((s) => [s.name, s]));
    const nextRows: RowState[] = [];
    let index = 0;

    for (const mapping of sheetMappings) {
      const sheet = bySheet.get(mapping.sheetName);
      if (!sheet) continue;

      const columns = mapping.platformOverride
        ? [
            ...mapping.columns,
            {
              header: "__sheet_platform__",
              field: "social_platform" as ImportTargetField,
              platform: null,
              includeAsCustomField: false,
            },
          ]
        : mapping.columns;

      for (const raw of sheet.rows) {
        const rawWithPlatform = mapping.platformOverride
          ? { ...raw, __sheet_platform__: mapping.platformOverride }
          : raw;
        const { data, warnings } = normalizeImportRow(rawWithPlatform, columns);
        const errors = validateNormalizedRow(data);
        nextRows.push({
          index: index++,
          sourceSheet: mapping.sheetName,
          rawData: raw,
          normalizedData: data,
          warnings,
          errors,
          matches: [],
          matchedCreatorId: null,
          action: "create",
          mergeDecisions: {},
        });
      }
    }

    setRows(nextRows);
    setStep(3);
  }

  // --- Step 4 -> 5: match against existing creators (server-side) -------

  async function proceedToReviewMatches() {
    setIsMatching(true);
    try {
      const matchable = rows.filter((r) => r.errors.length === 0);
      const allMatches: Record<number, CreatorMatch[]> = {};
      let names: Record<string, { display_name: string; email: string | null; city: string | null }> = {};

      for (const group of chunk(matchable, MATCH_CHUNK_SIZE)) {
        const result = await matchImportRows(group.map((r) => ({ index: r.index, data: r.normalizedData })));
        Object.assign(allMatches, result.matches);
        names = { ...names, ...result.creators };
      }

      setCreatorNames(names);
      setRows((prev) =>
        prev.map((r) => {
          const matches = allMatches[r.index] ?? [];
          const top = matches[0];
          if (!top) return { ...r, matches, matchedCreatorId: null, action: "create" };
          if (top.confidence === "exact") {
            return { ...r, matches, matchedCreatorId: top.creatorId, action: "update" };
          }
          // High/low confidence: never auto-merge or auto-update — default
          // to the safest option and require the user to opt in.
          return { ...r, matches, matchedCreatorId: top.creatorId, action: "keep_separate" };
        })
      );
      setStep(4);
    } finally {
      setIsMatching(false);
    }
  }

  function setRowAction(index: number, action: ImportRowAction) {
    setRows((prev) => prev.map((r) => (r.index === index ? { ...r, action } : r)));
  }

  function setRowMergeDecision(index: number, field: ImportMergeFieldKey, decision: "existing" | "imported") {
    setRows((prev) =>
      prev.map((r) =>
        r.index === index ? { ...r, mergeDecisions: { ...r.mergeDecisions, [field]: decision } } : r
      )
    );
  }

  // --- Derived tab buckets ------------------------------------------------

  const buckets = useMemo(() => {
    const withErrors = rows.filter((r) => r.errors.length > 0);
    const clean = rows.filter((r) => r.errors.length === 0);
    const newRows = clean.filter((r) => r.matches.length === 0);
    const existingRows = clean.filter((r) => r.matches[0]?.confidence === "exact");
    const duplicateRows = clean.filter((r) => r.matches.length > 0 && r.matches[0]?.confidence !== "exact");
    return { withErrors, newRows, existingRows, duplicateRows, clean };
  }, [rows]);

  const summary = useMemo(() => {
    const create = rows.filter((r) => r.action === "create" && r.errors.length === 0).length;
    const update = rows.filter((r) => r.action === "update" && r.errors.length === 0).length;
    const merge = rows.filter((r) => r.action === "merge" && r.errors.length === 0).length;
    const keepSeparate = rows.filter((r) => r.action === "keep_separate" && r.errors.length === 0).length;
    const skip = rows.filter((r) => r.action === "skip").length;
    const errors = buckets.withErrors.length;
    return { create, update, merge, keepSeparate, skip, errors, total: rows.length };
  }, [rows, buckets]);

  // --- Step 8: commit ------------------------------------------------------

  async function handleCommit() {
    setIsCommitting(true);
    setCommitError(null);
    try {
      const columnMapping: Record<string, string> = {};
      for (const m of sheetMappings) {
        for (const c of m.columns) {
          if (c.field) columnMapping[`${m.sheetName}:${c.header}`] = c.field;
        }
      }

      const commitRows: CommitImportRowInput[] = rows.map((r) => ({
        rowNumber: r.index + 1,
        sourceSheet: r.sourceSheet,
        rawData: r.rawData,
        normalizedData: r.normalizedData,
        matchedCreatorId: r.action === "create" ? null : r.matchedCreatorId,
        matchConfidence: r.matches[0]?.confidence ?? null,
        matchReasons: r.matches[0]?.reasons ?? [],
        action: r.errors.length > 0 ? "skip" : r.action,
        mergeDecisions: r.mergeDecisions,
        errors: r.errors,
      }));

      const result = await commitImportBatch({
        fileName,
        fileType,
        sourceName: sourceName || null,
        columnMapping,
        rows: commitRows,
      });

      if ("error" in result) {
        setCommitError(result.error);
      } else {
        setResultBatchId(result.batchId);
        setStep(8);
      }
    } catch {
      setCommitError("Something went wrong while importing. No changes past the last successful row were made.");
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div>
      <Stepper current={step} />

      <div className="mt-6">
        {step === 0 && <UploadStep onFile={handleFileSelected} error={uploadError} />}

        {step === 1 && parsed && (
          <SelectSheetsStep
            sheets={parsed.sheets}
            selected={selectedSheets}
            onToggle={(name) =>
              setSelectedSheets((prev) => {
                const next = new Set(prev);
                if (next.has(name)) next.delete(name);
                else next.add(name);
                return next;
              })
            }
            onBack={() => setStep(0)}
            onContinue={proceedToMapColumns}
          />
        )}

        {step === 2 && (
          <MapColumnsStep
            mappings={sheetMappings}
            onChangeColumn={updateColumnMapping}
            onChangeSheetPlatform={updateSheetPlatform}
            onBack={() => setStep(1)}
            onContinue={proceedToNormalize}
          />
        )}

        {step === 3 && (
          <NormalizeStep rows={rows} onBack={() => setStep(2)} onContinue={proceedToReviewMatches} isLoading={isMatching} />
        )}

        {step === 4 && (
          <ReviewMatchesStep
            rows={rows}
            buckets={buckets}
            creatorNames={creatorNames}
            tab={reviewTab}
            onTabChange={setReviewTab}
            onSetAction={setRowAction}
            onSetMergeDecision={setRowMergeDecision}
            onBack={() => setStep(3)}
            onContinue={() => setStep(5)}
          />
        )}

        {step === 5 && (
          <ReviewErrorsStep
            rows={buckets.withErrors}
            onSkip={(index) => setRowAction(index, "skip")}
            onBack={() => setStep(4)}
            onContinue={() => setStep(6)}
          />
        )}

        {step === 6 && (
          <PreviewStep
            summary={summary}
            confirmChecked={confirmChecked}
            onConfirmChange={setConfirmChecked}
            onBack={() => setStep(5)}
            onContinue={() => setStep(7)}
          />
        )}

        {step === 7 && (
          <ImportStep isCommitting={isCommitting} error={commitError} onBack={() => setStep(6)} onImport={handleCommit} />
        )}

        {step === 8 && resultBatchId && (
          <ResultsStep
            summary={summary}
            batchId={resultBatchId}
            onViewBatch={() => router.push(`/imports/${resultBatchId}`)}
            onDone={() => router.push("/imports")}
          />
        )}
      </div>
    </div>
  );
}

// --- Sub-components ------------------------------------------------------

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap gap-x-1 gap-y-2 text-xs">
      {STEPS.map((label, i) => (
        <li
          key={label}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
            i === current
              ? "border-ink bg-ink text-paper-raised"
              : i < current
                ? "border-line text-ink-soft"
                : "border-line/60 text-ink-soft/50"
          }`}
        >
          <span className="font-medium">{i + 1}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function UploadStep({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  return (
    <div className="card p-8 text-center">
      <p className="mb-4 text-sm text-ink-soft">
        Upload a CSV or Excel (.xls/.xlsx) file of creators. Multi-sheet workbooks are supported — you&apos;ll choose
        which sheets to import next.
      </p>
      <label className="btn-primary mx-auto w-fit cursor-pointer">
        Choose file
        <input
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {error ? <p className="mt-4 text-sm text-status-danger">{error}</p> : null}
    </div>
  );
}

function SelectSheetsStep({
  sheets,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  sheets: ParsedSheet[];
  selected: Set<string>;
  onToggle: (name: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="card divide-y divide-line">
      {sheets.map((sheet) => (
        <label key={sheet.name} className="flex items-center gap-3 p-4">
          <input type="checkbox" checked={selected.has(sheet.name)} onChange={() => onToggle(sheet.name)} />
          <div className="flex-1">
            <p className="font-medium text-ink">{sheet.name}</p>
            <p className="text-xs text-ink-soft">
              {sheet.rowCount} rows · {sheet.headers.length} columns
              {sheet.truncated ? " · truncated to the row limit for preview" : ""}
            </p>
          </div>
        </label>
      ))}
      <StepFooter onBack={onBack} onContinue={onContinue} continueDisabled={selected.size === 0} />
    </div>
  );
}

function MapColumnsStep({
  mappings,
  onChangeColumn,
  onChangeSheetPlatform,
  onBack,
  onContinue,
}: {
  mappings: SheetMapping[];
  onChangeColumn: (sheetName: string, header: string, patch: Partial<ColumnMappingEntry>) => void;
  onChangeSheetPlatform: (sheetName: string, platform: SocialPlatform | "") => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const fieldOptions = Object.entries(TARGET_FIELD_LABELS) as [ImportTargetField, string][];

  return (
    <div className="space-y-6">
      {mappings.map((mapping) => (
        <div key={mapping.sheetName} className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <p className="font-medium text-ink">{mapping.sheetName}</p>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              If this whole sheet is one platform:
              <select
                className="input w-auto"
                value={mapping.platformOverride}
                onChange={(e) => onChangeSheetPlatform(mapping.sheetName, e.target.value as SocialPlatform | "")}
              >
                <option value="">—</option>
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
                  <th className="p-3">Column</th>
                  <th className="p-3">Maps to</th>
                  <th className="p-3">Platform</th>
                  <th className="p-3">Keep unmapped data</th>
                </tr>
              </thead>
              <tbody>
                {mapping.columns.map((col) => (
                  <tr key={col.header} className="border-b border-line last:border-0">
                    <td className="p-3 font-medium text-ink">{col.header}</td>
                    <td className="p-3">
                      <select
                        className="input"
                        value={col.field ?? ""}
                        onChange={(e) =>
                          onChangeColumn(mapping.sheetName, col.header, {
                            field: (e.target.value || null) as ImportTargetField | null,
                          })
                        }
                      >
                        <option value="">Don&apos;t import</option>
                        {fieldOptions.map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      {col.field && SOCIAL_TARGET_FIELDS.has(col.field) ? (
                        <select
                          className="input"
                          value={col.platform ?? ""}
                          onChange={(e) =>
                            onChangeColumn(mapping.sheetName, col.header, {
                              platform: (e.target.value || null) as SocialPlatform | null,
                            })
                          }
                        >
                          <option value="">Use sheet default / declared column</option>
                          {SOCIAL_PLATFORMS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {!col.field ? (
                        <input
                          type="checkbox"
                          checked={col.includeAsCustomField}
                          onChange={(e) =>
                            onChangeColumn(mapping.sheetName, col.header, { includeAsCustomField: e.target.checked })
                          }
                        />
                      ) : (
                        <span className="text-ink-soft">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <StepFooter onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function NormalizeStep({
  rows,
  onBack,
  onContinue,
  isLoading,
}: {
  rows: RowState[];
  onBack: () => void;
  onContinue: () => void;
  isLoading: boolean;
}) {
  const preview = rows.slice(0, 20);
  const totalWarnings = rows.reduce((sum, r) => sum + r.warnings.length, 0);

  return (
    <div className="card">
      <div className="border-b border-line p-4">
        <p className="text-sm text-ink-soft">
          {rows.length} rows normalized. {totalWarnings} warning{totalWarnings === 1 ? "" : "s"} found — nothing was
          guessed or invented for values that couldn&apos;t be parsed confidently.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-soft">
              <th className="p-3">Row</th>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Social accounts</th>
              <th className="p-3">Warnings</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((r) => (
              <tr key={r.index} className="border-b border-line last:border-0 align-top">
                <td className="p-3 text-ink-soft">{r.index + 1}</td>
                <td className="p-3">{r.normalizedData.display_name ?? <em className="text-status-danger">missing</em>}</td>
                <td className="p-3">{r.normalizedData.email ?? "—"}</td>
                <td className="p-3">
                  {r.normalizedData.socialAccounts.length === 0
                    ? "—"
                    : r.normalizedData.socialAccounts
                        .map((a) => `${a.platform}:@${a.username}`)
                        .join(", ")}
                </td>
                <td className="p-3 text-status-warning">{r.warnings.join("; ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > preview.length ? (
        <p className="p-3 text-xs text-ink-soft">…and {rows.length - preview.length} more rows.</p>
      ) : null}
      <StepFooter onBack={onBack} onContinue={onContinue} continueLabel={isLoading ? "Matching…" : "Continue"} continueDisabled={isLoading} />
    </div>
  );
}

const ACTION_LABELS: Record<ImportRowAction, string> = {
  create: "Create new creator",
  update: "Update matched creator",
  merge: "Merge (review fields)",
  keep_separate: "Keep as separate creator",
  skip: "Skip this row",
  ignore: "Ignore",
};

function ReviewMatchesStep({
  rows,
  buckets,
  creatorNames,
  tab,
  onTabChange,
  onSetAction,
  onSetMergeDecision,
  onBack,
  onContinue,
}: {
  rows: RowState[];
  buckets: { newRows: RowState[]; existingRows: RowState[]; duplicateRows: RowState[]; clean: RowState[] };
  creatorNames: Record<string, { display_name: string; email: string | null; city: string | null }>;
  tab: "new" | "existing" | "duplicates" | "all";
  onTabChange: (tab: "new" | "existing" | "duplicates" | "all") => void;
  onSetAction: (index: number, action: ImportRowAction) => void;
  onSetMergeDecision: (index: number, field: ImportMergeFieldKey, decision: "existing" | "imported") => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const tabRows =
    tab === "new" ? buckets.newRows : tab === "existing" ? buckets.existingRows : tab === "duplicates" ? buckets.duplicateRows : buckets.clean;
  void rows;

  return (
    <div className="card">
      <div className="flex flex-wrap gap-2 border-b border-line p-4">
        <TabButton label={`All (${buckets.clean.length})`} active={tab === "all"} onClick={() => onTabChange("all")} />
        <TabButton label={`New (${buckets.newRows.length})`} active={tab === "new"} onClick={() => onTabChange("new")} />
        <TabButton
          label={`Existing (${buckets.existingRows.length})`}
          active={tab === "existing"}
          onClick={() => onTabChange("existing")}
        />
        <TabButton
          label={`Potential duplicates (${buckets.duplicateRows.length})`}
          active={tab === "duplicates"}
          onClick={() => onTabChange("duplicates")}
        />
      </div>
      <div className="max-h-[28rem] overflow-y-auto">
        {tabRows.slice(0, 200).map((r) => {
          const match = r.matches[0];
          const matchedName = r.matchedCreatorId ? creatorNames[r.matchedCreatorId]?.display_name : null;
          return (
            <div key={r.index} className="border-b border-line p-4 last:border-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{r.normalizedData.display_name}</p>
                  {match ? (
                    <p className="text-xs text-ink-soft">
                      Matched <span className="font-medium">{matchedName}</span> ({match.confidence} confidence):{" "}
                      {match.reasons.join("; ")}
                    </p>
                  ) : (
                    <p className="text-xs text-ink-soft">No match found</p>
                  )}
                </div>
                <select
                  className="input w-auto"
                  value={r.action}
                  onChange={(e) => onSetAction(r.index, e.target.value as ImportRowAction)}
                >
                  {(match
                    ? (["update", "merge", "keep_separate", "skip"] as ImportRowAction[])
                    : (["create", "skip"] as ImportRowAction[])
                  ).map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABELS[a]}
                    </option>
                  ))}
                </select>
              </div>
              {r.action === "merge" && r.matchedCreatorId ? (
                <MergeFieldsEditor
                  creatorName={matchedName ?? "existing creator"}
                  rowIndex={r.index}
                  imported={r.normalizedData}
                  decisions={r.mergeDecisions}
                  onSetDecision={onSetMergeDecision}
                />
              ) : null}
            </div>
          );
        })}
        {tabRows.length === 0 ? <p className="p-4 text-sm text-ink-soft">No rows in this view.</p> : null}
      </div>
      <StepFooter onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function MergeFieldsEditor({
  rowIndex,
  imported,
  decisions,
  onSetDecision,
}: {
  creatorName: string;
  rowIndex: number;
  imported: NormalizedCreatorRowInput;
  decisions: Partial<Record<ImportMergeFieldKey, "existing" | "imported">>;
  onSetDecision: (index: number, field: ImportMergeFieldKey, decision: "existing" | "imported") => void;
}) {
  // We don't have the existing creator's full record client-side (only its
  // id/name from the match step) — the conflict list itself is computed
  // server-side at commit time from the authoritative row; here we only
  // need to collect a decision for fields the imported row actually has a
  // value for, so the user isn't asked about fields with nothing to merge.
  const fields = (Object.keys(imported) as (keyof NormalizedCreatorRowInput)[]).filter((key) => {
    const value = imported[key];
    return typeof value === "string" && value.trim() !== "";
  }) as ImportMergeFieldKey[];

  if (fields.length === 0) {
    return <p className="text-xs text-ink-soft">This row has no conflicting fields to review.</p>;
  }

  return (
    <div className="mt-2 space-y-2 rounded-sm border border-line bg-paper p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
        For each field, choose which value to keep if they conflict
      </p>
      {fields.map((field) => (
        <div key={field} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-ink-soft">{field.replace(/_/g, " ")}</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name={`merge-${rowIndex}-${field}`}
                checked={(decisions[field] ?? "existing") === "existing"}
                onChange={() => onSetDecision(rowIndex, field, "existing")}
              />
              Keep existing
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="radio"
                name={`merge-${rowIndex}-${field}`}
                checked={decisions[field] === "imported"}
                onChange={() => onSetDecision(rowIndex, field, "imported")}
              />
              Use imported: {String(imported[field])}
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReviewErrorsStep({
  rows,
  onSkip,
  onBack,
  onContinue,
}: {
  rows: RowState[];
  onSkip: (index: number) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="card">
      {rows.length === 0 ? (
        <p className="p-6 text-sm text-ink-soft">No rows had validation errors.</p>
      ) : (
        <div className="divide-y divide-line">
          {rows.map((r) => (
            <div key={r.index} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-ink">Row {r.index + 1}</p>
                <p className="text-xs text-status-danger">{r.errors.join("; ")}</p>
              </div>
              <button type="button" className="btn-secondary" onClick={() => onSkip(r.index)}>
                Skip row
              </button>
            </div>
          ))}
        </div>
      )}
      <StepFooter onBack={onBack} onContinue={onContinue} />
    </div>
  );
}

function PreviewStep({
  summary,
  confirmChecked,
  onConfirmChange,
  onBack,
  onContinue,
}: {
  summary: { create: number; update: number; merge: number; keepSeparate: number; skip: number; errors: number; total: number };
  confirmChecked: boolean;
  onConfirmChange: (checked: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="card p-6">
      <p className="mb-4 text-sm text-ink-soft">Review the plan before anything is written to the database.</p>
      <dl className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryStat label="New creators" value={summary.create} />
        <SummaryStat label="Updated" value={summary.update} />
        <SummaryStat label="Merged" value={summary.merge} />
        <SummaryStat label="Kept separate" value={summary.keepSeparate} />
        <SummaryStat label="Skipped" value={summary.skip} />
        <SummaryStat label="Errors (skipped)" value={summary.errors} />
      </dl>
      <label className="mb-6 flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={confirmChecked} onChange={(e) => onConfirmChange(e.target.checked)} />
        I&apos;ve reviewed this import plan for {summary.total} rows and want to proceed.
      </label>
      <StepFooter onBack={onBack} onContinue={onContinue} continueDisabled={!confirmChecked} continueLabel="Continue to import" />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="text-2xl font-medium text-ink">{value}</p>
    </div>
  );
}

function ImportStep({
  isCommitting,
  error,
  onBack,
  onImport,
}: {
  isCommitting: boolean;
  error: string | null;
  onBack: () => void;
  onImport: () => void;
}) {
  return (
    <div className="card p-8 text-center">
      <p className="mb-4 text-sm text-ink-soft">
        This will create and update real creator records. Every row is processed independently, so a single bad row
        won&apos;t stop the rest of the import.
      </p>
      {error ? <p className="mb-4 text-sm text-status-danger">{error}</p> : null}
      <div className="flex justify-center gap-2">
        <button type="button" className="btn-secondary" onClick={onBack} disabled={isCommitting}>
          Back
        </button>
        <button type="button" className="btn-primary" onClick={onImport} disabled={isCommitting}>
          {isCommitting ? "Importing…" : "Run import"}
        </button>
      </div>
    </div>
  );
}

function ResultsStep({
  summary,
  batchId,
  onViewBatch,
  onDone,
}: {
  summary: { create: number; update: number; merge: number; keepSeparate: number; skip: number; errors: number; total: number };
  batchId: string;
  onViewBatch: () => void;
  onDone: () => void;
}) {
  return (
    <div className="card p-8 text-center">
      <p className="mb-2 text-lg font-medium text-ink">Import complete</p>
      <p className="mb-6 text-sm text-ink-soft">
        {summary.create} created, {summary.update + summary.merge} updated, {summary.skip + summary.errors} skipped
        out of {summary.total} rows.
      </p>
      <div className="flex justify-center gap-2">
        <button type="button" className="btn-secondary" onClick={onDone}>
          Back to imports
        </button>
        <button type="button" className="btn-primary" onClick={onViewBatch}>
          View import details
        </button>
      </div>
      <p className="mt-4 text-xs text-ink-soft">Import ID: {batchId}</p>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium ${
        active ? "border-ink bg-ink text-paper-raised" : "border-line text-ink-soft hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

function StepFooter({
  onBack,
  onContinue,
  continueDisabled,
  continueLabel = "Continue",
}: {
  onBack?: () => void;
  onContinue: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
}) {
  return (
    <div className="flex justify-between border-t border-line p-4">
      {onBack ? (
        <button type="button" className="btn-secondary" onClick={onBack}>
          Back
        </button>
      ) : (
        <span />
      )}
      <button type="button" className="btn-primary" onClick={onContinue} disabled={continueDisabled}>
        {continueLabel}
      </button>
    </div>
  );
}
