import { TileData, ConstituentData } from './tile-storage'
import { getEphemeridesMetadata } from '../harmonic/ephemerides'
import { TIDAL_CONSTITUENTS } from '../harmonic'

export interface TilePackage {
  tile: TileData
  payload: Uint8Array
}

export interface TilePackageManifest {
  version: string
  generatedAt: string
  ephemerides: ReturnType<typeof getEphemeridesMetadata>
  tiles: ManifestTileEntry[]
  signature?: string
}

export interface ManifestTileEntry {
  tileId: string
  checksum: string
  compressedSize: number
  originalSize: number
  bbox: [number, number, number, number]
  centroid: [number, number]
  model: string
  datum: string
  version: string
}

export interface TilePatch {
  tileId: string
  checksum: string
  compressedPayload: Uint8Array
  operations?: PatchOperation[]
}

export type PatchOperation =
  | { type: 'add'; path: string; value: unknown }
  | { type: 'remove'; path: string }
  | { type: 'replace'; path: string; value: unknown }

const TEXT_ENCODER = new TextEncoder()
const TEXT_DECODER = new TextDecoder()

/**
 * Create a packaged tile (payload + metadata).
 */
export async function createTilePackage(
  tileId: string,
  bbox: [number, number, number, number],
  centroid: [number, number],
  constituents: ConstituentData[],
  options: {
    model?: string
    datum?: string
    version?: string
    minorRules?: TileData['minorRules']
    localCalibration?: TileData['localCalibration']
  } = {},
): Promise<TilePackage> {
  const baseTile = {
    tileId,
    bbox,
    centroid,
    model: options.model ?? 'FES2022',
    datum: options.datum ?? 'MSL',
    constituents: normalizeConstituents(constituents),
    minorRules: options.minorRules,
    localCalibration: options.localCalibration,
    version: options.version ?? '1.0.0',
  }

  const canonical = stableStringify(baseTile)
  const originalSize = TEXT_ENCODER.encode(canonical).byteLength

  const payload = await compressString(canonical)
  const checksum = await calculateChecksum(payload)

  const now = Date.now()
  const tile: TileData = {
    ...baseTile,
    checksum,
    compressedSize: payload.byteLength,
    originalSize,
    downloadedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  }

  return { tile, payload }
}

/**
 * Build a manifest from packaged tiles. If an HMAC secret is supplied,
 * the manifest will be signed with SHA-256.
 */
export async function createTileManifest(
  packages: TilePackage[],
  options: { version: string; hmacSecret?: string | ArrayBuffer | Uint8Array } = { version: '1.0.0' },
): Promise<TilePackageManifest> {
  const manifest: TilePackageManifest = {
    version: options.version,
    generatedAt: new Date().toISOString(),
    ephemerides: getEphemeridesMetadata(),
    tiles: packages.map(({ tile }) => ({
      tileId: tile.tileId,
      checksum: tile.checksum,
      compressedSize: tile.compressedSize,
      originalSize: tile.originalSize,
      bbox: tile.bbox,
      centroid: tile.centroid,
      model: tile.model,
      datum: tile.datum,
      version: tile.version,
    })),
  }

  if (options.hmacSecret) {
    manifest.signature = await signManifest(manifest, options.hmacSecret)
  }

  return manifest
}

/**
 * Verify manifest signature given the shared secret.
 */
export async function verifyManifestSignature(
  manifest: TilePackageManifest,
  secret: string | ArrayBuffer | Uint8Array,
): Promise<boolean> {
  if (!manifest.signature) return false
  const expected = await signManifest({ ...manifest, signature: undefined }, secret)
  return expected === manifest.signature
}

/**
 * Create a delta patch between two tile versions.
 * The compressed payload of the new tile is embedded to guarantee recovery.
 */
export async function createDeltaPatch(
  oldPackage: TilePackage,
  newPackage: TilePackage,
): Promise<TilePatch> {
  const operations = diffConstituents(oldPackage.tile.constituents, newPackage.tile.constituents)

  return {
    tileId: newPackage.tile.tileId,
    checksum: newPackage.tile.checksum,
    compressedPayload: newPackage.payload,
    operations,
  }
}

/**
 * Apply a tile patch and return the updated package.
 */
export async function applyDeltaPatch(
  _current: TilePackage,
  patch: TilePatch,
): Promise<TilePackage> {
  const json = await decompressToString(patch.compressedPayload)
  const parsed = JSON.parse(json)

  // Ensure checksum matches expected
  const newPayload = patch.compressedPayload
  const checksum = await calculateChecksum(newPayload)
  if (checksum !== patch.checksum) {
    throw new Error(`Checksum mismatch for tile ${patch.tileId}`)
  }

  const now = Date.now()
  const tile: TileData = {
    ...parsed,
    checksum,
    compressedSize: newPayload.byteLength,
    originalSize: TEXT_ENCODER.encode(json).byteLength,
    downloadedAt: now,
    lastAccessedAt: now,
    accessCount: 0,
  }

  return { tile, payload: newPayload }
}

/**
 * Verify that a payload matches the advertised checksum.
 */
