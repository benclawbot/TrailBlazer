import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SOSButtonProps {
  currentLocation: { lat: number; lng: number } | null;
  contactNumber: string;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ currentLocation, contactNumber }) => {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const startPress = () => {
    setPressing(true);
  };

  const endPress = () => {
    setPressing(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (pressing) {
      intervalRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            triggerSOS();
            endPress();
            return 100;
          }
          return prev + 2; // ~2.5-3 seconds to fill depending on frame rate/interval
        });
      }, 50);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressing]);

  const triggerSOS = () => {
    if (!currentLocation) {
      alert("Location not available yet.");
      return;
    }
    const { lat, lng } = currentLocation;
    const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
    const body = `EMERGENCY: I need help. My GPS: ${lat}, ${lng}. View on map: ${mapUrl}`;
    const encodedBody = encodeURIComponent(body);
    window.location.href = `sms:${contactNumber}?body=${encodedBody}`;
  };

  return (
    <div className="relative">
      {pressing && (
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-600 text-white text-xs font-bold px-3 py-1 rounded shadow-md animate-pulse">
          KEEP HOLDING FOR SOS
        </div>
      )}
      <button
        onMouseDown={startPress}
        onMouseUp={endPress}
        onTouchStart={startPress}
        onTouchEnd={endPress}
        className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-xl transition-all duration-200 ${
          pressing ? 'scale-110 bg-red-700' : 'bg-red-600 hover:bg-red-700'
        }`}
      >
        <svg className="absolute w-full h-full -rotate-90 pointer-events-none">
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="white"
            strokeWidth="4"
            fill="transparent"
            className="opacity-30"
          />
          <circle
            cx="32"
            cy="32"
            r="28"
            stroke="white"
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={175.93} // 2 * pi * 28
            strokeDashoffset={175.93 - (175.93 * progress) / 100}
            className="transition-all duration-75"
          />
        </svg>
        <AlertTriangle className="text-white w-8 h-8 relative z-10" />
      </button>
    </div>
  );
};