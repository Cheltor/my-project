import React from "react";
import AsyncSelect from "react-select/async";

export default function CodeSelect({
  onChange,
  value,
  isMulti = false,
  loadOptions,
  showDescription = false,
  maxDescriptionLength = 120,
}) {
  // Default: Load code options from the API, filtered by chapter, section, name, or description
  const defaultLoadCodeOptions = async (inputValue) => {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/codes/?search=${encodeURIComponent(inputValue)}`
    );
    const data = await response.json();
    const lowerInput = inputValue.toLowerCase();
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

  const formatOptionLabel = (option) => {
    if (!showDescription) return option.label;
    const desc = option?.code?.description || '';
    const truncated =
      desc && desc.length > maxDescriptionLength
        ? `${desc.slice(0, maxDescriptionLength)}...`
        : desc;
    return (
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">{option.label}</span>
        {truncated && <span className="text-xs text-gray-600">{truncated}</span>}
      </div>
    );
  };

  return (
    <AsyncSelect
      cacheOptions
      defaultOptions
      loadOptions={loadOptions || defaultLoadCodeOptions}
      onChange={onChange}
      value={value}
      placeholder="Type to search by chapter, section, name, or description..."
      isClearable
      isMulti={isMulti}
      className="mb-2"
      menuPlacement="auto"
      menuPosition="fixed"
      formatOptionLabel={formatOptionLabel}
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
