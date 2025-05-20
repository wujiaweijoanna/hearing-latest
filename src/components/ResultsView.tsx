
import React from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Audiogram from './Audiogram';
import { toast } from 'sonner';

const ResultsView = () => {
  const { 
    patientInfo, 
    thresholdResults, 
    resetTest,
    startTime
  } = useTest();

  const hasFailedFrequency = thresholdResults.some(result => !result.passed);
  
  const generateReport = () => {
    // In a real application, this would generate a PDF
    // For now, we'll just display a toast notification
    toast.success('Report generated! In a real application, this would generate a downloadable PDF.');
  };
  
  // Calculate test duration
  const getTestDuration = () => {
    if (!startTime) return '00:00';
    
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffSec / 60);
    const seconds = diffSec % 60;
    
    return `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card className="mb-8">
        <CardHeader className={`${hasFailedFrequency ? 'bg-red-50' : 'bg-green-50'} border-b`}>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className={hasFailedFrequency ? 'text-red-700' : 'text-green-700'}>
                Hearing Screening Results: {hasFailedFrequency ? 'REFER' : 'PASS'}
              </CardTitle>
              <CardDescription>
                {hasFailedFrequency 
                  ? 'One or more frequencies exceeded the 20 dB threshold. Referral recommended.'
                  : 'All frequencies passed at 20 dB HL threshold.'
                }
              </CardDescription>
            </div>
            <div className={`text-xl font-bold px-4 py-2 rounded-md ${
              hasFailedFrequency ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}>
              {hasFailedFrequency ? 'REFER' : 'PASS'}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-4">Patient Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div className="text-gray-500">Name:</div>
                  <div className="font-medium">{patientInfo.name}</div>
                  
                  <div className="text-gray-500">ID:</div>
                  <div className="font-medium">{patientInfo.id}</div>
                  
                  <div className="text-gray-500">Age:</div>
                  <div className="font-medium">{patientInfo.age || 'N/A'}</div>
                  
                  <div className="text-gray-500">Test Date:</div>
                  <div className="font-medium">{new Date().toLocaleDateString()}</div>
                  
                  <div className="text-gray-500">Test Duration:</div>
                  <div className="font-medium">{getTestDuration()}</div>
                </div>
                
                {patientInfo.notes && (
                  <div className="mt-4">
                    <div className="text-gray-500 mb-1">Notes:</div>
                    <div className="bg-gray-50 p-3 rounded border text-sm">
                      {patientInfo.notes}
                    </div>
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-lg mt-6 mb-4">Summary by Ear</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-medical-blue mb-2">Right Ear</h4>
                  <div className="space-y-2">
                    {[1000, 2000, 4000].map(freq => {
                      const result = thresholdResults.find(r => r.ear === 'right' && r.frequency === freq);
                      return (
                        <div key={`right-${freq}`} className="flex justify-between text-sm">
                          <span>{freq} Hz:</span>
                          {result ? (
                            <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                              {result.threshold} dB {result.passed ? '(PASS)' : '(FAIL)'}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not tested</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-medical-green mb-2">Left Ear</h4>
                  <div className="space-y-2">
                    {[1000, 2000, 4000].map(freq => {
                      const result = thresholdResults.find(r => r.ear === 'left' && r.frequency === freq);
                      return (
                        <div key={`left-${freq}`} className="flex justify-between text-sm">
                          <span>{freq} Hz:</span>
                          {result ? (
                            <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                              {result.threshold} dB {result.passed ? '(PASS)' : '(FAIL)'}
                            </span>
                          ) : (
                            <span className="text-gray-400">Not tested</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Audiogram</h3>
              <Audiogram results={thresholdResults} />
              
              {hasFailedFrequency && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="font-semibold text-lg text-red-700 mb-2">Referral Recommendation</h3>
                  <p className="text-sm text-gray-700">
                    Based on the testing results, a referral to a licensed audiologist is recommended for a full diagnostic assessment.
                  </p>
                </div>
              )}
              
              <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
                <h3 className="font-semibold text-sm text-gray-700 mb-2">Disclaimer</h3>
                <p className="text-xs text-gray-500">
                  This hearing screening was conducted using a calibrated device and follows internationally recognized screening guidelines.
                  It is not a substitute for a diagnostic assessment by a licensed audiologist.
                  Results indicate either a "Pass" or "Refer" recommendation only.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="border-t bg-gray-50 p-4 flex justify-between">
          <Button 
            variant="outline"
            onClick={resetTest}
          >
            Start New Test
          </Button>
          
          <Button 
            className="bg-medical-blue hover:bg-medical-blue-dark"
            onClick={generateReport}
          >
            Generate PDF Report
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ResultsView;
