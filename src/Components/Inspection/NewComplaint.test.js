import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NewComplaint from './NewComplaint';
import { useAuth } from '../../AuthContext';

// Mock the useAuth hook
jest.mock('../../AuthContext', () => ({
	useAuth: jest.fn(),
}));

// Mock the fetch API
global.fetch = jest.fn(() =>
	Promise.resolve({
		json: () => Promise.resolve([]),
	})
);

describe('NewComplaint', () => {
	beforeEach(() => {
		useAuth.mockReturnValue({ user: { token: 'test-token' } });
	});

	test('renders without crashing', () => {
		render(<NewComplaint />);
		expect(screen.getByText(/New Complaint/i)).toBeInTheDocument();
	});

	test('renders form fields', () => {
		render(<NewComplaint />);
		expect(screen.getByLabelText(/Select Address/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/Application or Photos/i)).toBeInTheDocument();
	});

	test('handles form submission', async () => {
		render(<NewComplaint />);

		fireEvent.change(screen.getByLabelText(/Description/i), {
			target: { value: 'Test description' },
		});

		fireEvent.click(screen.getByText(/Create New Complaint/i));

		await waitFor(() => {
			expect(fetch).toHaveBeenCalledWith(
				`${process.env.REACT_APP_API_URL}/inspections/`,
				expect.objectContaining({
					method: 'POST',
					headers: expect.objectContaining({
						'Content-Type': 'application/json',
						Authorization: 'Bearer test-token',
					}),
					body: JSON.stringify(expect.objectContaining({
						description: 'Test description',
					})),
				})
			);
		});
	});

	test('handles file upload', async () => {
		render(<NewComplaint />);

		const file = new File(['dummy content'], 'example.png', { type: 'image/png' });
		const input = screen.getByLabelText(/Choose files/i);

		fireEvent.change(input, { target: { files: [file] } });

		expect(screen.getByText('example.png')).toBeInTheDocument();
	});

	test('toggles unit selection', async () => {
		render(<NewComplaint />);

		fireEvent.change(screen.getByLabelText(/Select Address/i), {
			target: { value: '1' },
		});

		await waitFor(() => {
			expect(screen.getByLabelText(/Select a Unit/i)).toBeInTheDocument();
		});
	});

	test('toggles business selection', () => {
		render(<NewComplaint />);

		fireEvent.click(screen.getByText(/Add a Business/i));
		expect(screen.getByText(/Hide Business Selection/i)).toBeInTheDocument();
	});
});