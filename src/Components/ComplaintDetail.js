import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import FullScreenPhotoViewer from "./FullScreenPhotoViewer";

export default function ComplaintDetail() {
	const { id } = useParams();
	const { user, token } = useAuth();
	const authToken = token || user?.token;

	const [complaint, setComplaint] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [attachments, setAttachments] = useState([]); // [{ filename, content_type, url }]
	const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);

	const [uploadFiles, setUploadFiles] = useState([]);
	const [uploading, setUploading] = useState(false);
	const [uploadError, setUploadError] = useState(null);

	useEffect(() => {
		const fetchComplaint = async () => {
			try {
				const resp = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
				if (!resp.ok) throw new Error("Failed to fetch complaint");
				const data = await resp.json();
				setComplaint(data);
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

	const handleFilesChange = (e) => {
		const files = Array.from(e.target.files || []);
		setUploadFiles(files);
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

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Status</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{complaint.status || "Pending"}</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Scheduled</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{complaint.scheduled_datetime ? new Date(complaint.scheduled_datetime).toLocaleString() : "Not scheduled"}
						</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Description</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">{complaint.description || "—"}</dd>
					</div>

					<div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
						<dt className="text-sm font-medium leading-6 text-gray-900">Contact</dt>
						<dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
							{complaint.contact ? (
								<>
									<Link to={`/contacts/${complaint.contact.id}`} className="text-indigo-600 hover:text-indigo-900">
										{complaint.contact.name}
									</Link>
									{" "}|{" "}
									{complaint.contact.email ? (
										<a href={`mailto:${complaint.contact.email}`} className="text-indigo-600 hover:text-indigo-900">
											{complaint.contact.email}
										</a>
									) : (
										"N/A"
									)}
									{" | "}
									{complaint.contact.phone || "N/A"}
								</>
							) : (
								"No contact information"
							)}
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
		</div>
	);
}

