import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import App from './App.tsx';

describe('App shell', () => {
  it('renders the application logo and title', () => {
    render(<App />);
    expect(screen.getByText('ReleaseLens')).toBeInTheDocument();
  });

  it('renders all primary navigation links', () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
    // Use within() to scope to the nav bar only
    expect(within(nav).getByText('Overview')).toBeInTheDocument();
    expect(within(nav).getByText('Change')).toBeInTheDocument();
    expect(within(nav).getByText('Impact')).toBeInTheDocument();
    expect(within(nav).getByText('Verification')).toBeInTheDocument();
    expect(within(nav).getByText('Findings')).toBeInTheDocument();
    expect(within(nav).getByText('Dossier')).toBeInTheDocument();
  });

  it('renders the Overview page by default (redirected from /)', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument();
  });

  it('shows the no-repository empty state on the Overview page', () => {
    render(<App />);
    expect(screen.getByText(/No repository loaded/i)).toBeInTheDocument();
  });
});