export async function verifyTileIntegrity(tile: TileData, payload: Uint8Array): Promise<boolean> {
  if (!tile.checksum) return false
  const checksum = await calculateChecksum(payload)
  return checksum === tile.checksum
}

/**
 * Decompress payload to tile JSON string.
 *
 * Uses the native DecompressionStream where available (mirrors the pattern in
 * lib/storage/indexed-db.ts) and falls back to pako on older browsers. The format is
 * `deflate` (zlib-wrapped), which is exactly what pako's `deflate`/`inflate`
 * use, so payloads stay byte-compatible across server and client and with any
 * tiles produced before this swap. pako is imported lazily so it stays out of
 * the main client bundle unless the fallback actually runs.
 */
export async function decompressToString(payload: Uint8Array): Promise<string> {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const buffer = payload.buffer.slice(
          payload.byteOffset,
          payload.byteOffset + payload.byteLength,
        ) as ArrayBuffer
        const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate'))
        return await new Response(stream).text()
      } catch {
        // Fall through to pako for streams the native decoder cannot read.
      }
    }

    const { inflate } = await import('pako')
    return TEXT_DECODER.decode(inflate(payload))
  } catch (error) {
    throw new Error(`Failed to decompress tile payload: ${(error as Error).message}`)
  }
}

type BinaryLike = string | Uint8Array | ArrayBuffer | SharedArrayBuffer

function isSharedArrayBuffer(value: unknown): value is SharedArrayBuffer {
  return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer
}

function toUint8Array(input: BinaryLike): Uint8Array {
  if (typeof input === 'string') {
    return TEXT_ENCODER.encode(input)
  }

  if (input instanceof Uint8Array) {
    return new Uint8Array(input)
  }

  if (input instanceof ArrayBuffer) {
    return new Uint8Array(input)
  }

  if (isSharedArrayBuffer(input)) {
    const view = new Uint8Array(input)
    const copy = new Uint8Array(view.length)
    copy.set(view)
    return copy
  }

  throw new TypeError('Unsupported binary input')
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const { buffer, byteOffset, byteLength } = view

  if (buffer instanceof ArrayBuffer) {
    if (byteOffset === 0 && byteLength === buffer.byteLength) {
      return buffer
    }
    return buffer.slice(byteOffset, byteOffset + byteLength)
  }

  if (isSharedArrayBuffer(buffer)) {
    const copy = new Uint8Array(byteLength)
    copy.set(view)
    return copy.buffer
  }

  throw new TypeError('Unsupported buffer source')
}

/**
 * Calculate SHA-256 checksum.
 */
export async function calculateChecksum(data: BinaryLike): Promise<string> {
  const bytes = toUint8Array(data)
  const buffer = toArrayBuffer(bytes)

  const hash = await crypto.subtle.digest('SHA-256', buffer)
  const view = new Uint8Array(hash)
  return Array.from(view)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Compress a string using the native CompressionStream where available
 * (mirrors the pattern in lib/storage/indexed-db.ts) and falls back to pako on older
 * browsers. Uses the zlib-wrapped `deflate` format, matching pako's `deflate`
 * output so payloads remain readable by every existing consumer. pako is
 * imported lazily so it stays out of the main client bundle unless the
 * fallback actually runs.
 */
async function compressString(data: string): Promise<Uint8Array> {
  const encoded = TEXT_ENCODER.encode(data)

  if (typeof CompressionStream !== 'undefined') {
    try {
      const stream = new Blob([encoded]).stream().pipeThrough(new CompressionStream('deflate'))
      return new Uint8Array(await new Response(stream).arrayBuffer())
    } catch {
      // Fall through to the pako fallback below.
    }
  }

  const { deflate } = await import('pako')
  return deflate(encoded, { level: 9 })
}

function normalizeConstituents(constituents: ConstituentData[]): ConstituentData[] {
  return constituents
    .map((c) => ({
      name: c.name,
      amplitude: roundTo(c.amplitude, 4),
      phase: roundTo(c.phase, 2),
      speedDegHr: typeof c.speedDegHr === 'number' ? roundTo(c.speedDegHr, 6) : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value))
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue)
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      result[key] = sortValue((value as Record<string, unknown>)[key])
    }
    return result
  }
  return value
}

