import { NextResponse } from 'next/server'

/**
 * API Health Check - Test real API connectivity
 * GET /api/health
 */

export async function GET() {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    apis: {
      openweather: await checkOpenWeatherAPI(),
      stormglass: await checkStormglassAPI(),
    },
    region: 'Thailand',
    version: '1.0.0'
  }

  const allHealthy = Object.values(health.apis).every(api => api.status === 'ok')
  
  return NextResponse.json(health, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache',
    }
  })
}

/**
 * Check OpenWeather API connectivity
 */
async function checkOpenWeatherAPI() {
  const apiKey = process.env.OPENWEATHER_API_KEY
  
  if (!apiKey) {
    return {
      status: 'disabled',
      message: 'API key not configured'
    }
  }

  try {
    // Test with Bangkok coordinates
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=13.7563&lon=100.5018&appid=${apiKey}&units=metric`
    const startedAt = performance.now()
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000)
    })
    const latencyMs = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        status: 'error',
        message: `HTTP ${response.status}`,
        code: response.status,
        latencyMs
      }
    }

    const data = await response.json()

    return {
      status: 'ok',
      message: 'API responding',
      testLocation: data.name,
      temperature: data.main.temp,
      latencyMs
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check Stormglass API connectivity
 */
async function checkStormglassAPI() {
  const apiKey = process.env.STORMGLASS_API_KEY
  
  if (!apiKey) {
    return {
      status: 'disabled',
      message: 'API key not configured'
    }
  }

  try {
    // Test with Ko Sichang coordinates
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date()
    end.setHours(23, 59, 59, 999)

    const url = `https://api.stormglass.io/v2/tide/extremes/point?lat=13.1627&lng=100.8076&start=${start.toISOString()}&end=${end.toISOString()}`
    
    const startedAt = performance.now()
    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey
      },
      signal: AbortSignal.timeout(5000)
    })
    const latencyMs = Math.round(performance.now() - startedAt)

    if (!response.ok) {
      return {
        status: 'error',
        message: `HTTP ${response.status}`,
        code: response.status,
        latencyMs
      }
    }

    const data = await response.json()
    
    return {
      status: 'ok',
      message: 'API responding',
      testLocation: 'Ko Sichang',
      dataPoints: data.data ? data.data.length : 0,
      latencyMs
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
