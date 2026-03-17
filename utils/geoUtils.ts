import { Coordinate, Trail, NavigationStep } from '../types';
import { MET_FLAT, MET_STEEP } from '../constants';
import { GoogleGenAI, Type, SchemaType } from "@google/genai";

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

// --- Overpass API (Worldwide OSM Data) ---
export const fetchOverpassTrails = async (center: Coordinate): Promise<Trail[]> => {
    // 50km radius
    const radius = 50000;
    
    // Query: Find relations (routes) tagged as hiking within radius.
    // We filter for named routes to get high-quality results.
    // Increased limit to 50 to find closer trails.
    const query = `
      [out:json][timeout:25];
      (
        relation["route"="hiking"]["name"](around:${radius},${center.lat},${center.lng});
        relation["route"="foot"]["name"](around:${radius},${center.lat},${center.lng});
      );
      out geom 50;
    `;

    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        });
        const data = await response.json();
        const trails: Trail[] = [];

        if (data.elements) {
            for (const el of data.elements) {
                const tags = el.tags || {};
                const name = tags.name;
                const id = `osm-${el.id}`;
                
                // Determine difficulty from OSM tags if available
                // sac_scale: hiking, mountain_hiking, alpine_hiking
                let difficulty: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
                const scale = tags.sac_scale || '';
                
                if (scale === 'hiking' || scale === 'T1') difficulty = 'Easy';
                else if (scale === 'alpine_hiking' || scale === 'demanding_alpine_hiking' || scale.startsWith('T4')) difficulty = 'Hard';
                
                // If the route name contains "Peak" or "Summit" or "Mount", lean towards Hard/Moderate
                if (name && (name.includes('Mount') || name.includes('Peak') || name.includes('Summit'))) {
                     if (difficulty === 'Easy') difficulty = 'Moderate';
                }

                // Geometry Parsing
                // Relations return 'members'. With 'out geom', members have 'geometry'.
                // We will stitch the first member's geometry or the longest segment found.
                // NOTE: Stitching complete OSM relations is complex. We grab a representative segment for the prototype.
                let geometry: Coordinate[] = [];
                let longestSegment: Coordinate[] = [];

                if (el.members) {
                    for (const member of el.members) {
                        if (member.type === 'way' && member.geometry) {
                             const segment = member.geometry.map((g: any) => ({ lat: g.lat, lng: g.lon }));
                             if (segment.length > longestSegment.length) {
                                 longestSegment = segment;
                             }
                        }
                    }
                }
                geometry = longestSegment;

                if (geometry.length < 2) continue;

                // Calculate Distance of the segment (or rough total from tags if available)
                // Often OSM tags have 'distance' or we calculate the vector length
                let dist = 0;
                for(let i=0; i<geometry.length-1; i++) {
                    dist += calculateDistance(geometry[i], geometry[i+1]);
                }

                // If the segment is tiny (artifact), skip
                if (dist < 500) continue;

                const start = geometry[0];
                const end = geometry[geometry.length - 1];

                trails.push({
                    id: id,
                    name: name,
                    location: tags.operator || 'World',
                    distanceKm: parseFloat((dist / 1000).toFixed(2)),
                    elevationGainM: Math.floor(dist * 0.03) + 50, // Rough estimate without DEM
                    difficulty: difficulty,
                    startCoordinate: start,
                    endCoordinate: end,
                    description: tags.description || `Official OpenStreetMap hiking route: ${name}.`,
                    geometry: geometry,
                    isLoop: calculateDistance(start, end) < 100 // Heuristic
                });
            }
        }
        
        // Sort by distance to center
        trails.sort((a, b) => {
             const distA = calculateDistance(center, a.startCoordinate);
             const distB = calculateDistance(center, b.startCoordinate);
             return distA - distB;
        });

        return trails;
    } catch (e) {
        console.error("Overpass API Error", e);
        return [];
    }
}

