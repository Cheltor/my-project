import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../AuthContext';
import NewViolationForm from './NewViolationForm';

// Mock the global fetch function
global.fetch = jest.fn();

// Mock child components to isolate the form
jest.mock('../CodeSelect', () => (props) => (
  <select
    data-testid="code-select"
    onChange={e => {
        const selectedOption = e.target.selectedOptions[0];
        if (!selectedOption.value) {
            props.onChange([]);
            return;
        }
        const value = JSON.parse(selectedOption.value);
        props.onChange(value ? [value] : []);
    }}
  >
    <option value="">Select a code</option>
    <option value='{"value": "1", "label": "Code 1", "code": { "id": 1, "name": "Code 1", "description": "Desc 1", "chapter": "1", "section": "1" }}'>Code 1</option>
    <option value='{"value": "2", "label": "Code 2", "code": { "id": 2, "name": "Code 2", "description": "Desc 2", "chapter": "2", "section": "2" }}'>Code 2</option>
  </select>
));


jest.mock('../Common/FileUploadInput', () => ({ files, onChange }) => (
    <div>
      <input
        type="file"
        data-testid="file-upload"
        onChange={e => onChange([...e.target.files])}
        multiple
      />
      {files.map((file, i) => <div key={i}>{file.name}</div>)}
    </div>
));

// Mock useNavigate
const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
}));

const renderWithProviders = (ui, { providerProps, ...renderOptions } = {}) => {
    return render(
        <MemoryRouter>
            <AuthContext.Provider value={providerProps.value}>
                {ui}
            </AuthContext.Provider>
        </MemoryRouter>,
        renderOptions
    );
};

describe('NewViolationForm', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockedNavigate.mockClear();
  });

  const mockUser = { id: 1, name: 'Test User', role: 1 };
  const providerProps = {
    value: {
      user: mockUser,
      token: 'fake-token',
      login: jest.fn(),
      logout: jest.fn(),
    },
  };

  test('fills out and submits the form successfully', async () => {
    const onCreated = jest.fn();

    // Mock successful API responses
    fetch.mockImplementation((url, options) => {
        if (url.includes('/violations/') && options.method === 'POST') {
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ id: 101, message: 'Violation created' }),
            });
        }
        // Default mock for other calls
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderWithProviders(<NewViolationForm onCreated={onCreated} initialAddressId="123" initialAddressLabel="123 Main St" lockAddress />, { providerProps });

    fireEvent.click(screen.getByText('Next')); // Step 1: Photos
    fireEvent.click(screen.getByText('Next')); // Step 2: Address

    // Step 3: Codes
    const codeSelect = screen.getByTestId('code-select');
    await userEvent.selectOptions(codeSelect, screen.getByText('Code 1'));
    await screen.findByText('Desc 1'); // Wait for re-render

    fireEvent.click(screen.getByText('Next'));

    // Step 4: Deadline & Review
    fireEvent.click(screen.getByText('Submit Violation'));

    await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/violations/'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('"address_id":123'),
            })
        );
    });

    await waitFor(() => {
        expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 101 }));
    });

    await waitFor(() => {
        expect(mockedNavigate).toHaveBeenCalledWith('/violation/101');
    });
  });

  test('shows an error message when submission fails', async () => {
    // Mock a failed API response
    fetch.mockImplementation((url, options) => {
        if (url.includes('/violations/')) {
            return Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ detail: 'Server error occurred' }),
            });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });

    renderWithProviders(<NewViolationForm onCreated={jest.fn()} initialAddressId="123" initialAddressLabel="123 Main St" lockAddress />, { providerProps });

    fireEvent.click(screen.getByText('Next')); // Photos
    fireEvent.click(screen.getByText('Next')); // Address

    const codeSelect = screen.getByTestId('code-select');
    await userEvent.selectOptions(codeSelect, screen.getByText('Code 1'));
    await screen.findByText('Desc 1'); // Wait for re-render

    fireEvent.click(screen.getByText('Next')); // Codes

    fireEvent.click(screen.getByText('Submit Violation')); // Deadline & Review

    await waitFor(() => {
        expect(screen.getByText('Server error occurred')).toBeInTheDocument();
    });

    expect(mockedNavigate).not.toHaveBeenCalled();
  });
});
