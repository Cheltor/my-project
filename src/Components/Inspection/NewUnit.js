import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NewUnit({ addressId, inspectionId }) {  // Use props instead of useParams
  const [number, setNumber] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    try {
      const response = await fetch(`http://localhost:8000/addresses/${addressId}/units`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: number,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create unit');
      }

      const newUnit = await response.json();
      // Redirect to the new unit's detail page using the inspectionId from the Conduct component
      navigate(`/inspections/${inspectionId}/unit/${newUnit.id}`);
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        {error && <p className="text-red-500">Error: {error}</p>}
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="number" className="block text-sm font-medium text-gray-700">
              Unit Number/Letter
            </label>
            <input
              id="number"
              type="text"
              className="form-input block w-full sm:text-sm sm:leading-5 mt-1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              required
            />
          </div>
          <div className="mt-6">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500"
            >
              Create Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
