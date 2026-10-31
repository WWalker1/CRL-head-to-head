import { fireEvent, render, screen } from '@testing-library/react';
import SkillScoreExample from './SkillScoreExample';

it('shows how identical results change with deck expectations', () => {
  render(<SkillScoreExample />);
  expect(screen.getByRole('status').textContent).toContain('60 / 100');
  fireEvent.change(screen.getByRole('slider', { name: 'Estimated win chance per example game' }), { target: { value: '70' } });
  expect(screen.getByRole('status').textContent).toContain('40 / 100');
  expect(screen.getByRole('status').textContent).toContain('6 actual wins − 7.0 expected wins');
  fireEvent.change(screen.getByRole('slider', { name: 'Wins in ten example games' }), { target: { value: '0' } });
  expect(screen.getByRole('status').textContent).toContain('0 / 100');
  expect(screen.getByRole('status').textContent).toContain('= -20.0. The displayed score is limited to 0–100.');
});
