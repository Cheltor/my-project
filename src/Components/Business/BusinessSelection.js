import React from "react";
import Select from "react-select";

export default function BusinessSelection({ businesses, formData, handleInputChange }) {
  const businessOptions = businesses.map((business) => ({
    value: business.id,
    label: business.name,
  }));

  const handleBusinessChange = (selectedOption) => {
    handleInputChange({
      target: {
        name: "business_id",
        value: selectedOption ? selectedOption.value : "",
      },
    });
  };

  return (
    <div className="mt-2 mb-4">
      <label htmlFor="business_id" className="block text-sm font-medium text-gray-700">
        Business
      </label>
      <Select
        id="business_id"
        name="business_id"
        value={businessOptions.find(option => option.value === formData.business_id)}
        onChange={handleBusinessChange}
        options={businessOptions}
        placeholder="Select Business"
        isClearable
        className="mt-1"
      />
    </div>
  );
}