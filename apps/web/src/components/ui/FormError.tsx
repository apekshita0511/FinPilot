export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <span role="alert" style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>
      {message}
    </span>
  );
}
