
import React from 'react';

interface ThresholdResult {
  ear: 'right' | 'left';
  frequency: 1000 | 2000 | 4000;
  threshold: number;
  passed: boolean;
}

interface AudiogramProps {
  results: ThresholdResult[];
  currentEar?: 'right' | 'left';
  currentFrequency?: number;
  showCurrent?: boolean;
}

const Audiogram: React.FC<AudiogramProps> = ({ 
  results, 
  currentEar, 
  currentFrequency,
  showCurrent = false
}) => {
  // Audiogram configuration
  const frequencies = [1000, 2000, 4000];
  const dbLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  
  const getPositionX = (frequency: number) => {
    const index = frequencies.indexOf(frequency);
    if (index === -1) return 0;
    return (index / (frequencies.length - 1)) * 100;
  };
  
  const getPositionY = (db: number) => {
    const index = dbLevels.indexOf(db);
    if (index === -1) {
      // Find the closest db level
      const closestDb = dbLevels.reduce((prev, curr) => 
        Math.abs(curr - db) < Math.abs(prev - db) ? curr : prev
      );
      const closestIndex = dbLevels.indexOf(closestDb);
      return (closestIndex / (dbLevels.length - 1)) * 100;
    }
    return (index / (dbLevels.length - 1)) * 100;
  };
  
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-2 bg-medical-blue-light text-xs font-medium text-center text-medical-blue">
        <span className="inline-block mr-4">
          ● Right Ear (Blue)
        </span>
        <span className="inline-block">
          ● Left Ear (Green)
        </span>
      </div>
      <div className="p-4 relative audiogram-grid">
        {/* Frequency labels across the top */}
        <div className="absolute -top-6 left-0 w-full flex justify-between px-3">
          {frequencies.map(freq => (
            <span key={freq} className="text-xs text-gray-600">
              {freq} Hz
            </span>
          ))}
        </div>
        
        {/* dB labels down the left side */}
        <div className="absolute top-0 -left-8 h-full flex flex-col justify-between">
          {dbLevels.map(db => (
            <span key={db} className="text-xs text-gray-600">
              {db} dB
            </span>
          ))}
        </div>
        
        {/* Frequency vertical lines */}
        {frequencies.map((freq, index) => (
          <div 
            key={freq}
            className="frequency-line"
            style={{ left: `${(index / (frequencies.length - 1)) * 100}%` }}
          />
        ))}
        
        {/* dB horizontal lines */}
        {dbLevels.map((db, index) => (
          <div 
            key={db}
            className="db-line"
            style={{ top: `${(index / (dbLevels.length - 1)) * 100}%` }}
          />
        ))}
        
        {/* Pass/Fail threshold line at 20dB */}
        <div 
          className="db-line"
          style={{ 
            top: `${getPositionY(20)}%`, 
            backgroundColor: 'rgba(220, 38, 38, 0.3)', 
            height: '2px' 
          }}
        />
        <div 
          className="absolute text-xs text-red-500 right-0"
          style={{ top: `${getPositionY(20)}%` }}
        >
          Pass/Fail Line
        </div>
        
        {/* Plot the results */}
        {results.map((result, index) => (
          <div
            key={index}
            className={`hearing-point ${result.ear}`}
            style={{
              left: `${getPositionX(result.frequency)}%`,
              top: `${getPositionY(result.threshold)}%`,
              backgroundColor: result.ear === 'right' ? '#1A73E8' : '#4CAF50'
            }}
          />
        ))}
        
        {/* Show the current frequency being tested */}
        {showCurrent && currentEar && currentFrequency && (
          <div
            className={`hearing-point ${currentEar} active-frequency`}
            style={{
              left: `${getPositionX(currentFrequency)}%`,
              top: `${getPositionY(0)}%`,
              opacity: 0.5,
              backgroundColor: currentEar === 'right' ? '#1A73E8' : '#4CAF50'
            }}
          />
        )}
      </div>
      
      <div className="p-2 bg-gray-50 text-xs text-gray-500 border-t">
        <div className="flex justify-between">
          <span>Better Hearing ↑</span>
          <span>Poorer Hearing ↓</span>
        </div>
      </div>
    </div>
  );
};

export default Audiogram;