// --- Geo.admin.ch API Integration (Official Swisstopo Data) ---
export const fetchGeoAdminTrails = async (center: Coordinate): Promise<Trail[]> => {
    // 50km radius Search
    const deltaLat = 0.45;
    const deltaLng = 0.65;
    
    const minLng = center.lng - deltaLng;
    const minLat = center.lat - deltaLat;
    const maxLng = center.lng + deltaLng;
    const maxLat = center.lat + deltaLat;
    
    // Construct Bounding Box
    const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
    const layers = 'all:ch.astra.wanderland';
    
    const url = `https://api3.geo.admin.ch/rest/services/all/MapServer/identify?` + 
        `geometry=${bbox}&` +
        `geometryFormat=geojson&` +
        `geometryType=esriGeometryEnvelope&` + // Search area, not point
        `imageDisplay=1000,1000,96&` +
        `lang=en&` +
        `layers=${layers}&` +
        `mapExtent=${bbox}&` +
        `returnGeometry=true&` +
        `sr=4326&` +
        `tolerance=0`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const trails: Trail[] = [];
        const seenNames = new Set<string>();

        if (data.results) {
            for (const result of data.results) {
                if (trails.length >= 50) break; // Increased limit
                
                // FIX: Check if attributes exist to avoid "Cannot read properties of undefined (reading 'name')"
                if (!result || !result.attributes) continue;

                const attrs = result.attributes;
                const name = attrs.name || `Route ${attrs.nr || ''}`;
                
                if (seenNames.has(name) || !name) continue;
                seenNames.add(name);

                const id = `ch-${result.featureId}`;
                const type = attrs.type || 'Regional Route';
                
                let difficulty: 'Easy' | 'Moderate' | 'Hard' = 'Moderate';
                if (type.includes('Alpine')) difficulty = 'Hard';
                
                const description = `Official Switzerland Mobility ${type} ${attrs.nr ? '#' + attrs.nr : ''}.`;

                let geometry: Coordinate[] = [];
                if (result.geometry && result.geometry.coordinates) {
                    const coords = result.geometry.type === 'MultiLineString' 
                        ? result.geometry.coordinates[0] 
                        : result.geometry.coordinates;
                    
                    if (coords && coords.length > 0) {
                        const flatCoords = Array.isArray(coords[0][0]) ? coords[0] : coords;
                        geometry = flatCoords.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
                    }
                }

                if (geometry.length < 2) continue;

                let dist = 0;
                for(let i=0; i<geometry.length-1; i++) {
                    dist += calculateDistance(geometry[i], geometry[i+1]);
                }
                
                const start = geometry[0];
                const end = geometry[geometry.length - 1];

                trails.push({
                    id: id,
                    name: name,
                    location: 'Switzerland',
                    distanceKm: parseFloat((dist / 1000).toFixed(2)),
                    elevationGainM: Math.floor(dist * 0.04),
                    difficulty: difficulty,
                    startCoordinate: start,
                    endCoordinate: end,
                    description: description,
                    geometry: geometry,
                    isLoop: calculateDistance(start, end) < 100
                });
            }
        }
        
        trails.sort((a, b) => {
            const distA = calculateDistance(center, a.startCoordinate);
            const distB = calculateDistance(center, b.startCoordinate);
            return distA - distB;
        });

        return trails;

    } catch (e) {
        console.error("Geo.admin.ch API Error", e);
        return [];
    }
};

export const fetchRealTrails = async (locationName: string, center: Coordinate): Promise<Trail[]> => {
    // Check if in Switzerland (Rough Bounding Box)
    const isSwiss = center.lat >= 45.8 && center.lat <= 47.8 && center.lng >= 5.9 && center.lng <= 10.5;

    // 1. SWISS STRATEGY (Best Quality for CH)
    if (isSwiss) {
        console.log("Location is Switzerland. Fetching from Geo.admin.ch (50km radius)...");
        const swissTrails = await fetchGeoAdminTrails(center);
        if (swissTrails.length > 0) {
            return swissTrails;
        }
    }

    // 2. WORLDWIDE STRATEGY (Overpass API)
    console.log("Fetching Worldwide data from Overpass API (OSM)...");
    const osmTrails = await fetchOverpassTrails(center);
    if (osmTrails.length > 0) {
        return osmTrails;
    }

    // 3. FALLBACK STRATEGY (AI)
    if (!process.env.API_KEY) {
        console.warn("No API Key, falling back to random generation.");
        return generateRandomTrails(center);
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Increased to top 30
        const prompt = `Find the top 30 most popular real-world hiking trails within a 50km radius of ${center.lat}, ${center.lng} (${locationName}).
            
            Return a JSON array where each object has:
            - name: string (Official Name)
            - description: string (Short summary)
            - difficulty: "Easy", "Moderate", or "Hard"
            - distanceKm: number
            - elevationGainM: number
            - startLat: number (Latitude of trailhead)
            - startLng: number (Longitude of trailhead)
            - isLoop: boolean
            - midLat: number (optional, for loop shape)
            - midLng: number (optional)

            Important:
            1. Only return REAL trails that actually exist.
            2. The trails must be within 50km of the coordinates.
            3. Coordinates must be accurate to the trailhead.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                temperature: 0.2, 
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
            let endLat = t.startLat;
            let endLng = t.startLng;

            if (!t.isLoop) {
                // Approximate end for linear trails if not provided
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