import React, { useState } from "react";
import { useAuth } from "../../AuthContext";
import AlertModal from "../Common/AlertModal";

export default function NewUnitForm({ addressId, onUnitCreated }) {
  const { user } = useAuth();
  const [unitNumber, setUnitNumber] = useState("");
  const [alertState, setAlertState] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
    onClose: () => setAlertState((prev) => ({ ...prev, isOpen: false })),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ address_id: addressId, number: unitNumber }),
      });

      if (!response.ok) throw new Error("Failed to create unit");

      const newUnit = await response.json();
      onUnitCreated(newUnit);
      setUnitNumber("");
    } catch (error) {
      console.error("Error creating unit:", error);
      setAlertState({
        isOpen: true,
        title: "Error",
        message: "Error creating unit.",
        type: "error",
        onClose: () => setAlertState((prev) => ({ ...prev, isOpen: false })),
      });
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-4">
          <label htmlFor="unit_number" className="block text-sm font-medium text-gray-700">
            Unit Number
          </label>
          <input
            type="text"
            id="unit_number"
            name="unit_number"
            value={unitNumber}
            onChange={(e) => setUnitNumber(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded hover:bg-indigo-700"
        >
          Create Unit
        </button>
      </form>
      <AlertModal
        isOpen={alertState.isOpen}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        onClose={alertState.onClose}
      />
    </>
  );
}
