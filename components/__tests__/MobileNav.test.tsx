import { fireEvent, render, screen } from '@testing-library/react';
import MobileNav from '../MobileNav';

let mockPathname = '/counter-deck';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

it('closes for navigation, including the current page, and after a route change', () => {
  const { container, rerender } = render(<MobileNav><a href="/counter-deck">Counter finder</a></MobileNav>);
  const menu = container.querySelector('details')!;
  menu.open = true;
  fireEvent.click(screen.getByRole('link', { name: 'Counter finder' }));
  expect(menu.open).toBe(false);
  menu.open = true;
  mockPathname = '/info';
  rerender(<MobileNav><a href="/info">How it works</a></MobileNav>);
  expect(menu.open).toBe(false);
});

it('closes outside the menu and restores summary focus on Escape', () => {
  const { container } = render(<MobileNav><a href="/info">How it works</a></MobileNav>);
  const menu = container.querySelector('details')!;
  menu.open = true;
  fireEvent.pointerDown(document.body);
  expect(menu.open).toBe(false);
  menu.open = true;
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(menu.open).toBe(false);
  expect(container.querySelector('summary')).toHaveFocus();
});
