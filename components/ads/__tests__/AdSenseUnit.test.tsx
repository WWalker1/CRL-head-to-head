import { StrictMode, useEffect } from 'react';
import { render, waitFor } from '@testing-library/react';
import AdSenseUnit from '../AdSenseUnit';

jest.mock('next/script', () => ({
  __esModule: true,
  default: function MockScript({ onReady }: { onReady: () => void }) {
    useEffect(() => { onReady(); }, [onReady]);
    return null;
  },
}));

describe('AdSense unit lifecycle', () => {
  beforeEach(() => {
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 320, height: 100, x: 0, y: 0, top: 0, left: 0, right: 320, bottom: 100, toJSON: () => ({}),
    });
  });
  afterEach(() => { jest.restoreAllMocks(); delete window.adsbygoogle; });

  it('requests once in Strict Mode, then once for a newly mounted page', async () => {
    const push = jest.fn();
    window.adsbygoogle = { push };
    const unit = <StrictMode><AdSenseUnit publisherId="ca-pub-1234567890123456" slot="1234567890" /></StrictMode>;
    const first = render(unit);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    first.rerender(unit);
    expect(push).toHaveBeenCalledTimes(1);
    first.unmount();
    render(unit);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(2));
  });

  it('does not request a zero-width ad', () => {
    jest.mocked(HTMLElement.prototype.getBoundingClientRect).mockReturnValue({ width: 0 } as DOMRect);
    const push = jest.fn();
    window.adsbygoogle = { push };
    render(<AdSenseUnit publisherId="ca-pub-1234567890123456" slot="1234567890" />);
    expect(push).not.toHaveBeenCalled();
  });

  it('contains ad provider failures', async () => {
    const push = jest.fn(() => { throw new Error('Blocked'); });
    window.adsbygoogle = { push };
    render(<AdSenseUnit publisherId="ca-pub-1234567890123456" slot="1234567890" />);
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });
});
