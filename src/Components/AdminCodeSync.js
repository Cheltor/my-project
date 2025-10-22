import React, { useState } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function AdminCodeSync() {
  const [payload, setPayload] = useState(null);
  const [diff, setDiff] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      setPayload(json);
      setDiff(null);
      setToast("File loaded.");
    } catch {
      setToast("Invalid JSON file.");
    }
  }

  async function runDiff() {
    if (!payload) return;
    setBusy(true);
    try {
      // convert "sections" to "items" automatically (works for both dict and array)
      let body = payload;
      if (payload.sections && !payload.items) {
        const secs = payload.sections;
        const items = Array.isArray(secs)
          ? secs.map((obj) => ({
              section: (obj.section || "").replace(/^(\d+[-.])/, ""),
              name: obj.title || "",
              description: obj.summary || "",
            }))
          : Object.entries(secs).map(([sec, obj]) => ({
              section: (sec || "").replace(/^(\d+[-.])/, ""),
              name: obj.title || "",
              description: obj.summary || "",
            }));

        body = {
          chapter: String(payload.chapter),
          source: payload.title,
          version: new Date().toISOString().slice(0, 10),
          items,
        };
      }

      const res = await fetch(`${API}/codes/sync/diff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setDiff(data);
      setToast(
        `Diff complete: creates ${data.summary.creates}, updates ${data.summary.updates}, conflicts ${data.summary.conflicts}`
      );
    } catch (e) {
      setToast(`Diff error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function applyNonConflicting() {
    if (!diff) return;
    setBusy(true);
    try {
      const body = {
        creates: diff.creates,
        updates: diff.updates.map((u) => ({ id: u.id, ...u.after })),
      };
      const res = await fetch(`${API}/codes/sync/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setToast(`Applied: created ${data.created}, updated ${data.updated}`);
      await runDiff(); // refresh
    } catch (e) {
      setToast(`Apply error: ${e.message}`);
      setBusy(false);
    }
  }

  async function acceptSource(conf) {
    if (!conf.after || conf.after.id == null) return;
    setBusy(true);
    try {
      const res = await fetch(`${API}/codes/${conf.after.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter: conf.after.chapter,
          section: conf.after.section,
          name: conf.after.name,
          description: conf.after.description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast(`Conflict resolved: updated id ${conf.after.id}`);
      await runDiff();
    } catch (e) {
      setToast(`Accept error: ${e.message}`);
      setBusy(false);
    }
  }

  function keepDatabase() {
    // MVP: do nothing server-side; user is choosing to leave DB as-is.
    setToast("Keeping database value (no change applied).");
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Code Sync (MVP)</h1>
      <p className="mt-1 mb-4 text-gray-600">
        Upload a chapter JSON, preview the diff, apply safe changes, and resolve conflicts.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept="application/json"
          onChange={handleFile}
          className="block w-full sm:w-auto text-sm text-gray-900 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <button
          disabled={!payload || busy}
          onClick={runDiff}
          className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? 'Working…' : 'Diff'}
        </button>
        <button
          disabled={!diff || busy}
          onClick={applyNonConflicting}
          className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Apply non-conflicting
        </button>
        {toast ? (
          <div
            className="mt-2 w-full sm:w-auto rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
            role="status"
            aria-live="polite"
          >
            {toast}
          </div>
        ) : null}
      </div>

      {diff && (
        <div className="grid gap-6">
          <section>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Creates</h2>
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                {diff.summary.creates}
              </span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {diff.creates.map((c, i) => (
                <li key={`c-${i}`} className="text-green-700">
                  {`${c.chapter}-${c.section}`}: <span className="font-semibold">{c.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Updates</h2>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
                {diff.summary.updates}
              </span>
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {diff.updates.map((u, i) => (
                <li key={`u-${i}`} className="text-blue-700">
                  id {u.id}: <span className="font-semibold">{u.before.name}</span> →{' '}
                  <span className="font-semibold">{u.after.name}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">Conflicts</h2>
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                {diff.summary.conflicts}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {diff.conflicts.map((c, i) => (
                <li key={`x-${i}`} className="rounded-lg border border-gray-200 p-4">
                  <div className="text-red-700 font-semibold">{c.reason}</div>
                  <div className="text-sm text-gray-600">{c.message}</div>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <div className="font-semibold text-gray-900">Before (DB)</div>
                      <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-800 overflow-auto">
                        {JSON.stringify(c.before, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">After (Source)</div>
                      <pre className="mt-1 whitespace-pre-wrap text-xs leading-5 rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-800 overflow-auto">
                        {JSON.stringify(c.after, null, 2)}
                      </pre>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => acceptSource(c)}
                      disabled={busy}
                      className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Accept Source (PUT)
                    </button>
                    <button
                      onClick={keepDatabase}
                      disabled={busy}
                      className="inline-flex items-center rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-900 shadow-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Keep Database
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
