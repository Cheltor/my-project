import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const CodeDetail = () => {
  const { id } = useParams(); // Extract the code ID from the URL
  const [code, setCode] = useState(null); // State to store code details
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state

  useEffect(() => {
    // Fetch the details of a specific code using the ID from the URL
    fetch(`${process.env.REACT_APP_API_URL}/codes/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch code details');
        }
        return response.json();
      })
      .then((data) => {
        setCode(data); // Set the fetched code details
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, [id]); // Dependency array includes id to refetch if it changes

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">Code Details</h1>
      {code ? (
        <div className="space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Basic Information</h2>
            <p className="text-sm text-gray-600"><strong>Chapter:</strong> {code.chapter}</p>
            <p className="text-sm text-gray-600"><strong>Section:</strong> {code.section}</p>
            <p className="text-sm text-gray-600"><strong>Name:</strong> {code.name}</p>
            <p className="text-sm text-gray-600"><strong>Description:</strong> {code.description}</p>
          </div>
          <div className="border-b pb-4">
            <h2 className="text-xl font-medium text-gray-700">Timestamps</h2>
            <p className="text-sm text-gray-600"><strong>Created At:</strong> {new Date(code.created_at).toLocaleDateString()}</p>
            <p className="text-sm text-gray-600"><strong>Updated At:</strong> {new Date(code.updated_at).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-600">No details available for this code.</p>
      )}
    </div>
  );
};

export default CodeDetail;
