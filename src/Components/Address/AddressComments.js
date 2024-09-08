import React from 'react';

// Utility function to format the date
const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const AddressComments = ({ comments }) => {
  if (comments.length === 0) {
    return <p>No comments available.</p>; // If there are no comments, display this
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Comments</h2>
      <ul className="space-y-4 mt-4">
        {comments.map((comment) => (
          <li key={comment.id} className="bg-gray-100 p-4 rounded-lg shadow">
            <p className="text-gray-700 whitespace-pre-line">{comment.content}</p> {/* Display the comment content */}
            <p className="text-sm text-gray-500 mt-2">Posted on {formatDate(comment.created_at)}</p> {/* Display the creation date */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AddressComments;
