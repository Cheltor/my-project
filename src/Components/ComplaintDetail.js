import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import FullScreenPhotoViewer from "./FullScreenPhotoViewer";
import NewViolationForm from "./Inspection/NewViolationForm";

const pickDescription = (payload) => {
  if (!payload || typeof payload !== 'object') return '';
  const fields = [
    'description',
		'details',
    'comment',
    'thoughts',
    'result',
		'notes',
    'notes_area_1',
    'notes_area_2',
    'notes_area_3',
  ];
  for (const field of fields) {
    const value = payload[field];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
};

export default function ComplaintDetail() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user, token } = useAuth();
	const authToken = token || user?.token;

	const [complaint, setComplaint] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [attachments, setAttachments] = useState([]); // [{ filename, content_type, url }]
	const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

	// Optional unit info (some complaints are tied to a unit under the address)
	const [unit, setUnit] = useState(null);

	const [uploadFiles, setUploadFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState(null);

	// Status editing (express as whether a violation was found)
	const [statusValue, setStatusValue] = useState("Pending");
	const [savingStatus, setSavingStatus] = useState(false);
	const [statusMessage, setStatusMessage] = useState("");
	const [showViolationPrompt, setShowViolationPrompt] = useState(false);

	// Contact management
	const [contactSearch, setContactSearch] = useState("");
	const [contactResults, setContactResults] = useState([]);
	const [contactLoading, setContactLoading] = useState(false);
	const [assigningContact, setAssigningContact] = useState(false);
	const [newContact, setNewContact] = useState({ name: "", email: "", phone: "" });
	const [contactMessage, setContactMessage] = useState("");
	const [showNewContactForm, setShowNewContactForm] = useState(false);

	// Scheduling
	const [scheduleValue, setScheduleValue] = useState("");
	const [savingSchedule, setSavingSchedule] = useState(false);
	const [scheduleMessage, setScheduleMessage] = useState("");

	useEffect(() => {
		const fetchComplaint = async () => {
			try {
				const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
				if (!resp.ok) throw new Error("Failed to fetch complaint");
				const data = await resp.json();
				// Debug: inspect payload keys and description sources
				try {
					// eslint-disable-next-line no-console
					console.debug('Inspection payload keys:', Object.keys(data || {}));
					// eslint-disable-next-line no-console
					console.debug('Inspection payload sample:', data);
				} catch {}
				const picked = pickDescription(data);
				const merged = picked && picked.trim()
					? { ...data, description: picked }
					: data; // don't overwrite a real description with empty text
				setComplaint(merged);
			} catch (e) {
				setError(e.message);
			} finally {
				setLoading(false);
			}
		};

		const fetchAttachments = async () => {
			try {
				const r = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
				if (!r.ok) return setAttachments([]);
				const data = await r.json();
				setAttachments(Array.isArray(data) ? data : []);
			} catch {
				setAttachments([]);
			}
		};

		fetchComplaint();
		fetchAttachments();
	}, [id]);

	useEffect(() => {
		if (complaint) {
			// Map legacy statuses to new wording
			const normalizeStatus = (s) => {
				if (!s) return "Pending";
				const v = String(s).toLowerCase();
				if (v === "satisfactory" || v === "no violation found" || v === "no violation") return "No Violation Found";
				if (v === "unsatisfactory" || v === "violation found" || v === "violation") return "Violation Found";
				if (v === "pending" || v === "unknown") return "Pending";
				return s; // preserve any unexpected custom status
			};
			setStatusValue(normalizeStatus(complaint.status));
			// Initialize schedule input as datetime-local string
			if (complaint.scheduled_datetime) {
				const d = new Date(complaint.scheduled_datetime);
				const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
					.toISOString()
					.slice(0, 16); // YYYY-MM-DDTHH:MM
				setScheduleValue(isoLocal);
			} else {
				setScheduleValue("");
			}
		}

		// If this complaint references a unit, fetch it to show the unit number
		(async () => {
			try {
				if (complaint?.unit_id) {
					const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${complaint.unit_id}`);
					if (r.ok) {
						const data = await r.json();
						setUnit(data);
					} else {
						setUnit(null);
					}
				} else {
					setUnit(null);
				}
			} catch {
				setUnit(null);
			}
		})();
	}, [complaint]);

	// Debounced contact search
	useEffect(() => {
		const t = setTimeout(async () => {
			if (!contactSearch || contactSearch.length < 2) {
				setContactResults([]);
				return;
			}
			setContactLoading(true);
			try {
				const r = await fetch(`${process.env.REACT_APP_API_URL}/contacts/?search=${encodeURIComponent(contactSearch)}`);
				if (!r.ok) throw new Error("Failed to search contacts");
				const data = await r.json();
				setContactResults(Array.isArray(data) ? data : []);
			} catch {
				setContactResults([]);
			} finally {
				setContactLoading(false);
			}
		}, 300);
		return () => clearTimeout(t);
	}, [contactSearch]);

	const handleFilesChange = (e) => {
		const files = Array.from(e.target.files || []);
		setUploadFiles(files);
	};

	const handleAssignContact = async (contactId) => {
		setAssigningContact(true);
		setContactMessage("");
		try {
			const fd = new FormData();
			fd.append("contact_id", String(contactId));
			const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/contact`, {
				method: "PATCH",
				headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
				body: fd,
			});
			if (!resp.ok) throw new Error("Failed to assign contact");
			const updated = await resp.json();
			setComplaint(updated);
			setContactMessage("Contact assigned");
		} catch (e) {
			setContactMessage(e.message || "Failed to assign contact");
		} finally {
			setAssigningContact(false);
		}
	};

	const handleSaveSchedule = async () => {
		setSavingSchedule(true);
		setScheduleMessage("");
		try {
			const fd = new FormData();
			if (scheduleValue) fd.append("scheduled_datetime", scheduleValue);
			else fd.append("scheduled_datetime", "");
			const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/schedule`, {
				method: "PATCH",
				headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
				body: fd,
			});
			if (!resp.ok) throw new Error("Failed to update schedule");
			const updated = await resp.json();
			setComplaint(updated);
			setScheduleMessage("Schedule saved");
		} catch (e) {
			setScheduleMessage(e.message || "Failed to save schedule");
		} finally {
			setSavingSchedule(false);
		}
	};

	const handleCreateContact = async () => {
		setAssigningContact(true);
		setContactMessage("");
		try {
			const resp = await fetch(`${process.env.REACT_APP_API_URL}/contacts/`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
				},
				body: JSON.stringify({ ...newContact }),
			});
			if (!resp.ok) throw new Error("Failed to create contact");
			const contact = await resp.json();
			await handleAssignContact(contact.id);
			setNewContact({ name: "", email: "", phone: "" });
		} catch (e) {
			setContactMessage(e.message || "Failed to create contact");
		} finally {
			setAssigningContact(false);
		}
	};

	const handleUpload = async () => {
		if (!uploadFiles.length) return;
		setUploading(true);
		setUploadError(null);
		try {
			const fd = new FormData();
			uploadFiles.forEach((f) => fd.append("files", f));
			const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`, {
				method: "POST",
				headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
				body: fd,
			});
			if (!resp.ok) throw new Error("Failed to upload attachments");
			// refresh list
			const r = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos`);
			const data = await r.json();
			setAttachments(Array.isArray(data) ? data : []);
			setUploadFiles([]);
		} catch (e) {
			setUploadError(e.message);
		} finally {
			setUploading(false);
		}
	};

	const handleDownloadAll = async () => {
		try {
			const r = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/photos?download=true`);
			if (!r.ok) return;
			const data = await r.json();
			(Array.isArray(data) ? data : []).forEach((a) => {
				if (a?.url) window.open(a.url, "_blank");
			});
		} catch {
			// no-op
		}
	};

	const handleSaveStatus = async () => {
		setSavingStatus(true);
		setStatusMessage("");
		try {
			const fd = new FormData();
			fd.append("status", statusValue);
			const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/status`, {
				method: "PATCH",
				headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
				body: fd,
			});
			if (!resp.ok) throw new Error("Failed to update status");
			const updated = await resp.json();
			setComplaint(updated);
			setStatusMessage("Status saved");
			// If Violation Found, prompt to add a violation for this address
			if ((statusValue || "").toLowerCase() === "violation found") {
				setShowViolationPrompt(true);
			}
		} catch (e) {
			setStatusMessage(e.message || "Failed to save status");
		} finally {
			setSavingStatus(false);
		}
	};

	if (loading) return <p>Loading complaint…</p>;
	if (error) return <p className="text-red-600">Error: {error}</p>;
	if (!complaint) return <p>Complaint not found.</p>;

	const isImage = (ct) => typeof ct === "string" && ct.startsWith("image/");

	return (
		<div className="container mx-auto px-4 sm:px-6 lg:px-8">
			<div className="px-4 sm:px-0">
				<h3 className="text-base font-semibold leading-7 text-gray-900">
					Complaint Details — #{complaint.id}
				</h3>
				<p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
					Source: {complaint.source || "Complaint"}
				</p>
			</div>

			<div className="mt-6 border-t border-gray-100">
				<dl className="divide-y divide-gray-100">
					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Property Address</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{complaint.address ? (
								<Link to={`/address/${complaint.address.id}`} className="text-indigo-600 hover:text-indigo-900">
									{complaint.address.combadd || "No address available"}
								</Link>
							) : (
								"No address available"
							)}
						</dd>
					</div>

					{/* Unit (if applicable) */}
					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Unit</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{complaint.unit_id ? (
								complaint.address ? (
									<Link
										to={`/address/${complaint.address.id}/unit/${complaint.unit_id}`}
										className="text-indigo-600 hover:text-indigo-900"
									>
										{unit?.number ? `Unit ${unit.number}` : `Unit ${complaint.unit_id}`}
									</Link>
								) : (
									<span>{unit?.number ? `Unit ${unit.number}` : `Unit ${complaint.unit_id}`}</span>
								)
							) : (
								<span className="text-gray-500">—</span>
							)}
						</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Violation found?</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							<div className="flex items-center gap-3">
								<select
									className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
									value={statusValue}
									onChange={(e) => setStatusValue(e.target.value)}
								>
									<option value="Pending">Pending</option>
									<option value="Violation Found">Violation Found</option>
									<option value="No Violation Found">No Violation Found</option>
								</select>
								<button
									type="button"
									onClick={handleSaveStatus}
									disabled={savingStatus}
									className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-indigo-500"
								>
									{savingStatus ? "Saving…" : "Save"}
								</button>
								{statusMessage && (
									<span className="text-xs text-gray-500">{statusMessage}</span>
								)}
							</div>
						</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Scheduled</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							<div className="flex items-center gap-3 flex-wrap">
								<input
									type="datetime-local"
									className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
									value={scheduleValue}
									onChange={(e) => setScheduleValue(e.target.value)}
								/>
								<button
									onClick={handleSaveSchedule}
									disabled={savingSchedule}
									className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-indigo-500"
								>
									{savingSchedule ? "Saving…" : "Save"}
								</button>
								<button
									onClick={() => setScheduleValue("")}
									disabled={savingSchedule}
									className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-200"
								>
									Clear
								</button>
								{scheduleMessage && <span className="text-xs text-gray-500">{scheduleMessage}</span>}
							</div>
							<div className="text-xs text-gray-500 mt-1">
								{complaint.scheduled_datetime ? new Date(complaint.scheduled_datetime).toLocaleString() : "Not scheduled"}
							</div>
						</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Description</dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{complaint.description && complaint.description.trim() ? complaint.description.trim() : 'No description provided.'}</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Contact</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							<div className="space-y-2">
								{complaint.contact ? (
									<div className="flex items-center gap-2">
										<Link to={`/contacts/${complaint.contact.id}`} className="text-indigo-600 hover:text-indigo-900">
											{complaint.contact.name}
										</Link>
										<span className="text-gray-400">|</span>
										{complaint.contact.email ? (
											<a href={`mailto:${complaint.contact.email}`} className="text-indigo-600 hover:text-indigo-900">
												{complaint.contact.email}
											</a>
										) : (
											<span className="text-gray-500">N/A</span>
										)}
										<span className="text-gray-400">|</span>
										<span>{complaint.contact.phone || "N/A"}</span>
									</div>
								) : (
									<p className="text-gray-500">No contact information</p>
								)}

								{/* Assign existing contact */}
								<div className="flex items-center gap-2">
									<input
										type="text"
										placeholder="Search contacts by name, email, or phone"
										className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
										value={contactSearch}
										onChange={(e) => setContactSearch(e.target.value)}
									/>
									{contactLoading && <span className="text-xs text-gray-500">Searching…</span>}
								</div>
								{contactResults.length > 0 && (
									<ul className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
										{contactResults.map((c) => (
											<li key={c.id} className="flex items-center justify-between border rounded-md p-2">
												<div className="text-sm">
													<div className="font-medium text-gray-900">{c.name}</div>
													<div className="text-gray-500 text-xs">{c.email || "—"} {c.phone ? ` | ${c.phone}` : ""}</div>
												</div>
												<button
													onClick={() => handleAssignContact(c.id)}
													disabled={assigningContact}
													className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-indigo-500"
												>
													Assign
												</button>
											</li>
										))}
									</ul>
								)}


								{/* Toggle new contact form */}
								<div className="mt-3">
									<button
										onClick={() => setShowNewContactForm((v) => !v)}
										className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-200"
									>
										{showNewContactForm ? "Cancel" : "Add new contact"}
									</button>
								</div>

								{showNewContactForm && (
									<div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
										<input
											type="text"
											placeholder="New contact name"
											className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
											value={newContact.name}
											onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
										/>
										<input
											type="email"
											placeholder="Email (optional)"
											className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
											value={newContact.email}
											onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
										/>
										<input
											type="tel"
											placeholder="Phone (optional)"
											className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
											value={newContact.phone}
											onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
										/>
										<button
											onClick={handleCreateContact}
											disabled={assigningContact || !newContact.name.trim()}
											className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-green-500"
										>
											{assigningContact ? "Saving…" : "Add & Assign"}
										</button>
									</div>
								)}
								{contactMessage && <p className="text-xs text-gray-500 mt-1">{contactMessage}</p>}
							</div>
						</dd>
					</div>

					{/* Attachments */}
					<div className="px-4 py-6 sm:px-0">
						<div className="flex items-center justify-between mb-3">
							<dt className="text-sm font-medium leading-6 text-gray-900">Attachments</dt>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleDownloadAll}
									className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
								>
									Download attachments ({attachments.length})
								</button>
							</div>
						</div>

						{attachments.length === 0 ? (
							<p className="text-sm text-gray-500">No attachments uploaded yet.</p>
						) : (
							<ul role="list" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
								{attachments.map((a, idx) => (
									<li key={idx} className="group border rounded-md p-2 bg-white shadow-sm">
										{isImage(a.content_type) ? (
											<img
												src={a.url}
												alt={a.filename}
												onClick={() => setSelectedPhotoUrl(a.url)}
												className="h-32 w-full object-cover rounded cursor-pointer"
											/>
										) : (
											<div className="h-32 flex items-center justify-center bg-gray-50 rounded">
												<span className="text-xs text-gray-500 break-all px-2 text-center">{a.filename}</span>
											</div>
										)}
										<div className="mt-2 flex items-center justify-between">
											<span className="text-xs text-gray-600 truncate" title={a.filename}>{a.filename}</span>
											<a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:text-indigo-500">Open</a>
										</div>
									</li>
								))}
							</ul>
						)}

						{/* Upload new attachments */}
						<div className="mt-4 flex items-center gap-3">
							<label className="bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm px-4 py-2 cursor-pointer hover:bg-gray-50">
								<span>Choose files</span>
								<input
									type="file"
									multiple
									accept="image/*,application/pdf"
									className="sr-only"
									onChange={handleFilesChange}
								/>
							</label>
							<span className="text-sm text-gray-500">
								{uploadFiles.length ? `${uploadFiles.length} file(s) selected` : "No files selected"}
							</span>
							<button
								type="button"
								onClick={handleUpload}
								disabled={!uploadFiles.length || uploading}
								className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-green-500"
							>
								{uploading ? "Uploading…" : "Upload"}
							</button>
						</div>
						{uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
					</div>
				</dl>
			</div>

			{selectedPhotoUrl && (
				<FullScreenPhotoViewer photoUrl={selectedPhotoUrl} onClose={() => setSelectedPhotoUrl(null)} />
			)}

			{showViolationPrompt && complaint?.address && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
					<div className="bg-white rounded-md shadow-lg w-full max-w-2xl p-4">
						<div className="flex items-center justify-between mb-2">
							<h4 className="text-base font-semibold text-gray-900">Add a Violation for this Address?</h4>
							<button
								className="text-gray-500 hover:text-gray-800"
								onClick={() => setShowViolationPrompt(false)}
							>
								✕
							</button>
						</div>
						<p className="text-sm text-gray-600 mb-3">
							You marked this complaint as “Violation Found”. Would you like to create a new violation for
							<span className="font-medium"> {complaint.address.combadd}</span>?
						</p>
						<NewViolationForm
							initialAddressId={complaint.address.id}
							initialAddressLabel={complaint.address.combadd}
							lockAddress={true}
							onCreated={(v) => {
								setShowViolationPrompt(false);
								if (v?.id) navigate(`/violation/${v.id}`);
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}