async function signManifest(
  manifest: Omit<TilePackageManifest, 'signature'> & { signature?: string },
  secret: BinaryLike,
): Promise<string> {
  const keyData = toUint8Array(secret)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const canonical = stableStringify({ ...manifest, signature: undefined })
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, TEXT_ENCODER.encode(canonical))
  const signatureArray = new Uint8Array(signatureBuffer)

  const nodeGlobal = globalThis as { Buffer?: { from(input: Uint8Array | string, encoding?: 'base64' | 'utf8'): { toString(encoding: 'base64' | 'utf8'): string } } }
  const bufferFactory = nodeGlobal.Buffer
  if (bufferFactory?.from) {
    return bufferFactory.from(signatureArray).toString('base64')
  }

  let binary = ''
  signatureArray.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function diffConstituents(
  oldList: ConstituentData[],
  newList: ConstituentData[],
): PatchOperation[] {
  const ops: PatchOperation[] = []
  const oldMap = new Map(oldList.map((c) => [c.name, c]))
  const newMap = new Map(newList.map((c) => [c.name, c]))

  for (const name of oldMap.keys()) {
    if (!newMap.has(name)) {
      ops.push({ type: 'remove', path: `constituents.${name}` })
    }
  }

  for (const [name, newConst] of newMap) {
    const priorConst = oldMap.get(name)
    if (!priorConst) {
      ops.push({ type: 'add', path: `constituents.${name}`, value: newConst })
      continue
    }

    const amplitudeDiff = Math.abs(priorConst.amplitude - newConst.amplitude) > 1e-6
    const phaseDiff = Math.abs(priorConst.phase - newConst.phase) > 1e-6
    const speedDiff =
      Math.abs((priorConst.speedDegHr ?? 0) - (newConst.speedDegHr ?? 0)) > 1e-6

    if (amplitudeDiff || phaseDiff || speedDiff) {
      ops.push({ type: 'replace', path: `constituents.${name}`, value: newConst })
    }
  }

  return ops
}

/**
 * Convenience helpers for demo/sample data used in the UI.
 */
export interface SampleTileInfo {
  tileId: string
  bbox: [number, number, number, number]
  centroid: [number, number]
  location: string
}

const SPEED = (name: string) => TIDAL_CONSTITUENTS[name]?.speed ?? 0

const GULF_BASE: ConstituentData[] = [
  { name: 'M2', amplitude: 0.42, phase: 188, speedDegHr: SPEED('M2') },
  { name: 'S2', amplitude: 0.18, phase: 176, speedDegHr: SPEED('S2') },
  { name: 'N2', amplitude: 0.07, phase: 170, speedDegHr: SPEED('N2') },
  { name: 'K1', amplitude: 0.48, phase: 118, speedDegHr: SPEED('K1') },
  { name: 'O1', amplitude: 0.36, phase: 110, speedDegHr: SPEED('O1') },
  { name: 'P1', amplitude: 0.17, phase: 115, speedDegHr: SPEED('P1') },
  { name: 'Q1', amplitude: 0.08, phase: 104, speedDegHr: SPEED('Q1') },
  { name: 'M4', amplitude: 0.09, phase: 92, speedDegHr: SPEED('M4') },
  { name: 'MS4', amplitude: 0.05, phase: 96, speedDegHr: SPEED('MS4') },
]

const ANDAMAN_BASE: ConstituentData[] = [
  { name: 'M2', amplitude: 0.9, phase: 205, speedDegHr: SPEED('M2') },
  { name: 'S2', amplitude: 0.44, phase: 198, speedDegHr: SPEED('S2') },
  { name: 'N2', amplitude: 0.2, phase: 192, speedDegHr: SPEED('N2') },
  { name: 'K2', amplitude: 0.13, phase: 200, speedDegHr: SPEED('K2') },
  { name: 'K1', amplitude: 0.42, phase: 126, speedDegHr: SPEED('K1') },
  { name: 'O1', amplitude: 0.30, phase: 115, speedDegHr: SPEED('O1') },
  { name: 'P1', amplitude: 0.14, phase: 120, speedDegHr: SPEED('P1') },
  { name: 'Q1', amplitude: 0.06, phase: 108, speedDegHr: SPEED('Q1') },
  { name: 'M4', amplitude: 0.07, phase: 102, speedDegHr: SPEED('M4') },
  { name: 'MS4', amplitude: 0.04, phase: 104, speedDegHr: SPEED('MS4') },
]

export function getGulfOfThailandConstituents(): ConstituentData[] {
  return GULF_BASE.map((c) => ({ ...c }))
}

export function getAndamanSeaConstituents(): ConstituentData[] {
  return ANDAMAN_BASE.map((c) => ({ ...c }))
}

const SAMPLE_TILES: SampleTileInfo[] = [
  {
    tileId: 'TH-BKK',
    bbox: [100.3, 13.4, 100.9, 13.9],
    centroid: [100.6, 13.6],
    location: 'กรุงเทพฯ (อ่าวไทยตอนบน)',
  },
  {
    tileId: 'TH-SAMUI',
    bbox: [99.9, 9.3, 100.2, 9.7],
    centroid: [100.05, 9.5],
    location: 'เกาะสมุย (อ่าวไทยตอนล่าง)',
  },
  {
    tileId: 'TH-PHUKET',
    bbox: [98.1, 7.7, 98.6, 8.2],
    centroid: [98.3, 8.0],
    location: 'ภูเก็ต (ทะเลอันดามัน)',
  },
  {
    tileId: 'TH-TRAT',
    bbox: [102.2, 11.5, 102.6, 12.0],
    centroid: [102.4, 11.75],
    location: 'ตราด (ชายฝั่งตะวันออก)',
  },
]

export function generateSampleTiles(): SampleTileInfo[] {
  return SAMPLE_TILES.map((tile) => ({ ...tile }))
}
