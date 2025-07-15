import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, Volume, Circle, CircleCheck, VolumeX, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

const EnvironmentCheck = () => {
  const { 
    environmentCheck, 
    updateEnvironmentCheck, 
    setCurrentPhase, 
    patientInfo, 
    updatePatientInfo,
    calibrationData,
    updateCalibrationData 
  } = useTest();
  const [noiseLevelInput, setNoiseLevelInput] = useState('');
  const [calibrationDb, setCalibrationDb] = useState(30);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
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

  const startContinuousTone = useCallback(async () => {
    if (!audioContext || isPlaying) return;
    if (audioContext.state === 'suspended') await audioContext.resume();

    setIsPlaying(true);

    const amplitude = Math.pow(10, (calibrationDb - 100) / 20);
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 1000; // 1000Hz tone
    gainNode.gain.value = amplitude;

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(amplitude, now + 0.05);

    oscillator.start(now);

    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
  }, [audioContext, calibrationDb, isPlaying]);

  const stopContinuousTone = useCallback(() => {
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
    }
  }, [audioContext]);

  const updateToneVolume = useCallback((newDb: number) => {
    if (gainNodeRef.current && audioContext) {
      const amplitude = Math.pow(10, (newDb - 100) / 20);
      const now = audioContext.currentTime;
      gainNodeRef.current.gain.linearRampToValueAtTime(amplitude, now + 0.02);
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

  const handleCalibrationChange = (checked: boolean) => {
    updateEnvironmentCheck({ calibrationConfirmed: checked });
  };

  const handleHeadphonesChange = (checked: boolean) => {
    updateEnvironmentCheck({ headphonesConfirmed: checked });
  };

  const handleContinue = () => {
    const { noiseLevel, calibrationConfirmed, headphonesConfirmed } = environmentCheck;
    
    if (noiseLevel === null || isNaN(noiseLevel)) {
      toast.error('Please enter a valid noise level');
      return;
    }
    
    if (noiseLevel > 50) {
      toast.error('Ambient noise level is too high (must be below 50 dB SPL)');
      return;
    }
    
    if (!calibrationConfirmed) {
      toast.error('Please confirm calibration check');
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

    if (!calibrationData.isCalibrated) {
      toast.error('Please complete your personal calibration for 1000Hz before proceeding');
      return;
    }

    setCurrentPhase('screening');
    toast.success('Environment check passed. Starting screening test...');
  };

  const saveCalibration = () => {
    updateCalibrationData({ 
      referenceDb: calibrationDb,
      isCalibrated: true
    });
    toast.success(`Calibration saved! Your 15 dB reference for 1000Hz is set to ${calibrationDb} dB`);
  };

  const increaseDb = () => {
    const newDb = Math.min(calibrationDb + 1, 80);
    setCalibrationDb(newDb);
    if (isPlaying) {
      updateToneVolume(newDb);
    }
  };

  const decreaseDb = () => {
    const newDb = Math.max(calibrationDb - 1, 0);
    setCalibrationDb(newDb);
    if (isPlaying) {
      updateToneVolume(newDb);
    }
  };

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
                Click "Play Tone" to start the continuous tone. Use the + and - buttons to adjust the volume until the first time you cannot hear the sound, then click Save.
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-3">
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={decreaseDb}
                  disabled={calibrationDb <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <div className="px-3 py-2 bg-gray-100 rounded-md min-w-[70px] text-center font-medium">
                  {calibrationDb} dB
                </div>
                
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={increaseDb}
                  disabled={calibrationDb >= 80}
                >
                  <Plus className="h-4 w-4" />
                </Button>

                {!isPlaying ? (
                  <Button 
                    className="bg-medical-blue hover:bg-medical-blue-dark"
                    onClick={startContinuousTone}
                  >
                    <Volume className="h-4 w-4 mr-2" />
                    Play 1000Hz Tone
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    onClick={stopContinuousTone}
                  >
                    <VolumeX className="h-4 w-4 mr-2" />
                    Stop Tone
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  className="border-green-600 text-green-600 hover:bg-green-50"
                  onClick={saveCalibration}
                >
                  <CircleCheck className="h-4 w-4 mr-2" />
                  Save Calibration
                </Button>
              </div>
            </div>

            {calibrationData.isCalibrated && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  ✓ Calibration saved! Your 15 dB reference for 1000Hz is set to {calibrationData.referenceDb} dB
                </p>
              </div>
            )}
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
                id="calibration" 
                checked={environmentCheck.calibrationConfirmed}
                onCheckedChange={handleCalibrationChange}
              />
              <div>
                <Label htmlFor="calibration" className="text-base font-medium">
                  Calibration Check Confirmed
                </Label>
                <p className="text-sm text-gray-500">
                  Biological listener with normal hearing can detect tones at 10 dB HL
                </p>
              </div>
            </div>

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
