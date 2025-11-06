import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTour } from '@reactour/tour';
import { tours } from '../tours';

const Help = () => {
  const navigate = useNavigate();
  const { setIsOpen, setCurrentStep, setSteps } = useTour();
  const [activeTourId, setActiveTourId] = React.useState(null);

  const handleLaunchTour = async (tour) => {
    if (!tour || activeTourId) return;
    setActiveTourId(tour.id);

    try {
      if (typeof tour.prepare === 'function') {
        await tour.prepare({ navigate });
      }

      const tourSteps = typeof tour.buildSteps === 'function' ? tour.buildSteps({ navigate }) : tour.steps || [];
      setSteps(tourSteps);
      setCurrentStep(0);
      setIsOpen(true);
    } finally {
      setActiveTourId(null);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <header className="space-y-4">
          <div className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Guided support
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Help & interactive tours
          </h1>
          <p className="max-w-2xl text-base text-slate-600">
            Learn the core workflows step-by-step. Launch a tour to spotlight the exact buttons, forms, and shortcuts used in the application.
          </p>
        </header>

        <section aria-label="Available tours" className="space-y-6">
          <h2 className="text-lg font-semibold text-slate-900">Available tours</h2>
          {tours.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-white/70 px-4 py-6 text-slate-500">
              No tours are available yet. Check back soon for guided walkthroughs.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {tours.map((tour) => (
                <article
                  key={tour.id}
                  className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold text-slate-900">{tour.title}</h3>
                    {tour.description && <p className="text-sm leading-relaxed text-slate-600">{tour.description}</p>}
                    {tour.estimatedTime && (
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                        {tour.estimatedTime}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLaunchTour(tour)}
                    className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={activeTourId === tour.id}
                    data-tour-id={tour.launchTourId}
                  >
                    {activeTourId === tour.id ? 'Preparing…' : 'Start tour'}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Help;

