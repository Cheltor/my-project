import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const RESOURCE_CONFIG = [
  {
    key: 'addresses',
    label: 'Addresses',
    listEndpoint: '/addresses/',
    deleteEndpoint: (id) => `/addresses/${id}`,
    viewRoute: (id) => `/address/${id}`,
    fields: ['id', 'combadd', 'city', 'zip', 'status'],
  },
  {
    key: 'contacts',
    label: 'Contacts',
    listEndpoint: '/contacts/',
    deleteEndpoint: (id) => `/contacts/${id}`,
    viewRoute: (id) => `/contacts/${id}`,
    fields: ['id', 'name', 'email', 'phone'],
  },
  {
    key: 'businesses',
    label: 'Businesses',
    listEndpoint: '/businesses/',
    deleteEndpoint: (id) => `/businesses/${id}`,
    viewRoute: (id) => `/business/${id}`,
    fields: ['id', 'name', 'address.combadd', 'phone', 'email'],
  },
  {
    key: 'violations',
    label: 'Violations',
    listEndpoint: '/violations/',
    deleteEndpoint: (id) => `/violations/${id}`,
    viewRoute: (id) => `/violation/${id}`,
    fields: ['id', 'status', 'code.code', 'created_at'],
  },
  {
    key: 'inspections',
    label: 'Inspections',
    listEndpoint: '/inspections/',
    deleteEndpoint: (id) => `/inspections/${id}`,
    viewRoute: (id) => `/inspection/${id}`,
    fields: ['id', 'status', 'scheduled_for', 'address.combadd'],
  },
  {
    key: 'permits',
    label: 'Permits',
    listEndpoint: '/permits/',
    deleteEndpoint: (id) => `/permits/${id}`,
    viewRoute: (id) => `/permit/${id}`,
    fields: ['id', 'permit_number', 'status', 'address.combadd'],
  },
  {
    key: 'licenses',
    label: 'Licenses',
    listEndpoint: '/licenses/',
    deleteEndpoint: (id) => `/licenses/${id}`,
    viewRoute: (id) => `/license/${id}`,
    fields: ['id', 'license_number', 'status', 'business.name'],
  },
  {
    key: 'complaints',
    label: 'Complaints',
    listEndpoint: '/complaints/',
    deleteEndpoint: (id) => `/complaints/${id}`,
    viewRoute: (id) => `/complaint/${id}`,
    fields: ['id', 'type', 'status', 'address.combadd'],
  },
  {
    key: 'citations',
    label: 'Citations',
    listEndpoint: '/citations/',
    deleteEndpoint: (id) => `/citations/${id}`,
    viewRoute: (id) => `/citation/${id}`,
    fields: ['id', 'citationid', 'status', 'deadline'],
  },
  {
    key: 'codes',
    label: 'Codes',
    listEndpoint: '/codes/',
    deleteEndpoint: (id) => `/codes/${id}`,
    viewRoute: (id) => `/code/${id}`,
    fields: ['id', 'code', 'description', 'section'],
  },
  {
    key: 'users',
    label: 'Users',
    listEndpoint: '/users/',
    deleteEndpoint: (id) => `/users/${id}`,
    viewRoute: (id) => `/users/${id}`,
    fields: ['id', 'name', 'email', 'role'],
  },
];

const PAGE_SIZE = 20;

const ROLE_LABELS = {
  0: 'Guest',
  1: 'ONS',
  2: 'OAS',
  3: 'Admin',
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : '—';
  }
  if (Array.isArray(value)) {
    if (!value.length) return '—';
    const preview = value
      .map((item) => {
        if (item && typeof item === 'object') {
          if (item.name) return item.name;
          if (item.title) return item.title;
          if (item.combadd) return item.combadd;
          if (item.id) return `#${item.id}`;
          return JSON.stringify(item);
        }
        return item;
      })
      .join(', ');
    return preview || '—';
  }
  if (typeof value === 'object') {
    if (value.name) return value.name;
    if (value.title) return value.title;
    if (value.combadd) return value.combadd;
    if (value.email) return value.email;
    if (value.phone) return value.phone;
    return JSON.stringify(value);
  }
  return value;
};

