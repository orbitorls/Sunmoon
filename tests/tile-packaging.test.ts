import {
  applyDeltaPatch,
  calculateChecksum,
  createDeltaPatch,
  createTileManifest,
  createTilePackage,
  decompressToString,
  verifyManifestSignature,
  verifyTileIntegrity,
} from '../lib/tile-packaging'
import type { ConstituentData } from '../lib/tile-storage'

const BBOX: [number, number, number, number] = [13.1, 100.8, 13.2, 100.9]
const CENTROID: [number, number] = [13.15, 100.82]

const CONSTITUENTS: ConstituentData[] = [
  { name: 'M2', amplitude: 0.9519, phase: 120 },
  { name: 'S2', amplitude: 0.28, phase: 200.004 },
  { name: 'K1', amplitude: 0.35, phase: 45 },
]

function packageTile(tileId = 'tile-1', constituents: ConstituentData[] = CONSTITUENTS) {
  return createTilePackage(tileId, BBOX, CENTROID, constituents)
}

describe('tile packaging', () => {
  it('round-trips a compressed tile payload back to its canonical JSON', async () => {
    const { tile, payload } = await packageTile()

    const json = await decompressToString(payload)
    const parsed = JSON.parse(json) as { tileId: string; constituents: ConstituentData[] }

    expect(parsed.tileId).toBe('tile-1')
    expect(parsed.constituents.map((entry) => entry.name)).toEqual(['K1', 'M2', 'S2'])
    expect(tile.compressedSize).toBe(payload.byteLength)
    expect(tile.originalSize).toBeGreaterThan(tile.compressedSize)
  })

  it('detects a payload that does not match the advertised checksum', async () => {
    const { tile, payload } = await packageTile()

    await expect(verifyTileIntegrity(tile, payload)).resolves.toBe(true)
    await expect(verifyTileIntegrity(tile, payload.slice(1))).resolves.toBe(false)
  })

  it('signs a manifest so tampering is detectable', async () => {
    const secret = 'sunmoon-manifest-secret'
    const manifest = await createTileManifest([await packageTile()], {
      version: '1.0.0',
      hmacSecret: secret,
    })

    expect(manifest.signature).toEqual(expect.any(String))
    expect(manifest.signature).not.toHaveLength(0)
    await expect(verifyManifestSignature(manifest, secret)).resolves.toBe(true)
    await expect(verifyManifestSignature(manifest, 'wrong-secret')).resolves.toBe(false)
    await expect(verifyManifestSignature({ ...manifest, version: '9.9.9' }, secret)).resolves.toBe(false)
  })

  it('applies a delta patch and rejects one whose checksum was altered', async () => {
    const oldPackage = await packageTile('tile-1', [{ name: 'M2', amplitude: 0.9, phase: 100 }])
    const newPackage = await packageTile('tile-1', [
      { name: 'M2', amplitude: 0.95, phase: 110 },
      { name: 'S2', amplitude: 0.3, phase: 190 },
    ])

    const patch = await createDeltaPatch(oldPackage, newPackage)
    const applied = await applyDeltaPatch(oldPackage, patch)

    expect(applied.tile.tileId).toBe('tile-1')
    expect(applied.tile.checksum).toBe(newPackage.tile.checksum)

    await expect(applyDeltaPatch(oldPackage, { ...patch, checksum: 'deadbeef' })).rejects.toThrow(
      /Checksum mismatch/,
    )
  })

  it('hashes a string and its UTF-8 bytes to the same checksum', async () => {
    const bytes = new TextEncoder().encode('sunmoon')

    await expect(calculateChecksum('sunmoon')).resolves.toBe(await calculateChecksum(bytes))
  })
})
