import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'default' | 'small';
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', size = 'default', fullWidth, className, ...rest }: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'small' ? styles.small : '',
    fullWidth ? styles.fullWidth : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...rest} />;
}
