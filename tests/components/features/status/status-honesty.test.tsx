/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';

import HealthCards from '@/components/features/status/health-cards';
import ApiStatusDashboard from '@/components/features/status/api-status-dashboard';

/**
 * These lock in the honesty rules. Every string below was a hardcoded
 * constant rendered in a telemetry slot, so the user read a fabricated
 * measurement as if it had been probed. If one reappears, the UI is lying
 * again and this suite should fail.
 */

const FABRICATED = [
  'STABLE 99.98%',
  '0.012 m RMS',
  'Zstandard',
  'OPFS',
  'Brotli',
  '42 ms',
  '42ms',
  '76.4',
];

function expectNoFabricatedValues(container: HTMLElement) {
  const text = container.textContent ?? '';
  for (const needle of FABRICATED) {
    expect(text).not.toContain(needle);
  }
}

describe('status telemetry honesty', () => {
  it('shows "not probed" instead of a latency when a provider has no key', () => {
    const { container } = render(
      <HealthCards
        tideStatus="degraded"
        tideMessage="กำลังประมวลผล"
        weatherStatus="degraded"
        weatherMessage="กำลังโหลด"
        lastUpdated="—"
        providers={{
          openweather: { status: 'disabled', message: 'API key not configured' },
        }}
      />,
    );

    // The badge is split into a bullet span and a label span, so match on the
    // container's flattened text rather than a single element.
    expect(container.textContent).toContain('NOT CONFIGURED');
    expect(screen.getAllByText('ไม่ได้ตรวจ').length).toBeGreaterThan(0);
    expectNoFabricatedValues(container);
  });

  it('renders a real latency only when the probe reported one', () => {
    const { container } = render(
      <HealthCards
        tideStatus="online"
        tideMessage="พร้อมใช้งาน"
        weatherStatus="online"
        weatherMessage="พร้อมใช้งาน"
        lastUpdated="12:00 น."
        providers={{
          openweather: { status: 'ok', message: 'API responding', latencyMs: 214 },
        }}
      />,
    );

    expect(screen.getByText('214 ms')).toBeInTheDocument();
    expectNoFabricatedValues(container);
  });

  it('never claims a latency for a provider that was not probed', () => {
    // An errored probe still returns a measured round-trip, so the honest
    // output is the latency plus an error status, never a placeholder number.
    const { container } = render(
      <HealthCards
        tideStatus="offline"
        tideMessage="โหลดไม่สำเร็จ"
        weatherStatus="offline"
        weatherMessage="โหลดไม่สำเร็จ"
        lastUpdated="—"
        providers={{
          stormglass: { status: 'error', message: 'HTTP 503', latencyMs: 5000 },
        }}
      />,
    );

    expect(container.textContent).toContain('OFFLINE');
    expect(screen.getByText('5000 ms')).toBeInTheDocument();
    expectNoFabricatedValues(container);
  });
});

describe('ApiStatusDashboard honesty', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('reports a not-configured provider as unprobed rather than inventing a latency', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({
        timestamp: '2026-03-24T06:00:00.000Z',
        apis: {
          openweather: { status: 'disabled', message: 'API key not configured' },
        },
      }),
    }) as unknown as typeof fetch;

    const { container } = render(
      <ApiStatusDashboard
        tideApiStatus="success"
        weatherApiStatus="success"
        lastUpdated="2026-03-24T06:00:00.000Z"
      />,
    );

    // Wait for the mocked probe to land, then assert the real render: the
    // provider has no key, so it must read as unprobed, not as a latency.
    await waitFor(() => {
      expect(container.textContent).toContain('OpenWeather');
    });

    expect(container.textContent).toContain('NOT CONFIGURED');
    expect(container.textContent).toContain('ไม่ได้ตรวจ');
    expectNoFabricatedValues(container);
  });
});
