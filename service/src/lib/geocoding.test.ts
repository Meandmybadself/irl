import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodeAddress } from './geocoding.js';

// Mock the nominatim-client module
vi.mock('nominatim-client', () => {
  return {
    default: vi.fn(() => ({
      search: vi.fn()
    }))
  };
});

describe.skip('Geocoding Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should geocode a valid address successfully', async () => {
    // Mock the nominatim client
    const mockSearch = vi.fn().mockResolvedValue([
      {
        lat: '40.7128',
        lon: '-74.0060',
        display_name: 'New York, NY, USA'
      }
    ]);

    // Replace the actual client with our mock
    const createClient = await import('nominatim-client');
    (createClient.default as any).mockReturnValue({ search: mockSearch });

    const result = await geocodeAddress('New York, NY');

    expect(result).toEqual({
      latitude: 40.7128,
      longitude: -74.0060
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'New York, NY',
        limit: 1
      })
    );
  });

  it('should throw error for empty address', async () => {
    await expect(geocodeAddress('')).rejects.toThrow('Address cannot be empty');
    await expect(geocodeAddress('   ')).rejects.toThrow('Address cannot be empty');
  });

  it('should throw error when address cannot be geocoded', async () => {
    const mockSearch = vi.fn().mockResolvedValue([]);

    const createClient = await import('nominatim-client');
    (createClient.default as any).mockReturnValue({ search: mockSearch });

    await expect(geocodeAddress('Invalid Address 12345')).rejects.toThrow(
      'Could not geocode address - please verify the address is valid and complete'
    );
  });

  it('should throw error on network failure', async () => {
    const mockSearch = vi.fn().mockRejectedValue(new Error('ENOTFOUND'));

    const createClient = await import('nominatim-client');
    (createClient.default as any).mockReturnValue({ search: mockSearch });

    await expect(geocodeAddress('123 Main St')).rejects.toThrow(
      'Geocoding service temporarily unavailable - please try again later'
    );
  });

  it('should handle invalid coordinates returned from service', async () => {
    const mockSearch = vi.fn().mockResolvedValue([
      {
        lat: 'invalid',
        lon: 'invalid'
      }
    ]);

    const createClient = await import('nominatim-client');
    (createClient.default as any).mockReturnValue({ search: mockSearch });

    await expect(geocodeAddress('123 Main St')).rejects.toThrow(
      'Invalid coordinates returned from geocoding service'
    );
  });

  it('should trim whitespace from address', async () => {
    const mockSearch = vi.fn().mockResolvedValue([
      {
        lat: '40.7128',
        lon: '-74.0060'
      }
    ]);

    const createClient = await import('nominatim-client');
    (createClient.default as any).mockReturnValue({ search: mockSearch });

    await geocodeAddress('  New York, NY  ');

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'New York, NY'
      })
    );
  });
});

