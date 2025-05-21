
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
  console.log('results:', results)
  // Audiogram configuration
  const frequencies = [1000, 2000, 4000];
  const dbLevels = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  
  const getPositionX = (frequency: number) => {
    const index = frequencies.indexOf(frequency);
    if (index === -1) return 0;
    return (index / (frequencies.length - 1)) * 100;
  };
  
  const getPositionY = (db: number) => {
    const minDb = dbLevels[0];
    const maxDb = dbLevels[dbLevels.length - 1];
    
    // Clamp db within range
    const clampedDb = Math.max(minDb, Math.min(db, maxDb));
  
    // Y increases as dB increases (worse hearing = lower on graph)
    const percentage = (clampedDb - minDb) / (maxDb - minDb);
    return percentage * 100;
  };
    
  return (
    <div className="bg-white rounded-lg border overflow-hidden p-4">
      <div className="relative audiogram-grid">
        {/* Frequency labels across the top */}
        <div className="absolute -top-5 left-0 w-full flex justify-between pr-6 pl-2">
          {frequencies.map(freq => (
            <span key={freq} className="text-xs text-gray-600">
              {freq} Hz
            </span>
          ))}
        </div>
        
        {/* dB labels down the left side */}
        <div className="absolute top-0 -left-0 h-full flex flex-col justify-between pr-2 text-right">
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
        {results.map((result, index) => {
          const isRight = result.ear === 'right';
          const x = getPositionX(result.frequency);
          const y = getPositionY(result.threshold);
          
          return (
            <div
              key={index}
              className="absolute"
              style={{
                left: `${x}%`,
                top: `${y + (isRight ? 0 : 1.5)}%`, // slight offset for left ear to prevent overlap
                transform: 'translate(-50%, -50%)',
                color: isRight ? '#1A73E8' : '#4CAF50',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {isRight ? '×' : '●'}
            </div>
          );
        })}

        
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

      <div className="p-2 bg-medical-blue-light text-xs font-medium mt-2">
        <div className='flex justify-center gap-8'>
        <span className="inline-block text-green-600">
          ● Left Ear (Green)
        </span>
        <span className="inline-block mr-4 text-blue-600">
          ● Right Ear (Blue)
        </span>
        </div>         
      </div>
    </div>
  );
};

export default Audiogram;
