import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapComponent } from './components/Map';
import { TrailCard } from './components/TrailCard';
import { Trail, Breadcrumb, Coordinate, UserSettings, HikeStats } from './types';
import { MOCK_TRAILS, BREADCRUMB_INTERVAL_METERS, GEOFENCE_RADIUS_METERS, DEFAULT_CENTER, WALKING_SPEED_KMH, DIRECTION_ALERT_DISTANCE } from './constants';
import { calculateDistance, calculateCalories, searchAddress, estimateDuration, fetchRealTrails, fetchRoute } from './utils/geoUtils';
import { saveHikeToHistory, getHikeHistory, saveTrailOffline, removeOfflineTrail, isTrailOffline, getOfflineTrails } from './utils/storage';
import { Battery, Play, Square, Download, Settings, X, Search, History, CheckCircle, MapPin, Mountain, Clock, Filter, Repeat, ChevronUp, LocateFixed } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// -- History Modal --
const HistoryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<HikeStats[]>([]);

    useEffect(() => {
        if (isOpen) {
            setHistory(getHikeHistory());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <History size={24} className="text-primary"/> Hike History
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-grow overflow-y-auto no-scrollbar space-y-4">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            <p>No hikes recorded yet.</p>
                            <p className="text-sm">Go explore the outdoors!</p>
                        </div>
                    ) : (
                        history.map((hike, i) => (
                            <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between mb-2">
                                    <span className="font-bold text-gray-800">{hike.trailName || "Unknown Trail"}</span>
                                    <span className="text-xs text-gray-500">{new Date(hike.date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>{hike.distanceWalkedKm.toFixed(2)} km</span>
                                    <span>{Math.floor(hike.durationSeconds / 60)} min</span>
                                    <span>{hike.caloriesBurned} cal</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

// -- Settings Modal Component --
const SettingsModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  settings: UserSettings; 
  onSave: (s: UserSettings) => void; 
}> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState(settings);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input 
              type="number" 
              value={formData.weightKg} 
              onChange={e => setFormData({...formData, weightKg: Number(e.target.value)})}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
            <input 
              type="tel" 
              value={formData.emergencyContact} 
              onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
              className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none"
              placeholder="+1234567890"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-medium text-gray-700">Battery Saver Mode</label>
            <button 
              onClick={() => setFormData({...formData, batterySaverMode: !formData.batterySaverMode})}
              className={`w-12 h-6 rounded-full transition-colors relative ${formData.batterySaverMode ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.batterySaverMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => { onSave(formData); onClose(); }}
          className="w-full mt-6 bg-primary text-white font-bold py-3 rounded-xl hover:bg-green-800 transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

// -- Summary Modal Component --
const SummaryModal: React.FC<{
  isOpen: boolean;
  onClose: (save: boolean) => void;
  stats: HikeStats;
}> = ({ isOpen, onClose, stats }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🎉</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Hike Complete!</h2>
                <p className="text-gray-500 mb-6">Great job out there.</p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="text-2xl font-bold text-gray-900">{stats.distanceWalkedKm.toFixed(2)}</div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Km Walked</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="text-2xl font-bold text-gray-900">{stats.caloriesBurned}</div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Calories</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="text-2xl font-bold text-gray-900">{Math.floor(stats.durationSeconds / 60)}</div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Minutes</div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="text-2xl font-bold text-gray-900">{stats.elevationGainedM}</div>
                        <div className="text-xs text-gray-500 uppercase font-semibold">Elev Gain (m)</div>
                    </div>
                </div>
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => onClose(false)}
                        className="flex-1 bg-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-300 transition-colors"
                    >
                        Discard
                    </button>
                    <button 
                        onClick={() => onClose(true)}
                        className="flex-1 bg-primary text-white font-bold py-3 rounded-xl hover:bg-green-800 transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// -- Main App Component --
export default function App() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    weightKg: 70,
    emergencyContact: '911',
    batterySaverMode: false,
  });

  const [currentLocation, setCurrentLocation] = useState<Coordinate | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [hikeStartTime, setHikeStartTime] = useState<number | null>(null);
  const [completedStats, setCompletedStats] = useState<HikeStats | null>(null);
  const [approachPath, setApproachPath] = useState<Coordinate[] | undefined>(undefined);
  
  // Navigation State
  const [currentInstruction, setCurrentInstruction] = useState<string | null>(null);
  
  // Filtering States
  const [filterDifficulty, setFilterDifficulty] = useState<string>('All');
  const [filterDuration, setFilterDuration] = useState<number | null>(null); // hours
  const [filterLoop, setFilterLoop] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  
  // -- New States for Dynamic Search & Map --
  const [activeTrails, setActiveTrails] = useState<Trail[]>(MOCK_TRAILS);
  const [mapViewCenter, setMapViewCenter] = useState<Coordinate | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [droppedPin, setDroppedPin] = useState<Coordinate | null>(null);

  // Offline state
  const [offlineMapProgress, setOfflineMapProgress] = useState<number>(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0); 

  const [aiTip, setAiTip] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);

  // --- Filtering & Offline Source ---
  const filteredTrails = useMemo(() => {
    // 1. Combine Active Trails with Saved Offline
    const offline = getOfflineTrails();
    const all = [...activeTrails];
    offline.forEach(ot => {
        if (!all.find(at => at.id === ot.id)) {
            all.push(ot);
        }
    });
    
    // 2. Filter Logic
    let result = all.filter(trail => {
      // Rule: Propose hikes > 1km by default
      if (trail.distanceKm <= 1.0) return false;

      // Loop Filter
      if (filterLoop && !trail.isLoop) return false;

      // Search Query Logic
      const matchesSearch = trail.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            trail.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (searchQuery.length > 0 && (trail.id.startsWith('ai-') || trail.id.startsWith('gen-')));
      
      if (searchQuery.length > 0 && !matchesSearch) return false;

      // Difficulty (Elevation Change) / Offline
      if (filterDifficulty !== 'All') {
          if (filterDifficulty === 'Offline') {
              if (!isTrailOffline(trail.id)) return false;
          } else {
              if (trail.difficulty !== filterDifficulty) return false;
          }
      }

      // Duration Filter
      if (filterDuration !== null) {
          const duration = trail.distanceKm / WALKING_SPEED_KMH;
          if (duration > filterDuration) return false;
      }

      return true;
    });

    // 3. Sorting Logic: Priority = User Location -> Dropped Pin -> Map Center
    const referencePoint = currentLocation || droppedPin || mapViewCenter || DEFAULT_CENTER;
    
    result.sort((a, b) => {
        const distA = calculateDistance(referencePoint, a.startCoordinate);
        const distB = calculateDistance(referencePoint, b.startCoordinate);
        return distA - distB;
    });

    return result;

  }, [searchQuery, filterDifficulty, filterDuration, filterLoop, forceUpdate, activeTrails, mapViewCenter, currentLocation, droppedPin]);

  // --- Route Fetching Logic ---
  useEffect(() => {
    const updateTrailRoute = async () => {
        if (!selectedTrail) {
            setApproachPath(undefined);
            setCurrentInstruction(null);
            return;
        }

        // 1. Fetch Real Trail Geometry if missing
        if (!selectedTrail.geometry) {
             const routeData = await fetchRoute(selectedTrail.startCoordinate, selectedTrail.endCoordinate, selectedTrail.midCoordinate);
             if (routeData) {
                 setSelectedTrail(prev => prev ? ({
                     ...prev,
                     geometry: routeData.geometry,
                     instructions: routeData.instructions
                 }) : null);
             }
        }

        // 2. Fetch Approach Path from User Location
        if (currentLocation) {
            const approachData = await fetchRoute(currentLocation, selectedTrail.startCoordinate);
            if (approachData) {
                setApproachPath(approachData.geometry);
            }
        }
    };

    updateTrailRoute();
  }, [selectedTrail?.id]);

  // --- Geolocation Service & Directions ---
  const requestLocation = () => {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
    }
    
    setIsSearching(true);

    // Single prompt request
    navigator.geolocation.getCurrentPosition(
        async (pos) => {
            const newCoord = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setCurrentLocation(newCoord);
            setMapViewCenter(newCoord);
            setDroppedPin(null); // Clear dropped pin to prioritize user location
            
            // Auto-fetch trails near this location
            const trails = await fetchRealTrails("Current Location", newCoord);
            setActiveTrails(trails);
            setIsSearching(false);
            setIsSheetCollapsed(false); // Auto expand list to show results
        },
        (err) => {
            console.error(err);
            alert("Could not get location. Please enable GPS permissions.");
            setIsSearching(false);
        },
        { enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (!isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    const options = {
      enableHighAccuracy: !userSettings.batterySaverMode,
      timeout: userSettings.batterySaverMode ? 30000 : 10000,
      maximumAge: userSettings.batterySaverMode ? 60000 : 0,
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const newCoord: Coordinate = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCurrentLocation(newCoord);

        // Directions Check
        if (selectedTrail?.instructions) {
            let foundInstruction = null;
            for (const step of selectedTrail.instructions) {
                const dist = calculateDistance(newCoord, step.location);
                if (dist < DIRECTION_ALERT_DISTANCE) {
                    foundInstruction = step.instruction;
                    break;
                }
            }
            setCurrentInstruction(foundInstruction);
        }

        setBreadcrumbs(prev => {
          const lastPoint = prev[prev.length - 1];
          if (!lastPoint || calculateDistance(lastPoint, newCoord) >= BREADCRUMB_INTERVAL_METERS) {
            return [...prev, { ...newCoord, timestamp: Date.now() }];
          }
          return prev;
        });

        if (selectedTrail) {
            const distToEnd = calculateDistance(newCoord, selectedTrail.endCoordinate);
            if (distToEnd < GEOFENCE_RADIUS_METERS && !completedStats) {
                finishHike();
            }
        }
      },
      (err) => console.error("Location error:", err),
      options
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isTracking, userSettings.batterySaverMode, selectedTrail]);

  // --- Search & Interaction Logic ---
  const handleSearchKey = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim().length > 0) {
        setIsSearching(true);
        setIsSheetCollapsed(false); 
        const result = await searchAddress(searchQuery);
        
        if (result) {
            setMapViewCenter(result.coord);
            setDroppedPin(result.coord); // Treat search result as a "pin"
            setSelectedTrail(null);
            const newTrails = await fetchRealTrails(result.displayName || searchQuery, result.coord);
            setActiveTrails(newTrails);
        } else {
            alert("Location not found.");
        }
        setIsSearching(false);
    }
  };

  const handleMapLongPress = async (coord: Coordinate) => {
    setDroppedPin(coord);
    setMapViewCenter(coord);
    setSelectedTrail(null);
    setIsSearching(true);
    setIsSheetCollapsed(false); // Open sheet to show new results

    // Fetch trails around this dropped pin
    const newTrails = await fetchRealTrails("Custom Location", coord);
    setActiveTrails(newTrails);
    setIsSearching(false);
  };

  // --- Actions ---
  const startHike = () => {
    setIsTracking(true);
    setHikeStartTime(Date.now());
    setBreadcrumbs([]);
    setCompletedStats(null);
    setIsSheetCollapsed(true); // Auto collapse when starting hike to see map
  };

  const finishHike = () => {
    setIsTracking(false);
    setIsSheetCollapsed(false); // Expand to see summary or list
    if (!hikeStartTime) return;

    let totalDist = 0;
    for (let i = 0; i < breadcrumbs.length - 1; i++) {
      totalDist += calculateDistance(breadcrumbs[i], breadcrumbs[i + 1]);
    }
    const distanceKm = totalDist / 1000;
    const durationHrs = (Date.now() - hikeStartTime) / 3600000;
    const calories = calculateCalories(userSettings.weightKg, durationHrs, selectedTrail?.elevationGainM || 0, distanceKm);

    setCompletedStats({
      trailName: selectedTrail?.name || "Free Hike",
      date: Date.now(),
      distanceWalkedKm: distanceKm,
      elevationGainedM: selectedTrail?.elevationGainM || 0,
      durationSeconds: (Date.now() - hikeStartTime) / 1000,
      caloriesBurned: calories
    });
  };

  const handleDownloadMap = () => {
    if (!selectedTrail) return;
    if (isDownloading) return;

    if (isTrailOffline(selectedTrail.id)) {
        removeOfflineTrail(selectedTrail.id);
        setForceUpdate(n => n + 1);
        return;
    }

    setIsDownloading(true);
    setOfflineMapProgress(0);

    const interval = setInterval(() => {
        setOfflineMapProgress(prev => {
            if (prev >= 100) {
                clearInterval(interval);
                setIsDownloading(false);
                saveTrailOffline(selectedTrail);
                setForceUpdate(n => n + 1);
                return 100;
            }
            return prev + 10;
        });
    }, 200);
  };

  const onTrailSelect = (t: Trail) => {
      setSelectedTrail(t);
      setMapViewCenter(t.startCoordinate); // Recenter map on selected trail
      setIsSheetCollapsed(false);
  };

  // --- Gemini API ---
  const fetchSafetyTip = async () => {
    if (!process.env.API_KEY || !selectedTrail) return;
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Give me a very short (max 1 sentence) safety tip for hiking "${selectedTrail.name}" which is a ${selectedTrail.difficulty} trail.`,
        });
        setAiTip(response.text?.trim() || null);
    } catch (e) {
        console.error("AI Error", e);
    }
  };

  useEffect(() => {
    if (selectedTrail && process.env.API_KEY) fetchSafetyTip();
  }, [selectedTrail?.id]);

  // --- Layout Classes ---
  // Adjusted for mobile visibility
  const isSheetMinimized = !!selectedTrail || isTracking;
  const sheetClasses = `
    absolute bottom-0 left-0 right-0 bg-white z-[1000]
    rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.1)]
    transition-all duration-300 ease-in-out
    flex flex-col
    lg:left-4 lg:bottom-4 lg:w-96 lg:rounded-3xl lg:h-auto lg:max-h-[85vh] lg:border lg:border-gray-100
    ${isSheetCollapsed ? 'h-12 min-h-[48px]' : (isSheetMinimized ? 'h-[45vh] min-h-[300px]' : 'h-[50%]')} 
  `;

  return (
    <div className="relative h-screen w-screen bg-gray-200 overflow-hidden">
      
      {/* Full Screen Map */}
      <div className="absolute inset-0 z-0">
        <MapComponent 
            userLocation={currentLocation}
            trails={filteredTrails}
            selectedTrail={selectedTrail}
            breadcrumbs={breadcrumbs}
            viewCenter={mapViewCenter}
            approachPath={approachPath}
            droppedPin={droppedPin}
            onMapLongPress={handleMapLongPress}
            onMapClick={() => {
                setIsSheetCollapsed(true);
            }}
        />
      </div>

      {/* Navigation Instruction Banner */}
      {isTracking && currentInstruction && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1500] bg-black/70 backdrop-blur-md text-white px-6 py-2 rounded-full shadow-xl flex items-center gap-3 max-w-[90%] animate-in slide-in-from-top-4">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-bold tracking-wide uppercase">{currentInstruction}</span>
        </div>
      )}

      {/* Top Controls (Just History & Settings now) */}
      <div className="absolute top-4 right-4 flex gap-2 z-[1000] pointer-events-auto">
          <button 
              onClick={() => setIsHistoryOpen(true)}
              className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
              title="Hike History"
          >
              <History size={20} className="text-gray-700" />
          </button>
          <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50"
              title="Settings"
          >
              <Settings size={20} className="text-gray-700" />
          </button>
      </div>

      {/* Map Controls */}
      <div className="absolute top-20 right-4 flex flex-col gap-3 z-[1000] pointer-events-auto">
          {userSettings.batterySaverMode && (
              <div className="bg-yellow-100 p-2 rounded-full shadow-lg border border-yellow-300 text-yellow-800 animate-pulse" title="Battery Saver On">
                  <Battery size={20} />
              </div>
          )}
      </div>

      {/* GPS Location Button (Bottom Right) */}
      {/* Positioned at bottom-24 to sit above the collapsed sheet height (12 * 4px = 48px, + spacing) */}
      <div className="absolute bottom-24 lg:bottom-6 right-4 z-[1000] pointer-events-auto">
           <button 
              onClick={requestLocation}
              disabled={isSearching}
              className={`p-4 rounded-full shadow-xl transition-all active:scale-95 flex items-center justify-center border-2
                  ${!currentLocation 
                      ? 'bg-blue-600 border-blue-400 text-white animate-pulse shadow-blue-500/50' 
                      : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-100'
                  }
              `}
              title="Start App & Find Trails"
          >
              {isSearching ? (
                 <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
              ) : (
                 <LocateFixed size={28} className={!currentLocation ? 'text-white' : 'text-blue-600'} />
              )}
          </button>
      </div>

      {/* Bottom Sheet */}
      <div className={sheetClasses}>
        {/* Handle for mobile */}
        <div 
            className="w-full flex justify-center pt-3 pb-2 lg:hidden cursor-pointer hover:bg-gray-50 rounded-t-3xl active:bg-gray-100 transition-colors group flex-shrink-0"
            onClick={() => setIsSheetCollapsed(!isSheetCollapsed)}
        >
            {isSheetCollapsed ? (
                <ChevronUp className="text-gray-400 group-hover:text-primary transition-colors" size={20}/>
            ) : (
                <div className="w-12 h-1.5 bg-gray-300 rounded-full group-hover:bg-primary/50 transition-colors"></div>
            )}
        </div>

        <div className={`flex-grow overflow-hidden flex flex-col px-4 pb-4 ${isSheetCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'} transition-opacity duration-200`}>
            {isTracking ? (
                // --- VIEW 3: TRACKING MODE ---
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 h-full pb-6">
                    <div className="flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-2">
                             <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                             <span className="font-bold text-red-600">Tracking Hike</span>
                        </div>
                        <span className="font-mono font-medium text-gray-600">
                             {hikeStartTime ? Math.floor((Date.now() - hikeStartTime) / 60000) : 0} min
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span className="text-xs text-gray-500 uppercase font-bold">Distance</span>
                            <div className="text-xl font-bold text-gray-800">
                                {(breadcrumbs.length * BREADCRUMB_INTERVAL_METERS / 1000).toFixed(2)} <span className="text-sm text-gray-500">km</span>
                            </div>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                             <span className="text-xs text-gray-500 uppercase font-bold">Remaining</span>
                             <div className="text-xl font-bold text-gray-800">
                                 {selectedTrail ? Math.max(0, selectedTrail.distanceKm - (breadcrumbs.length * BREADCRUMB_INTERVAL_METERS / 1000)).toFixed(1) : '-'} <span className="text-sm text-gray-500">km</span>
                             </div>
                        </div>
                    </div>

                    <div className="flex-grow"></div>
                    
                    <button 
                        onClick={finishHike}
                        className="w-full bg-red-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center justify-center gap-2 flex-shrink-0 mb-2"
                    >
                        <Square size={20} fill="currentColor" />
                        Stop Hike
                    </button>
                </div>
            ) : selectedTrail ? (
                // --- VIEW 2: SELECTED TRAIL COMPACT MODE ---
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 leading-tight">{selectedTrail.name}</h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <MapPin size={14} /> {selectedTrail.location}
                            </p>
                        </div>
                        <button 
                            onClick={() => setSelectedTrail(null)}
                            className="p-2 -mr-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                        <div className="flex items-center gap-1.5">
                            <Mountain size={16} className="text-gray-400" />
                            <span className="font-semibold">{selectedTrail.elevationGainM}m</span>
                        </div>
                        <div className="w-px h-4 bg-gray-300"></div>
                        <div className="flex items-center gap-1.5">
                            <Clock size={16} className="text-gray-400" />
                            <span className="font-semibold">{estimateDuration(selectedTrail.distanceKm, WALKING_SPEED_KMH)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                selectedTrail.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                                selectedTrail.difficulty === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {selectedTrail.difficulty}
                            </span>
                        </div>
                    </div>

                    {aiTip && (
                        <div className="bg-blue-50 text-blue-800 text-xs p-2.5 rounded-lg flex items-start gap-2 border border-blue-100 mb-2">
                            <span className="text-base">🤖</span>
                            <p className="leading-tight pt-0.5">{aiTip}</p>
                        </div>
                    )}

                    {/* Spacer to push buttons to bottom if needed, or just flex-grow */}
                    <div className="flex-grow"></div>

                    <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 pb-2">
                         <button 
                            onClick={handleDownloadMap}
                            disabled={isDownloading}
                            className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                                isTrailOffline(selectedTrail.id)
                                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                            }`}
                            title={isTrailOffline(selectedTrail.id) ? "Remove Offline Map" : "Download Offline Map"}
                         >
                            {isDownloading ? (
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            ) : isTrailOffline(selectedTrail.id) ? (
                                <CheckCircle size={20}/>
                            ) : (
                                <Download size={20}/>
                            )}
                         </button>
                        <button 
                            onClick={startHike}
                            className="flex-1 bg-primary text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 hover:bg-green-800 transition-all flex items-center justify-center gap-2"
                        >
                            <Play size={20} fill="currentColor" />
                            Start Hike
                        </button>
                    </div>
                </div>
            ) : (
                // --- VIEW 1: SEARCH & LIST MODE ---
                <div className="flex flex-col h-full animate-in fade-in">
                    {/* Search & Filter */}
                    <div className="mb-3 space-y-3 flex-shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                                type="text" 
                                placeholder={isSearching ? "Searching..." : "Search address or Long Press Map..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKey}
                                disabled={isSearching}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm transition-shadow focus:shadow-sm"
                            />
                        </div>
                        
                        <div className="flex flex-col gap-2">
                             {/* Loop / Difficulty Filter */}
                             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 items-center">
                                <button
                                        onClick={() => setFilterLoop(!filterLoop)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1 ${
                                            filterLoop 
                                                ? 'bg-indigo-600 text-white shadow-md' 
                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                        }`}
                                    >
                                        <Repeat size={12}/> Loops Only
                                </button>
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                {['All', 'Easy', 'Moderate', 'Hard', 'Offline'].map(diff => (
                                    <button
                                        key={diff}
                                        onClick={() => setFilterDifficulty(diff)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${
                                            filterDifficulty === diff 
                                                ? 'bg-gray-900 text-white shadow-md' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {diff === 'Easy' ? 'Easy (<200m)' : diff === 'Moderate' ? 'Mod (200-500m)' : diff === 'Hard' ? 'Hard (>500m)' : diff}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Trail List */}
                    <div className="flex-grow overflow-y-auto no-scrollbar pb-4">
                        <div className="flex justify-between items-end mb-2">
                             <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                {droppedPin ? "Trails near Pin" : (currentLocation ? "Trails Near You" : "Trails at Location")}
                            </h3>
                            <span className="text-[10px] text-gray-400">Sorted by distance</span>
                        </div>
                       
                        {filteredTrails.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                <MapPin size={32} className="mb-2 opacity-50"/>
                                <p className="text-sm">No trails found.</p>
                                <p className="text-xs mt-1">Try adjusting filters or long-press map.</p>
                            </div>
                        )}
                        {filteredTrails.map(trail => (
                            <TrailCard 
                                key={trail.id} 
                                trail={trail} 
                                onSelect={onTrailSelect}
                                selected={false}
                                userLocation={currentLocation}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={userSettings}
        onSave={setUserSettings}
      />

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SummaryModal 
        isOpen={!!completedStats} 
        onClose={(save) => {
            if (save && completedStats) {
                saveHikeToHistory(completedStats);
            }
            setCompletedStats(null);
        }}
        stats={completedStats || { date: 0, distanceWalkedKm: 0, elevationGainedM: 0, durationSeconds: 0, caloriesBurned: 0 }}
      />
    </div>
  );
}