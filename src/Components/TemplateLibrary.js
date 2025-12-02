import React, { useEffect, useMemo, useState } from "react";
import FileUploadInput from "./Common/FileUploadInput";
import LoadingSpinner from "./Common/LoadingSpinner";
import { useAuth } from "../AuthContext";
import { toEasternLocaleString } from "../utils";

const TEMPLATE_CATEGORIES = [
  { value: "violation", label: "Violation Notices" },
  { value: "compliance", label: "Compliance Letters" },
  { value: "license", label: "Licenses" },
];

const LICENSE_TYPE_OPTIONS = [
  { value: "1", label: "Business License" },
  { value: "2", label: "Single Family License" },
  { value: "3", label: "Multifamily License" },
];

const formatLicenseType = (value) => {
  const match = LICENSE_TYPE_OPTIONS.find((opt) => String(opt.value) === String(value));
  return match ? match.label : value ? `Type ${value}` : "Unspecified";
};

const sanitizeFilename = (value, fallback) => {
  const safe = String(value || "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return safe || fallback;
};

const TemplateLibrary = () => {
  const { user, token } = useAuth();
  const [templatesByCategory, setTemplatesByCategory] = useState({});
  const [activeCategory, setActiveCategory] = useState(TEMPLATE_CATEGORIES[0].value);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategory, setUploadCategory] = useState(TEMPLATE_CATEGORIES[0].value);
  const [uploadLicenseType, setUploadLicenseType] = useState("1");
  const [uploading, setUploading] = useState(false);

  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const fetchTemplatesForCategory = async (category, signal) => {
    const resp = await fetch(
      `${process.env.REACT_APP_API_URL}/templates/?category=${encodeURIComponent(category)}`,
      { headers: authHeaders, signal }
    );
    if (!resp.ok) throw new Error("Failed to load templates");
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  };

  const refreshAll = async (signal) => {
    setErrorMessage("");
    setLoading(true);
    try {
      const entries = await Promise.all(
        TEMPLATE_CATEGORIES.map(async (cat) => [cat.value, await fetchTemplatesForCategory(cat.value, signal)])
      );
      if (signal?.aborted) return;
      const next = {};
      entries.forEach(([key, list]) => {
        next[key] = list;
      });
      setTemplatesByCategory(next);
    } catch (err) {
      if (!signal?.aborted) {
        setErrorMessage(err.message || "Unable to load templates.");
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    refreshAll(controller.signal);
    return () => controller.abort();
  }, [token]);

  const handleRefreshCategory = async () => {
    setStatusMessage("");
    setErrorMessage("");
    setLoading(true);
    try {
      const list = await fetchTemplatesForCategory(activeCategory);
      setTemplatesByCategory((prev) => ({ ...prev, [activeCategory]: list }));
      setStatusMessage("Templates refreshed.");
    } catch (err) {
      setErrorMessage(err.message || "Unable to refresh templates.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    if (!uploadName.trim()) {
      setErrorMessage("Template name is required.");
      return;
    }
    if (!uploadFiles.length) {
      setErrorMessage("Please select a .docx file to upload.");
      return;
    }
    const file = uploadFiles[0];
    const lower = (file.name || "").toLowerCase();
    const isDocx =
      lower.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (!isDocx) {
      setErrorMessage("Templates must be Word .docx files.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", uploadName.trim());
      fd.append("category", uploadCategory);
      if (uploadCategory === "license") {
        fd.append("license_type", uploadLicenseType);
      }
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/templates/`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      if (!resp.ok) {
        let message = "Unable to upload template.";
        try {
          const body = await resp.json();
          if (body?.detail) message = body.detail;
        } catch (e) {
          // ignore parse errors
        }
        throw new Error(message);
      }
      const updatedList = await fetchTemplatesForCategory(uploadCategory);
      setTemplatesByCategory((prev) => ({ ...prev, [uploadCategory]: updatedList }));
      setActiveCategory(uploadCategory);
      setUploadFiles([]);
      setUploadName("");
      setStatusMessage("Template uploaded successfully.");
    } catch (err) {
      setErrorMessage(err.message || "Unable to upload template.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (template) => {
    if (!template?.id) return;
    if (!window.confirm("Delete this template? This cannot be undone.")) return;
    setStatusMessage("");
    setErrorMessage("");
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/templates/${template.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!resp.ok) throw new Error("Unable to delete template.");
      const updatedList = await fetchTemplatesForCategory(template.category || activeCategory);
      setTemplatesByCategory((prev) => ({
        ...prev,
        [template.category || activeCategory]: updatedList,
      }));
      setStatusMessage("Template deleted.");
    } catch (err) {
      setErrorMessage(err.message || "Unable to delete template.");
    }
  };

  const handleDownload = async (template) => {
    if (!template?.id) return;
    setStatusMessage("");
    setErrorMessage("");
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/templates/${template.id}/download`, {
        headers: authHeaders,
      });
      if (!resp.ok) throw new Error("Unable to download template.");
      const blob = await resp.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      const rawName = template.filename || template.name || `template_${template.id}`;
      const baseName = sanitizeFilename(rawName.replace(/\.docx$/i, ""), `template_${template.id}`);
      const downloadName = `${baseName}.docx`;
      a.href = url;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err.message || "Unable to download template.");
    }
  };

  const activeTemplates = templatesByCategory[activeCategory] || [];
  const isLicenseCategory = activeCategory === "license";
  const activeLabel =
    TEMPLATE_CATEGORIES.find((cat) => cat.value === activeCategory)?.label || "Templates";

  if (!user || user.role !== 3) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-white px-6 py-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Admin access required</h2>
          <p className="mt-2 text-sm text-slate-600">
            Template management is limited to administrators.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Settings</p>
          <h1 className="text-2xl font-semibold text-slate-900">Template Library</h1>
          <p className="mt-1 text-sm text-slate-600">
            Upload custom Word templates for notices, compliance letters, and licenses.
          </p>
        </div>
        <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200">
          {token ? "Authenticated" : "No token"}
        </div>
      </div>

      {(statusMessage || errorMessage) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {statusMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              {statusMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{activeLabel}</h2>
                <p className="text-sm text-slate-600">
                  {activeTemplates.length} {activeTemplates.length === 1 ? "template" : "templates"} available
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                  {TEMPLATE_CATEGORIES.map((cat) => {
                    const isActive = cat.value === activeCategory;
                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setActiveCategory(cat.value)}
                        className={`rounded-full px-3 py-1 transition ${isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-700 hover:bg-white hover:text-indigo-700"
                          }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={handleRefreshCategory}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center px-6 py-10 text-sm text-slate-600">
              <LoadingSpinner className="mr-2 h-4 w-4" />
              Loading templates...
            </div>
          ) : activeTemplates.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-600">
              No templates uploaded for this category yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Name
                    </th>
                    {isLicenseCategory && (
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        License Type
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Added
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeTemplates.map((tpl) => (
                    <tr key={tpl.id}>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-900">{tpl.name}</td>
                      {isLicenseCategory && (
                        <td className="px-6 py-3 text-sm text-slate-700">
                          {formatLicenseType(tpl.license_type)}
                        </td>
                      )}
                      <td className="px-6 py-3 text-sm text-slate-700">{tpl.filename || "docx"}</td>
                      <td className="px-6 py-3 text-sm text-slate-700">
                        {tpl.created_at ? toEasternLocaleString(tpl.created_at, "en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }) : "-"}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownload(tpl)}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm ring-1 ring-inset ring-indigo-200 transition hover:bg-indigo-50"
                          >
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tpl)}
                            className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 transition hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Upload a new template</h2>
            <p className="text-sm text-slate-600">
              Provide a friendly name and choose the document type. Uploads must be .docx files.
            </p>
          </div>
          <form onSubmit={handleUpload} className="space-y-4 px-6 py-5">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-800" htmlFor="template-name">
                Template name
              </label>
              <input
                id="template-name"
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="e.g., Winter Notice Layout"
                disabled={uploading}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-slate-800" htmlFor="template-category">
                  Category
                </label>
                <select
                  id="template-category"
                  value={uploadCategory}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUploadCategory(value);
                    if (value !== "license") setUploadLicenseType("1");
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                  disabled={uploading}
                >
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {uploadCategory === "license" && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-800" htmlFor="license-type">
                    License type
                  </label>
                  <select
                    id="license-type"
                    value={uploadLicenseType}
                    onChange={(e) => setUploadLicenseType(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    disabled={uploading}
                  >
                    {LICENSE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Templates are suggested by license type when downloading a license document.
                  </p>
                </div>
              )}
            </div>

            <FileUploadInput
              label="Template file"
              description="Upload a Word (.docx) file. Max 10 MB."
              files={uploadFiles}
              onChange={setUploadFiles}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              multiple={false}
              disabled={uploading}
              addFilesLabel="Choose file"
              emptyStateLabel="No file selected"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {uploading ? "Uploading..." : "Upload template"}
              </button>
              <p className="text-xs text-slate-500">
                Each license template should be uploaded with the correct license type so it shows up in the matching dropdown.
              </p>
            </div>

          </form>
        </section>
      </div>
    </div>
  );
};

export default TemplateLibrary;
