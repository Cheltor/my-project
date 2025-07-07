import React from "react";
import AsyncSelect from "react-select/async";

export default function CodeSelect({ onChange, value, isMulti = false }) {
  // Load code options from the API, filtered by chapter, section, name, or description
  const loadCodeOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/codes/?search=${encodeURIComponent(inputValue)}`
    );
    const data = await response.json();
    // Filter client-side as well for chapter/section if needed
    const lowerInput = inputValue.toLowerCase();
    // Helper to truncate long descriptions
    const truncate = (str, max = 50) =>
      str && str.length > max ? str.substring(0, max) + '...' : str;

    return data
      .filter((code) =>
        [
          code.chapter?.toString() ?? "",
          code.section?.toString() ?? "",
          code.name?.toLowerCase() ?? "",
          code.description?.toLowerCase() ?? ""
        ].some((field) => field.includes(lowerInput))
      )
      .map((code) => ({
        label: `Ch. ${code.chapter} Sec. ${code.section} - ${code.name} - ${truncate(code.description, 50)}`,
        value: code.id,
        code: code
      }));
  };

  return (
    <AsyncSelect
      cacheOptions
      defaultOptions
      loadOptions={loadCodeOptions}
      onChange={onChange}
      value={value}
      placeholder="Type to search by chapter, section, name, or description..."
      isClearable
      isMulti={isMulti}
      className="mb-2"
      menuPlacement="auto"
      menuPosition="fixed"
      styles={{
        menu: (provided) => ({
          ...provided,
          zIndex: 9999,
          maxHeight: 300,
        })
      }}
    />
  );
}
