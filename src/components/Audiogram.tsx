import React, { useRef, useEffect, useState } from 'react';

interface ThresholdResult {
  ear: 'right' | 'left';
  frequency: 500 | 1000 | 2000 | 4000;
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
  const frequencies = [500, 1000, 2000, 4000];
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

  // Helper function to check if two line segments overlap
  const doLinesOverlap = (line1: { x1: number, y1: number, x2: number, y2: number }, 
                          line2: { x1: number, y1: number, x2: number, y2: number }) => {
    const tolerance = 10; // pixels - increased tolerance for better detection
    
    // Check if the segments cover the same frequency range (x-axis overlap)
    const xOverlap = Math.max(0, Math.min(line1.x2, line2.x2) - Math.max(line1.x1, line2.x1));
    if (xOverlap < 20) return false; // Need significant x-axis overlap
    
    // Sample multiple points along the overlapping x range to check y distance
    const startX = Math.max(line1.x1, line2.x1);
    const endX = Math.min(line1.x2, line2.x2);
    const numSamples = 5;
    
    for (let i = 0; i <= numSamples; i++) {
      const x = startX + (endX - startX) * (i / numSamples);
      
      // Get y coordinates at this x for both lines
      const t1 = (x - line1.x1) / (line1.x2 - line1.x1);
      const t2 = (x - line2.x1) / (line2.x2 - line2.x1);
      
      if (t1 >= 0 && t1 <= 1 && t2 >= 0 && t2 <= 1) {
        const y1 = line1.y1 + t1 * (line1.y2 - line1.y1);
        const y2 = line2.y1 + t2 * (line2.y2 - line2.y1);
        
        if (Math.abs(y1 - y2) < tolerance) {
          return true; // Lines are close at this point
        }
      }
    }
    
    return false;
  };

