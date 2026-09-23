# WASM Compute Engine Setup _(archived)_

> **Status:** The live system now uses the JavaScript harmonic engine.  
> Keep this document for historical reference only; WASM build steps are optional.

## Overview
High-performance tide prediction using **Rust compiled to WebAssembly** for ≤150ms computation time.

## Why WASM?

### Performance Targets
- **JavaScript baseline**: ~500-800ms for 72hr prediction (37 constituents × 72 hourly points)
- **WASM target**: ≤150ms (5-6× speedup)
- **Mobile target**: ≤200ms on mid-range devices

### Benefits
1. **Near-native speed**: Rust compiled to WASM runs at ~80% native C++ performance
2. **No garbage collection**: Predictable performance without GC pauses
3. **SIMD support**: Can use WebAssembly SIMD for vector operations
4. **Shared memory**: Zero-copy data passing between JS and WASM
5. **Graceful fallback**: Falls back to JavaScript if WASM not supported

## Prerequisites

### Install Rust
```powershell
# Windows (PowerShell)
# Download and run rustup-init.exe from https://rustup.rs/
# Or use winget
winget install Rustlang.Rustup

# Verify installation
cargo --version
rustc --version
```

### Install wasm-pack
```powershell
cargo install wasm-pack
```

### Add WASM target
```powershell
rustup target add wasm32-unknown-unknown
```

## Build Instructions

### Quick Build
```powershell
cd tide-wasm
.\build.ps1
```

### Manual Build
```powershell
cd tide-wasm
wasm-pack build --target web --out-dir ../public/wasm --release
```

### Build Options

**Development (faster build, larger size)**
```powershell
wasm-pack build --target web --out-dir ../public/wasm --dev
```

**Production (optimized, smaller size)**
```powershell
wasm-pack build --target web --out-dir ../public/wasm --release
```

**With optimization for size**
```toml
# Add to Cargo.toml
[profile.release]
opt-level = "z"  # Optimize for size
lto = true       # Link-time optimization
codegen-units = 1
strip = true     # Strip symbols
```

## Usage

### Initialize WASM Module
```typescript
import { initWASM, isWASMAvailable } from '@/lib/tide-wasm-wrapper'

// On app startup
await initWASM()

if (isWASMAvailable()) {
  console.log('โœ… WASM tide engine ready')
} else {
  console.log('โš ๏ธ  Using JavaScript fallback')
}
```

### Predict Tides (Batch)
```typescript
import { predictTideBatchWASM } from '@/lib/tide-wasm-wrapper'
import { getLocationConstituents } from '@/lib/harmonic-prediction'

const location = { lat: 13.7563, lon: 100.5018, name: 'Bangkok' }
const constituents = getLocationConstituents(location)

// Generate 72 hours of timestamps
const now = new Date()
const timestamps = Array.from({ length: 72 }, (_, i) => {
  const date = new Date(now)
  date.setHours(date.getHours() + i)
  return date
})

// Predict (WASM)
const waterLevels = predictTideBatchWASM(
  constituents,
  timestamps,
  location.lon,
  1.2 // MSL offset
)

console.log(`Predicted ${waterLevels.length} tide levels`)
```

### Auto-Select (WASM or JS fallback)
```typescript
import { predictTideAuto } from '@/lib/tide-wasm-wrapper'

const waterLevels = predictTideAuto(
  constituents,
  timestamps,
  location.lon,
  1.2,
  fallbackJSFunction // JavaScript fallback
)
```

### Benchmark Performance
```typescript
import { benchmark72hrWASM, comparePerformance } from '@/lib/tide-wasm-wrapper'

// WASM only
const wasmTime = benchmark72hrWASM(constituents, location.lon)
console.log(`WASM: ${wasmTime.toFixed(2)}ms`)

// Compare WASM vs JavaScript
const comparison = await comparePerformance(
  constituents,
  location.lon,
  jsPredict
)

console.log(`JavaScript: ${comparison.javascript.time.toFixed(2)}ms`)
console.log(`WASM: ${comparison.wasm.time.toFixed(2)}ms`)
console.log(`Speedup: ${comparison.speedup.toFixed(1)}ร—`)
```

## Architecture

### Data Flow
```
TypeScript                       Rust/WASM
โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€
TidalConstituent[]  โ†'  Float64Array (flatten)
                        โ†"
Date[] timestamps   โ†'  Float64Array (ms)
                        โ†"
                        Calculate:
                        - Astronomical args
                        - Nodal corrections
                        - Harmonic synthesis
                        โ†"
number[] results    โ†  Float64Array
```

### Memory Layout
```
Constituent (10 ร— f64):
โ"Œโ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"
โ"‚ amplitude โ"‚ phase โ"‚ speed โ"‚ freq โ"‚ tau โ"‚ s โ"‚ h โ"‚ p โ"‚ np โ"‚ ps โ"‚
โ""โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"€โ"˜

For 37 constituents:
Total size: 37 ร— 10 ร— 8 bytes = 2,960 bytes (2.9 KB)
```

