import { fireEvent, render, screen } from '@testing-library/react';
import FriendInsights from './FriendInsights';

jest.mock('./FriendDeckExperience', () => function MockDeck() { return <div>Played deck and counter</div>; });

describe('Friend deck preview', () => {
  const props = { friendId: 'friend-1', friendTag: '#ABC', friendName: 'Alex' };

  it('opens on mouse hover and closes when the pointer leaves', () => {
    const { container } = render(<FriendInsights {...props} />);
    const region = container.firstElementChild!;
    const enter = new Event('pointerover', { bubbles: true });
    Object.defineProperty(enter, 'pointerType', { value: 'mouse' });
    fireEvent(region, enter);
    expect(screen.getByText('Played deck and counter')).toBeTruthy();
    const leave = new Event('pointerout', { bubbles: true });
    Object.defineProperty(leave, 'pointerType', { value: 'mouse' });
    fireEvent(region, leave);
    expect(screen.queryByText('Played deck and counter')).toBeNull();
  });

  it('opens on tap and has a close control for touch users', () => {
    render(<FriendInsights {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /see deck and best counter/i }));
    expect(screen.getByText('Played deck and counter')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /close deck preview/i }));
    expect(screen.queryByText('Played deck and counter')).toBeNull();
  });

  it('keeps the preview open after a click even when the mouse leaves', () => {
    const { container } = render(<FriendInsights {...props} />);
    const button = screen.getByRole('button', { name: /see deck and best counter/i });
    fireEvent.click(button);
    const leave = new Event('pointerout', { bubbles: true });
    Object.defineProperty(leave, 'pointerType', { value: 'mouse' });
    fireEvent(container.firstElementChild!, leave);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('uses click instead of hover on a narrow screen', () => {
    const width = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    try {
      const { container } = render(<FriendInsights {...props} />);
      const enter = new Event('pointerover', { bubbles: true });
      Object.defineProperty(enter, 'pointerType', { value: 'mouse' });
      fireEvent(container.firstElementChild!, enter);
      expect(screen.queryByText('Played deck and counter')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /see deck and best counter/i }));
      expect(screen.getByText('Played deck and counter')).toBeTruthy();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
    }
  });
});
