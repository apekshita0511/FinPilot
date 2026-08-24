import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiClientError } from '../api/client';
import { AuthLayout } from '../components/layout/AuthLayout';
import authStyles from '../components/layout/AuthLayout.module.css';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Field';
import { FormError } from '../components/ui/FormError';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, name);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Unable to create an account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout subtitle="Create your account">
      <form className={authStyles.form} onSubmit={onSubmit}>
        <Input label="Name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className={authStyles.footer}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}
