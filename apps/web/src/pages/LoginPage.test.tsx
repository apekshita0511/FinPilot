import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { LoginPage } from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import * as authApi from '../api/auth';
import { ApiClientError } from '../api/client';

jest.mock('../api/auth');
const mockedAuthApi = authApi as jest.Mocked<typeof authApi>;

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // AuthProvider calls me() on mount to establish session state.
    mockedAuthApi.me.mockRejectedValue(new ApiClientError(401, 'Authentication required'));
  });

  it('renders email and password fields and a submit button', async () => {
    renderLoginPage();
    expect(await screen.findByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows the backend error message when login fails', async () => {
    mockedAuthApi.login.mockRejectedValue(new ApiClientError(401, 'Invalid email or password'));
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(await screen.findByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('calls the login API with the entered credentials on submit', async () => {
    mockedAuthApi.login.mockResolvedValue({
      user: { id: 'u1', email: 'alice@example.com', name: 'Alice', createdAt: '', updatedAt: '' },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(await screen.findByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(mockedAuthApi.login).toHaveBeenCalledWith({ email: 'alice@example.com', password: 'password123' });
    });
  });
});
