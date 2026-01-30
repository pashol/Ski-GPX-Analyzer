interface NominatimResponse {
  address?: {
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
  display_name?: string;
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      {
        headers: {
          'User-Agent': 'SkiGPXAnalyzer/1.0',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data: NominatimResponse = await response.json();
    
    if (!data.address) {
      return null;
    }

    // Extract the most specific location name available
    const location = 
      data.address.village ||
      data.address.town ||
      data.address.city ||
      data.address.municipality ||
      data.address.county ||
      null;

    return location;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('Reverse geocoding timed out');
    } else {
      console.error('Reverse geocoding failed:', error instanceof Error ? error.message : String(error));
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
