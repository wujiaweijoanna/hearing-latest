import React, { useState, useEffect, useCallback } from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Audiogram from './Audiogram';
import { Volume, Headphones } from 'lucide-react';

const ScreeningTest = () => {
  const {
    currentEar, setCurrentEar,
    currentFrequency, setCurrentFrequency,
    currentDb, setCurrentDb,
    setCurrentPhase,
    thresholdResults, addThresholdResult,
    startTime, setStartTime,
    remarks, setRemarks,
    calibrationData
  } = useTest();

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [frequencyIndex, setFrequencyIndex] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [testTonePlayed, setTestTonePlayed] = useState(false);
  const [phase, setPhase] = useState<'descending' | 'ascending'>('descending');
  const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);
  const [showSaveButton, setShowSaveButton] = useState(false);
  const frequencies: number[] = [500, 1000, 2000, 4000];

  useEffect(() => {
    const context = new AudioContext();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  // Initialize Web Speech API voices
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const playTone = useCallback(async (frequency: number, dB: number, duration: number, ear: 'left' | 'right') => {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying(true);

    // Apply calibration offset for 500Hz, 1000Hz, 2000Hz, and 4000Hz tones
    let adjustedDb = dB;
    if (frequency === 1000 && calibrationData.isCalibrated1000 && calibrationData.referenceDb1000 !== null) {
      // The user's calibration reference becomes their personal 15dB threshold
      // So we need to adjust all 1000Hz tones relative to this reference
      const calibrationOffset = calibrationData.referenceDb1000 - 15;
      adjustedDb = dB + calibrationOffset;
    } else if (frequency === 500 && calibrationData.isCalibrated500 && calibrationData.referenceDb500 !== null) {
      // The user's calibration reference becomes their personal 15dB threshold
      // So we need to adjust all 500Hz tones relative to this reference
      const calibrationOffset = calibrationData.referenceDb500 - 15;
      adjustedDb = dB + calibrationOffset;
    } else if (frequency === 2000 && calibrationData.isCalibrated2000 && calibrationData.referenceDb2000 !== null) {
      // The user's calibration reference becomes their personal 15dB threshold
      // So we need to adjust all 2000Hz tones relative to this reference
      const calibrationOffset = calibrationData.referenceDb2000 - 15;
      adjustedDb = dB + calibrationOffset;
    } else if (frequency === 4000 && calibrationData.isCalibrated4000 && calibrationData.referenceDb4000 !== null) {
      // The user's calibration reference becomes their personal 15dB threshold
      // So we need to adjust all 4000Hz tones relative to this reference
      const calibrationOffset = calibrationData.referenceDb4000 - 15;
      adjustedDb = dB + calibrationOffset;
    }

    const amplitude = Math.pow(10, (adjustedDb - 100) / 20);

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const panner = audioContext.createStereoPanner();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.2;
    panner.pan.value = ear === 'right' ? 1 : -1;

    oscillator.connect(gainNode);
    gainNode.connect(panner);
    panner.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.05);
    gainNode.gain.setValueAtTime(amplitude, now + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    oscillator.onended = () => {
      setIsPlaying(false);
    };
  }, [audioContext, calibrationData]);

  const playInstructions = useCallback(async () => {
    setIsPlayingInstructions(true);
    
    // Create speech synthesis utterance
    const utterance = new SpeechSynthesisUtterance(
      "Welcome to the hearing test. During this test, you'll hear a series of sounds. When you hear a sound, please respond by giving a thumbs up."
    );
    
    // Set voice properties for a professional female voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => voice.name.includes('Female') || voice.name.includes('female'));
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }
    utterance.pitch = 1;
    utterance.rate = 0.9;
    
    // Play instructions
    return new Promise<void>((resolve) => {
      utterance.onend = async () => {
        // Play "Let's begin"
        const finalUtterance = new SpeechSynthesisUtterance("Let's begin.");
        if (femaleVoice) {
          finalUtterance.voice = femaleVoice;
        }
        finalUtterance.onend = () => {
          setIsPlayingInstructions(false);
          // Set test as started right after instructions finish
          setTestStarted(true);
          resolve();
        };
        window.speechSynthesis.speak(finalUtterance);
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const startTest = async () => {
    if (!audioContext) return;

    setTestStarted(true);
    setStartTime(new Date());
    setCurrentEar('right');
    setCurrentFrequency(500);
    setCurrentDb(50);
    setFrequencyIndex(0);
    setPhase('descending');
    
    // Wait 5 seconds before starting the test
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Play first tone
    toast.info('Starting test at 50 dB HL');
    await playTone(500, 50, 1.5, 'right');
    setTestTonePlayed(true);
  };

  const playCurrentTestTone = () => {
    if (isPlaying || isPlayingInstructions) return;
  
    if (!testStarted) {
      startTest();
    } else {
      playTone(currentFrequency, currentDb, 1.5, currentEar);
      setTestTonePlayed(true);
    }
  };

  const replayCurrentTone = () => {
    if (isPlaying || isPlayingInstructions || !testStarted) return;
    
    // Replay the same frequency and dB level
    playTone(currentFrequency, currentDb, 1.5, currentEar);
    setTestTonePlayed(true);
  };

  const recordResponse = (heard: boolean) => {
    if (isPlaying) return;
  
    const handleNextTone = (nextDb: number) => {
      setCurrentDb(nextDb);
      setTimeout(() => {
        playTone(currentFrequency, nextDb, 1.5, currentEar);
        setTestTonePlayed(true);
      }, 3000);
    };
  
    if (heard) {
      if (phase === 'descending' && currentDb > 30) {
        handleNextTone(currentDb - 10);
      } else {
        addThresholdResult({
          ear: currentEar,
          frequency: currentFrequency,
          threshold: currentDb,
          passed: currentDb <= 30,
        });
        setTimeout(moveToNextFrequency, 3000);
      }
    } else {
      // If can't hear at 50 dB — whether starting at 50 (descending) OR ascending phase
      if (currentDb === 50) {
        addThresholdResult({
          ear: currentEar,
          frequency: currentFrequency,
          threshold: 60,  // Record 60 in these cases
          passed: false,
        });
        setTimeout(moveToNextFrequency, 3000);
      } else {
        // Otherwise, go up by 10 and switch to ascending phase
        setPhase('ascending');
        handleNextTone(currentDb + 10);
      }
    }
  
    setTestTonePlayed(false);
  };

  const moveToNextFrequency = () => {
    const nextIndex = frequencyIndex + 1;

    if (nextIndex < frequencies.length) {
      const nextFrequency = frequencies[nextIndex] as 500 | 1000 | 2000 | 4000;
      setFrequencyIndex(nextIndex);
      setCurrentFrequency(nextFrequency);
      setCurrentDb(50);
      setPhase('descending');
      setTimeout(() => {
        playTone(nextFrequency, 50, 1.5, currentEar);
        setTestTonePlayed(true);
      }, 3000);
    } else if (currentEar === 'right') {
      setCurrentEar('left');
      setFrequencyIndex(0);
      setCurrentFrequency(500);
      setCurrentDb(50);
      setPhase('descending');
      setTimeout(() => {
        playTone(500, 50, 1.5, 'left');
        setTestTonePlayed(true);
      }, 3000);
    } else {
      setShowSaveButton(true);
    }
  };

  const completeTest = () => {
    setCurrentPhase('results');
    toast.success('Testing complete. Viewing results...');
  };

  const getTestDuration = () => {
    if (!startTime) return '0:00';
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6 flex flex-col">
          <Card>
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Current Test Status</CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Ear</p>
                  <p className={`text-xl font-semibold ${currentEar === 'right' ? 'text-red-600' : 'text-medical-blue'}`}>
                    {currentEar === 'right' ? 'Right' : 'Left'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Frequency</p>
                  <p className="text-xl font-semibold text-medical-blue">{currentFrequency} Hz</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Level</p>
                  <p className="text-xl font-semibold text-medical-blue">{currentDb} dB HL</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Test Duration</p>
                  <p className="text-xl font-semibold text-medical-blue">{getTestDuration()}</p>
                </div>
              </div>

              {!testStarted ? (
                <Button
                  className="w-full py-4 text-base font-medium flex items-center justify-center gap-2 bg-medical-blue text-white hover:bg-medical-blue-dark transition-all rounded-lg shadow"
                  onClick={playCurrentTestTone}
                  disabled={isPlaying || isPlayingInstructions}
                >
                  <Volume className="h-6 w-6" />
                  {isPlayingInstructions ? 'Playing Instructions...' : 'Start Hearing Test'}
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    disabled={!testTonePlayed || isPlaying}
                    onClick={() => recordResponse(false)}
                  >
                    No Response
                  </Button>

                  <Button
                    variant="outline"
                    className="h-16 border-2 border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                    disabled={!testTonePlayed || isPlaying}
                    onClick={() => recordResponse(true)}
                  >
                    Responded
                  </Button>

                  <Button
                    variant="outline"
                    className="col-span-2 h-16 border-2 border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                    disabled={!testTonePlayed || isPlaying}
                    onClick={replayCurrentTone}
                  >
                    Replay Tone
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-grow">
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Test Remarks</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex flex-col">
              <textarea
                className="w-full p-3 border rounded-md min-h-[120px] max-h-[200px]"
                placeholder="Enter any remarks or observations about the test..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </CardContent>
            {showSaveButton && (
              <CardFooter className="border-t bg-gray-50 p-4">
                <Button
                  className="ml-auto bg-medical-blue hover:bg-medical-blue-dark"
                  onClick={completeTest}
                >
                  Save & View Results
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Audiogram</CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <Audiogram
                results={thresholdResults}
                currentEar={currentEar}
                currentFrequency={currentFrequency}
                currentDb={currentDb}
                showCurrent={isPlaying}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScreeningTest;