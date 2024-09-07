import React from 'react';

const Citations = ({ citations }) => {
  if (citations.length === 0) {
    return <p>No citations available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Citations</h2>
      {citations.map((citation) => (
        <div key={citation.id} className="mb-2">
          <p><strong>ID:</strong> {citation.id}</p>
          <p><strong>Status:</strong> {citation.status}</p>
          <p><strong>Deadline:</strong> {citation.deadline}</p>
          <p><strong>Fine:</strong> {citation.fine}</p>
        </div>
      ))}
    </div>
  );
};

export default Citations;
