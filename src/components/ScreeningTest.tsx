
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
    responseStatus, setResponseStatus,
    setCurrentPhase,
    thresholdResults, addThresholdResult,
    currentAttempt, setCurrentAttempt,
    startTime, setStartTime
  } = useTest();

  const [isPlaying, setIsPlaying] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [frequencyIndex, setFrequencyIndex] = useState(0);
  const frequencies: number[] = [1000, 2000, 4000];
  
  // Initialize AudioContext
  useEffect(() => {
    const context = new AudioContext();
    setAudioContext(context);
    
    return () => {
      context.close();
    };
  }, []);

  // Play tone function
  const playTone = useCallback(async(frequency: number, dB: number, duration: number) => {
    if (!audioContext) return;

    console.log('Playing tone:', frequency, 'Hz at', dB, 'dB');
    console.log('AudioContext state:', audioContext.state);

    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    setIsPlaying(true);
    
    // Convert dB HL to amplitude (simplified)
    // Note: Proper calibration would require actual measurement and calibration
    const amplitude = Math.pow(10, (dB - 100) / 20);
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.2;
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    
    // Apply a slight fade in/out to avoid clicks
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(amplitude, audioContext.currentTime + 0.05);
    gainNode.gain.setValueAtTime(amplitude, audioContext.currentTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
    
    setTimeout(() => {
      oscillator.stop();
      setIsPlaying(false);
    }, duration * 1000);
  }, [audioContext]);

  // Start the test with a familiarization tone
  const startTest = () => {
    if (!audioContext) {
      const context = new AudioContext();
      setAudioContext(context);
    };
    
    setStartTime(new Date());
    toast.info('Playing familiarization tone at 40 dB HL');
    
    // Play a familiarization tone at 40 dB HL @ 1000 Hz
    playTone(1000, 40, 1.5);
    
    // Set the initial test parameters
    setCurrentEar('right');
    setCurrentFrequency(1000);
    setCurrentDb(20);
    setFrequencyIndex(0);
    setResponseStatus('waiting');
    setCurrentAttempt(0);
  };

  // Play the current test tone
  const playTestTone = () => {
    if (currentAttempt >= 3 && responseStatus === 'waiting') {
      // No response after 3 attempts
      setResponseStatus('failed');
      return;
    }
    
    setCurrentAttempt(prev => prev + 1);
    playTone(currentFrequency, currentDb, 1.5);
  };

  // Handle the user response (record the examiner's observation)
  const recordResponse = (heard: boolean) => {
    if (heard) {
      setResponseStatus('responded');
      
      // Record threshold in threshold mode (when dB is not 20)
      if (currentDb !== 20) {
        // In threshold mode, record this threshold and continue
        addThresholdResult({
          ear: currentEar,
          frequency: currentFrequency as 1000 | 2000 | 4000,
          threshold: currentDb,
          passed: currentDb <= 20
        });
        
        // Go back to screening mode for the next frequency
        setCurrentDb(20);
        moveToNextFrequency();
      } else {
        // In regular screening mode
        moveToNextFrequency();
      }
    } else if (currentDb === 20) {
      // Failed at screening level - move to threshold mode
      setCurrentDb(25); // Start threshold mode at 25 dB
      setCurrentAttempt(0);
      setResponseStatus('waiting');
    } else {
      // In threshold mode - increase by 5dB and try again
      setCurrentDb(prev => prev + 5);
      setCurrentAttempt(0);
      setResponseStatus('waiting');
    }
  };

  // Move to the next frequency or ear
  const moveToNextFrequency = () => {
    const nextIndex = frequencyIndex + 1;
    
    if (nextIndex < frequencies.length) {
      // Move to the next frequency for the same ear
      setFrequencyIndex(nextIndex);
      setCurrentFrequency(frequencies[nextIndex] as 1000 | 2000 | 4000);
      setCurrentAttempt(0);
      setResponseStatus('waiting');
    } else if (currentEar === 'right') {
      // Move to the left ear, starting with 1000 Hz
      setCurrentEar('left');
      setFrequencyIndex(0);
      setCurrentFrequency(1000);
      setCurrentAttempt(0);
      setResponseStatus('waiting');
    } else {
      // Test is complete
      completeTest();
    }
  };

  // Complete the test and show results
  const completeTest = () => {
    setCurrentPhase('results');
    toast.success('Testing complete. Viewing results...');
  };

  // Calculate total test time
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
        <div>
          <Card className="mb-6">
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Current Test Status</CardTitle>
              <CardDescription>
                Testing {currentEar === 'right' ? 'Right' : 'Left'} Ear at {currentFrequency} Hz
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-500">Ear</p>
                  <p className={`text-xl font-semibold ${currentEar === 'right' ? 'text-medical-blue' : 'text-medical-green'}`}>
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
                  <p className="text-sm text-gray-500">Attempt</p>
                  <p className="text-xl font-semibold text-medical-blue">
                    {responseStatus === 'responded' ? 'Responded' : 
                     responseStatus === 'failed' ? 'Failed' : 
                     `${currentAttempt}/3`}
                  </p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg text-center col-span-2">
                  <p className="text-sm text-gray-500">Test Duration</p>
                  <p className="text-xl font-semibold text-medical-blue">{getTestDuration()}</p>
                </div>
              </div>
              
              <div className="border p-4 rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-700 mb-2">Instructions for child:</h3>
                <p className="text-sm bg-white p-3 border rounded">
                  "Give me a thumbs up if you hear the beep."
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Test Controls</CardTitle>
              <CardDescription>
                Play tones and record responses
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              {!startTime ? (
                <div className="text-center">
                  <Button 
                    className="bg-medical-blue hover:bg-medical-blue-dark mb-4"
                    size="lg"
                    onClick={startTest}
                  >
                    <Headphones className="mr-2 h-5 w-5" />
                    Start Test with Familiarization Tone
                  </Button>
                  <p className="text-sm text-gray-500">
                    Make sure headphones are properly placed on the child
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <Button 
                      className={`w-full h-16 ${isPlaying ? 'bg-muted' : 'bg-medical-blue hover:bg-medical-blue-dark'}`}
                      disabled={isPlaying || responseStatus === 'responded'}
                      onClick={playTestTone}
                    >
                      <Volume className="mr-2 h-5 w-5" />
                      Play Tone ({currentFrequency} Hz at {currentDb} dB)
                    </Button>
                    
                    {isPlaying && (
                      <p className="text-center text-sm text-medical-blue mt-2">
                        Playing tone...
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-16 border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      disabled={isPlaying || responseStatus !== 'waiting' || currentAttempt === 0}
                      onClick={() => recordResponse(false)}
                    >
                      No Response
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="h-16 border-2 border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                      disabled={isPlaying || responseStatus !== 'waiting' || currentAttempt === 0}
                      onClick={() => recordResponse(true)}
                    >
                      Responded
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
            
            <CardFooter className="border-t bg-gray-50 p-4">
              <Button 
                variant="outline" 
                className="ml-auto"
                onClick={completeTest}
              >
                End Test & View Results
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div>
          <Card className="h-full">
            <CardHeader className="bg-medical-blue-light border-b">
              <CardTitle className="text-medical-blue">Audiogram</CardTitle>
              <CardDescription>
                Visual representation of hearing thresholds (Examiner view only)
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6">
              <Audiogram 
                results={thresholdResults} 
                currentEar={currentEar} 
                currentFrequency={currentFrequency} 
                showCurrent={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ScreeningTest;
