import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../AuthContext';
import CodeSelect from '../CodeSelect';
import FileUploadInput from '../Common/FileUploadInput';

export default function UnitAreaDetail() {
  const { id, areaId, unitId } = useParams();
  const { user, token } = useAuth();
  const authToken = token || user?.token;
  const [inspection, setInspection] = useState(null);
  const [area, setArea] = useState(null);
  const [unit, setUnit] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [observations, setObservations] = useState([]);
  const [newObservation, setNewObservation] = useState('');
  const [markPotential, setMarkPotential] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInspectionDetails = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/inspections/${id}`);
        if (!response.ok) throw new Error('Failed to fetch inspection details');
        const inspectionData = await response.json();
        setInspection(inspectionData);
      } catch (err) {
        setError(err.message);
      }
    };

    const fetchAreaAndUnitDetails = async () => {
      try {
        const areaResponse = await fetch(`${process.env.REACT_APP_API_URL}/areas/${areaId}`);
        if (!areaResponse.ok) throw new Error('Failed to fetch area details');
        const areaData = await areaResponse.json();
        setArea(areaData);

        const unitResponse = await fetch(`${process.env.REACT_APP_API_URL}/units/${unitId}`);
        if (!unitResponse.ok) throw new Error('Failed to fetch unit details');
        const unitData = await unitResponse.json();
        setUnit(unitData);

        const roomsResponse = await fetch(`${process.env.REACT_APP_API_URL}/rooms/`);
        if (!roomsResponse.ok) throw new Error('Failed to fetch rooms');
        const roomsData = await roomsResponse.json();
        const matchingRoom = roomsData.find((room) => room.name.toLowerCase() === areaData.name.toLowerCase());
        if (matchingRoom) {
          const promptsResponse = await fetch(`${process.env.REACT_APP_API_URL}/rooms/${matchingRoom.id}/prompts`);
          if (!promptsResponse.ok) throw new Error('Failed to fetch prompts');
          const promptsData = await promptsResponse.json();
          setPrompts(promptsData);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching area or unit details:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    const fetchObservations = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/areas/${areaId}/observations`);
        if (!response.ok) throw new Error('Failed to fetch observations');
        const observationsData = await response.json();
        setObservations(observationsData);
      } catch (err) {
        console.error('Error fetching observations:', err);
      }
    };

    fetchInspectionDetails();
    fetchAreaAndUnitDetails();
    fetchObservations();
  }, [id, areaId, unitId]);

  const handleCreateObservation = async (e) => {
    e.preventDefault();
    if (!newObservation.trim()) return;
    try {
      const observationData = {
        content: newObservation,
        potentialvio: !!markPotential,
        user_id: user?.id,
        codes: (selectedCodes || []).map((opt) => opt.code.id),
      };
      const observationResponse = await fetch(`${process.env.REACT_APP_API_URL}/areas/${areaId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify(observationData),
      });
      if (!observationResponse.ok) throw new Error('Failed to create observation');
      const createdObservation = await observationResponse.json();
      setObservations((prev) => [...prev, createdObservation]);
      setNewObservation('');
      setMarkPotential(false);
      setSelectedCodes([]);

      if (photos.length > 0) {
        const formData = new FormData();
        photos.forEach((p) => formData.append('files', p));
        const photoUploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/observations/${createdObservation.id}/photos`, {
          method: 'POST',
          headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: formData,
        });
        if (!photoUploadResponse.ok) throw new Error('Failed to upload photos');
        try {
          const refreshed = await fetch(`${process.env.REACT_APP_API_URL}/areas/${areaId}/observations`);
          if (refreshed.ok) {
            const list = await refreshed.json();
            setObservations(list);
          }
        } catch (_) {}
        setPhotos([]);
      }
    } catch (err) {
      console.error('Error creating observation:', err);
    }
  };

  const handleImageClick = (url) => {
    setSelectedImage(url);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  if (loading) return <p>Loading unit area details...</p>;
  if (error) return <p>Error: {error}</p>;

  const potentialBadge = (flag) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${flag ? 'bg-rose-100 text-rose-800 ring-rose-500/30' : 'bg-emerald-100 text-emerald-800 ring-emerald-500/30'}`}>
      {flag ? 'Potential violation' : 'Not a violation'}
    </span>
  );
  const promptCount = Array.isArray(prompts) ? prompts.length : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-12 sm:px-6 lg:px-8">
      <header className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {inspection && (
              <>
                <p className="text-sm font-semibold text-indigo-600">Inspection #{inspection.id}</p>
                <h1 className="text-2xl font-semibold text-gray-900">{inspection.source || 'Inspection'} — {area?.name || 'Area'} {unit?.number ? `(Unit ${unit.number})` : ''}</h1>
                {inspection.address && (
                  <p className="mt-1 text-sm">
                    <Link to={`/address/${inspection.address.id}`} className="text-indigo-600 hover:text-indigo-800">
                      {inspection.address.combadd}
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              to={`/inspections/${id}/unit/${unitId}`}
              className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
            >
              Back to Unit {unit?.number}
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Checklist</h2>
              <p className="text-xs text-gray-500">{promptCount ? `${promptCount} item${promptCount > 1 ? 's' : ''}` : 'No items'}</p>
            </div>
            {promptCount > 0 ? (
              <ul className="mt-4 space-y-3">
                {prompts.map((prompt) => (
                  <li key={prompt.id} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3">
                    <input id={`prompt-${prompt.id}`} type="checkbox" className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <label htmlFor={`prompt-${prompt.id}`} className="text-sm text-gray-800">
                      {prompt.content}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                No checklist available for this area.
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Observations</h2>
            {Array.isArray(observations) && observations.length > 0 ? (
              <div className="mt-4 space-y-4">
                {observations.map((observation) => (
                  <div key={observation.id} className="rounded-lg border border-gray-200 p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">{observation.content}</p>
                      {potentialBadge(!!observation.potentialvio)}
                    </div>

                    <div className="mt-3 text-xs text-gray-600">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!observation.potentialvio}
                          onChange={async (e) => {
                            const next = e.target.checked;
                            try {
                              const resp = await fetch(`${process.env.REACT_APP_API_URL}/observations/${observation.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ potentialvio: next }),
                              });
                              if (resp.ok) {
                                const updated = await resp.json();
                                setObservations((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
                              }
                            } catch (_) {}
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Mark as potential violation</span>
                      </label>
                    </div>

                    {observation.codes && observation.codes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text:[11px]">
                        {observation.codes.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-800">
                            <span className="font-medium">Ch {c.chapter}</span>
                            <span>Sec {c.section}</span>
                            <span className="text-gray-500">{c.name}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3">
                      {observation.photos && observation.photos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                          {observation.photos.map((photo, index) => (
                            <button
                              type="button"
                              key={index}
                              onClick={() => handleImageClick(photo.url)}
                              className="block overflow-hidden rounded border border-gray-200 bg-gray-50 hover:border-gray-300"
                            >
                              <img src={photo.url} alt={`Observation ${index + 1}`} className="h-28 w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm italic text-gray-500">No photos attached</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                No observations yet.
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900">Add Observation</h2>
            <form onSubmit={handleCreateObservation} className="mt-4 space-y-3">
              <div>
                <label htmlFor="obs-text" className="mb-1 block text-xs font-medium text-gray-700">Observation</label>
                <textarea
                  id="obs-text"
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="Enter your observation..."
                  className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  rows="4"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  id="potential"
                  type="checkbox"
                  checked={markPotential}
                  onChange={(e) => setMarkPotential(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Mark as potential violation</span>
              </label>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Suspected Codes</label>
                <CodeSelect onChange={(opts) => setSelectedCodes(opts || [])} value={selectedCodes} isMulti={true} />
              </div>
              <div>
                <FileUploadInput
                  id="unit-observation-photos"
                  name="photos"
                  label="Photos"
                  files={photos}
                  onChange={setPhotos}
                  accept="image/*,application/pdf"
                />
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
                >
                  Add Observation
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl">
            <button
              onClick={closeModal}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-gray-600 hover:bg-black/10"
              aria-label="Close"
            >
              ×
            </button>
            <img src={selectedImage} alt="Selected Observation" className="h-auto w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
