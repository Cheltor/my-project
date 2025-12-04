
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { buildRegistrationDraft, computeExpiresOn, deriveVacancyStatusFromRegistration } from './Address/vacantRegistrationUtils';

function titlize(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

const STATUS_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'potentially vacant', label: 'Potentially Vacant' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'registered', label: 'Registered' },
];

const REG_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'waived', label: 'Waived' },
  { value: 'draft', label: 'Draft' },
  { value: 'expired', label: 'Expired' },
];

const COMPLIANCE_OPTIONS = [
  { value: '', label: 'Not set' },
  { value: 'pending', label: 'Pending' },
  { value: 'compliant', label: 'Compliant' },
  { value: 'non-compliant', label: 'Non-compliant' },
];

function VacancyStatusList() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [registrationDraft, setRegistrationDraft] = useState(null);
  const [savingRegistration, setSavingRegistration] = useState(false);
  const [registrationError, setRegistrationError] = useState(null);
  const [registrationSuccess, setRegistrationSuccess] = useState(null);

  useEffect(() => {
    const url = `${process.env.REACT_APP_API_URL}/addresses/by-vacancy-status`;
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch addresses');
        return res.json();
      })
      .then(data => {
        setAddresses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleEditClick = (id, currentStatus) => {
    setEditingId(id);
    setNewStatus(currentStatus);
  };

  const handleStatusChange = (e) => {
    setNewStatus(e.target.value);
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString();
  };

  const openRegistrationEditor = (address) => {
    setExpandedId(address.id);
    setRegistrationError(null);
    setRegistrationSuccess(null);
    const draft = buildRegistrationDraft(address.current_vacant_registration);
    const registeredOn = draft.registered_on || new Date().toISOString().slice(0, 10);
    const expiresOn = draft.expires_on || computeExpiresOn(registeredOn);
    setRegistrationDraft({ ...draft, registered_on: registeredOn, expires_on: expiresOn });
  };

  const closeRegistrationEditor = () => {
    setExpandedId(null);
    setRegistrationDraft(null);
    setRegistrationError(null);
    setRegistrationSuccess(null);
  };

  const handleRegistrationChange = (field, value) => {
    setRegistrationDraft((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const handleSaveRegistration = async (address) => {
    if (!address || !registrationDraft) return;
    setSavingRegistration(true);
    setRegistrationError(null);
    setRegistrationSuccess(null);
    try {
      const payload = { ...registrationDraft };
      payload.fee_amount = Number(payload.fee_amount) || 0;
      if (!payload.expires_on && payload.registered_on) {
        payload.expires_on = computeExpiresOn(payload.registered_on);
      }
      if (payload.registration_year) {
        payload.registration_year = Number(payload.registration_year) || new Date().getFullYear();
      } else if (payload.registered_on) {
        const regDate = new Date(payload.registered_on);
        if (!Number.isNaN(regDate.getTime())) {
          payload.registration_year = regDate.getFullYear();
        }
      } else {
        payload.registration_year = new Date().getFullYear();
      }
      if ((payload.maintenance_status || payload.security_status) && !payload.compliance_checked_at) {
        payload.compliance_checked_at = new Date().toISOString();
      }
      const hasExisting = Boolean(address.current_vacant_registration?.id);
      const { id: _dropId, ...body } = payload;
      const url = hasExisting
        ? `${process.env.REACT_APP_API_URL}/addresses/${address.id}/vacant-registrations/${address.current_vacant_registration.id}`
        : `${process.env.REACT_APP_API_URL}/addresses/${address.id}/vacant-registrations`;
      const method = hasExisting ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || 'Failed to save registration');
      }
      setAddresses((prev) =>
        prev.map((addr) => {
          if (addr.id !== address.id) return addr;
          const nextVacancyStatus = deriveVacancyStatusFromRegistration(data, addr.vacancy_status);
          return {
            ...addr,
            vacancy_status: nextVacancyStatus,
            current_vacant_registration: data,
          };
        })
      );
      setRegistrationDraft(buildRegistrationDraft(data));
      setRegistrationSuccess('Saved registration details.');
      setExpandedId(null);
    } catch (err) {
      setRegistrationError(err.message);
    } finally {
      setSavingRegistration(false);
    }
  };

  const handleConfirm = (id) => {
    const url = `${process.env.REACT_APP_API_URL}/addresses/${id}/vacancy-status`;
    fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vacancy_status: newStatus }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update status');
        return res.json();
      })
      .then(data => {
        setAddresses(addresses.map(addr => (addr.id === id ? { ...addr, vacancy_status: newStatus } : addr)));
        setEditingId(null);
      })
      .catch(err => {
        setError(err.message);
      });
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg mt-10">
      <h1 className="text-2xl font-bold mb-4">Addresses by Vacancy Status</h1>
      {registrationError && <div className="mb-3 text-sm text-red-600">Registration error: {registrationError}</div>}
      {registrationSuccess && <div className="mb-3 text-sm text-green-700">{registrationSuccess}</div>}
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Address</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Vacancy Status</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Registration</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Compliance</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {addresses.map(addr => (
            <React.Fragment key={addr.id}>
              <tr className="hover:bg-gray-50 align-top">
                <td className="px-4 py-2">
                  <Link to={`/address/${addr.id}`} className="text-blue-600 hover:underline font-medium">
                    {addr.combadd}
                  </Link>
                  <div className="text-xs text-gray-500">ID: {addr.id}</div>
                </td>
                <td className="px-4 py-2">
                  {editingId === addr.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newStatus}
                        onChange={handleStatusChange}
                        className="border rounded p-1 text-sm"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleConfirm(addr.id)}
                        className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{titlize(addr.vacancy_status)}</span>
                      <button
                        onClick={() => handleEditClick(addr.id, addr.vacancy_status)}
                        className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
                      >
                        Update
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-2">
                  {addr.current_vacant_registration ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">
                          {addr.current_vacant_registration.registration_year} • {titlize(addr.current_vacant_registration.status)}
                        </span>
                        {addr.current_vacant_registration.fire_damage && (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Fire-damaged
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        {addr.current_vacant_registration.registered_on ? `Registered ${formatDate(addr.current_vacant_registration.registered_on)}` : 'No registration date'}{addr.current_vacant_registration.expires_on ? ` • Expires ${formatDate(addr.current_vacant_registration.expires_on)}` : ''}
                      </div>
                      <div className="text-xs text-gray-600">
                        Fee: ${Number(addr.current_vacant_registration.fee_amount || 0).toFixed(2)} • {addr.current_vacant_registration.fee_paid ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No registration on file</div>
                  )}
                </td>
                <td className="px-4 py-2 text-sm text-gray-700">
                  <div>Maintenance: {titlize(addr.current_vacant_registration?.maintenance_status) || 'Not set'}</div>
                  <div>Security: {titlize(addr.current_vacant_registration?.security_status) || 'Not set'}</div>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => openRegistrationEditor(addr)}
                    className="bg-emerald-600 text-white px-3 py-1 rounded hover:bg-emerald-700 text-sm"
                  >
                    {addr.current_vacant_registration ? 'Update registration' : 'Start registration'}
                  </button>
                </td>
              </tr>
              {expandedId === addr.id && registrationDraft && (
                <tr className="bg-gray-50">
                  <td colSpan="5" className="px-4 py-3">
                    <div className="border border-gray-200 rounded-md p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">Vacant registration workflow</h3>
                          <p className="text-xs text-gray-600">Track annual registration, fees, fire damage, and compliance.</p>
                        </div>
                        <button
                          onClick={closeRegistrationEditor}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          Close
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Registration status</span>
                          <select
                            value={registrationDraft.status || ''}
                            onChange={(e) => handleRegistrationChange('status', e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                          >
                            {REG_STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Registration year</span>
                          <input
                            type="number"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.registration_year || ''}
                            onChange={(e) => handleRegistrationChange('registration_year', Number(e.target.value) || '')}
                          />
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Registered on</span>
                          <input
                            type="date"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.registered_on ? registrationDraft.registered_on.slice(0, 10) : ''}
                            onChange={(e) => {
                              const nextDate = e.target.value;
                              handleRegistrationChange('registered_on', nextDate);
                              if (!registrationDraft.expires_on && nextDate) {
                                handleRegistrationChange('expires_on', computeExpiresOn(nextDate));
                              }
                            }}
                          />
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Expires on</span>
                          <input
                            type="date"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.expires_on ? registrationDraft.expires_on.slice(0, 10) : ''}
                            onChange={(e) => handleRegistrationChange('expires_on', e.target.value)}
                          />
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Fee amount</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.fee_amount}
                            onChange={(e) => handleRegistrationChange('fee_amount', e.target.value)}
                          />
                        </label>
                        <div className="flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(registrationDraft.fee_paid)}
                              onChange={(e) => handleRegistrationChange('fee_paid', e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>Fee paid</span>
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(registrationDraft.fire_damage)}
                              onChange={(e) => handleRegistrationChange('fire_damage', e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>Fire-damaged</span>
                          </label>
                        </div>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Maintenance status</span>
                          <select
                            value={registrationDraft.maintenance_status || ''}
                            onChange={(e) => handleRegistrationChange('maintenance_status', e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                          >
                            {COMPLIANCE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Security status</span>
                          <select
                            value={registrationDraft.security_status || ''}
                            onChange={(e) => handleRegistrationChange('security_status', e.target.value)}
                            className="w-full border rounded p-2 text-sm"
                          >
                            {COMPLIANCE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Maintenance notes</span>
                          <textarea
                            rows="2"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.maintenance_notes || ''}
                            onChange={(e) => handleRegistrationChange('maintenance_notes', e.target.value)}
                          />
                        </label>
                        <label className="text-sm text-gray-700 space-y-1">
                          <span className="text-xs font-semibold text-gray-600">Security notes</span>
                          <textarea
                            rows="2"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.security_notes || ''}
                            onChange={(e) => handleRegistrationChange('security_notes', e.target.value)}
                          />
                        </label>
                        <label className="text-sm text-gray-700 space-y-1 md:col-span-2">
                          <span className="text-xs font-semibold text-gray-600">Registration notes</span>
                          <textarea
                            rows="2"
                            className="w-full border rounded p-2 text-sm"
                            value={registrationDraft.notes || ''}
                            onChange={(e) => handleRegistrationChange('notes', e.target.value)}
                          />
                        </label>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSaveRegistration(addr)}
                          disabled={savingRegistration}
                          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {savingRegistration ? 'Saving...' : 'Save registration'}
                        </button>
                        <button
                          onClick={closeRegistrationEditor}
                          className="text-sm text-gray-700 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default VacancyStatusList;
