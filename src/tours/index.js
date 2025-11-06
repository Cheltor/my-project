import React from 'react';

const wait = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const DEMO_ADDRESS_ID = '1143';
const DEMO_ADDRESS_SEARCH = '5008 Queensbury';

const createStepContent = (title, description, footer) => (
  <div className="space-y-2 text-slate-100">
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm leading-relaxed text-slate-200">{description}</p>
    {footer}
  </div>
);

const violationEntrySteps = () => [
  {
    selector: '[data-tour-id="address-search-input"]',
    content: createStepContent(
      'Find the property',
      'Use the global search to jump to the address that needs a notice. Type “5008 Queensbury” to find the Town Hall property used in this example.',
      <p className="text-xs uppercase tracking-wide text-indigo-200">Tip: You can search by address, owner, or property name.</p>
    ),
    position: 'bottom',
    spotlightPadding: 10,
    meta: {
      script: async ({ location, navigate, wait: pause, typeIntoInput, waitForElement }) => {
        if (typeof window === 'undefined') return;

        if (!location || location.pathname !== '/') {
          navigate('/', { replace: false });
          await pause(700);
        }

        await pause(250);
        await typeIntoInput('[data-tour-id="address-search-input"]', DEMO_ADDRESS_SEARCH, {
          timeout: 5000,
        });

        await waitForElement('[data-tour-id="address-search-results"]', {
          timeout: 5000,
        });
      },
    },
  },
  {
    selector: '[data-tour-id="address-search-results"]',
    content: createStepContent(
      'Open the address workspace',
      'Watch the tour select the “Town Hall – 5008 Queensbury Road” result and open the address workspace so you can review every step in context.',
    ),
    position: 'bottom',
    spotlightPadding: 12,
    meta: {
      script: async ({ navigate, wait: pause, waitForElement, queryAll }) => {
        if (typeof document === 'undefined') {
          navigate(`/address/${DEMO_ADDRESS_ID}`);
          await pause(650);
          return;
        }

        const candidate = await waitForElement('[data-tour-id="address-search-results"] li', {
          timeout: 5000,
          interval: 150,
        });

        if (!candidate) {
          navigate(`/address/${DEMO_ADDRESS_ID}`);
          await pause(650);
          return;
        }

        const items = queryAll('[data-tour-id="address-search-results"] li');
        const searchLower = DEMO_ADDRESS_SEARCH.toLowerCase();
        const match = items.find((el) => {
          const text = el.textContent ? el.textContent.toLowerCase() : '';
          return text.includes(searchLower);
        });
        const target = match || candidate;

        if (target) {
          if (typeof target.scrollIntoView === 'function') {
            target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            await pause(350);
          } else {
            await pause(250);
          }

          const eventOptions = {
            bubbles: true,
            cancelable: true,
            view: window,
          };

          target.dispatchEvent(new MouseEvent('mousedown', eventOptions));
          target.dispatchEvent(new MouseEvent('mouseup', eventOptions));
          target.dispatchEvent(new MouseEvent('click', eventOptions));
          await pause(650);
        }

        const violationsTab = await waitForElement('[data-tour-id="address-violations-tab"]', {
          timeout: 6000,
        });

        if (!violationsTab) {
          navigate(`/address/${DEMO_ADDRESS_ID}`);
          await pause(700);
          await waitForElement('[data-tour-id="address-violations-tab"]', {
            timeout: 6000,
          });
        }
      },
    },
  },
  {
    selector: '[data-tour-id="address-violations-tab"]',
    content: createStepContent(
      'Navigate to Violations',
      'The tour opens the Violations card so you can preview the property workspace layout before we start the form.',
    ),
    spotlightPadding: 12,
    meta: {
      script: async ({ wait: pause, waitForElement }) => {
        if (typeof document === 'undefined') return;

        const tab = await waitForElement('[data-tour-id="address-violations-tab"]', {
          timeout: 6000,
        });

        if (tab && tab.getAttribute('aria-pressed') !== 'true') {
          if (typeof tab.scrollIntoView === 'function') {
            tab.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await pause(350);
          }
          tab.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          await pause(450);
        }

        await waitForElement('[data-tour-id="address-new-violation-button"]', {
          timeout: 6000,
        });
      },
    },
  },
  {
    selector: '[data-tour-id="address-new-violation-button"]',
    content: createStepContent(
      'Start a new notice',
      'The walkthrough reveals the New Violation form and keeps it open while we review each field.',
    ),
    spotlightPadding: 12,
    meta: {
      script: async ({ wait: pause, waitForElement }) => {
        if (typeof document === 'undefined') return;

        const toggle = await waitForElement('[data-tour-id="address-new-violation-button"]', {
          timeout: 5000,
        });

        if (toggle && toggle.getAttribute('aria-expanded') !== 'true') {
          if (typeof toggle.scrollIntoView === 'function') {
            toggle.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await pause(300);
          }
          toggle.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          await pause(450);
        }

        await waitForElement('[data-tour-id="address-violation-type"]', {
          timeout: 6000,
        });
      },
    },
  },
  {
    selector: '[data-tour-id="address-violation-type"]',
    content: createStepContent(
      'Choose the notice type',
      'We will use the Formal Notice template for this example so you can see the full workflow.',
    ),
    position: 'bottom',
    meta: {
      script: async ({ waitForElement }) => {
        if (typeof document === 'undefined') return;

        const select = await waitForElement('[data-tour-id="address-violation-type"]', {
          timeout: 5000,
        });

        if (select && select.value !== 'Formal Notice') {
          select.value = 'Formal Notice';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    },
  },
  {
    selector: '[data-tour-id="address-violation-codes"]',
    content: createStepContent(
      'Add violation codes',
      'This field is where you would search and add one or more codes to drive the notice language and follow-up schedule.',
    ),
    position: 'right',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="address-violation-deadline"]',
    content: createStepContent(
      'Set the compliance deadline',
      'The example sets a seven-day compliance window, which you can adjust in real scenarios.',
    ),
    position: 'bottom',
    meta: {
      script: async ({ waitForElement }) => {
        if (typeof document === 'undefined') return;

        const select = await waitForElement('[data-tour-id="address-violation-deadline"]', {
          timeout: 5000,
        });

        if (select && select.value !== '7 days') {
          select.value = '7 days';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    },
  },
  {
    selector: '[data-tour-id="address-violation-attachments"]',
    content: createStepContent(
      'Attach documentation',
      'This panel accepts photos or PDFs that support the violation. They stay with the record for future inspections.',
    ),
    position: 'top',
  },
  {
    selector: '[data-tour-id="address-violation-submit"]',
    content: createStepContent(
      'Submit the violation',
      'When all required fields are complete outside of the tour, you would submit to log the violation on this property.',
    ),
    position: 'top',
    spotlightPadding: 12,
  },
  {
    selector: '[data-tour-id="nav-dashboard"]',
    content: createStepContent(
      'Return to the dashboard',
      'You can also add violations without opening an address first. The tour returns to the Dashboard so you can see the quick action panel.',
    ),
    position: 'right',
    meta: {
      script: async ({ navigate, wait: pause }) => {
        navigate('/', { replace: false });
        await pause(700);
      },
    },
  },
  {
    selector: '[data-tour-id="home-quick-actions-toggle"]',
    content: createStepContent(
      'Open quick actions',
      'The tour opens quick actions so you can see the shortcuts for common forms, including the violation form.',
    ),
    position: 'left',
    meta: {
      script: async ({ wait: pause, waitForElement }) => {
        if (typeof document === 'undefined') return;

        const quickActionButton = document.querySelector('[data-tour-id="home-new-violation-quick-action"]');
        if (!quickActionButton) {
          const toggle = await waitForElement('[data-tour-id="home-quick-actions-toggle"]', {
            timeout: 5000,
          });
          if (toggle) {
            toggle.dispatchEvent(
              new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window,
              }),
            );
            await pause(450);
          }
        }

        await waitForElement('[data-tour-id="home-new-violation-quick-action"]', {
          timeout: 6000,
        });
      },
    },
  },
  {
    selector: '[data-tour-id="home-new-violation-quick-action"]',
    content: createStepContent(
      'Launch the quick violation form',
      'The dashboard shortcut opens the same form without leaving your current context. It is ideal for back-to-back notices, and the tour opens it automatically.',
    ),
    position: 'bottom',
    spotlightPadding: 12,
    meta: {
      script: async ({ wait: pause, waitForElement }) => {
        if (typeof document === 'undefined') return;

        const form = document.querySelector('[data-tour-id="new-violation-form"]');
        if (form) {
          return;
        }

        const button = await waitForElement('[data-tour-id="home-new-violation-quick-action"]', {
          timeout: 5000,
        });

        if (button) {
          button.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
            }),
          );
          await pause(500);
        }

        await waitForElement('[data-tour-id="new-violation-form"]', {
          timeout: 6000,
        });
      },
    },
  },
  {
    selector: '[data-tour-id="new-violation-address"]',
    content: createStepContent(
      'Select the address',
      'The tour fills in the sample address (ID 1143) so the record stays linked without manual input.',
    ),
    position: 'bottom',
    meta: {
      script: async ({ wait: pause, typeIntoInput }) => {
        await pause(250);
        await typeIntoInput('[data-tour-id="new-violation-address"] input', DEMO_ADDRESS_ID, {
          timeout: 5000,
        });
        await pause(450);
      },
    },
  },
  {
    selector: '[data-tour-id="new-violation-type"]',
    content: createStepContent(
      'Set the notice type',
      'The quick form mirrors the address modal, and we will pick the same notice type automatically.',
    ),
    position: 'bottom',
    meta: {
      script: async ({ waitForElement }) => {
        if (typeof document === 'undefined') return;

        const select = await waitForElement('[data-tour-id="new-violation-type"]', {
          timeout: 5000,
        });

        if (select && select.value !== 'Formal Notice') {
          select.value = 'Formal Notice';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    },
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
      'We keep the same compliance deadline here so both entry points stay consistent.',
    ),
    position: 'bottom',
    meta: {
      script: async ({ waitForElement }) => {
        if (typeof document === 'undefined') return;

        const select = await waitForElement('[data-tour-id="new-violation-deadline"]', {
          timeout: 5000,
        });

        if (select && select.value !== '7 days') {
          select.value = '7 days';
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
    },
  },
  {
    selector: '[data-tour-id="new-violation-attachments"]',
    content: createStepContent(
      'Attach supporting files',
      'This quick form field also accepts uploads, letting you add photos or documents without leaving the dashboard.',
    ),
    position: 'top',
  },
  {
    selector: '[data-tour-id="new-violation-submit"]',
    content: createStepContent(
      'Submit from anywhere',
      'Outside of the tour you would save the violation to route it to inspectors. The quick form and address modal both create the same record.',
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
    },
    buildSteps: () => violationEntrySteps(),
  },
];

