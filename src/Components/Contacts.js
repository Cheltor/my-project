import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { formatPhoneNumber } from '../utils';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);
  const contactsPerPage = 10;

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/contacts/`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        return response.json();
      })
      .then((data) => {
        setContacts(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  const filteredContacts = contacts.filter((contact) =>
    [contact.name, contact.email, contact.phone]
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleCreateContact = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setDuplicateMatch(null);
    const emailNorm = (newContact.email || '').trim().toLowerCase();
    const phoneNorm = (newContact.phone || '').replace(/\D/g, '');
    const match = contacts.find((c) => {
      const cEmail = (c.email || '').trim().toLowerCase();
      const cPhone = (c.phone || '').replace(/\D/g, '');
      return (emailNorm && cEmail && cEmail === emailNorm) || (phoneNorm && cPhone && cPhone === phoneNorm);
    });
    if (match) {
      setCreating(false);
      setDuplicateMatch(match);
      setCreateError('A contact with this email or phone already exists.');
      return;
    }
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (newContact.name || '').trim(),
          email: (newContact.email || '').trim() || null,
          phone: (newContact.phone || '').trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create contact');
      const created = await res.json();
      setContacts((prev) => [created, ...prev]);
      setShowNewContact(false);
      setNewContact({ name: '', email: '', phone: '' });
      // Reset to first page so the new item is visible
      setCurrentPage(1);
    } catch (err) {
      setCreateError(err.message || 'Could not create contact');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Contacts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all contacts including name, email, and phone number.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            onClick={() => { setShowNewContact(true); setCreateError(null); }}
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Add contact
          </button>
        </div>
      </div>

      {showNewContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowNewContact(false)} />
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Contact</h2>
            {createError && (
              <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">
                <div>{createError}</div>
                {duplicateMatch && (
                  <div className="mt-2 text-sm">
                    Existing: <Link className="text-indigo-600 underline" to={`/contacts/${duplicateMatch.id}`}>{duplicateMatch.name || duplicateMatch.email || duplicateMatch.phone}</Link>
                  </div>
                )}
              </div>
            )}
            <form onSubmit={handleCreateContact} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name<span className="text-red-600">*</span></label>
                <input
                  required
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="name@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={() => setShowNewContact(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className={classNames(
                    'rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm',
                    creating ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-500'
                  )}
                >
                  {creating ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="mt-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {currentContacts.map((contact) => (
              <tr key={contact.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <Link to={`/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900">
                    {contact.name}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a href={`tel:${formatPhoneNumber(contact.phone)}`}>
                    {formatPhoneNumber(contact.phone) || 'N/A'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
        >
          Previous
        </button>
        <p className="text-sm text-gray-700">
          Page {currentPage} of {totalPages}
        </p>
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-500 disabled:bg-gray-300"
        >
          Next
        </button>
      </div>
    </div>
  );
}
