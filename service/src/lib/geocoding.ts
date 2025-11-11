import nominatimModule from 'nominatim-client';

// Lazy initialization of Nominatim client
let nominatimClient: any;
const getNominatimClient = () => {
  if (!nominatimClient) {
    // The default export is an object with a createClient method
    nominatimClient = nominatimModule.createClient({
      useragent: 'IRL Community Directory',
      referer: process.env.SERVICE_PUBLIC_URL || 'http://localhost:3001'
    });
  }
  return nominatimClient;
};

// Rate limiting: Nominatim usage policy requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

const rateLimitedDelay = async (): Promise<void> => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delayNeeded = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delayNeeded));
  }
  
  lastRequestTime = Date.now();
};

export interface GeocodedLocation {
  latitude: number;
  longitude: number;
}

/**
 * Geocode an address string to latitude/longitude coordinates using Nominatim
 * @param address The address string to geocode
 * @returns Object with latitude and longitude
 * @throws Error if geocoding fails or address cannot be found
 */
export const geocodeAddress = async (address: string): Promise<GeocodedLocation> => {
  if (!address || address.trim().length === 0) {
    throw new Error('Address cannot be empty');
  }

  try {
    // Apply rate limiting
    await rateLimitedDelay();

    const request = {
      q: address.trim(),
      addressdetails: false,
      limit: 1
    };

    const client = getNominatimClient();
    const results = await client.search(request);

    if (!results || results.length === 0) {
      throw new Error('Could not geocode address - please verify the address is valid and complete');
    }

    const location = results[0];
    
    const latitude = parseFloat(location.lat);
    const longitude = parseFloat(location.lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new Error('Invalid coordinates returned from geocoding service');
    }

    return { latitude, longitude };
  } catch (error) {
    // Handle network errors or API unavailability
    if (error instanceof Error) {
      // If it's already our custom error, rethrow it
      if (error.message.includes('Could not geocode address')) {
        throw error;
      }
      
      // Network or API errors
      if (error.message.includes('ENOTFOUND') || 
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNREFUSED')) {
        throw new Error('Geocoding service temporarily unavailable - please try again later');
      }
      
      // Other errors
      throw new Error(`Geocoding failed: ${error.message}`);
    }
    
    throw new Error('Geocoding service temporarily unavailable - please try again later');
  }
};

