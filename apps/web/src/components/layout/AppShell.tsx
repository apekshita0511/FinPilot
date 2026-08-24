import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '⌂' },
  { to: '/accounts', label: 'Accounts', icon: '▤' },
  { to: '/transactions', label: 'Transactions', icon: '⇄' },
  { to: '/budgets', label: 'Budgets', icon: '◔' },
  { to: '/import', label: 'Import', icon: '⇩' },
  { to: '/analytics', label: 'Analytics', icon: '▦' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>FP</span>
          FinPilot
        </div>
        <nav className={styles.nav} aria-label="Main navigation">
          <NavLinks />
        </nav>
        <div className={styles.userBox}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userEmail}>{user?.email}</span>
          </div>
          <Button variant="ghost" size="small" onClick={() => logout()}>
            Log out
          </Button>
        </div>
      </aside>

      <div className={styles.mobileTopbar}>
        <div className={styles.brand} style={{ padding: 0 }}>
          <span className={styles.brandMark}>FP</span>
          FinPilot
        </div>
        <Button variant="ghost" size="small" onClick={() => logout()}>
          Log out
        </Button>
      </div>
      <nav className={styles.mobileNav} aria-label="Main navigation">
        <NavLinks />
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className={styles.pageHeader}>
      <h1>{title}</h1>
      {action}
    </div>
  );
}
