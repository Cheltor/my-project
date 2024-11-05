import React from "react";

export default function NewContactForm({ formData, onInputChange }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700">Create a new contact</label>
      
      {/* Name Field */}
      <input
        type="text"
        name="new_contact_name"
        placeholder="Name"
        value={formData.new_contact_name}
        onChange={onInputChange}
        className="mt-1 block w-full shadow-sm border-gray-300 rounded-md mb-2"
      />

      {/* Email Field */}
      <input
        type="email"
        name="new_contact_email"
        placeholder="Email"
        value={formData.new_contact_email}
        onChange={onInputChange}
        className="mt-1 block w-full shadow-sm border-gray-300 rounded-md mb-2"
      />

      {/* Phone Field */}
      <input
        type="tel"
        name="new_contact_phone"
        placeholder="Phone"
        value={formData.new_contact_phone}
        onChange={onInputChange}
        className="mt-1 block w-full shadow-sm border-gray-300 rounded-md"
      />
    </div>
  );
}
