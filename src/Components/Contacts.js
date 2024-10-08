import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import { formatPhoneNumber } from '../utils'; // Import formatPhoneNumber utility function

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function Contacts() {
  const [contacts, setContacts] = useState([]); // State to store all contacts
  const [loading, setLoading] = useState(true); // State to manage loading state
  const [error, setError] = useState(null); // State to manage error state
  const [currentPage, setCurrentPage] = useState(1); // State for the current page
  const [searchQuery, setSearchQuery] = useState(''); // State for search query
  const contactsPerPage = 10; // Number of contacts to display per page

  useEffect(() => {
    // Fetch contacts from the API
    fetch('http://127.0.0.1:8000/contacts/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        return response.json();
      })
      .then((data) => {
        setContacts(data); // Store the fetched contacts in the state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        setError(error.message); // Set error state if the fetch fails
        setLoading(false);
      });
  }, []); // Empty dependency array ensures this runs once when component mounts

  // Calculate the total number of pages
  const totalPages = Math.ceil(contacts.length / contactsPerPage);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter((contact) => {
    return (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.phone && contact.phone.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Get the current set of contacts to display
  const indexOfLastContact = currentPage * contactsPerPage;
  const indexOfFirstContact = indexOfLastContact - contactsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstContact, indexOfLastContact);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Handle search query change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Contacts</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all the contacts in CodeSoft including their name, email, and phone number.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
          <button
            type="button"
            className="block rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Add contact
          </button>
        </div>
      </div>
      <div className="mt-4">
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:pl-6 lg:pl-8"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 hidden border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter sm:table-cell"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="sticky top-0 z-10 border-b border-gray-300 bg-white bg-opacity-75 px-3 py-3.5 text-left text-sm font-semibold text-gray-900 backdrop-blur backdrop-filter"
                  >
                    Phone
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentContacts.map((contact, contactIdx) => (
                  <tr key={contact.id}>
                    <td
                      className={classNames(
                        contactIdx !== currentContacts.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 lg:pl-8',
                      )}
                    >
                      {/* Wrap name with Link to navigate to the contact's details page */}
                      <Link to={`/contacts/${contact.id}`} className="text-indigo-600 hover:text-indigo-900">
                        {contact.name}
                      </Link>
                    </td>
                    <td
                      className={classNames(
                        contactIdx !== currentContacts.length - 1 ? 'border-b border-gray-200' : '',
                        'hidden whitespace-nowrap px-3 py-4 text-sm text-gray-500 sm:table-cell',
                      )}
                    >
                      <a href={`mailto:${contact.email}`}>{contact.email}</a>                    </td>
                    <td
                      className={classNames(
                        contactIdx !== currentContacts.length - 1 ? 'border-b border-gray-200' : '',
                        'whitespace-nowrap px-3 py-4 text-sm text-gray-500',
                      )}
                    >
                      <a href={`tel:${formatPhoneNumber(contact.phone)}`}>{formatPhoneNumber(contact.phone) || 'N/A'}</a>                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Pagination Controls */}
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
