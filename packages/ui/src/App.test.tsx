import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App.tsx';

describe('App shell', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('renders the application logo and title', () => {
    render(<App />);
    expect(screen.getByText('ReleaseLens')).toBeInTheDocument();
  });

  it('renders all primary navigation links after entering the workbench', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Get Started/ }));
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    // Use within() to scope to the nav bar only
    expect(within(nav).getByText('Overview')).toBeInTheDocument();
    expect(within(nav).getByText('Change')).toBeInTheDocument();
    expect(within(nav).getByText('Impact')).toBeInTheDocument();
    expect(within(nav).getByText('Verification')).toBeInTheDocument();
    expect(within(nav).getByText('Findings')).toBeInTheDocument();
    expect(within(nav).getByText('Dossier')).toBeInTheDocument();
  });

  it('renders the welcome page at the application root', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /Evidence-Backed Release Verification Workbench/ })).toBeInTheDocument();
  });

  it('opens Overview and shows the no-repository empty state', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Get Started/ }));
    expect(await screen.findByText('No repositories loaded')).toBeInTheDocument();
  });
});
