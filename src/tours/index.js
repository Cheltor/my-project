import React from 'react';

const wait = (ms = 350) => new Promise((resolve) => window.setTimeout(resolve, ms));

const createStepContent = (title, description, footer) => (
  <div className="space-y-2 text-slate-100">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-200">{description}</p>
    {footer}
  </div>
);

const violationEntrySteps = [
  {
    selector: '[data-tour-id="address-search-input"]',
    content: createStepContent(
      'Find the property',
      'Use the global search to jump to the address that needs a notice. Type at least two characters to see suggestions.',
      <p className="text-xs uppercase tracking-wide text-indigo-200">Tip: You can search by address, owner, or property name.</p>
    ),
    position: 'bottom',
    spotlightPadding: 10,
  },
  {
    selector: '[data-tour-id="address-search-results"]',
    content: createStepContent(
      'Open the address workspace',
      'Pick the correct result from the dropdown. The address page opens with tabs for contacts, inspections, and more.',
    ),
    position: 'bottom',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="address-violations-tab"]',
    content: createStepContent(
      'Navigate to Violations',
      'Inside the address workspace, open the Violations card to launch the detailed modal for this property.',
    ),
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="address-new-violation-button"]',
    content: createStepContent(
      'Start a new notice',
      'Use the New Violation button to reveal the form. Keep the modal open while you work through the fields.',
    ),
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="address-violation-type"]',
    content: createStepContent(
      'Choose the notice type',
      'Select the template that matches how you are delivering the violation (Doorhanger or Formal Notice).',
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="address-violation-codes"]',
    content: createStepContent(
      'Add violation codes',
      'Search and add one or more codes. These drive the language on the notice and the follow-up schedule.',
    ),
    position: 'right',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="address-violation-deadline"]',
    content: createStepContent(
      'Set the compliance deadline',
      'Pick the deadline that inspectors should enforce. Adjusting this updates reminders and reporting.',
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="address-violation-attachments"]',
    content: createStepContent(
      'Attach documentation',
      'Drop photos or PDFs that support the violation. These stay with the record for future inspections.',
    ),
    position: 'top',
  },
  {
    selector: '[data-tour-id="address-violation-submit"]',
    content: createStepContent(
      'Submit the violation',
      'When all required fields are complete, submit to log the violation on this property.',
    ),
    position: 'top',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="nav-dashboard"]',
    content: createStepContent(
      'Return to the dashboard',
      'You can also add violations without opening an address first. Navigate back to the Dashboard to see the quick action panel.',
    ),
    position: 'right',
  },
  {
    selector: '[data-tour-id="home-quick-actions-toggle"]',
    content: createStepContent(
      'Open quick actions',
      'Use the quick actions toggle to reveal shortcuts for common forms, including the violation form.',
    ),
    position: 'left',
  },
  {
    selector: '[data-tour-id="home-new-violation-quick-action"]',
    content: createStepContent(
      'Launch the quick violation form',
      'The dashboard shortcut opens the same form without leaving your current context. It is ideal for back-to-back notices.',
    ),
    position: 'bottom',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="new-violation-address"]',
    content: createStepContent(
      'Select the address',
      'Search for the property again from the quick form. The system keeps the violation linked to the correct address.',
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="new-violation-type"]',
    content: createStepContent(
      'Set the notice type',
      'Pick the same notice type options here. The quick form mirrors the fields from the address modal.',
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="new-violation-codes"]',
    content: createStepContent(
      'Add the violation codes',
      'Search or paste code numbers. You can attach multiple codes at once from the quick form as well.',
    ),
    position: 'right',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="new-violation-deadline"]',
    content: createStepContent(
      'Confirm the deadline',
      'Match the compliance deadline to the notice type. Adjust it if the situation requires a shorter window.',
    ),
    position: 'bottom',
  },
  {
    selector: '[data-tour-id="new-violation-attachments"]',
    content: createStepContent(
      'Attach supporting files',
      'Upload photos or other documents directly from the dashboard if you already have them.',
    ),
    position: 'top',
  },
  {
    selector: '[data-tour-id="new-violation-submit"]',
    content: createStepContent(
      'Submit from anywhere',
      'Save the violation to route it to inspectors. The quick form and address modal both create the same record.',
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-200">All done! You can rerun this tour anytime from the Help page.</p>
    ),
    position: 'top',
    spotlightPadding: 12,
  },
];

export const tours = [
  {
    id: 'violation-entry',
    title: 'Entering a violation notice',
    description:
      'Walk through finding an address, recording the violation within the property workspace, and using the dashboard quick action.',
    estimatedTime: '≈3 minutes',
    launchTourId: 'help-tour-violation-entry',
    prepare: async ({ navigate }) => {
      navigate('/', { replace: false });
      await wait(450);
      if (typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.dispatchEvent(new CustomEvent('app:open-new-violation-tour'));
    },
    buildSteps: () => violationEntrySteps,
  },
];