const getNestedValue = (item, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === null || acc === undefined) {
      return undefined;
    }
    return acc[key];
  }, item);
};

const resolveFields = (items, resource) => {
  const configured = resource.fields || [];
  const hasData = (field) =>
    items.some((item) => {
      const value = getNestedValue(item, field);
      return value !== undefined && value !== null && value !== '';
    });

  let fields = configured.filter(hasData);

  if (!fields.length && items.length) {
    const firstItem = items[0];
    fields = Object.keys(firstItem)
      .filter((key) => typeof firstItem[key] !== 'object')
      .slice(0, 4);

    if (!fields.length) {
      fields = Object.keys(firstItem).slice(0, 4);
    }
  }

  return fields;
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [resourceKey, setResourceKey] = useState(RESOURCE_CONFIG[0].key);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [statusMessage, setStatusMessage] = useState('');

  const resource = useMemo(
    () => RESOURCE_CONFIG.find((entry) => entry.key === resourceKey) || RESOURCE_CONFIG[0],
    [resourceKey]
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${resource.listEndpoint}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${resource.label.toLowerCase()}`);
      }
      const data = await response.json();
      if (!Array.isArray(data)) {
        setItems([]);
        setError('Unexpected response format from the server.');
      } else {
        setItems(data);
      }
    } catch (err) {
      setError(err.message || 'Unable to load data.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [resource.listEndpoint, resource.label]);

  useEffect(() => {
    fetchItems();
    setPage(1);
    setSearchTerm('');
  }, [resourceKey, fetchItems]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const query = searchTerm.trim().toLowerCase();
    return items.filter((item) => {
      const values = resource.fields || Object.keys(item);
      return values.some((field) => {
        const value = getNestedValue(item, field);
        if (value === undefined || value === null) return false;
        return String(normalizeValue(value)).toLowerCase().includes(query);
      });
    });
  }, [items, searchTerm, resource.fields]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  const fields = useMemo(() => resolveFields(currentItems, resource), [currentItems, resource]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
      return;
    }
    setStatusMessage('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}${resource.deleteEndpoint(id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete the record.');
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      setStatusMessage('Record deleted successfully.');
    } catch (err) {
      setStatusMessage(err.message || 'Unable to delete the record.');
    }
  };

  if (!user || user.role !== 3) {
    return (
      <div className="max-w-4xl mx-auto mt-10 bg-white shadow rounded-lg p-8">
        <h1 className="text-2xl font-semibold text-gray-800">Admin access required</h1>
        <p className="mt-4 text-gray-600">
          You must be an administrator to view and manage application data.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">Administration</h1>
          <p className="mt-2 text-sm text-gray-700">
            Review, edit, and delete objects across the platform. Use the resource selector to load different data sets.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={fetchItems}
            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="resource" className="block text-sm font-medium text-gray-700">
            Resource
          </label>
          <select
            id="resource"
            value={resourceKey}
            onChange={(event) => setResourceKey(event.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            {RESOURCE_CONFIG.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700">
            Search
          </label>
          <input
            id="search"
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setPage(1);
              setSearchTerm(event.target.value);
            }}
            placeholder={`Search ${resource.label.toLowerCase()}...`}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {statusMessage && (
        <div className="mt-4 rounded-md bg-indigo-50 p-4 text-sm text-indigo-700">
          {statusMessage}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-500">Loading {resource.label.toLowerCase()}...</div>
          ) : currentItems.length ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {fields.map((field) => (
                    <th
                      key={field}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                    >
                      {field.split('.').slice(-1)[0].replace(/_/g, ' ')}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {currentItems.map((item) => (
                  <tr key={item.id}>
                    {fields.map((field) => {
                      const value = normalizeValue(getNestedValue(item, field));
                      return (
                        <td key={field} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                          {field === 'role' && typeof item.role === 'number'
                            ? ROLE_LABELS[item.role] || item.role
                            : value}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Link
                          to={resource.viewRoute ? resource.viewRoute(item.id) : '#'}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View & Edit
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-16 text-gray-500">
              No {resource.label.toLowerCase()} found.
            </div>
          )}
        </div>
      </div>

      {!loading && currentItems.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
