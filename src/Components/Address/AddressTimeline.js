import React from 'react';
import { toEasternLocaleDateString } from '../../utils';

const Timeline = ({ timeline }) => {
  if (timeline.length === 0) {
    return <p>No timeline events available.</p>;
  }

  return (
    <div className="border-b pb-4">
      <h2 className="text-2xl font-semibold text-gray-700">Timeline</h2>
      {timeline.map((item) => (
        <div key={item.id} className="mb-2">
          <p><strong>ID:</strong> {item.id}</p>
          <p><strong>Date:</strong> {toEasternLocaleDateString(item.created_at)}</p>
        </div>
      ))}
    </div>
  );
};

export default Timeline;
