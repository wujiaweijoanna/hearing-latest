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
  const [testStarted, setTestStarted] = useState(false);
  const [testTonePlayed, setTestTonePlayed] = useState(false);
  const frequencies: number[] = [1000, 2000, 4000];

  useEffect(() => {
    const context = new AudioContext();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  const playTone = useCallback(async (frequency: number, dB: number, duration: number) => {
    if (!audioContext) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying(true);

    const amplitude = Math.pow(10, (dB - 100) / 20);

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const panner = audioContext.createStereoPanner();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gainNode.gain.value = 0.2;
    panner.pan.value = currentEar === 'right' ? 1 : -1;

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
  }, [audioContext, currentEar]);

  // Start test - play familiarization tone
  const startTest = () => {
    if (!audioContext) {
      const context = new AudioContext();
      setAudioContext(context);
    }

    setStartTime(new Date());
    toast.info('Playing familiarization tone at 40 dB HL');
    playTone(1000, 40, 1.5);

    setCurrentEar('right');
    setCurrentFrequency(1000);
    setCurrentDb(20);
    setFrequencyIndex(0);
    setResponseStatus('waiting');
    setCurrentAttempt(0);
    setTestStarted(true);
    setTestTonePlayed(false);
  };

  // Play current test tone when user clicks button
  const playCurrentTestTone = () => {
    if (isPlaying) return;
    playTone(currentFrequency, currentDb, 1.5);
    setResponseStatus('waiting');
    setTestTonePlayed(true);
  };

  // Handle user response
  const recordResponse = (heard: boolean) => {
    if (isPlaying) return;

    if (heard) {
      setResponseStatus('responded');
      addThresholdResult({
        ear: currentEar,
        frequency: currentFrequency as 1000 | 2000 | 4000,
        threshold: currentDb,
        passed: currentDb <= 20,
      });
      setCurrentDb(20);
      setCurrentAttempt(0);

      // After 3s, go to next frequency and auto play tone
      setTimeout(() => {
        moveToNextFrequency();
      }, 3000);
    } else {
      // Increase level on no response
      const nextDb = currentDb + 5;
      if (nextDb > 50) {
        // max level reached, record failed and move on
        setResponseStatus('failed');
        setCurrentAttempt(0);
        setTimeout(() => {
          moveToNextFrequency();
        }, 3000);
      } else {
        setCurrentDb(nextDb);
        setCurrentAttempt(0);
        setResponseStatus('waiting');
        // Play next louder tone after 3s
        setTimeout(() => {
          playTone(currentFrequency, nextDb, 1.5);
          setTestTonePlayed(true);
        }, 3000);
      }
    }
    setTestTonePlayed(false);
  };

  // Move to next frequency or ear or complete test
  const moveToNextFrequency = () => {
    const nextIndex = frequencyIndex + 1;

    if (nextIndex < frequencies.length) {
      setFrequencyIndex(nextIndex);
      setCurrentFrequency(frequencies[nextIndex] as 1000 | 2000 | 4000);
      setCurrentDb(20);
      setCurrentAttempt(0);
      setResponseStatus('waiting');

      // Auto play next tone after 3s
      setTimeout(() => {
        playTone(frequencies[nextIndex], 20, 1.5);
        setTestTonePlayed(true);
      }, 3000);
    } else if (currentEar === 'right') {
      setCurrentEar('left');
      setFrequencyIndex(0);
      setCurrentFrequency(1000);
      setCurrentDb(20);
      setCurrentAttempt(0);
      setResponseStatus('waiting');

      setTimeout(() => {
        playTone(1000, 20, 1.5);
        setTestTonePlayed(true);
      }, 3000);
    } else {
      completeTest();
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
                Click "Play Test Tone" to begin each tone. Then respond to advance automatically.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {!testStarted ? (
                <div className="text-center">
                  <Button
                    className="bg-medical-blue hover:bg-medical-blue-dark mb-4"
                    size="lg"
                    onClick={startTest}
                    disabled={isPlaying}
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
                  {!testTonePlayed ? (
                    <Button
                      className="w-full mb-4"
                      size="lg"
                      onClick={playCurrentTestTone}
                      disabled={isPlaying}
                    >
                      <Volume className="mr-2 h-5 w-5" />
                      Play Test Tone ({currentFrequency} Hz at {currentDb} dB)
                    </Button>
                  ) : (
                    <p className="text-center mb-4 text-gray-700">
                      Tone played. Awaiting response...
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-16 border-2 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      disabled={!testTonePlayed || isPlaying || responseStatus !== 'waiting'}
                      onClick={() => recordResponse(false)}
                    >
                      No Response
                    </Button>

                    <Button
                      variant="outline"
                      className="h-16 border-2 border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                      disabled={!testTonePlayed || isPlaying || responseStatus !== 'waiting'}
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
                disabled={isPlaying}
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