## Optimization Techniques

### 1. Batch Processing
Process multiple timestamps in one WASM call to amortize FFI overhead:
```rust
// Good: Single call for 72 predictions
predict_tide_batch(constituents, timestamps_72)

// Bad: 72 separate calls
for timestamp in timestamps_72 {
    predict_tide_single(constituents, timestamp) // โœ— Slow
}
```

### 2. Memory Pre-allocation
```rust
let mut results = Vec::with_capacity(timestamps.len()); // Pre-allocate
```

### 3. Inlining
```rust
#[inline(always)]
fn calc_nodal_correction(...)
```

### 4. SIMD (Future Enhancement)
```rust
#[cfg(target_feature = "simd128")]
use std::arch::wasm32::*;
```

### 5. Lookup Tables (Future)
Pre-compute nodal factors for common N values:
```rust
static NODAL_LOOKUP: [f64; 360] = [...]; // 1ยฐ resolution
```

## Performance Testing

### Target Metrics
- **72hr prediction**: ≤150ms (desktop), ≤200ms (mobile)
- **Single point**: ≤2ms
- **WASM size**: ≤100KB (gzipped)

### Benchmark Script
```typescript
// benchmark-wasm.ts
import { benchmark72hrWASM } from '@/lib/tide-wasm-wrapper'
import { getLocationConstituents } from '@/lib/harmonic-prediction'

const location = { lat: 13.7563, lon: 100.5018, name: 'Bangkok' }
const constituents = getLocationConstituents(location)

// Run 100 iterations
const times = []
for (let i = 0; i < 100; i++) {
  times.push(benchmark72hrWASM(constituents, location.lon))
}

const avg = times.reduce((a, b) => a + b) / times.length
const min = Math.min(...times)
const max = Math.max(...times)
const p50 = times.sort()[50]
const p95 = times.sort()[95]

console.log(`Average: ${avg.toFixed(2)}ms`)
console.log(`Min: ${min.toFixed(2)}ms`)
console.log(`Max: ${max.toFixed(2)}ms`)
console.log(`P50: ${p50.toFixed(2)}ms`)
console.log(`P95: ${p95.toFixed(2)}ms`)

if (avg <= 150) {
  console.log('โœ… Performance target met!')
} else {
  console.log(`โŒ Target missed by ${(avg - 150).toFixed(2)}ms`)
}
```

## Troubleshooting

### Build Errors

**"wasm-pack not found"**
```powershell
cargo install wasm-pack
```

**"target 'wasm32-unknown-unknown' not installed"**
```powershell
rustup target add wasm32-unknown-unknown
```

**"error: linker `rust-lld` not found"**
```powershell
rustup update
```

### Runtime Errors

**"Cannot find module '@/public/wasm/tide_wasm'"**
- WASM not built yet. Run `.\tide-wasm\build.ps1`

**"WebAssembly module is not supported"**
- Old browser. Check browser support:
  - Chrome 57+
  - Firefox 52+
  - Safari 11+
  - Edge 16+

## Browser Support

### WASM 1.0 (Supported)
- Chrome 57+ (2017)
- Firefox 52+ (2017)
- Safari 11+ (2017)
- Edge 16+ (2017)

### Feature Detection
```typescript
export function isWASMSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object'
        && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      )
      return module instanceof WebAssembly.Module
    }
  } catch (e) {
    return false
  }
  return false
}
```

## File Structure

```
tide-wasm/
โ"œโ"€โ"€ Cargo.toml          # Rust project config
โ"œโ"€โ"€ build.ps1           # Build script
โ""โ"€โ"€ src/
    โ""โ"€โ"€ lib.rs          # Rust source code

public/wasm/            # Generated WASM output
โ"œโ"€โ"€ tide_wasm_bg.wasm  # Compiled WASM binary
โ"œโ"€โ"€ tide_wasm.js       # JS bindings
โ""โ"€โ"€ tide_wasm.d.ts     # TypeScript types

lib/
โ""โ"€โ"€ tide-wasm-wrapper.ts  # TypeScript wrapper
```

## Next Steps

1. **Install Rust**: https://rustup.rs/
2. **Build WASM**: `.\tide-wasm\build.ps1`
3. **Test performance**: Create benchmark script
4. **Validate accuracy**: Compare WASM vs JS predictions
5. **Optimize**: Profile and optimize hot paths
6. **Document**: Add performance metrics to docs

## References

- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [wasm-pack Documentation](https://rustwasm.github.io/wasm-pack/)
- [WebAssembly MDN](https://developer.mozilla.org/en-US/docs/WebAssembly)
- [wasm-bindgen Guide](https://rustwasm.github.io/wasm-bindgen/)
