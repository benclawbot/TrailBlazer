import React from 'react';
import { Clock, Mountain, MapPin, Car, Footprints } from 'lucide-react';
import { Trail, Coordinate } from '../types';
import { estimateDuration, calculateDistance } from '../utils/geoUtils';
import { WALKING_SPEED_KMH } from '../constants';

interface TrailCardProps {
  trail: Trail;
  onSelect: (trail: Trail) => void;
  selected?: boolean;
  userLocation?: Coordinate | null;
}

export const TrailCard: React.FC<TrailCardProps> = ({ trail, onSelect, selected, userLocation }) => {
  const duration = estimateDuration(trail.distanceKm, WALKING_SPEED_KMH);

  // Calculate distance from user to the start of the trail
  const distToStartKm = userLocation 
    ? (calculateDistance(userLocation, trail.startCoordinate) / 1000).toFixed(1) 
    : null;

  // Difficulty color
  const diffColor =
    trail.difficulty === 'Easy'
      ? 'text-green-700 bg-green-100'
      : trail.difficulty === 'Moderate'
      ? 'text-yellow-700 bg-yellow-100'
      : 'text-red-700 bg-red-100';

  return (
    <div
      onClick={() => onSelect(trail)}
      className={`p-4 mb-3 rounded-2xl border transition-all cursor-pointer ${
        selected
          ? 'border-primary bg-primary/5 shadow-md scale-[1.01]'
          : 'border-gray-200 bg-white hover:border-primary/30 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{trail.name}</h3>
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {trail.location}
          </p>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${diffColor}`}>
          {trail.difficulty}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-3">
        {/* Row 1: Hike Stats */}
        <div className="flex flex-col">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Hike Time</span>
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <Clock size={16} className="text-primary" />
                <span>{duration}</span>
            </div>
        </div>

        <div className="flex flex-col">
            <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Length</span>
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <Footprints size={16} className="text-primary" />
                <span>{trail.distanceKm} km</span>
            </div>
        </div>

        {/* Row 2: Elevation & Distance to Start */}
        <div className="flex flex-col mt-2">
             <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">Elevation</span>
             <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <Mountain size={16} className="text-gray-500" />
                <span>{trail.elevationGainM}m</span>
            </div>
        </div>

        {distToStartKm && (
             <div className="flex flex-col mt-2">
                <span className="text-[10px] uppercase text-gray-400 font-bold tracking-wider mb-0.5">From You</span>
                <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                    <Car size={16} className="text-blue-500" />
                    <span>{distToStartKm} km</span>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};