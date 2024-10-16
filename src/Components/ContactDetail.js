import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContactComments from './Contact/ContactComments';
import NewContactComment from './Contact/NewContactComment';
import { formatPhoneNumber } from '../utils';

export default function ContactDetail() {
  const { id } = useParams(); // Get the id from the URL
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch the contact details from the API
    fetch(`https://civicode-2eae16143963.herokuapp.com/contacts/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch contact details');
        }
        return response.json();
      })
      .then((data) => {
        setContact(data); // Set the contact details
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message); // Set error message
        setLoading(false);
      });
  }, [id]); // Dependency array includes id to refetch if it changes

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold leading-6 text-gray-900">{contact.name}</h1>
      <p className="mt-2 text-sm text-gray-700">Email: <a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <p className="mt-2 text-sm text-gray-700">
        Phone: <a href={`tel:${formatPhoneNumber(contact.phone)}`}>{formatPhoneNumber(contact.phone) || 'N/A'}</a>
      </p>
      {/* Add more contact details as needed */}
      <ContactComments contactId={id} />
    </div>
  );
}
