import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

export default function InspectionDetail() {
  const { id } = useParams();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchInspection = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch inspection');
        }
        const data = await response.json();
        setInspection(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInspection();
  }, [id]);

  if (loading) {
    return <p>Loading inspection...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <div className="px-4 sm:px-0">
        <h3 className="text-base font-semibold leading-7 text-gray-900">Inspection Information for {inspection.source} - #{inspection.id}</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">Details of the inspection and related information.</p>
      </div>

      {/* CTA to Conduct Inspection. Only show if inspection is pending */}
      {inspection.status === null && (
        <div className="px-4 py-6 sm:px-0">
          <Link to={`/inspections/${inspection.id}/conduct`} className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Conduct Inspection
          </Link>
        </div>
      )}

      {/* Edit Inspection Button if inspection status is not null */}
      {inspection.status !== null && (
        <div className="px-4 py-6 sm:px-0">
          <Link to={`/inspections/${inspection.id}/conduct`} className="block rounded-md bg-indigo-50 px-3 py-2 text-center text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            Edit Inspection
          </Link>
        </div>
      )}
      
      <div className="mt-6 border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          
          {/* Address Information with Link */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Property Address</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.address ? (
                <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-900">
                  {inspection.address.combadd || "No address available"}
                </Link>
              ) : "No address available"}
            </dd>
          </div>
          
          {/* Inspector Information */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspector</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.inspector?.name || "No inspector assigned"}
            </dd>
          </div>

          {/* Inspector Contact Information with Mailto 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspector Contact</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.inspector?.email ? (
                <a href={`mailto:${inspection.inspector.email}`} className="text-indigo-600 hover:text-indigo-900">
                  {inspection.inspector.email}
                </a>
              ) : "N/A"} | {inspection.inspector?.phone || "N/A"}
            </dd>
          </div>*/}

          {/* Status */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Inspection Status</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.status || "Pending"}
            </dd>
          </div>

          {/* Scheduled Date/Time */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Scheduled Date/Time</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.scheduled_datetime ? new Date(inspection.scheduled_datetime).toLocaleString() : "Not scheduled"}
            </dd>
          </div>

          {/* Contact Information with Link */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Contact Information</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.contact ? (
                <>
                  <Link to={`/contacts/${inspection.contact.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.contact.name}
                  </Link> | 
                  <a href={`mailto:${inspection.contact.email}`} className="text-indigo-600 hover:text-indigo-900">
                    {inspection.contact.email}
                  </a> | {inspection.contact.phone || "N/A"}
                </>
              ) : "No contact information available"}
            </dd>
          </div>

          {/* Property Owner Information */}
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Owner Name</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.address?.ownername || "No owner information available"}
            </dd>
          </div>

          {/* Property Location 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Latitude/Longitude</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              Latitude: {inspection.address?.latitude || "N/A"}, Longitude: {inspection.address?.longitude || "N/A"}
            </dd>
          </div>*/}

          {/* Additional Details 
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Additional Notes</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              {inspection.comment || "No additional notes provided."}
            </dd>
          </div>*/}
        </dl>
      </div>
    </div>
  );
}
