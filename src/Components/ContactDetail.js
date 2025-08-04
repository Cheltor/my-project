
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ContactComments from './Contact/ContactComments';
import NewContactComment from './Contact/NewContactComment';
import { formatPhoneNumber } from '../utils';


export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContact, setEditContact] = useState({ name: '', email: '', phone: '' });
  const [editError, setEditError] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/contacts/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch contact details');
        }
        return response.json();
      })
      .then((data) => {
        setContact(data);
        setEditContact({ name: data.name || '', email: data.email || '', phone: data.phone || '' });
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, [id]);

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditContact((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editContact)
      });
      if (!res.ok) throw new Error('Failed to update contact');
      const updated = await res.json();
      setContact(updated);
      setIsEditing(false);
    } catch (err) {
      setEditError('Could not update contact.');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <div className="space-y-4">
        <div className="border-b pb-4">
          <h2 className="text-xl font-medium text-gray-700 flex items-center justify-between">
            Basic Information
            {!isEditing && (
              <button
                className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm"
                onClick={() => setIsEditing(true)}
              >Edit</button>
            )}
          </h2>
          {!isEditing ? (
            <>
              <p className="text-lg font-semibold text-blue-700 mb-2">{contact.name}</p>
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm font-medium mr-2"
                  title={`Email ${contact.email}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm0 0v4m0-4V8" /></svg>
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm font-medium"
                  title={`Call ${contact.phone}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H5a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  {formatPhoneNumber(contact.phone)}
                </a>
              )}
            </>
          ) : (
            <form onSubmit={handleEditSubmit} className="space-y-2 mt-2">
              <input
                required
                type="text"
                name="name"
                className="border px-2 py-1 rounded w-full"
                placeholder="Name"
                value={editContact.name}
                onChange={handleEditChange}
              />
              <input
                type="email"
                name="email"
                className="border px-2 py-1 rounded w-full"
                placeholder="Email"
                value={editContact.email}
                onChange={handleEditChange}
              />
              <input
                type="text"
                name="phone"
                className="border px-2 py-1 rounded w-full"
                placeholder="Phone"
                value={editContact.phone}
                onChange={handleEditChange}
              />
              <div className="flex gap-2">
                <button type="submit" className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                <button type="button" className="px-3 py-1 bg-gray-400 text-white rounded" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
              {editError && <div className="text-red-500 mt-2">{editError}</div>}
            </form>
          )}
        </div>
        {/* Add more contact details as needed */}
        <div>
          <ContactComments contactId={id} />
        </div>
      </div>
    </div>
  );
}
