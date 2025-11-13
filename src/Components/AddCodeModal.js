import React, { useCallback, useMemo, useState, useId } from "react";
import ModalShell from "./Common/ModalShell";
import useModalReset from "../Hooks/useModalReset";

const INITIAL_FORM = {
  chapter: "",
  section: "",
  name: "",
  description: "",
};

export default function AddCodeModal({
  open,
  onClose,
  onCreated,
  authToken,
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const formId = useId();

  const resetModal = useCallback(() => {
    setForm(INITIAL_FORM);
    setSubmitting(false);
    setError("");
  }, []);

  useModalReset(open, resetModal);

  const canSubmit = useMemo(() => {
    const chapter = form.chapter.trim();
    const section = form.section.trim();
    const name = form.name.trim();
    const description = form.description.trim();
    return (
      chapter !== "" &&
      section !== "" &&
      name !== "" &&
      description !== "" &&
      !submitting
    );
  }, [form.chapter, form.section, form.name, form.description, submitting]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/codes/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          chapter: form.chapter,
          section: form.section,
          name: form.name,
          description: form.description,
        }),
      });

      if (!response.ok) {
        let message = "Unable to create code.";
        try {
          const payload = await response.json();
          if (payload?.detail) message = payload.detail;
        } catch {
          message = await response.text().catch(() => message);
        }
        throw new Error(message || "Unable to create code.");
      }

      const created = await response.json();
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      setError(err.message || "Unable to create code.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      title="Add Code"
      onClose={onClose}
      onCancel={onClose}
      disableCancel={submitting}
      actions={
        <button
          type="submit"
          form={formId}
          disabled={!canSubmit}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Create"}
        </button>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Chapter (67, 10, 15, etc.)<span className="text-red-600">*</span>
            </label>
            <input
              name="chapter"
              type="text"
              value={form.chapter}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Section (1, 10, 302.2, etc.)<span className="text-red-600">*</span>
            </label>
            <input
              name="section"
              type="text"
              value={form.section}
              onChange={handleChange}
              required
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={5}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>
    </ModalShell>
  );
}
