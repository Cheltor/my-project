import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';

const formatDateTime = (iso) => {
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return iso;
	}
};

const RecentComments = ({ limit = 10, className = '' }) => {
	const { user } = useAuth();
	const [comments, setComments] = useState([]); // currently displayed slice (enriched)
	const [allComments, setAllComments] = useState([]); // full list (raw)
	const [visibleCount, setVisibleCount] = useState(limit);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [expanded, setExpanded] = useState(false);
	const [hasFetched, setHasFetched] = useState(false);
	const [mineOnly, setMineOnly] = useState(false);

	// Caches to avoid duplicate fetches
	const addressCacheRef = useRef(new Map());
	const unitCacheRef = useRef(new Map());

	useEffect(() => {
			if (!expanded || hasFetched) return; // defer until opened, avoid refetch
			let isMounted = true;

			const enrichAndSlice = async (items) => {
				// Determine which address/unit details are missing
				const addressCache = addressCacheRef.current;
				const unitCache = unitCacheRef.current;
				const missingAddressIds = Array.from(new Set(items.map(c => c.address_id).filter(id => id && !addressCache.has(id))));
				const missingUnitIds = Array.from(new Set(items.map(c => c.unit_id).filter(id => id && !unitCache.has(id))));

				await Promise.all([
					Promise.all(missingAddressIds.map(async (id) => {
						try {
							const r = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}`);
							if (r.ok) addressCache.set(id, await r.json());
						} catch {}
					})),
					Promise.all(missingUnitIds.map(async (id) => {
						try {
							const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${id}`);
							if (r.ok) unitCache.set(id, await r.json());
						} catch {}
					}))
				]);

				return items.map(c => ({
					...c,
					address: addressCache.get(c.address_id) || null,
					unit: c.unit_id ? (unitCache.get(c.unit_id) || null) : null,
				}));
			};

	    const load = async () => {
				setLoading(true);
				setError(null);
				try {
					const resp = await fetch(`${process.env.REACT_APP_API_URL}/comments/`);
					if (!resp.ok) throw new Error('Failed to fetch comments');
					const data = await resp.json();
					if (!isMounted) return;

					const sorted = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
					setAllComments(sorted);

		    const base = mineOnly && user ? sorted.filter(c => (c.user_id ?? c.user?.id) === user.id) : sorted;
		    const initial = base.slice(0, visibleCount);
					const enriched = await enrichAndSlice(initial);
					if (!isMounted) return;
					setComments(enriched);
				} catch (e) {
					if (!isMounted) return;
					setError(e.message || 'Error loading recent comments');
				} finally {
					if (isMounted) {
						setHasFetched(true);
						setLoading(false);
					}
				}
			};
			load();
			return () => { isMounted = false; };
	}, [expanded, hasFetched, visibleCount, mineOnly, user]);

	// When visibleCount increases after initial fetch, enrich and show more
	useEffect(() => {
		if (!expanded || !hasFetched) return;
		let isMounted = true;

		const run = async () => {
			setLoading(true);
			try {
				const base = mineOnly && user ? allComments.filter(c => (c.user_id ?? c.user?.id) === user.id) : allComments;
				const slice = base.slice(0, visibleCount);
				// Enrich only what's needed using caches
				const addressCache = addressCacheRef.current;
				const unitCache = unitCacheRef.current;
				const missingAddressIds = Array.from(new Set(slice.map(c => c.address_id).filter(id => id && !addressCache.has(id))));
				const missingUnitIds = Array.from(new Set(slice.map(c => c.unit_id).filter(id => id && !unitCache.has(id))));

				await Promise.all([
					Promise.all(missingAddressIds.map(async (id) => {
						try {
							const r = await fetch(`${process.env.REACT_APP_API_URL}/addresses/${id}`);
							if (r.ok) addressCache.set(id, await r.json());
						} catch {}
					})),
					Promise.all(missingUnitIds.map(async (id) => {
						try {
							const r = await fetch(`${process.env.REACT_APP_API_URL}/units/${id}`);
							if (r.ok) unitCache.set(id, await r.json());
						} catch {}
					}))
				]);

				const enriched = slice.map(c => ({
					...c,
					address: addressCache.get(c.address_id) || null,
					unit: c.unit_id ? (unitCache.get(c.unit_id) || null) : null,
				}));

				if (!isMounted) return;
				setComments(enriched);
			} finally {
				if (isMounted) setLoading(false);
			}
		};
		run();
		return () => { isMounted = false; };
	}, [visibleCount, expanded, hasFetched, allComments, mineOnly, user]);

	// Reset page size when toggling the filter
	useEffect(() => {
		setVisibleCount(limit);
	}, [mineOnly, limit]);

		const filteredLength = mineOnly && user ? allComments.filter(c => (c.user_id ?? c.user?.id) === user.id).length : allComments.length;
		const canLoadMore = filteredLength > comments.length;

		const handleLoadMore = (e) => {
			if (e && typeof e.preventDefault === 'function') e.preventDefault();
			if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
			const prevY = window.scrollY;
			setVisibleCount((n) => n + limit);
			// Restore scroll after DOM updates
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					window.scrollTo({ top: prevY, left: 0, behavior: 'auto' });
				});
			});
		};

		const content = useMemo(() => {
		if (loading) {
			return <div className="text-gray-500">Loading recent comments...</div>;
		}
		if (error) {
			return <div className="text-red-600">{error}</div>;
		}
				if (!comments.length) {
			return <div className="text-gray-500">No recent comments.</div>;
		}
				return (
			<>
			<ul role="list" className="divide-y divide-gray-200">
				{comments.map((c) => (
					<li key={c.id} className="py-4">
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0 flex-1">
											{/* Address / Unit breadcrumb */}
											<div className="mb-1 text-xs text-gray-600">
												{c.unit_id && c.unit ? (
													<>
														<Link to={`/address/${c.address_id}`} className="text-indigo-700 hover:underline">
															{c.address?.combadd || `Address #${c.address_id}`}
														</Link>
														<span className="mx-1">•</span>
														<Link to={`/address/${c.address_id}/unit/${c.unit_id}`} className="text-indigo-700 hover:underline">
															Unit {c.unit?.number || c.unit_id}
														</Link>
													</>
												) : (
													<Link to={`/address/${c.address_id}`} className="text-indigo-700 hover:underline">
														{c.address?.combadd || `Address #${c.address_id}`}
													</Link>
												)}
											</div>
								<p className="text-sm text-gray-900 whitespace-pre-line">
									{c.content?.length > 280 ? `${c.content.slice(0, 280)}…` : c.content}
								</p>
								<p className="mt-1 text-xs text-gray-500">
									{c.user?.name || c.user?.email || 'Unknown user'} • {formatDateTime(c.created_at)}
								</p>
							</div>
										<div className="shrink-0">
											{c.unit_id ? (
												<Link
													to={`/address/${c.address_id}/unit/${c.unit_id}`}
													className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100"
													title="Go to unit"
												>
													Open
												</Link>
											) : (
												<Link
													to={`/address/${c.address_id}`}
													className="inline-flex items-center rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10 hover:bg-indigo-100"
													title="Go to address"
												>
													Open
												</Link>
											)}
										</div>
						</div>
					</li>
				))}
						</ul>
						{canLoadMore && (
							<div className="mt-3 flex justify-center">
								<button
									type="button"
							onClick={handleLoadMore}
									className="inline-flex items-center rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 ring-1 ring-inset ring-gray-300 hover:bg-gray-200"
								>
									Load more
								</button>
							</div>
						)}
						</>
		);
				}, [comments, loading, error, canLoadMore, limit]);

	return (
		<div className={`rounded-lg bg-white p-4 shadow ${className}`}>
			<div className="flex items-center justify-between mb-1">
				<h3 className="text-base font-semibold leading-6 text-gray-900">Recent comments</h3>
				<div className="flex items-center gap-3">
					<label className="inline-flex items-center text-sm text-gray-700 select-none">
						<input
							type="checkbox"
							className="mr-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
							checked={mineOnly}
							onChange={(e) => setMineOnly(e.target.checked)}
							disabled={!user}
						/>
						My comments
					</label>
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-expanded={expanded}
						className="text-sm font-medium text-indigo-700 hover:underline"
					>
						{expanded ? 'Hide' : 'Show'}
					</button>
				</div>
			</div>
			{expanded && content}
		</div>
	);
};

export default RecentComments;

