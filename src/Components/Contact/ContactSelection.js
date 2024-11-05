import React, { useState } from "react";
import ContactSelect from "./ContactSelect";
import NewContactForm from "./NewContactForm";

export default function ContactSelection({ formData, setFormData, loadContactOptions, onInputChange }) {
  const [useExistingContact, setUseExistingContact] = useState(true);

  const toggleContactOption = () => {
    setUseExistingContact(!useExistingContact);
    setFormData({ ...formData, contact_id: "", new_contact_name: "", new_contact_email: "", new_contact_phone: "" });
  };

  return (
    <div className="mb-4">
      {useExistingContact ? (
        <ContactSelect
          loadContactOptions={loadContactOptions}
          onSelectContact={(selected) => setFormData({ ...formData, contact_id: selected ? selected.value : "" })}
        />
      ) : (
        <NewContactForm formData={formData} onInputChange={onInputChange} />
      )}
      <button
        type="button" // Ensure the button does not submit the form
        onClick={toggleContactOption}
        className="bg-transparent hover:bg-blue-500 text-blue-700 font-semibold hover:text-white py-1 px-2 border border-blue-500 hover:border-transparent rounded"
      >
        {useExistingContact ? "Or create a new contact" : "Or use an existing contact"}
      </button>
    </div>
  );
}