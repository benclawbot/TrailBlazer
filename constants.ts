import { Trail } from './types';

// Physical constants
export const MET_FLAT = 6.0;
export const MET_STEEP = 9.0;
export const WALKING_SPEED_KMH = 4.5;
export const GEOFENCE_RADIUS_METERS = 20;
export const BREADCRUMB_INTERVAL_METERS = 10;
export const DIRECTION_ALERT_DISTANCE = 50; // meters

// Map settings
export const DEFAULT_CENTER = { lat: 46.60, lng: 7.80 }; // Central Switzerland/Alps view
export const DEFAULT_ZOOM = 8;

const US_TRAILS: Trail[] = [
  {
    id: 'us-1',
    name: 'Chautauqua Loop',
    location: 'Boulder, CO',
    distanceKm: 5.8,
    elevationGainM: 150,
    difficulty: 'Easy',
    startCoordinate: { lat: 40.0150, lng: -105.2705 },
    endCoordinate: { lat: 40.0150, lng: -105.2705 }, // Loop
    midCoordinate: { lat: 40.0000, lng: -105.2800 },
    description: 'A beautiful scenic loop at the base of the Flatirons.',
    isLoop: true
  },
  {
    id: 'us-2',
    name: 'Royal Arch Trail',
    location: 'Boulder, CO',
    distanceKm: 6.4,
    elevationGainM: 420,
    difficulty: 'Moderate',
    startCoordinate: { lat: 39.9990, lng: -105.2800 },
    endCoordinate: { lat: 39.9950, lng: -105.2900 },
    description: 'A challenging hike leading to a natural rock arch with great views.',
    isLoop: false
  },
];

