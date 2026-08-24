import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';

import styles from './Field.module.css';

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => ReactNode;
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error && (
        <span className={styles.errorText} role="alert">
          {error}
        </span>
      )}
      {!error && hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id) => (
        <input
          id={id}
          className={[styles.control, error ? styles.controlError : '', className].filter(Boolean).join(' ')}
          aria-invalid={!!error}
          {...rest}
        />
      )}
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, className, children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      {(id) => (
        <select
          id={id}
          className={[styles.control, error ? styles.controlError : '', className].filter(Boolean).join(' ')}
          aria-invalid={!!error}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldWrapper>
  );
}
