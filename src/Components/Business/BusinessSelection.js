import React from "react";
import Select from "react-select";

export default function BusinessSelection({ businesses, formData, handleInputChange }) {
  const businessOptions = businesses.map((business) => ({
    value: business.id,
    label: business.trading_as ? `${business.name} (${business.trading_as})` : business.name,
    addressId: business.address.id, // Include addressId in the option
  }));

  const handleBusinessChange = (selectedOption) => {
    handleInputChange({
      target: {
        name: "business_id",
        value: selectedOption ? selectedOption.value : "",
      },
    });
  };
  

  const customFilterOption = (option, searchText) => {
    if (
      option.label.toLowerCase().includes(searchText.toLowerCase()) ||
      (option.data.trading_as && option.data.trading_as.toLowerCase().includes(searchText.toLowerCase()))
    ) {
      return true;
    }
    return false;
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
        filterOption={customFilterOption}
      />
    </div>
  );
}