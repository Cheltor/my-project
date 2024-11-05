import React from "react";
import AsyncSelect from "react-select/async";

export default function ContactSelect({ loadContactOptions, onSelectContact }) {
  return (
    <div className="mb-4">
      <label htmlFor="contact_id" className="block text-sm font-medium text-gray-700">
        Select an Existing Contact
      </label>
      <AsyncSelect
        cacheOptions
        loadOptions={loadContactOptions}
        placeholder="Type to search contacts by name or email..."
        isClearable
        onChange={onSelectContact}
        className="mt-1"
        autoComplete="off"
        inputId="contact_id"
      />
    </div>
  );
}
