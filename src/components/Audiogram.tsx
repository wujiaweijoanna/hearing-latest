import React, { useRef, useEffect, useState } from 'react';

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
  currentDb?: number;
  showCurrent?: boolean;
}

const Audiogram: React.FC<AudiogramProps> = ({
  results,
  currentEar,
  currentFrequency,
  currentDb,
  showCurrent = false
}) => {
  const frequencies = [1000, 2000, 4000];
  const dbLevels = [0, 10, 20, 30, 40, 50, 60];
  const containerRef = useRef<HTMLDivElement>(null); // 🔧 CHANGED
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); // 🔧 CHANGED

  useEffect(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      setDimensions({ width: offsetWidth, height: offsetHeight });
    }
  }, []);

  const getPositionX = (frequency: number) => {
    const index = frequencies.indexOf(frequency);
    return (index / (frequencies.length - 1)) * dimensions.width;
  };

  const getPositionY = (db: number) => {
    const minDb = dbLevels[0];
    const maxDb = dbLevels[dbLevels.length - 1];
    const clampedDb = Math.max(minDb, Math.min(db, maxDb));
    const percentage = (clampedDb - minDb) / (maxDb - minDb);
    return percentage * dimensions.height;
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden px-8 pt-10 pb-4 mt-4">
      <div
        ref={containerRef} // 🔧 CHANGED
        className="relative audiogram-grid h-[300px] audiogram-container" // 🔧 CHANGED: Fixed height for calculation
      >
        {/* Frequency labels across the top */}
        <div className="absolute top-[-18px] left-0 w-full">
          {frequencies.map((freq, index) => (
            <span
              key={freq}
              className="absolute text-xs text-gray-600"
              style={{
                left: `${(index / (frequencies.length - 1)) * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {freq}{freq === 2000 ? ' Hz' : ''}
            </span>
          ))}
        </div>

        {/* dB labels down the left side */}
        <div className="absolute left-[-25px] top-0 w-8">
          {dbLevels.map((db) => {
            const y = getPositionY(db); // 💡 Use the same Y positioning as grid lines

            return (
              <div
                key={db}
                className="absolute text-xs text-gray-600 text-right leading-tight"
                style={{
                  top: `${y}px`,
                  transform: 'translateY(-50%)',
                }}
              >
                {db === 60 ? '>50' : db}
              </div>
            );
          })}
        </div>


        {/* Vertical and horizontal grid lines */}
        {frequencies.map((freq, index) => (
          <div
            key={freq}
            className="frequency-line"
            style={{
              left: `${(index / (frequencies.length - 1)) * 100}%`
            }}
          />
        ))}
        {dbLevels.map((db, index) => (
          <div
            key={db}
            className="db-line"
            style={{
              top: `${(index / (dbLevels.length - 1)) * 100}%`
            }}
          />
        ))}

        {/* 🔧 CHANGED: Connect points with lines */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {['left', 'right'].map(ear => {
            const color = ear === 'right' ? '#EF4444' : '#3B82F6';
            const earResults = results
              .filter(r => r.ear === ear)
              .sort((a, b) => a.frequency - b.frequency);

            if (earResults.length < 2) return null;

            const points = earResults.map(r => {
              const x = getPositionX(r.frequency);
              const y = getPositionY(r.threshold);
              return `${x},${y}`;
            });

            return (
              <polyline
                key={ear}
                className='audiogram-line'
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points.join(' ')}
              />
            );
          })}
        </svg>

        {/* Data points as X or O */}
        {results.map((result, index) => {
          const isRight = result.ear === 'right';
          const x = getPositionX(result.frequency);
          const y = getPositionY(result.threshold); // offset left ear slightly

          return (
            <div
              key={index}
              className="absolute audiogram-data-point"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
                color: isRight ? '#EF4444' : '#3B82F6',
                fontSize: '1rem',
                fontWeight: 'bold'
              }}
            >
              {isRight ? 'X' : 'O'}
            </div>
          );
        })}

        {/* Optional current test marker */}
        {showCurrent && currentEar && currentFrequency != null && currentDb != null && (
          <div
            className={`hearing-point ${currentEar} active-frequency`}
            style={{
              left: `${getPositionX(currentFrequency)}px`,
              top: `${getPositionY(currentDb)}px`,
              opacity: 0.5,
              backgroundColor:
                currentEar === 'right' ? '#EF4444' : '#3B82F6'
            }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="p-2 bg-gray-50 text-xs text-gray-500 border-t">
        <div className="flex justify-between">
          <span>Better Hearing ↑</span>
          <span>Poorer Hearing ↓</span>
        </div>
      </div>

      <div className="p-2 bg-medical-blue-light text-xs font-medium mt-2">
        <div className="flex justify-center gap-8">
          <span className="inline-block text-blue-600">O Left Ear (Blue)</span>
          <span className="inline-block mr-4 text-red-600">X Right Ear (Red)</span>
        </div>
      </div>
    </div>
  );
};

export default Audiogram;
