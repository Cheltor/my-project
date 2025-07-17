import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import CitationDetails from "./CitationDetails";

export default function CitationDetailsPage() {
  const { id } = useParams();
  const [citation, setCitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Add loading state for status update
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/citations/${id}`)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch citation");
        return response.json();
      })
      .then((data) => {
        setCitation(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Handler for status change
  const handleStatusChange = async (citationId, newStatus) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/citations/${citationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      // Refetch updated citation
      const updated = await fetch(`${process.env.REACT_APP_API_URL}/citations/${citationId}`);
      const updatedCitation = await updated.json();
      setCitation(updatedCitation);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">{error}</div>;

  return <CitationDetails citation={citation} submitting={submitting} onStatusChange={handleStatusChange} />;
}
