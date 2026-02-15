import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Check } from 'lucide-react';
import { Trail, Breadcrumb, Coordinate } from '../types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../constants';

// Fix Leaflet generic marker icon
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Green Flag for Unselected Trails
const StartFlagIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#22c55e" stroke="#15803d"/>
      <line x1="4" x2="4" y1="22" y2="15" stroke="#374151"/>
    </svg>
  `,
  className: 'bg-transparent',
  iconSize: [24, 24],
  iconAnchor: [4, 22],
  popupAnchor: [0, -24]
});

// Red Flag for Selected Trail
const SelectedFlagIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" fill="#ef4444" stroke="#7f1d1d"/>
      <line x1="4" x2="4" y1="22" y2="15" stroke="#374151"/>
    </svg>
  `,
  className: 'bg-transparent',
  iconSize: [32, 32],
  iconAnchor: [4, 30],
  popupAnchor: [0, -32]
});

// Checkered Flag for Finish
const FinishFlagIcon = L.divIcon({
  html: `<div style="font-size: 20px; line-height: 1; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));">🏁</div>`,
  className: 'bg-transparent',
  iconSize: [24, 24],
  iconAnchor: [4, 22],
  popupAnchor: [0, -22]
});

// Dropped Pin (Purple)
const DroppedPinIcon = L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#9333ea" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>
  `,
  className: 'bg-transparent',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
  popupAnchor: [0, -32]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Define available map layers
const MAP_LAYERS = {
  standard: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  topo: {
    name: 'Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
  }
};

type MapLayerKey = keyof typeof MAP_LAYERS;

interface MapProps {
  userLocation: Coordinate | null;
  trails: Trail[];
  selectedTrail: Trail | null;
  breadcrumbs: Breadcrumb[];
  viewCenter?: Coordinate | null;
  onMapLongPress?: (coord: Coordinate) => void;
  onMapClick?: () => void;
  approachPath?: Coordinate[];
  droppedPin?: Coordinate | null;
}

// Component to handle map center updates
const MapController: React.FC<{ center: Coordinate; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
};

// Component to handle map events (click, long press)
const MapEvents: React.FC<{ onLongPress?: (coord: Coordinate) => void; onMapClick?: () => void }> = ({ onLongPress, onMapClick }) => {
  const map = useMap();
  useEffect(() => {
    const handleContext = (e: any) => {
        if (onLongPress) onLongPress({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    const handleClick = () => {
        if (onMapClick) onMapClick();
    };
    
    map.on('contextmenu', handleContext); 
    map.on('click', handleClick);

    return () => {
        map.off('contextmenu', handleContext);
        map.off('click', handleClick);
    };
  }, [map, onLongPress, onMapClick]);
  return null;
};

export const MapComponent: React.FC<MapProps> = ({ 
  userLocation, 
  trails, 
  selectedTrail, 
  breadcrumbs,
  viewCenter,
  onMapLongPress,
  onMapClick,
  approachPath,
  droppedPin
}) => {
  const [mapCenter, setMapCenter] = useState<Coordinate>(DEFAULT_CENTER);
  const [activeLayer, setActiveLayer] = useState<MapLayerKey>('standard');
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

  // Prioritize viewCenter, then selectedTrail, then userLocation, then default
  useEffect(() => {
    if (viewCenter) {
        setMapCenter(viewCenter);
    } else if (selectedTrail) {
      setMapCenter(selectedTrail.startCoordinate);
    } else if (userLocation) {
      setMapCenter(userLocation);
    }
  }, [viewCenter, selectedTrail, userLocation]);

  const breadcrumbPositions = breadcrumbs.map(b => [b.lat, b.lng] as [number, number]);

  return (
    <div className="w-full h-full bg-gray-200 relative">
        <MapContainer 
            center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} 
            zoom={DEFAULT_ZOOM} 
            className="w-full h-full z-0"
            zoomControl={false}
        >
            <TileLayer
                key={activeLayer} // Force re-render on layer change
                attribution={MAP_LAYERS[activeLayer].attribution}
                url={MAP_LAYERS[activeLayer].url}
                crossOrigin="anonymous" 
            />
            
            <MapController center={mapCenter} />
            <MapEvents onLongPress={onMapLongPress} onMapClick={onMapClick} />

            {/* Dropped Pin Marker (from Long Press) */}
            {droppedPin && (
                 <Marker 
                    position={[droppedPin.lat, droppedPin.lng]}
                    icon={DroppedPinIcon}
                >
                    <Popup>Selected Location</Popup>
                </Marker>
            )}

            {/* User Location Marker */}
            {userLocation && (
                <Marker 
                    position={[userLocation.lat, userLocation.lng]}
                    icon={L.divIcon({
                        html: '<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
                        className: 'bg-transparent',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })}
                >
                    <Popup>You are here</Popup>
                </Marker>
            )}

            {/* Trail Start Markers */}
            {trails.map(trail => (
                <Marker 
                    key={trail.id} 
                    position={[trail.startCoordinate.lat, trail.startCoordinate.lng]}
                    opacity={selectedTrail?.id === trail.id ? 1 : 0.7}
                    zIndexOffset={selectedTrail?.id === trail.id ? 1000 : 0}
                    icon={selectedTrail?.id === trail.id ? SelectedFlagIcon : StartFlagIcon}
                >
                <Popup>
                    <strong>{trail.name}</strong><br/>
                    {trail.difficulty} • {trail.distanceKm}km <br/>
                    {trail.isLoop ? '(Loop)' : ''}
                </Popup>
                </Marker>
            ))}

            {/* Selected Trail Visualization */}
            {selectedTrail && (
                <>
                    {/* 1. Path to Start (Dashed) */}
                    {userLocation && approachPath && (
                        <Polyline 
                            positions={approachPath.map(c => [c.lat, c.lng])}
                            pathOptions={{ 
                                color: '#64748b', 
                                weight: 4, 
                                opacity: 0.8,
                                dashArray: '8, 12', 
                                lineCap: 'round'
                            }} 
                        />
                    )}
                    {userLocation && !approachPath && (
                        <Polyline 
                            positions={[
                                [userLocation.lat, userLocation.lng],
                                [selectedTrail.startCoordinate.lat, selectedTrail.startCoordinate.lng]
                            ]}
                            pathOptions={{ 
                                color: '#64748b', 
                                weight: 4, 
                                opacity: 0.5,
                                dashArray: '8, 12', 
                            }} 
                        />
                    )}

                    {/* 2. Actual Trail Path (Continuous Solid) */}
                    {selectedTrail.geometry ? (
                        <Polyline 
                            positions={selectedTrail.geometry.map(c => [c.lat, c.lng])}
                            pathOptions={{ 
                                color: '#ef4444', 
                                weight: 6, 
                                opacity: 1,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }} 
                        />
                    ) : (
                        <Polyline 
                            positions={[
                                [selectedTrail.startCoordinate.lat, selectedTrail.startCoordinate.lng],
                                ...(selectedTrail.midCoordinate ? [[selectedTrail.midCoordinate.lat, selectedTrail.midCoordinate.lng] as [number, number]] : []),
                                [selectedTrail.endCoordinate.lat, selectedTrail.endCoordinate.lng]
                            ]}
                            pathOptions={{ 
                                color: '#ef4444', 
                                weight: 6, 
                                opacity: 1,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }} 
                        />
                    )}
                    
                    <Marker 
                        position={[selectedTrail.endCoordinate.lat, selectedTrail.endCoordinate.lng]}
                        icon={FinishFlagIcon}
                        zIndexOffset={1000}
                    />
                </>
            )}

            {/* Breadcrumbs Trail (History) */}
            {breadcrumbPositions.length > 1 && (
                <Polyline 
                    positions={breadcrumbPositions}
                    pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }}
                />
            )}
        </MapContainer>

        {/* Map Layer Controls */}
        <div className="absolute top-36 right-4 z-[900] flex flex-col items-end">
            {isLayerMenuOpen && (
                <div className="bg-white/90 backdrop-blur-md p-1 rounded-xl shadow-xl border border-white/20 mb-2 flex flex-col gap-1 min-w-[140px] animate-in fade-in slide-in-from-right-2">
                    {(Object.keys(MAP_LAYERS) as MapLayerKey[]).map((layerKey) => (
                        <button
                            key={layerKey}
                            onClick={() => { setActiveLayer(layerKey); setIsLayerMenuOpen(false); }}
                            className={`
                                text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between
                                ${activeLayer === layerKey ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}
                            `}
                        >
                            {MAP_LAYERS[layerKey].name}
                            {activeLayer === layerKey && <Check size={14} />}
                        </button>
                    ))}
                </div>
            )}
            
            <button 
                onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
                className="bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 text-gray-700 transition-transform active:scale-95"
                title="Change Map Layer"
            >
                <Layers size={20} />
            </button>
        </div>
    </div>
  );
};