const EUROPE_TRAILS: Trail[] = [
  // --- FRANCE ---
  {
    id: 'fr-1',
    name: 'Lac Blanc Loop',
    location: 'Chamonix, France',
    distanceKm: 8.5,
    elevationGainM: 550,
    difficulty: 'Moderate',
    startCoordinate: { lat: 45.9680, lng: 6.9050 },
    endCoordinate: { lat: 45.9680, lng: 6.9050 }, // Loop
    midCoordinate: { lat: 45.9850, lng: 6.8800 },
    description: 'Iconic alpine lake with reflection of Mont Blanc. Rocky terrain.',
    isLoop: true
  },
  {
    id: 'fr-2',
    name: 'Grand Balcon Nord',
    location: 'Chamonix, France',
    distanceKm: 6.0,
    elevationGainM: 200,
    difficulty: 'Easy',
    startCoordinate: { lat: 45.9237, lng: 6.8694 },
    endCoordinate: { lat: 45.9350, lng: 6.9100 },
    description: 'High traverse with stunning glacier views, connecting Plan de l\'Aiguille to Montenvers.',
    isLoop: false
  },
  {
    id: 'fr-3',
    name: 'Cirque de Gavarnie',
    location: 'Pyrenees, France',
    distanceKm: 11.5,
    elevationGainM: 350,
    difficulty: 'Easy',
    startCoordinate: { lat: 42.7300, lng: -0.0100 },
    endCoordinate: { lat: 42.6950, lng: -0.0050 },
    description: 'Spectacular walk into a massive glacial amphitheater with waterfalls.',
    isLoop: false
  },
  {
    id: 'fr-4',
    name: 'Calanques d\'En-Vau',
    location: 'Cassis, France',
    distanceKm: 7.2,
    elevationGainM: 400,
    difficulty: 'Moderate',
    startCoordinate: { lat: 43.2140, lng: 5.5120 },
    endCoordinate: { lat: 43.2000, lng: 5.4950 },
    midCoordinate: { lat: 43.2050, lng: 5.5000 },
    description: 'Limestone cliffs plunging into turquoise Mediterranean waters.',
    isLoop: true
  },
  {
    id: 'fr-5',
    name: 'La Tournette',
    location: 'Annecy, France',
    distanceKm: 10.5,
    elevationGainM: 950,
    difficulty: 'Hard',
    startCoordinate: { lat: 45.8300, lng: 6.2800 },
    endCoordinate: { lat: 45.8300, lng: 6.2800 },
    midCoordinate: { lat: 45.8200, lng: 6.2700 },
    description: 'The highest peak around Lake Annecy offering 360-degree views.',
    isLoop: true
  },

  // --- SWITZERLAND ---
  {
    id: 'ch-1',
    name: '5 Seenweg (Five Lakes Walk)',
    location: 'Zermatt, Switzerland',
    distanceKm: 9.3,
    elevationGainM: 450,
    difficulty: 'Moderate',
    startCoordinate: { lat: 46.0207, lng: 7.7491 },
    endCoordinate: { lat: 46.0100, lng: 7.7600 },
    description: 'Famous trail passing 5 crystal clear mountain lakes with Matterhorn views.',
    isLoop: false
  },
  {
    id: 'ch-2',
    name: 'Hornli Hut Hike',
    location: 'Zermatt, Switzerland',
    distanceKm: 14.0,
    elevationGainM: 1200,
    difficulty: 'Hard',
    startCoordinate: { lat: 45.9900, lng: 7.7200 },
    endCoordinate: { lat: 45.9750, lng: 7.6800 },
    description: 'Strenuous ascent to the base camp of the Matterhorn climbers.',
    isLoop: false
  },
  {
    id: 'ch-3',
    name: 'Eiger Trail',
    location: 'Grindelwald, Switzerland',
    distanceKm: 6.0,
    elevationGainM: 100,
    difficulty: 'Moderate',
    startCoordinate: { lat: 46.5850, lng: 7.9600 },
    endCoordinate: { lat: 46.6000, lng: 8.0100 },
    description: 'Walk directly at the foot of the famous Eiger North Face.',
    isLoop: false
  },
  {
    id: 'ch-4',
    name: 'Oeschinensee Panorama',
    location: 'Kandersteg, Switzerland',
    distanceKm: 8.5,
    elevationGainM: 380,
    difficulty: 'Moderate',
    startCoordinate: { lat: 46.4980, lng: 7.6800 },
    endCoordinate: { lat: 46.4980, lng: 7.6800 },
    midCoordinate: { lat: 46.5050, lng: 7.7000 },
    description: 'A loop overlooking one of the bluest alpine lakes in the world.',
    isLoop: true
  },
  {
    id: 'ch-5',
    name: 'Creux du Van',
    location: 'Noiraigue, Switzerland',
    distanceKm: 13.0,
    elevationGainM: 750,
    difficulty: 'Moderate',
    startCoordinate: { lat: 46.9550, lng: 6.7200 },
    endCoordinate: { lat: 46.9550, lng: 6.7200 },
    midCoordinate: { lat: 46.9300, lng: 6.7000 },
    description: 'The "Grand Canyon of Switzerland", a massive natural rock arena.',
    isLoop: true
  },
  {
    id: 'ch-6',
    name: 'Lavaux Vineyard Terraces',
    location: 'Montreux, Switzerland',
    distanceKm: 11.0,
    elevationGainM: 250,
    difficulty: 'Easy',
    startCoordinate: { lat: 46.4800, lng: 6.7500 },
    endCoordinate: { lat: 46.4900, lng: 6.8500 },
    description: 'Walk through UNESCO heritage vineyards overlooking Lake Geneva.',
    isLoop: false
  },
  {
    id: 'ch-7',
    name: 'Harder Grat (Section)',
    location: 'Interlaken, Switzerland',
    distanceKm: 6.5,
    elevationGainM: 800,
    difficulty: 'Hard',
    startCoordinate: { lat: 46.6980, lng: 7.8500 },
    endCoordinate: { lat: 46.7100, lng: 7.9000 },
    description: 'A very steep, exposed ridge walk with views of Brienz and Thun lakes.',
    isLoop: false
  }
];

// Combine all mock trails
export const MOCK_TRAILS: Trail[] = [...EUROPE_TRAILS, ...US_TRAILS];