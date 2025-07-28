import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, Volume, Circle, CircleCheck, VolumeX, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import { formatCalibrationDate } from '@/lib/utils';

const EnvironmentCheck = () => {
  const { 
    environmentCheck, 
    updateEnvironmentCheck, 
    setCurrentPhase, 
    patientInfo, 
    updatePatientInfo,
    calibrationData,
    saveCalibrationForFrequency,
    isLoadingCalibration
  } = useTest();
  const [noiseLevelInput, setNoiseLevelInput] = useState('');
  const [calibrationDb, setCalibrationDb] = useState(30);
  const [calibrationDb500, setCalibrationDb500] = useState(30);
  const [calibrationDb2000, setCalibrationDb2000] = useState(30);
  const [calibrationDb4000, setCalibrationDb4000] = useState(30);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlaying500, setIsPlaying500] = useState(false);
  const [isPlaying2000, setIsPlaying2000] = useState(false);
  const [isPlaying4000, setIsPlaying4000] = useState(false);
  const [isSavingCalibration, setIsSavingCalibration] = useState(false);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillator500Ref = useRef<OscillatorNode | null>(null);
  const gainNode500Ref = useRef<GainNode | null>(null);
  const oscillator2000Ref = useRef<OscillatorNode | null>(null);
  const gainNode2000Ref = useRef<GainNode | null>(null);
  const oscillator4000Ref = useRef<OscillatorNode | null>(null);
  const gainNode4000Ref = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const interval500Ref = useRef<NodeJS.Timeout | null>(null);
  const interval2000Ref = useRef<NodeJS.Timeout | null>(null);
  const interval4000Ref = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(false);

  useEffect(() => {
    const context = new AudioContext();
    setAudioContext(context);
    return () => {
      context.close();
    };
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (oscillatorRef.current) {
        oscillatorRef.current.stop();
        oscillatorRef.current.disconnect();
      }
      if (gainNodeRef.current) {
        gainNodeRef.current.disconnect();
      }
    };
  }, []);

  // Initialize calibration values from saved data
  useEffect(() => {
    if (!isLoadingCalibration) {
      // Only update if we have valid applied values, otherwise keep the default 30
      if (calibrationData.appliedDb500 !== null && !isNaN(calibrationData.appliedDb500)) {
        setCalibrationDb500(calibrationData.appliedDb500);
      }
      if (calibrationData.appliedDb1000 !== null && !isNaN(calibrationData.appliedDb1000)) {
        setCalibrationDb(calibrationData.appliedDb1000);
      }
      if (calibrationData.appliedDb2000 !== null && !isNaN(calibrationData.appliedDb2000)) {
        setCalibrationDb2000(calibrationData.appliedDb2000);
      }
      if (calibrationData.appliedDb4000 !== null && !isNaN(calibrationData.appliedDb4000)) {
        setCalibrationDb4000(calibrationData.appliedDb4000);
      }
    }
  }, [isLoadingCalibration, calibrationData]);

  const startContinuousTone = useCallback(async () => {
    if (!audioContext || isPlaying) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying(true);
    let playCount = 0;

    const playToneInterval = () => {
      if (!isMounted.current) return;
      
      const amplitude = Math.pow(10, (calibrationDb - 100) / 20);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 1000; // 1000Hz tone
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      // Start with zero gain
      gainNode.gain.setValueAtTime(0, now);
      // Quick fade in
      gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.01);
      // Hold at target amplitude
      gainNode.gain.setValueAtTime(amplitude, now + 0.99);
      // Quick fade out
      gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

      oscillator.start(now);
      oscillator.stop(now + 1.0);

      // Clean up when this oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      };

      playCount++;
      
      // Stop after 2 cycles (on-off-on-off)
      if (playCount >= 2) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setIsPlaying(false);
      }
    };

    // Start the first tone immediately
    playToneInterval();

    // Set up interval to play tone every 2 seconds (1s on, 1s off)
    intervalRef.current = setInterval(playToneInterval, 2000);
  }, [audioContext, calibrationDb, isPlaying]);

  const stopContinuousTone = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (oscillatorRef.current && gainNodeRef.current) {
      const now = audioContext?.currentTime || 0;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, now + 0.05);
      
      setTimeout(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.stop();
          oscillatorRef.current.disconnect();
          oscillatorRef.current = null;
        }
        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
          gainNodeRef.current = null;
        }
        setIsPlaying(false);
      }, 60);
    } else {
      setIsPlaying(false);
    }
  }, [audioContext]);

  const updateToneVolume = useCallback((newDb: number) => {
    if (gainNodeRef.current && audioContext) {
      const amplitude = Math.pow(10, (newDb - 100) / 20);
      const now = audioContext.currentTime;
      gainNodeRef.current.gain.linearRampToValueAtTime(amplitude, now + 0.02);
    }
  }, [audioContext]);

  const startContinuousTone500 = useCallback(async () => {
    if (!audioContext || isPlaying500) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying500(true);
    let playCount = 0;

    const playToneInterval = () => {
      if (!isMounted.current) return;
      
      const amplitude = Math.pow(10, (calibrationDb500 - 100) / 20);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 500; // 500Hz tone
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      // Start with zero gain
      gainNode.gain.setValueAtTime(0, now);
      // Quick fade in
      gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.01);
      // Hold at target amplitude
      gainNode.gain.setValueAtTime(amplitude, now + 0.99);
      // Quick fade out
      gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

      oscillator.start(now);
      oscillator.stop(now + 1.0);

      // Clean up when this oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      };

      playCount++;
      
      // Stop after 2 cycles (on-off-on-off)
      if (playCount >= 2) {
        if (interval500Ref.current) {
          clearInterval(interval500Ref.current);
          interval500Ref.current = null;
        }
        setIsPlaying500(false);
      }
    };

    // Start the first tone immediately
    playToneInterval();

    // Set up interval to play tone every 2 seconds (1s on, 1s off)
    interval500Ref.current = setInterval(playToneInterval, 2000);
  }, [audioContext, calibrationDb500, isPlaying500]);

  const stopContinuousTone500 = useCallback(() => {
    if (interval500Ref.current) {
      clearInterval(interval500Ref.current);
      interval500Ref.current = null;
    }
    
    if (oscillator500Ref.current && gainNode500Ref.current) {
      const now = audioContext?.currentTime || 0;
      gainNode500Ref.current.gain.linearRampToValueAtTime(0, now + 0.05);
      
      setTimeout(() => {
        if (oscillator500Ref.current) {
          oscillator500Ref.current.stop();
          oscillator500Ref.current.disconnect();
          oscillator500Ref.current = null;
        }
        if (gainNode500Ref.current) {
          gainNode500Ref.current.disconnect();
          gainNode500Ref.current = null;
        }
        setIsPlaying500(false);
      }, 60);
    } else {
      setIsPlaying500(false);
    }
  }, [audioContext]);

  const updateToneVolume500 = useCallback((newDb: number) => {
    if (gainNode500Ref.current && audioContext) {
      const amplitude = Math.pow(10, (newDb - 100) / 20);
      const now = audioContext.currentTime;
      gainNode500Ref.current.gain.linearRampToValueAtTime(amplitude, now + 0.02);
    }
  }, [audioContext]);

  const startContinuousTone2000 = useCallback(async () => {
    if (!audioContext || isPlaying2000) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying2000(true);
    let playCount = 0;

    const playToneInterval = () => {
      if (!isMounted.current) return;
      
      const amplitude = Math.pow(10, (calibrationDb2000 - 100) / 20);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 2000; // 2000Hz tone
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      // Start with zero gain
      gainNode.gain.setValueAtTime(0, now);
      // Quick fade in
      gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.01);
      // Hold at target amplitude
      gainNode.gain.setValueAtTime(amplitude, now + 0.99);
      // Quick fade out
      gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

      oscillator.start(now);
      oscillator.stop(now + 1.0);

      // Clean up when this oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      };

      playCount++;
      
      // Stop after 2 cycles (on-off-on-off)
      if (playCount >= 2) {
        if (interval2000Ref.current) {
          clearInterval(interval2000Ref.current);
          interval2000Ref.current = null;
        }
        setIsPlaying2000(false);
      }
    };

    // Start the first tone immediately
    playToneInterval();

    // Set up interval to play tone every 2 seconds (1s on, 1s off)
    interval2000Ref.current = setInterval(playToneInterval, 2000);
  }, [audioContext, calibrationDb2000, isPlaying2000]);

  const stopContinuousTone2000 = useCallback(() => {
    if (interval2000Ref.current) {
      clearInterval(interval2000Ref.current);
      interval2000Ref.current = null;
    }
    
    if (oscillator2000Ref.current && gainNode2000Ref.current) {
      const now = audioContext?.currentTime || 0;
      gainNode2000Ref.current.gain.linearRampToValueAtTime(0, now + 0.05);
      
      setTimeout(() => {
        if (oscillator2000Ref.current) {
          oscillator2000Ref.current.stop();
          oscillator2000Ref.current.disconnect();
          oscillator2000Ref.current = null;
        }
        if (gainNode2000Ref.current) {
          gainNode2000Ref.current.disconnect();
          gainNode2000Ref.current = null;
        }
        setIsPlaying2000(false);
      }, 60);
    } else {
      setIsPlaying2000(false);
    }
  }, [audioContext]);

  const updateToneVolume2000 = useCallback((newDb: number) => {
    if (gainNode2000Ref.current && audioContext) {
      const amplitude = Math.pow(10, (newDb - 100) / 20);
      const now = audioContext.currentTime;
      gainNode2000Ref.current.gain.linearRampToValueAtTime(amplitude, now + 0.02);
    }
  }, [audioContext]);

  const startContinuousTone4000 = useCallback(async () => {
    if (!audioContext || isPlaying4000) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying4000(true);
    let playCount = 0;

    const playToneInterval = () => {
      if (!isMounted.current) return;
      
      const amplitude = Math.pow(10, (calibrationDb4000 - 100) / 20);
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.value = 4000; // 4000Hz tone
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const now = audioContext.currentTime;
      // Start with zero gain
      gainNode.gain.setValueAtTime(0, now);
      // Quick fade in
      gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.01);
      // Hold at target amplitude
      gainNode.gain.setValueAtTime(amplitude, now + 0.99);
      // Quick fade out
      gainNode.gain.linearRampToValueAtTime(0, now + 1.0);

      oscillator.start(now);
      oscillator.stop(now + 1.0);

      // Clean up when this oscillator ends
      oscillator.onended = () => {
        try {
          oscillator.disconnect();
          gainNode.disconnect();
        } catch (e) {
          // Ignore if already disconnected
        }
      };

      playCount++;
      
      // Stop after 2 cycles (on-off-on-off)
      if (playCount >= 2) {
        if (interval4000Ref.current) {
          clearInterval(interval4000Ref.current);
          interval4000Ref.current = null;
        }
        setIsPlaying4000(false);
      }
    };

    // Start the first tone immediately
    playToneInterval();

    // Set up interval to play tone every 2 seconds (1s on, 1s off)
    interval4000Ref.current = setInterval(playToneInterval, 2000);
  }, [audioContext, calibrationDb4000, isPlaying4000]);

  const stopContinuousTone4000 = useCallback(() => {
    if (interval4000Ref.current) {
      clearInterval(interval4000Ref.current);
      interval4000Ref.current = null;
    }
    
    if (oscillator4000Ref.current && gainNode4000Ref.current) {
      const now = audioContext?.currentTime || 0;
      gainNode4000Ref.current.gain.linearRampToValueAtTime(0, now + 0.05);
      
      setTimeout(() => {
        if (oscillator4000Ref.current) {
          oscillator4000Ref.current.stop();
          oscillator4000Ref.current.disconnect();
          oscillator4000Ref.current = null;
        }
        if (gainNode4000Ref.current) {
          gainNode4000Ref.current.disconnect();
          gainNode4000Ref.current = null;
        }
        setIsPlaying4000(false);
      }, 60);
    } else {
      setIsPlaying4000(false);
    }
  }, [audioContext]);

  const updateToneVolume4000 = useCallback((newDb: number) => {
    if (gainNode4000Ref.current && audioContext) {
      const amplitude = Math.pow(10, (newDb - 100) / 20);
      const now = audioContext.currentTime;
      gainNode4000Ref.current.gain.linearRampToValueAtTime(amplitude, now + 0.02);
    }
  }, [audioContext]);

  const handleNoiseLevelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNoiseLevelInput(value);
    
    // Only update if it's a valid number
    if (!isNaN(Number(value))) {
      updateEnvironmentCheck({ noiseLevel: Number(value) });
    }
  };

  const handleHeadphonesChange = (checked: boolean) => {
    updateEnvironmentCheck({ headphonesConfirmed: checked });
  };

  const handleContinue = () => {
    const { noiseLevel, headphonesConfirmed } = environmentCheck;
    
    if (noiseLevel === null || isNaN(noiseLevel)) {
      toast.error('Please enter a valid noise level');
      return;
    }
    
    if (noiseLevel > 50) {
      toast.error('Ambient noise level is too high (must be below 50 dB SPL)');
      return;
    }
    
    if (!headphonesConfirmed) {
      toast.error('Please confirm using Sennheiser HD 280 Pro headphones');
      return;
    }

    if (!patientInfo.name || !patientInfo.id) {
      toast.error('Please enter patient name and ID');
      return;
    }

    if (!calibrationData.isCalibrated500) {
      toast.error('Please complete your personal calibration for 500Hz before proceeding');
      return;
    }

    if (!calibrationData.isCalibrated1000) {
      toast.error('Please complete your personal calibration for 1000Hz before proceeding');
      return;
    }

    if (!calibrationData.isCalibrated2000) {
      toast.error('Please complete your personal calibration for 2000Hz before proceeding');
      return;
    }

    if (!calibrationData.isCalibrated4000) {
      toast.error('Please complete your personal calibration for 4000Hz before proceeding');
      return;
    }

    setCurrentPhase('screening');
    toast.success('Environment check passed. Starting screening test...');
  };

  const saveCalibration500 = async () => {
    setIsSavingCalibration(true);
    try {
      await saveCalibrationForFrequency(500, calibrationDb500);
      toast.success('Calibration saved!');
      // toast.success(`Calibration saved! New value: ${calibrationDb500} dB. Applied: ${calibrationData.appliedDb500} dB`);
    } catch (error) {
      toast.error('Failed to save calibration data');
    } finally {
      setIsSavingCalibration(false);
    }
  };

  const saveCalibration = async () => {
    setIsSavingCalibration(true);
    try {
      await saveCalibrationForFrequency(1000, calibrationDb);
      toast.success('Calibration saved!');
      // toast.success(`Calibration saved! New value: ${calibrationDb} dB. Applied: ${calibrationData.appliedDb1000} dB`);
    } catch (error) {
      toast.error('Failed to save calibration data');
    } finally {
      setIsSavingCalibration(false);
    }
  };

  const saveCalibration2000 = async () => {
    setIsSavingCalibration(true);
    try {
      await saveCalibrationForFrequency(2000, calibrationDb2000);
      toast.success('Calibration saved!');
      // toast.success(`Calibration saved! New value: ${calibrationDb2000} dB. Applied: ${calibrationData.appliedDb2000} dB`);
    } catch (error) {
      toast.error('Failed to save calibration data');
    } finally {
      setIsSavingCalibration(false);
    }
  };

  const saveCalibration4000 = async () => {
    setIsSavingCalibration(true);
    try {
      await saveCalibrationForFrequency(4000, calibrationDb4000);
      toast.success('Calibration saved!');
      // toast.success(`Calibration saved! New value: ${calibrationDb4000} dB. Applied: ${calibrationData.appliedDb4000} dB`);
    } catch (error) {
      toast.error('Failed to save calibration data');
    } finally {
      setIsSavingCalibration(false);
    }
  };

  const increaseDb500 = () => {
    const newDb = Math.min(calibrationDb500 + 2, 80);
    setCalibrationDb500(newDb);
    if (isPlaying500) {
      updateToneVolume500(newDb);
    }
  };

  const decreaseDb500 = () => {
    const newDb = Math.max(calibrationDb500 - 2, 0);
    setCalibrationDb500(newDb);
    if (isPlaying500) {
      updateToneVolume500(newDb);
    }
  };

  const increaseDb = () => {
    const newDb = Math.min(calibrationDb + 2, 80);
    setCalibrationDb(newDb);
    if (isPlaying) {
      updateToneVolume(newDb);
    }
  };

  const decreaseDb = () => {
    const newDb = Math.max(calibrationDb - 2, 0);
    setCalibrationDb(newDb);
    if (isPlaying) {
      updateToneVolume(newDb);
    }
  };

  const increaseDb2000 = () => {
    const newDb = Math.min(calibrationDb2000 + 2, 80);
    setCalibrationDb2000(newDb);
    if (isPlaying2000) {
      updateToneVolume2000(newDb);
    }
  };

  const decreaseDb2000 = () => {
    const newDb = Math.max(calibrationDb2000 - 2, 0);
    setCalibrationDb2000(newDb);
    if (isPlaying2000) {
      updateToneVolume2000(newDb);
    }
  };

  const increaseDb4000 = () => {
    const newDb = Math.min(calibrationDb4000 + 2, 80);
    setCalibrationDb4000(newDb);
    if (isPlaying4000) {
      updateToneVolume4000(newDb);
    }
  };

  const decreaseDb4000 = () => {
    const newDb = Math.max(calibrationDb4000 - 2, 0);
    setCalibrationDb4000(newDb);
    if (isPlaying4000) {
      updateToneVolume4000(newDb);
    }
  };

  if (isLoadingCalibration) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
              <span>Loading calibration data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <Card className="mb-8">
        <CardHeader className="bg-medical-blue-light border-b">
          <CardTitle className="text-medical-blue">Patient Information</CardTitle>
          <CardDescription>Enter the patient details for this screening session</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input 
                id="patient-name" 
                placeholder="Full name" 
                value={patientInfo.name}
                onChange={(e) => updatePatientInfo({ name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-id">Patient ID</Label>
              <Input 
                id="patient-id" 
                placeholder="ID number" 
                value={patientInfo.id}
                onChange={(e) => updatePatientInfo({ id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-age">Age</Label>
              <Input 
                id="patient-age" 
                placeholder="Patient age" 
                value={patientInfo.age}
                onChange={(e) => updatePatientInfo({ age: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patient-notes">Notes (Optional)</Label>
              <Input 
                id="patient-notes" 
                placeholder="Additional notes" 
                value={patientInfo.notes}
                onChange={(e) => updatePatientInfo({ notes: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader className="bg-medical-blue-light border-b">
          <CardTitle className="text-medical-blue">Calibration Check</CardTitle>
          <CardDescription>Establish your hearing threshold for accurate test results</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Use the + and - buttons to adjust the volume until the first time you cannot hear the sound, then click Save. The system will store your last calibration value and use it as your reference threshold.
              </p>
            </div>

            {/* Last Calibration Date Display */}
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Last Calibration:</span>
                <span className="text-sm text-gray-600">
                  {formatCalibrationDate(calibrationData.lastCalibrationDate)}
                </span>
              </div>
            </div>
            
            {/* Row 1: 500Hz and 1000Hz */}
            <div className="grid grid-cols-2 gap-6">
              {/* 500Hz Calibration */}
              <div className="space-y-3">
                <h4 className="font-medium text-medical-blue">500Hz Calibration</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 active:bg-red-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={decreaseDb500}
                    disabled={calibrationDb500 <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  {/* <div className="px-2 py-1 bg-gray-100 rounded-md min-w-[50px] text-center font-medium text-sm">
                    {calibrationDb500}
                  </div> */}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={increaseDb500}
                    disabled={calibrationDb500 >= 80}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  {!isPlaying500 ? (
                    <Button 
                      size="sm"
                      className="bg-medical-blue hover:bg-medical-blue-dark"
                      onClick={startContinuousTone500}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      onClick={stopContinuousTone500}
                    >
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={saveCalibration500}
                    disabled={isSavingCalibration}
                  >
                    {isSavingCalibration ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                
                {calibrationData.isCalibrated500 && (
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <p className="text-xs text-green-800">
                      ✓ Calibrated!
                      {/* Applied: {calibrationData.appliedDb500} dB */}
                    </p>
                    {/* <p className="text-xs text-gray-600">
                      Values: [{calibrationData.referenceDb500Values.join(', ')}]
                    </p> */}
                  </div>
                )}
              </div>

              {/* 1000Hz Calibration */}
              <div className="space-y-3">
                <h4 className="font-medium text-medical-blue">1000Hz Calibration</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 active:bg-red-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={decreaseDb}
                    disabled={calibrationDb <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  {/* <div className="px-2 py-1 bg-gray-100 rounded-md min-w-[50px] text-center font-medium text-sm">
                    {calibrationDb}
                  </div> */}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={increaseDb}
                    disabled={calibrationDb >= 80}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  {!isPlaying ? (
                    <Button 
                      size="sm"
                      className="bg-medical-blue hover:bg-medical-blue-dark"
                      onClick={startContinuousTone}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      onClick={stopContinuousTone}
                    >
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={saveCalibration}
                    disabled={isSavingCalibration}
                  >
                    {isSavingCalibration ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                
                {calibrationData.isCalibrated1000 && (
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <p className="text-xs text-green-800">
                      ✓ Calibrated!
                      {/* Applied: {calibrationData.appliedDb1000} dB */}
                    </p>
                    {/* <p className="text-xs text-gray-600">
                      Values: [{calibrationData.referenceDb1000Values.join(', ')}]
                    </p> */}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: 2000Hz and 4000Hz */}
            <div className="grid grid-cols-2 gap-6">
              {/* 2000Hz Calibration */}
              <div className="space-y-3">
                <h4 className="font-medium text-medical-blue">2000Hz Calibration</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 active:bg-red-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={decreaseDb2000}
                    disabled={calibrationDb2000 <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  {/* <div className="px-2 py-1 bg-gray-100 rounded-md min-w-[50px] text-center font-medium text-sm">
                    {calibrationDb2000}
                  </div> */}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={increaseDb2000}
                    disabled={calibrationDb2000 >= 80}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  {!isPlaying2000 ? (
                    <Button 
                      size="sm"
                      className="bg-medical-blue hover:bg-medical-blue-dark"
                      onClick={startContinuousTone2000}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      onClick={stopContinuousTone2000}
                    >
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={saveCalibration2000}
                    disabled={isSavingCalibration}
                  >
                    {isSavingCalibration ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                
                {calibrationData.isCalibrated2000 && (
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <p className="text-xs text-green-800">
                      ✓ Calibrated!
                      {/* Applied: {calibrationData.appliedDb2000} dB */}
                    </p>
                    {/* <p className="text-xs text-gray-600">
                      Values: [{calibrationData.referenceDb2000Values.join(', ')}]
                    </p> */}
                  </div>
                )}
              </div>

              {/* 4000Hz Calibration */}
              <div className="space-y-3">
                <h4 className="font-medium text-medical-blue">4000Hz Calibration</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 active:bg-red-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={decreaseDb4000}
                    disabled={calibrationDb4000 <= 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  
                  {/* <div className="px-2 py-1 bg-gray-100 rounded-md min-w-[50px] text-center font-medium text-sm">
                    {calibrationDb4000}
                  </div> */}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-2 border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400 active:bg-blue-200 active:scale-95 transition-all duration-150 font-semibold shadow-sm hover:shadow-md"
                    onClick={increaseDb4000}
                    disabled={calibrationDb4000 >= 80}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>

                  {!isPlaying4000 ? (
                    <Button 
                      size="sm"
                      className="bg-medical-blue hover:bg-medical-blue-dark"
                      onClick={startContinuousTone4000}
                    >
                      Play
                    </Button>
                  ) : (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      onClick={stopContinuousTone4000}
                    >
                      Stop
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    onClick={saveCalibration4000}
                    disabled={isSavingCalibration}
                  >
                    {isSavingCalibration ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                
                {calibrationData.isCalibrated4000 && (
                  <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                    <p className="text-xs text-green-800">
                      ✓ Calibrated!
                      {/* Applied: {calibrationData.appliedDb4000} dB */}
                    </p>
                    {/* <p className="text-xs text-gray-600">
                      Values: [{calibrationData.referenceDb4000Values.join(', ')}]
                    </p> */}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-medical-blue-light border-b">
          <CardTitle className="text-medical-blue">Environment Check</CardTitle>
          <CardDescription>Complete all checks before starting the screening test</CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Mic className="h-5 w-5 text-medical-blue" />
              <Label htmlFor="noise-level" className="text-base font-medium">
                Ambient Noise Level (must be below 50 dB SPL)
              </Label>
            </div>
            <Input
              id="noise-level"
              type="number"
              placeholder="Enter measured dB SPL"
              value={noiseLevelInput}
              onChange={handleNoiseLevelChange}
            />
            {environmentCheck.noiseLevel !== null && (
              <p className={`text-sm ${environmentCheck.noiseLevel <= 50 ? 'text-green-600' : 'text-red-500'}`}>
                {environmentCheck.noiseLevel <= 50 
                  ? '✓ Environment noise level is acceptable' 
                  : '✗ Noise level too high - find a quieter location'}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="headphones" 
                checked={environmentCheck.headphonesConfirmed}
                onCheckedChange={handleHeadphonesChange}
              />
              <div>
                <Label htmlFor="headphones" className="text-base font-medium">
                  Using Sennheiser HD 280 Pro Headphones
                </Label>
                <p className="text-sm text-gray-500">
                  Calibrated according to RETSPL standards
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="border-t bg-gray-50 p-4">
          <Button 
            className="ml-auto bg-medical-blue hover:bg-medical-blue-dark"
            onClick={handleContinue}
          >
            Continue to Screening Test
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EnvironmentCheck;
