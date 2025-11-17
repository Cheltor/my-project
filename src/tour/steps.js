import React from 'react';

const TOUR_STEPS = [
  {
    id: 'search-address',
    selector: '[data-tour-id="global-address-search"]',
    title: 'Find an address',
    placement: 'bottom',
    content: (
      <p className="text-sm leading-relaxed text-slate-600">
        Use the global search to find any property. We&apos;ll search for <strong>5008 Queensbury</strong> so you can follow along.
      </p>
    ),
  },
  {
    id: 'search-results',
    selector: '[data-tour-id="address-search-result-0"]',
    placement: 'bottom',
    title: 'Pick the matching record',
    content: (
      <p className="text-sm leading-relaxed text-slate-600">
        The best match appears at the top of the list. Select it to jump to the address overview.
      </p>
    ),
  },
  {
    id: 'violations-card',
    selector: '[data-tour-id="address-tab-violations"]',
    placement: 'top',
    title: 'Review violations',
    content: (
      <p className="text-sm leading-relaxed text-slate-600">
        Every section card opens a modal with richer detail. Start with <strong>Violations</strong> to see enforcement history and add new cases.
      </p>
    ),
  },
  {
    id: 'inspections-card',
    selector: '[data-tour-id="address-tab-inspections"]',
    placement: 'top',
    title: 'Inspect scheduled work',
    content: (
      <p className="text-sm leading-relaxed text-slate-600">
        Use <strong>Inspections</strong> to review upcoming visits or schedule a new one directly from this address record.
      </p>
    ),
  },
  {
    id: 'comments-card',
    selector: '[data-tour-id="address-tab-comments"]',
    placement: 'top',
    title: 'Open the comments feed',
    content: (
      <p className="text-sm leading-relaxed text-slate-600">
        The <strong>Comments</strong> card opens the running timeline of internal notes, attachments, and mentions for this address.
      </p>
    ),
  },
  {
    id: 'add-comment',
    selector: '[data-tour-id="address-comment-form"]',
    placement: 'left',
    title: 'Leave a comment',
    content: (
      <div className="text-sm leading-relaxed text-slate-600 space-y-2">
        <p>
          Draft your note, mention teammates with <code>@Name</code>, and add files before posting. Comments instantly notify anyone you mention.
        </p>
        <p className="font-medium text-indigo-600">Give it a try when you&apos;re ready!</p>
      </div>
    ),
  },
];

export default TOUR_STEPS;
