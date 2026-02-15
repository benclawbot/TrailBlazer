import { Coordinate, Trail, NavigationStep } from '../types';
import { MET_FLAT, MET_STEEP } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

export const calculateDistance = (coord1: Coordinate, coord2: Coordinate): number => {
  const R = 6371e3; // Earth radius in meters
  const lat1 = (coord1.lat * Math.PI) / 180;
  const lat2 = (coord2.lat * Math.PI) / 180;
  const deltaLat = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const deltaLng = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

export const calculateCalories = (
  weightKg: number,
  durationHours: number,
  elevationGainM: number,
  distanceKm: number
): number => {
  const grade = distanceKm > 0 ? elevationGainM / (distanceKm * 1000) : 0;
  const met = grade > 0.05 ? MET_STEEP : MET_FLAT;
  return Math.round(met * weightKg * durationHours);
};

export const estimateDuration = (distanceKm: number, speedKmh: number): string => {
  const hours = distanceKm / speedKmh;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

// -- Search & Generation --

export const searchAddress = async (query: string): Promise<{ coord: Coordinate, displayName: string } | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return { 
          coord: { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) },
          displayName: data[0].display_name
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }
  return null;
};

// Fetch real routing data from OSRM
export const fetchRoute = async (start: Coordinate, end: Coordinate, mid?: Coordinate): Promise<{ geometry: Coordinate[], instructions: NavigationStep[] } | null> => {
    try {
        // Format: lon,lat;lon,lat
        let coordinatesString = `${start.lng},${start.lat}`;
        if (mid) {
            coordinatesString += `;${mid.lng},${mid.lat}`;
        }
        coordinatesString += `;${end.lng},${end.lat}`;

        const url = `https://router.project-osrm.org/route/v1/walking/${coordinatesString}?overview=full&geometries=geojson&steps=true`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.code === "Ok" && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            
            // Extract geometry (GeoJSON [lon, lat])
            const geometry: Coordinate[] = route.geometry.coordinates.map((c: number[]) => ({
                lat: c[1],
                lng: c[0]
            }));

            // Extract steps
            const instructions: NavigationStep[] = [];
            route.legs.forEach((leg: any) => {
                leg.steps.forEach((step: any) => {
                    instructions.push({
                        distance: step.distance,
                        duration: step.duration,
                        instruction: step.maneuver.type + (step.maneuver.modifier ? ` ${step.maneuver.modifier}` : ''),
                        location: { lat: step.maneuver.location[1], lng: step.maneuver.location[0] }
                    });
                });
            });

            return { geometry, instructions };
        }
    } catch (e) {
        console.error("Routing error:", e);
    }
    return null;
};

export const fetchRealTrails = async (locationName: string, center: Coordinate): Promise<Trail[]> => {
    if (!process.env.API_KEY) {
        console.warn("No API Key, falling back to random generation.");
        return generateRandomTrails(center);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a list of 12 popular real-world hiking trails near "${locationName}".
            Return a JSON array where each object has:
            - name: string
            - description: string (short summary)
            - difficulty: "Easy", "Moderate", or "Hard"
            - distanceKm: number
            - elevationGainM: number
            - startLat: number (latitude of trailhead)
            - startLng: number (longitude of trailhead)
            - isLoop: boolean (true if the trail starts and ends at the same place)
            - midLat: number (optional, a coordinate halfway through the trail, useful for drawing loops)
            - midLng: number (optional)

            Important: Ensure coordinates are accurate for the specific trail.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            difficulty: { type: Type.STRING },
                            distanceKm: { type: Type.NUMBER },
                            elevationGainM: { type: Type.NUMBER },
                            startLat: { type: Type.NUMBER },
                            startLng: { type: Type.NUMBER },
                            isLoop: { type: Type.BOOLEAN },
                            midLat: { type: Type.NUMBER },
                            midLng: { type: Type.NUMBER },
                        }
                    }
                }
            }
        });

        const rawTrails = JSON.parse(response.text || '[]');
        
        return rawTrails.map((t: any, index: number) => {
            // For loops, end is start. For linear, calculate end based on distance if not provided (Gemini usually doesn't provide end for linear accurately in this schema, so we approximate or use start+distance).
            // Actually, if linear, we project. If loop, end = start.
            
            let endLat = t.startLat;
            let endLng = t.startLng;

            if (!t.isLoop) {
                // Project an end coordinate roughly
                const distDeg = t.distanceKm / 111; 
                const bearing = (Math.random() * 360) * (Math.PI / 180);
                endLat = t.startLat + (distDeg * Math.cos(bearing));
                endLng = t.startLng + (distDeg * Math.sin(bearing)) / Math.cos(t.startLat * (Math.PI/180));
            }

            return {
                id: `ai-${Date.now()}-${index}`,
                name: t.name,
                location: locationName.split(',')[0],
                distanceKm: t.distanceKm,
                elevationGainM: t.elevationGainM,
                difficulty: t.difficulty as 'Easy' | 'Moderate' | 'Hard',
                startCoordinate: { lat: t.startLat, lng: t.startLng },
                endCoordinate: { lat: endLat, lng: endLng },
                midCoordinate: (t.midLat && t.midLng) ? { lat: t.midLat, lng: t.midLng } : undefined,
                description: t.description,
                isLoop: !!t.isLoop
            };
        });

    } catch (e) {
        console.error("AI Trail Fetch Failed:", e);
        return generateRandomTrails(center);
    }
};

export const generateRandomTrails = (center: Coordinate, count: number = 4): Trail[] => {
  const trails: Trail[] = [];
  const difficulties: ('Easy' | 'Moderate' | 'Hard')[] = ['Easy', 'Moderate', 'Hard'];
  
  for (let i = 0; i < count; i++) {
    const latOffset = (Math.random() - 0.5) * 0.04;
    const lngOffset = (Math.random() - 0.5) * 0.04;
    const isLoop = Math.random() > 0.5;
    
    const start: Coordinate = {
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset
    };
    
    let end = start;
    let mid: Coordinate | undefined = undefined;

    if (!isLoop) {
        end = {
            lat: start.lat + (Math.random() - 0.5) * 0.03,
            lng: start.lng + (Math.random() - 0.5) * 0.03
        };
    } else {
        mid = {
            lat: start.lat + (Math.random() - 0.5) * 0.015,
            lng: start.lng + (Math.random() - 0.5) * 0.015
        };
    }

    const dist = isLoop ? (calculateDistance(start, mid!) * 2)/1000 : calculateDistance(start, end) / 1000;
    
    trails.push({
      id: `gen-${Date.now()}-${i}`,
      name: isLoop ? `Loop Trail #${i + 1}` : `Trail #${i + 1}`,
      location: 'Unknown Location',
      distanceKm: parseFloat(dist.toFixed(1)),
      elevationGainM: Math.floor(Math.random() * 500) + 50,
      difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
      startCoordinate: start,
      endCoordinate: end,
      midCoordinate: mid,
      isLoop: isLoop,
      description: 'A generated trail.'
    });
  }
  return trails;
};