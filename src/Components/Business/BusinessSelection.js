import React from "react";
import Select from "react-select";

export default function BusinessSelection({ businesses, formData, handleInputChange, setFormData }) {
  const businessOptions = businesses.map((business) => ({
    value: business.id,
    label: business.trading_as ? `${business.name} (${business.trading_as})` : business.name,
    // Prefer nested address.id if present, otherwise fall back to address_id
    addressId: business.address?.id ?? business.address_id,
    // If the business is tied to a specific unit, carry it through so we can auto-fill
    unitId: business.unit_id ?? null,
  }));

  const handleBusinessChange = (selectedOption) => {
    const selectedBusinessId = selectedOption ? Number(selectedOption.value) : null;
    const selectedAddressId = selectedOption && selectedOption.addressId != null ? Number(selectedOption.addressId) : null;
    const selectedUnitId = selectedOption && selectedOption.unitId != null ? Number(selectedOption.unitId) : null;
    if (typeof setFormData === 'function') {
      setFormData((prev) => ({
        ...prev,
        business_id: selectedBusinessId,
        address_id: selectedAddressId,
        unit_id: selectedUnitId,
      }));
    } else {
      // Fallback to individual changes
      handleInputChange({ target: { name: "business_id", value: selectedBusinessId ?? "" } });
      handleInputChange({ target: { name: "address_id", value: selectedAddressId ?? "" } });
      handleInputChange({ target: { name: "unit_id", value: selectedUnitId ?? "" } });
    }
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