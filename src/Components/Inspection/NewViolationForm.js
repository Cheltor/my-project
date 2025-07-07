import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import CodeSelect from "../CodeSelect";

export default function NewViolationForm({ onCreated }) {
  const [form, setForm] = useState({
    codes: [], // array of code objects
    address_id: ""
  });
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [addressLabel, setAddressLabel] = useState("");
  // Function to load address options asynchronously
  const loadAddressOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/addresses/search?query=${inputValue}&limit=5`
    );
    const data = await response.json();
    return data.map((address) => ({
      label: `${address.property_name ? address.property_name + " - " : ""}${address.combadd}`,
      value: address.id,
    }));
  };

  const handleAddressChange = (selectedOption) => {
    setForm((prev) => ({ ...prev, address_id: selectedOption ? selectedOption.value : "" }));
    setAddressLabel(selectedOption ? selectedOption.label : "");
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle code select change (multi)
  const handleCodeChange = (selectedOptions) => {
    setSelectedCodes(selectedOptions || []);
    setForm((prev) => ({
      ...prev,
      codes: (selectedOptions || []).map(opt => ({
        id: opt.code.id,
        name: opt.code.name,
        description: opt.code.description,
        chapter: opt.code.chapter,
        section: opt.code.section
      }))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Use current date in YYYY-MM-DD format
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const currentDate = `${yyyy}-${mm}-${dd}`;
      // Submit one violation per code
      for (const code of form.codes) {
        const violationData = {
          code: code.name,
          description: code.description,
          address_id: form.address_id,
          date: currentDate
        };
        const response = await fetch(`${process.env.REACT_APP_API_URL}/violations/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(violationData),
        });
        if (!response.ok) throw new Error("Failed to create violation");
      }
      setSuccess(true);
      setForm({ codes: [], address_id: "" });
      setSelectedCodes([]);
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">Add New Violation</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Address Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <AsyncSelect
            cacheOptions
            defaultOptions
            loadOptions={loadAddressOptions}
            onChange={handleAddressChange}
            value={form.address_id ? { value: form.address_id, label: addressLabel } : null}
            placeholder="Type to search addresses..."
            isClearable
            className="mb-2"
          />
        </div>
        {/* Violation Code Selection (multi) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Violation Codes</label>
          <CodeSelect
            onChange={handleCodeChange}
            value={selectedCodes}
            isMulti={true}
          />
        </div>
        {/* Show selected code descriptions (truncated) */}
        {selectedCodes.length > 0 && (
          <div className="mb-2">
            <label className="block text-xs font-medium text-gray-500">Descriptions:</label>
            <ul className="list-disc ml-5 text-xs text-gray-700">
              {selectedCodes.map((opt) => (
                <li key={opt.value} title={opt.code.description}>
                  {opt.code.description.length > 80 ? opt.code.description.slice(0, 80) + '...' : opt.code.description}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Attachments */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Attachments</label>
          <div className="mt-1 flex items-center">
            <label className="bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm px-4 py-2 cursor-pointer hover:bg-gray-50">
              <span>Choose files</span>
              <input
                type="file"
                name="attachments"
                multiple
                className="sr-only"
                // You can add onChange handler for attachments if you want to handle uploads
              />
            </label>
            {/* Optionally, show selected file names here if you add state for them */}
          </div>
        </div>
        {/* Date field removed; current date will be used automatically */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Violation"}
        </button>
        {error && <div className="text-red-500">{error}</div>}
        {success && <div className="text-green-600">Violation created!</div>}
      </form>
    </div>
  );
}
