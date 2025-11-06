import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Tour from 'reactour';

const CommentingTourPage = () => {
  const [tourOpen, setTourOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const steps = useMemo(
    () => [
      {
        selector: '[data-tour="address-search"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Start with the address search</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Type <strong>5008 Queensbury</strong> into the universal search box. The quick results panel shows matches in
              real time, so you can jump directly into the address record without leaving your current page.
            </p>
          </div>
        ),
      },
      {
        selector: '[data-tour="address-result"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Open the 5008 Queensbury record</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Select the <strong>5008 Queensbury Rd</strong> result to open the address profile. Every tour action from here
              mirrors the live address experience.
            </p>
          </div>
        ),
      },
      {
        selector: '[data-tour="comments-tab"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Navigate to Comments</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Within the address dashboard, choose the <strong>Comments</strong> tab. This is where internal notes for 5008
              Queensbury are organized chronologically.
            </p>
          </div>
        ),
      },
      {
        selector: '[data-tour="comment-editor"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Write your update</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the comment editor to describe what you observed. You can mention teammates with <code>@name</code> and
              attach documentation before posting the update.
            </p>
          </div>
        ),
      },
      {
        selector: '[data-tour="comment-submit"]',
        content: (
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Post the comment</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Choose <strong>Add Comment</strong> to publish the note to 5008 Queensbury’s timeline. Everyone following the
              property will see it immediately.
            </p>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">Help Center · Guided Tours</p>
        <h1 className="text-3xl font-bold text-slate-900">Leave a comment on 5008 Queensbury</h1>
        <p className="max-w-3xl text-base leading-7 text-slate-600">
          Follow this interactive walkthrough to see how a code officer records a site note on <strong>5008 Queensbury Rd</strong>.
          The demo uses the exact interface your team sees in production.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            onClick={() => setTourOpen(true)}
          >
            Start the Reactour demo
          </button>
          <Link
            to="/helpful"
            className="text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
          >
            Browse other resources
          </Link>
        </div>
      </header>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-tour="address-search">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">1. Find the property</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Search
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Start typing <strong>5008 Queensbury</strong> into the global search located in the sidebar header. Matches appear as you
          type, letting you select the property in seconds.
        </p>
        <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-4">
          <input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
            placeholder="Search addresses..."
            defaultValue="5008 Queensbury"
            aria-label="Address search"
          />
          <div
            className="absolute left-4 right-4 top-[4.75rem] space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg"
            data-tour="address-result"
          >
            <button
              type="button"
              className="flex w-full items-start justify-between rounded-md border border-transparent bg-white px-4 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50"
            >
              <div>
                <p className="text-sm font-semibold text-slate-900">5008 Queensbury Rd</p>
                <p className="text-xs text-slate-500">Riverdale Park, MD 20737 · Residential property</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Open profile</span>
            </button>
            <p className="text-xs text-slate-500">
              Selecting the address opens the full property dashboard without disrupting your current task.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-tour="comments-tab">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">2. Move to the Comments tab</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Address dashboard
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Inside the property record you can move between tabs like Contacts, Units, and Photos. Choose <strong>Comments</strong>
          to work with the activity feed shared among your team.
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-500">
            <span className="rounded-md px-3 py-1">Overview</span>
            <span className="rounded-md px-3 py-1">Contacts</span>
            <span className="rounded-md px-3 py-1">Photos</span>
            <span className="rounded-md bg-indigo-600 px-3 py-1 text-white">Comments</span>
            <span className="rounded-md px-3 py-1">Inspections</span>
            <span className="rounded-md px-3 py-1">Complaints</span>
          </div>
          <div className="bg-white p-4 text-sm text-slate-600">
            The comments timeline keeps the most recent updates at the top. Use it to coordinate follow-up actions for 5008
            Queensbury Rd.
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" data-tour="comment-editor">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">3. Draft your internal note</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Compose
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          Capture what you learned at the property. Mention coworkers with <code>@</code>, reference contacts with <code>%</code>,
          and add supporting files for quick context.
        </p>
        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none"
            placeholder="Document what you observed at 5008 Queensbury Rd..."
            aria-label="Comment draft"
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Attach inspection photos</span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Mention @Carla to notify her</span>
            <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Reference %Tenant for contact follow-up</span>
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">4. Publish and review</h2>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
            Timeline
          </span>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          When you post, the note appears instantly in the timeline and triggers notifications for anyone mentioned. Use the
          button below to see how it looks once saved.
        </p>
        <div className="space-y-4">
          <div className="flex items-center gap-3" data-tour="comment-submit">
            <button
              type="button"
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              onClick={() => setShowPreview(true)}
            >
              Add Comment
            </button>
            <span className="text-xs text-slate-500">Simulates the final step inside the real address record.</span>
          </div>
          {showPreview && (
            <article className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-slate-700">
              <header className="flex items-center justify-between text-xs uppercase tracking-wide text-indigo-600">
                <span>Most recent activity</span>
                <time dateTime="2024-08-14T14:45:00-04:00">Aug 14, 2024 · 2:45 PM ET</time>
              </header>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                Followed up with the tenant at <strong>5008 Queensbury Rd</strong>. Trash containers relocated to the rear per Chapter 36.
                Scheduled a re-check for next Monday. @Carla will drop off the courtesy notice.
              </p>
            </article>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
        <h2 className="text-lg font-semibold text-indigo-900">Need more guided content?</h2>
        <p className="mt-2 text-sm leading-6 text-indigo-900/80">
          We&apos;re expanding the help center with additional Reactour demos. Let the product team know which workflows you&apos;d like to
          see next.
        </p>
        <a
          className="mt-4 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition hover:bg-indigo-50"
          href="mailto:product@civiccode.us?subject=Help%20Center%20Request%3A%20Reactour%20Walkthroughs"
        >
          Request another walkthrough
        </a>
      </section>

      <Tour
        steps={steps}
        isOpen={tourOpen}
        onRequestClose={() => setTourOpen(false)}
        accentColor="#4f46e5"
        rounded={12}
      />
    </div>
  );
};

export default CommentingTourPage;

