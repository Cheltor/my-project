import React from 'react';

const Title = ({ children }) => (
  <h3 className="text-lg font-semibold text-gray-900 mb-1">{children}</h3>
);

const Body = ({ children }) => (
  <p className="text-sm text-gray-700 leading-relaxed">{children}</p>
);

const Emphasis = ({ children }) => (
  <span className="font-semibold text-indigo-600">{children}</span>
);

const tourSteps = [
  {
    selector: '[data-tour-target="address-search-input"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Find an address</Title>
        <Body>
          Start typing <Emphasis>5008 Queensbury</Emphasis> into the global search bar. The results list will update as you type,
          so you can jump directly to that property.
        </Body>
      </div>
    ),
    position: 'bottom',
    stepInteraction: true,
  },
  {
    selector: '[data-tour-target="address-search-results"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Pick the matching result</Title>
        <Body>
          Choose the result that matches <Emphasis>5008 Queensbury</Emphasis>. Selecting it will open the address profile so you can
          review everything tied to that location.
        </Body>
      </div>
    ),
    position: 'right',
  },
  {
    selector: '[data-tour-target="address-tab-violations"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Check violations</Title>
        <Body>
          Use the <Emphasis>Violations</Emphasis> card to review open or resolved enforcement actions for this address. Click it
          whenever you need the full violation history.
        </Body>
      </div>
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-target="address-tab-inspections"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Review inspections</Title>
        <Body>
          The <Emphasis>Inspections</Emphasis> button is where you can see scheduled, in-progress, and past inspections. It's the
          quickest way to check the latest field activity.
        </Body>
      </div>
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-target="address-tab-comments"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Read team notes</Title>
        <Body>
          Head to <Emphasis>Comments</Emphasis> to browse internal updates, attachments, and mentions from your teammates. Keep this
          area in mind when you need the running conversation.
        </Body>
      </div>
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-target="address-comment-form"]',
    content: () => (
      <div className="max-w-xs">
        <Title>Leave a comment</Title>
        <Body>
          Add your update in the text box, attach files if needed, and press <Emphasis>Add Comment</Emphasis>. You can @mention
          coworkers or %mention contacts to notify them instantly.
        </Body>
      </div>
    ),
    position: 'top',
    stepInteraction: true,
  },
];

export default tourSteps;
