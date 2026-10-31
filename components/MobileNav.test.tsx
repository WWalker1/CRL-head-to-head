import { fireEvent, render, screen } from '@testing-library/react';
import MobileNav from './MobileNav';

let pathname = '/guides';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));

function menu() {
  return screen.getByLabelText('Navigation menu').closest('details')!;
}

beforeEach(() => { pathname = '/guides'; });

it('closes on a link selection, including the current route', () => {
  render(<MobileNav><a href="/guides"><span>Guides</span></a></MobileNav>);
  menu().open = true;
  fireEvent.click(screen.getByText('Guides'));
  expect(menu().open).toBe(false);
});

it('closes on a route change', () => {
  const { rerender } = render(<MobileNav><a href="/info">Info</a></MobileNav>);
  menu().open = true;
  pathname = '/info';
  rerender(<MobileNav><a href="/info">Info</a></MobileNav>);
  expect(menu().open).toBe(false);
});

it('dismisses outside and returns focus to the summary on Escape', () => {
  render(<MobileNav><a href="/guides">Guides</a></MobileNav>);
  menu().open = true;
  fireEvent.pointerDown(document.body);
  expect(menu().open).toBe(false);
  menu().open = true;
  screen.getByText('Guides').focus();
  fireEvent.keyDown(screen.getByText('Guides'), { key: 'Escape' });
  expect(menu().open).toBe(false);
  expect(document.activeElement).toBe(screen.getByLabelText('Navigation menu'));
});
