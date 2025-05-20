
import React, { useState } from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Mic, Volume, Circle, CircleCheck } from 'lucide-react';
import { toast } from 'sonner';

const EnvironmentCheck = () => {
  const { environmentCheck, updateEnvironmentCheck, setCurrentPhase, patientInfo, updatePatientInfo } = useTest();
  const [noiseLevelInput, setNoiseLevelInput] = useState('');

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

    setCurrentPhase('screening');
    toast.success('Environment check passed. Starting screening test...');
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
