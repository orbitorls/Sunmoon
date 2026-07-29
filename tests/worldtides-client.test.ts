import { WorldTidesClient } from '../lib/worldtides-client'

describe('WorldTidesClient datum handling', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('requests datum=MSL by default on coordinate-based calls', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ extremes: [] }),
      statusText: 'OK',
    } as Response)

    const client = new WorldTidesClient('secret-key')
    await client.getExtremesForCoordinates(
      13.1599,
      100.8096,
      new Date('2025-03-24T00:00:00+07:00'),
      new Date('2025-03-24T23:59:59+07:00'),
    )

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('datum=MSL'))
  })

  it('requests datum=MSL by default on station-based calls', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ heights: [] }),
      statusText: 'OK',
    } as Response)

    const client = new WorldTidesClient('secret-key')
    await client.getPredictions('station-1', new Date('2025-03-24T00:00:00+07:00'), new Date('2025-03-24T23:59:59+07:00'))

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('datum=MSL'))
  })

  it('honors an explicit datum override (e.g. chart datum)', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ heights: [] }),
      statusText: 'OK',
    } as Response)

    const client = new WorldTidesClient('secret-key', 'CD')
    await client.getHeightsForCoordinates(
      13.1599,
      100.8096,
      new Date('2025-03-24T00:00:00+07:00'),
      new Date('2025-03-24T23:59:59+07:00'),
    )

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('datum=CD'))
  })
})
