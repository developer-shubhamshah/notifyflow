
"use client";

import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface ImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string | null;
  mobile: string | null;
  email: string | null;
  status: "valid" | "invalid" | "duplicate";
  errors: string[];
}

interface PreviewResponse {
  message: string;
  fileName: string;
  totalRows: number;
  summary: {
    valid: number;
    duplicate: number;
    invalid: number;
  };
  preview: ImportRow[];
  issues: ImportRow[];
}

interface ImportResponse {
  message: string;
  fileName: string;
  groupId: string | null;
  summary: {
    totalRows: number;
    imported: number;
    assignedToGroup: number;
    duplicate: number;
    invalid: number;
  };
  issues: ImportRow[];
}

interface Props {
  brandId: string;
  onImported: () => void;
}

export default function BulkContactImport({
  brandId,
  onImported,
}: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] =
    useState<ImportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setPreview(null);
    setImportResult(null);
    setError("");
  };

  const close = () => {
    if (loading) return;
    setOpen(false);
    reset();
  };

  const getErrorMessage = async (response: Response) => {
    const result = await response.json().catch(() => ({}));
    return Array.isArray(result.message)
      ? result.message.join(", ")
      : result.message || "Something went wrong.";
  };

  const validateFile = async () => {
    if (!file || !brandId) {
      setError("Please select a file.");
      return;
    }

    setLoading(true);
    setError("");
    setPreview(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/contact-import/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: PreviewResponse = await response.json();
      setPreview(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to validate file."
      );
    } finally {
      setLoading(false);
    }
  };

  const importContacts = async () => {
    if (!file || !preview || preview.summary.valid === 0) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/brands/${encodeURIComponent(brandId)}/contact-import/import`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      const result: ImportResponse = await response.json();
      setImportResult(result);
      onImported();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to import contacts."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!brandId}
        className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 transition hover:bg-violet-50 disabled:opacity-50"
      >
        <Upload size={17} />
        Bulk Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Bulk Contact Import
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Upload an Excel or CSV file to import contacts.
                </p>
              </div>

              <button
                type="button"
                onClick={close}
                disabled={loading}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">
              {!importResult && (
                <>
                  <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                    <div className="flex items-start gap-3">
                      <FileSpreadsheet
                        className="mt-0.5 text-violet-600"
                        size={22}
                      />
                      <div>
                        <p className="text-sm font-semibold text-violet-900">
                          Prepare your Excel file
                        </p>
                        <p className="mt-1 text-xs leading-5 text-violet-800">
                          Required headers: firstName, lastName, mobile,
                          email. First name is mandatory. Each row must
                          contain a mobile number or email address.
                        </p>
                        <p className="mt-2 text-xs text-violet-800">
                          Supported formats: .xlsx and .csv. Maximum file
                          size: 5 MB. Maximum 5,000 contact rows.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Select Excel or CSV file
                    </label>

                    <input
                      type="file"
                      accept=".xlsx,.csv"
                      disabled={loading || !!preview}
                      onChange={(event) => {
                        const selectedFile =
                          event.target.files?.[0] ?? null;

                        setFile(selectedFile);
                        setPreview(null);
                        setImportResult(null);
                        setError("");
                      }}
                      className="block w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-violet-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-violet-700 hover:file:bg-violet-200"
                    />

                    {file && (
                      <p className="mt-2 text-xs text-slate-500">
                        Selected: {file.name} (
                        {(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  {!preview && (
                    <button
                      type="button"
                      onClick={validateFile}
                      disabled={!file || loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          Validating file...
                        </>
                      ) : (
                        <>
                          <Upload size={17} />
                          Validate & Preview
                        </>
                      )}
                    </button>
                  )}
                </>
              )}

              {preview && !importResult && (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-medium text-emerald-700">
                        Valid contacts
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-800">
                        {preview.summary.valid}
                      </p>
                    </div>

                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-xs font-medium text-orange-700">
                        Duplicates
                      </p>
                      <p className="mt-1 text-2xl font-bold text-orange-800">
                        {preview.summary.duplicate}
                      </p>
                    </div>

                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-medium text-red-700">
                        Invalid rows
                      </p>
                      <p className="mt-1 text-2xl font-bold text-red-800">
                        {preview.summary.invalid}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">
                      Import preview
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Showing up to 20 rows from {preview.totalRows} total
                      rows.
                    </p>

                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500">
                          <tr>
                            <th className="p-3">Row</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Mobile</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {preview.preview.map((row) => (
                            <tr key={row.rowNumber}>
                              <td className="p-3">{row.rowNumber}</td>
                              <td className="p-3">
                                {row.firstName} {row.lastName ?? ""}
                              </td>
                              <td className="p-3">{row.mobile || "—"}</td>
                              <td className="p-3">{row.email || "—"}</td>
                              <td className="p-3">
                                <span
                                  className={`rounded-full px-2 py-1 font-medium ${
                                    row.status === "valid"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : row.status === "duplicate"
                                        ? "bg-orange-100 text-orange-700"
                                        : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {preview.issues.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-orange-800">
                        <AlertCircle size={17} />
                        Rows requiring attention
                      </p>

                      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                        {preview.issues.map((row) => (
                          <div
                            key={row.rowNumber}
                            className="text-xs text-orange-800"
                          >
                            <strong>Row {row.rowNumber}:</strong>{" "}
                            {row.errors.join(", ")}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Only valid contacts will be imported. Duplicate and
                    invalid rows will be skipped. Imported contacts will
                    have WhatsApp, SMS and Email consent set to false.
                  </p>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={reset}
                      disabled={loading}
                      className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Choose Another File
                    </button>

                    <button
                      type="button"
                      onClick={importContacts}
                      disabled={loading || preview.summary.valid === 0}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          Importing...
                        </>
                      ) : (
                        `Import ${preview.summary.valid} Contacts`
                      )}
                    </button>
                  </div>
                </>
              )}

              {importResult && (
                <div className="space-y-5">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                    <CheckCircle2
                      size={42}
                      className="mx-auto text-emerald-600"
                    />
                    <h3 className="mt-3 text-lg font-bold text-emerald-800">
                      Import completed
                    </h3>
                    <p className="mt-1 text-sm text-emerald-700">
                      {importResult.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-emerald-200 p-4">
                      <p className="text-xs text-slate-500">
                        Imported successfully
                      </p>
                      <p className="mt-1 text-2xl font-bold text-emerald-700">
                        {importResult.summary.imported}
                      </p>
                    </div>

                    <div className="rounded-xl border border-orange-200 p-4">
                      <p className="text-xs text-slate-500">Duplicates</p>
                      <p className="mt-1 text-2xl font-bold text-orange-700">
                        {importResult.summary.duplicate}
                      </p>
                    </div>

                    <div className="rounded-xl border border-red-200 p-4">
                      <p className="text-xs text-slate-500">Invalid rows</p>
                      <p className="mt-1 text-2xl font-bold text-red-700">
                        {importResult.summary.invalid}
                      </p>
                    </div>
                  </div>

                  {importResult.issues.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="text-sm font-semibold text-orange-800">
                        Skipped rows
                      </p>
                      <div className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                        {importResult.issues.map((row) => (
                          <p
                            key={row.rowNumber}
                            className="text-xs text-orange-800"
                          >
                            <strong>Row {row.rowNumber}:</strong>{" "}
                            {row.errors.join(", ")}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={close}
                    className="w-full rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
                  >
                    Done
                  </button>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle size={17} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
