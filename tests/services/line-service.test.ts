import { formatForecastMessage, handleWeatherError } from '../../lib/services/line/message-builder'

describe('LINE Service', () => {
  describe('formatForecastMessage', () => {
    const mockLocation = {
      lat: 13.361,
      lon: 100.984,
      name: 'ชลบุรี',
      district: 'เมืองชลบุรี',
      province: 'ชลบุรี'
    }
    
    it('should handle null or undefined weather data gracefully', () => {
      const forecast = {
        location: { lat: 13.361, lon: 100.984 },
        weatherData: undefined,
        tideData: {
          heights: [1.5, 1.2, 0.8],
          times: ['2025-10-29T00:00:00Z', '2025-10-29T06:00:00Z', '2025-10-29T12:00:00Z']
        }
      }
      
      const result = formatForecastMessage(forecast, mockLocation)
      expect(result).toBeTruthy() // Message should be generated
      expect(result.text).toEqual(expect.stringContaining('🌊')) // Message starts with wave emoji
      expect(result.text).not.toEqual(expect.stringContaining('undefined')) // No undefined in message
      expect(result.text).not.toEqual(expect.stringContaining('null')) // No null in message
    })

    it('should handle missing weather data with fallback values', () => {
      const forecast = {
        location: { lat: 13.361, lon: 100.984 },
        weatherData: null,
        tideData: {
          heights: [1.5, 1.2, 0.8],
          times: ['2025-10-29T00:00:00Z', '2025-10-29T06:00:00Z', '2025-10-29T12:00:00Z']
        }
      }
      
      const result = formatForecastMessage(forecast, mockLocation)
      expect(result).toBeTruthy()
      expect(result.text).toEqual(expect.stringContaining('🌡️')) // Has temperature emoji
      expect(result.text).toEqual(expect.stringContaining('°C')) // Has temperature unit
    })

    it('should generate complete message with valid data', () => {
      const forecast = {
        location: { lat: 13.361, lon: 100.984 },
        weatherData: {
          main: {
            temp: 32,
            feels_like: 35,
            humidity: 75
          },
          weather: [{ main: 'มีเมฆบางส่วน' }],
          wind: { speed: 12 }
        },
        tideData: {
          heights: [1.5, 1.2, 0.8],
          times: ['2025-10-29T00:00:00Z', '2025-10-29T06:00:00Z', '2025-10-29T12:00:00Z']
        }
      }
      
      const result = formatForecastMessage(forecast, mockLocation)
      expect(result.text).toEqual(expect.stringContaining('32°C')) // Exact temperature
      expect(result.text).toEqual(expect.stringContaining('75%')) // Humidity
      expect(result.text).toEqual(expect.stringContaining('มีเมฆบางส่วน')) // Weather description
      expect(result.text).toEqual(expect.stringMatching(/12/)) // Wind speed
    })
  })

  describe('handleWeatherError', () => {
    it('should return valid fallback weather object', () => {
      const error = new Error('Test error')
      const fallback = handleWeatherError(error) as {
        main: { temp: null, feels_like: null, humidity: null },
        weather: Array<{ main: string }>,
        wind: { speed: null }
      }
      
      expect(fallback).toBeTruthy()
      expect(fallback.main.temp).toBeNull()
      expect(fallback.main.humidity).toBeNull()
      expect(typeof fallback.weather[0]?.main).toBe('string')
      expect(fallback.wind.speed).toBeNull()
      expect(fallback.weather[0].main).toBe('ไม่สามารถดึงข้อมูลได้')
    })
  })
})