  // Helper function to create dotted line path
  const createDottedPath = (points: string[], color: string, isOverlapping: boolean, earType: 'left' | 'right') => {
    if (points.length < 2) return '';
    
    const dashLength = 6;
    const gapLength = 3;
    const totalDashUnit = dashLength + gapLength;
    
    let pathData = '';
    
    for (let i = 0; i < points.length - 1; i++) {
      const [x1, y1] = points[i].split(',').map(Number);
      const [x2, y2] = points[i + 1].split(',').map(Number);
      
      const segmentLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const numDashes = Math.ceil(segmentLength / totalDashUnit);
      
      for (let j = 0; j < numDashes; j++) {
        let startProgress = (j * totalDashUnit) / segmentLength;
        let endProgress = Math.min(((j * totalDashUnit) + dashLength) / segmentLength, 1);
        
        // For overlapping lines, offset blue dashes by 1 unit (as requested)
        if (isOverlapping && earType === 'left') {
          const offset = dashLength / segmentLength;
          startProgress = (startProgress + offset) % 1;
          endProgress = Math.min(startProgress + (dashLength / segmentLength), 1);
          
          // Handle wrap-around at the end
          if (startProgress > endProgress) {
            // Draw two segments: one from start to end of line, one from beginning
            const endX = x1 + (x2 - x1) * 1;
            const endY = y1 + (y2 - y1) * 1;
            const startX = x1 + (x2 - x1) * startProgress;
            const startY = y1 + (y2 - y1) * startProgress;
            
            pathData += `M ${startX} ${startY} L ${endX} ${endY} `;
            
            // Second segment from beginning
            const newEndX = x1 + (x2 - x1) * endProgress;
            const newEndY = y1 + (y2 - y1) * endProgress;
            pathData += `M ${x1} ${y1} L ${newEndX} ${newEndY} `;
            continue;
          }
        }
        
        if (startProgress < 1 && endProgress > 0) {
          const startX = x1 + (x2 - x1) * startProgress;
          const startY = y1 + (y2 - y1) * startProgress;
          const endX = x1 + (x2 - x1) * endProgress;
          const endY = y1 + (y2 - y1) * endProgress;
          
          pathData += `M ${startX} ${startY} L ${endX} ${endY} `;
        }
      }
    }
    
    return pathData;
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden px-8 pt-10 pb-4 mt-4">
      <div
        ref={containerRef}
        className="relative audiogram-grid h-[300px] audiogram-container"
      >
        {/* Passing zone background */}
        <div
          className="absolute bg-blue-100"
          style={{
            left: `${getPositionX(500)}px`,
            top: `${getPositionY(0)}px`,
            width: `${getPositionX(4000) - getPositionX(500)}px`,
            height: `${getPositionY(30) - getPositionY(0)}px`,
            zIndex: 0
          }}
        />
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
              {freq}{freq === 4000 ? 'Hz' : ''}
            </span>
          ))}
        </div>

        {/* dB labels down the left side */}
        <div className="absolute left-[-25px] top-0 w-8">
          {dbLevels.map((db) => {
            const y = getPositionY(db);

            return (
              <div
                key={db}
                className="absolute text-xs text-gray-600 text-right leading-tight"
                style={{
                  top: `${y}px`,
                  transform: 'translateY(-50%)',
                }}
              >
                {db === 60 ? (
                  <div>
                    <div>&gt;50</div>
                    <div style={{ textAlign: 'left', marginLeft: '1px' }}>dB</div>
                  </div>
                ) : (
                  db
                )}
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

        {/* 🔧 CHANGED: Connect points with dotted lines */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {(() => {
            // Get both ear results
            const rightResults = results
              .filter(r => r.ear === 'right')
              .sort((a, b) => a.frequency - b.frequency);
            const leftResults = results
              .filter(r => r.ear === 'left')
              .sort((a, b) => a.frequency - b.frequency);

            // Create line segments for overlap detection
            const rightSegments = [];
            const leftSegments = [];

            for (let i = 0; i < rightResults.length - 1; i++) {
              const curr = rightResults[i];
              const next = rightResults[i + 1];
              rightSegments.push({
                x1: getPositionX(curr.frequency),
                y1: getPositionY(curr.threshold),
                x2: getPositionX(next.frequency),
                y2: getPositionY(next.threshold),
                freq1: curr.frequency,
                freq2: next.frequency
              });
            }

            for (let i = 0; i < leftResults.length - 1; i++) {
              const curr = leftResults[i];
              const next = leftResults[i + 1];
              leftSegments.push({
                x1: getPositionX(curr.frequency),
                y1: getPositionY(curr.threshold),
                x2: getPositionX(next.frequency),
                y2: getPositionY(next.threshold),
                freq1: curr.frequency,
                freq2: next.frequency
              });
            }

            // Find overlapping segments
            const overlappingSegments = new Set();
            rightSegments.forEach((rightSeg, rightIdx) => {
              leftSegments.forEach((leftSeg, leftIdx) => {
                if (doLinesOverlap(rightSeg, leftSeg)) {
                  overlappingSegments.add(`right-${rightIdx}`);
                  overlappingSegments.add(`left-${leftIdx}`);
                }
              });
            });

            return (
              <>
                {/* Right ear (red) dotted lines */}
                {rightSegments.map((segment, index) => {
                  const isOverlapping = overlappingSegments.has(`right-${index}`);
                  const points = [`${segment.x1},${segment.y1}`, `${segment.x2},${segment.y2}`];
                  
                  return (
                    <path
                      key={`right-${index}`}
                      d={createDottedPath(points, '#EF4444', isOverlapping, 'right')}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="2"
                    />
                  );
                })}

                {/* Left ear (blue) dotted lines */}
                {leftSegments.map((segment, index) => {
                  const isOverlapping = overlappingSegments.has(`left-${index}`);
                  const points = [`${segment.x1},${segment.y1}`, `${segment.x2},${segment.y2}`];
                  
                  return (
                    <path
                      key={`left-${index}`}
                      d={createDottedPath(points, '#3B82F6', isOverlapping, 'left')}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2"
                    />
                  );
                })}
              </>
            );
          })()}
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
              {isRight ? 'O' : 'X'}
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
          <span className="inline-block text-red-600">O Right Ear (Red)</span>
          <span className="inline-block mr-4 text-blue-600">X Left Ear (Blue)</span>
        </div>
      </div>
    </div>
  );
};

export default Audiogram;
