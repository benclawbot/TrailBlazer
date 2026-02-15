export interface Coordinate {
  lat: number;
  lng: number;
}

export interface NavigationStep {
  distance: number; // meters to next step
  duration: number;
  instruction: string;
  location: Coordinate;
}

export interface Trail {
  id: string;
  name: string;
  location: string;
  distanceKm: number;
  elevationGainM: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  startCoordinate: Coordinate;
  endCoordinate: Coordinate;
  midCoordinate?: Coordinate; // Used to force a loop route
  description: string;
  isOffline?: boolean;
  isLoop?: boolean;
  geometry?: Coordinate[]; // Array of lat/lng for the real path
  instructions?: NavigationStep[]; // Turn by turn
}

export interface Breadcrumb extends Coordinate {
  timestamp: number;
}

export interface HikeStats {
  trailName?: string;
  date: number;
  distanceWalkedKm: number;
  elevationGainedM: number;
  durationSeconds: number;
  caloriesBurned: number;
}

export interface UserSettings {
  weightKg: number;
  emergencyContact: string;
  batterySaverMode: boolean;
}