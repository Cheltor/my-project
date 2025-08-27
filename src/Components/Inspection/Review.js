import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import NewViolationForm from "./NewViolationForm";
import FullScreenPhotoViewer from "../FullScreenPhotoViewer";

export default function Review() {
  const { id } = useParams(); // inspection id
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [potentials, setPotentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [areasById, setAreasById] = useState({});
  const [violationCodes, setViolationCodes] = useState([]); // codes to prefill violation form
  const [viewerUrl, setViewerUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [inspRes, potRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`),
          fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/potential-observations`),
        ]);
        if (!inspRes.ok) throw new Error("Failed to load inspection");
        if (!potRes.ok) throw new Error("Failed to load potential observations");
        const insp = await inspRes.json();
        const pots = await potRes.json();
        if (!cancelled) {
          setInspection(insp);
          setPotentials(pots);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // fetch areas for mapping area_id -> name
    fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}/areas`).then(r=>r.json()).then(list => {
      const map = {};
      list.forEach(a => { map[a.id] = a; });
      setAreasById(map);
    }).catch(()=>{});
  }, [id]);

  const allChecked = useMemo(() => selectedIds.size > 0 && selectedIds.size === potentials.length, [selectedIds, potentials]);

  const toggleOne = (obsId) => {
    const next = new Set(selectedIds);
    if (next.has(obsId)) next.delete(obsId); else next.add(obsId);
    setSelectedIds(next);
  };
  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(potentials.map(p => p.id)));
  };

  const pushCodesFromSelected = () => {
    // Collect de-duplicated codes across selected observations
    const map = new Map();
    potentials.forEach(p => {
      if (!selectedIds.has(p.id)) return;
      (p.codes || []).forEach(c => {
        if (!map.has(c.id)) map.set(c.id, c);
      });
    });
    // Transform to CodeSelect option shape
    const toOption = (c) => ({
      label: `Ch. ${c.chapter} Sec. ${c.section} - ${c.name}`,
      value: c.id,
      code: c,
    });
    const merged = Array.from(map.values()).map(toOption);
    setViolationCodes(merged);
  };

  const initialAddressId = inspection?.address?.id;
  const initialAddressLabel = inspection?.address?.combadd;

  if (loading) return <div className="p-4">Loading review…</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Review Potential Violations</h1>
        <div className="flex gap-2">
          <Link className="text-sm text-indigo-600 hover:underline" to={`/inspections/${id}/conduct`}>Back to Conduct</Link>
          {inspection?.address?.id && (
            <Link className="text-sm text-blue-600 hover:underline" to={`/address/${inspection.address.id}`}>View Address</Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Potential items from field</h2>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} />
            <span>Select all</span>
          </label>
        </div>
        {potentials.length === 0 ? (
          <p className="text-gray-600 mt-2">No potential violations were flagged during this inspection.</p>) : (
          <ul className="divide-y mt-2">
            {potentials.map(p => (
              <li key={p.id} className="py-2 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleOne(p.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium">Area:</span>
                    <span>{p.area_name || '—'}</span>
                    {p.unit_number && <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800">Unit {p.unit_number}</span>}
                  </div>
                  <div className="mt-1 text-gray-900">{p.content}</div>
                  {p.codes && p.codes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      {p.codes.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 text-gray-800 border border-gray-200">
                          <span className="font-medium">Ch {c.chapter}</span>
                          <span>Sec {c.section}</span>
                          <span className="text-gray-500">{c.name}</span>
                        </span>
                      ))}
                    </div>
                  )}
          {p.photos && p.photos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
            {p.photos.map((ph, idx) => (
                        <img
                          key={idx}
                          src={ph.url}
                          alt={`Observation ${p.id} photo ${idx + 1}`}
              className="w-24 h-24 object-cover rounded border cursor-pointer"
              onClick={() => setViewerUrl(ph.url)}
                        />
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">Observed: {new Date(p.created_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 pt-3 border-t flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={pushCodesFromSelected}
            className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            disabled={selectedIds.size === 0}
            title="Add suspected codes from selected observations into the violation form"
          >
            Add suspected codes to violation
          </button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-base font-semibold leading-6 text-gray-900 mb-2">Create Violation Notice</h2>
        <NewViolationForm
          onCreated={() => navigate(`/inspection/${id}`)}
          initialAddressId={inspection?.address_id}
          initialAddressLabel={inspection?.address?.combadd}
          lockAddress={true}
          inspectionId={parseInt(id, 10)}
          selectedCodesValue={violationCodes}
          onSelectedCodesChange={setViolationCodes}
        />
      </div>

      {viewerUrl && (
        <FullScreenPhotoViewer photoUrl={viewerUrl} onClose={() => setViewerUrl(null)} />
      )}
    </div>
  );
}
