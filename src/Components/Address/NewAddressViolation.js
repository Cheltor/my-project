import React, { useState } from 'react';

const NewAddressViolation = ({ addressId, onViolationAdded }) => {
  const [description, setDescription] = useState(''); // State for the description input
  const [violationType, setViolationType] = useState(''); // State for the violation type input
  const [status, setStatus] = useState(0); // State for the status input
  const [deadline, setDeadline] = useState(''); // State for the deadline input
  const [submitting, setSubmitting] = useState(false); // State for form submission

  // Function to handle form submission
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!description.trim() || !violationType.trim() || !deadline.trim()) {
      return; // Prevent submission of incomplete forms
    }
    
    console.log("Submitting violation:", description, violationType, status, deadline);
    console.log("Address ID:", addressId);
    console.log("User ID:", 1); // Hardcoded user ID for testing

    setSubmitting(true);

    fetch(`${process.env.REACT_APP_API_URL}/addresses/${addressId}/violations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        violation_type: violationType,
        status,
        deadline,
        user_id: 1, // Adjust this to the actual user ID as needed
      }),
    })
      .then((response) => {
        console.log("Response status:", response.status);
        return response.json();
      })
      .then((newViolation) => {
        console.log("Received response:", newViolation);
        onViolationAdded(newViolation); // Notify parent component of the new violation
        // Reset the input fields
        setDescription('');
        setViolationType('');
        setStatus(0);
        setDeadline('');
        setSubmitting(false);
      })
      .catch((error) => {
        console.error('Error submitting violation:', error);
        setSubmitting(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Violation description..."
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        rows="4"
        disabled={submitting}
      ></textarea>
      <input
        value={violationType}
        onChange={(e) => setViolationType(e.target.value)}
        placeholder="Violation type..."
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        disabled={submitting}
      />
      <input
        type="number"
        value={status}
        onChange={(e) => setStatus(Number(e.target.value))}
        placeholder="Status (e.g., 0, 1, 2...)"
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        disabled={submitting}
      />
      <select
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:ring-indigo-200"
        disabled={submitting}
      >
        <option value="" disabled>Select deadline</option>
        <option value="Immediate">Immediate</option>
        <option value="1 day">1 day</option>
        <option value="3 days">3 days</option>
        <option value="7 days">7 days</option>
        <option value="14 days">14 days</option>
        <option value="30 days">30 days</option>
      </select>
      <button
        type="submit"
        className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-500 focus:outline-none focus:ring focus:ring-indigo-400"
        disabled={submitting}
      >
        {submitting ? 'Submitting...' : 'Add Violation'}
      </button>
    </form>
  );
};

export default NewAddressViolation;
