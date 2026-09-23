/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';

import ForecastTrustStrip from '@/components/features/forecast/forecast-trust-strip';

describe('ForecastTrustStrip', () => {
  it('shows the source, freshness and message for a fresh station-harmonic result', () => {
    render(
      <ForecastTrustStrip
        sourceLabel="Station Harmonic Model (Bangkok)"
        apiStatus="success"
        apiStatusMessage="พยากรณ์จากสถานีกรุงเทพ"
        lastUpdated="2026-03-24T06:00:00.000Z"
      />,
    );

    expect(screen.getByText('Station Harmonic Model (Bangkok)')).toBeInTheDocument();
    expect(screen.getByText('ข้อมูลล่าสุด')).toBeInTheDocument();
    expect(screen.getByText('พยากรณ์จากสถานีกรุงเทพ')).toBeInTheDocument();
  });

  it('flags cached data and a degraded fallback', () => {
    render(
      <ForecastTrustStrip
        apiStatus="success"
        apiStatusMessage="ใช้ข้อมูลแคช"
        isFromCache
        lastUpdated="2026-03-24T06:00:00.000Z"
        degraded
      />,
    );

    expect(screen.getByText('ข้อมูลจากแคช')).toBeInTheDocument();
    expect(
      screen.getByText('ยังไม่มี fit จริงจุดนี้ ใช้โมเดลภูมิภาค'),
    ).toBeInTheDocument();
  });

  it('renders the measured accuracy band when provided', () => {
    const { container } = render(
      <ForecastTrustStrip
        apiStatus="success"
        apiStatusMessage="x"
        lastUpdated="2026-03-24T06:00:00.000Z"
        measuredAccuracy={{ meanAbsoluteTimingErrorMinutes: 12, matchedEventCount: 40 }}
      />,
    );

    expect(container.textContent).toContain('คลาดเฉลี่ย ~12 นาที');
    expect(container.textContent).toContain('จาก 40 เหตุการณ์');
  });
});
