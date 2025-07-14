import React, {useRef, useEffect, useState} from 'react';
import { useTest } from '../context/TestContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Audiogram from './Audiogram';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const ResultsView = () => {
  const { 
    patientInfo, 
    thresholdResults, 
    resetTest,
    startTime,
    environmentCheck,
    remarks
  } = useTest();

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const hasFailedFrequency = thresholdResults.some(result => !result.passed);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const generateReport = async () => {
    const card = cardRef.current;
    if (!card) return;

    try {
      // Hide buttons before capture
      card.classList.add('pdf-export');
      
      const canvas = await html2canvas(card, {
        scale: 2,
        logging: true,
        useCORS: true,
        onclone: (clonedDoc) => {
          clonedDoc.querySelector('.audiogram-container')?.classList.add('pdf-export')
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate image dimensions to fit page
      const imgRatio = canvas.width / canvas.height;
      const pdfImgHeight = pageWidth / imgRatio;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pdfImgHeight);
            const safeName = patientInfo.name
        ? patientInfo.name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
        : 'Unknown_Patient';
      pdf.save(`${safeName}_Report.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      // Restore buttons after capture
      card.classList.remove('pdf-export');
    }
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

  const saveResults = async () => {
    if (isSaved) return; // Don't save if already saved
    setIsSaving(true);
    
    try {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // 1. Save patient information
      const patientId = uuidv4();
      const { error: patientError } = await supabase
        .from('patients')
        .insert({
          id: patientId,
          name: patientInfo.name,
          patient_id: patientInfo.id,
          age: patientInfo.age,
          notes: patientInfo.notes,
          user_id: user.id
        });

      if (patientError) {
        throw new Error(`Error saving patient: ${patientError.message}`);
      }

      // 2. Create test result record
      const testResultId = uuidv4();
      const testDuration = startTime ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000) : 0;
      
      const { error: testError } = await supabase
        .from('test_results')
        .insert({
          id: testResultId,
          patient_id: patientId,
          user_id: user.id,
          test_date: new Date().toISOString(),
          overall_result: hasFailedFrequency ? 'REFER' : 'PASS',
          duration_seconds: testDuration,
          environment_noise_level: environmentCheck.noiseLevel,
          notes: patientInfo.notes,
          remarks: remarks
        });

      if (testError) {
        throw new Error(`Error saving test result: ${testError.message}`);
      }

      // 3. Save threshold results
      const thresholdData = thresholdResults.map(result => ({
        id: uuidv4(),
        test_result_id: testResultId,
        ear: result.ear,
        frequency: result.frequency,
        threshold: result.threshold,
        passed: result.passed
      }));

      const { error: thresholdError } = await supabase
        .from('threshold_results')
        .insert(thresholdData);

      if (thresholdError) {
        throw new Error(`Error saving threshold results: ${thresholdError.message}`);
      }

      setIsSaved(true);
      toast.success('Test results saved successfully');
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save test results');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    saveResults();
  }, []); // Auto-save when component mounts

  const handleStartNewTest = () => {
    if (!isSaved && !isSaving) {
      // If not saved and not currently saving, try to save first
      toast.promise(saveResults(), {
        loading: 'Saving test results...',
        success: 'Results saved. Starting new test...',
        error: 'Failed to save results. Please try again.'
      });
    } else if (isSaving) {
      toast.info('Please wait while saving current results...');
      return;
    } else {
      resetTest();
    }
  };

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <Card className="mb-8" ref={cardRef}>
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
                  <h4 className="font-medium text-red-600 mb-2">Right Ear</h4>
                  <div className="space-y-2">
                    {[500, 1000, 2000, 4000].map(freq => {
                      const result = thresholdResults.find(r => r.ear === 'right' && r.frequency === freq);
                      return (
                        <div key={`right-${freq}`} className="flex justify-between text-sm">
                          <span>{freq} Hz:</span>
                          {result ? (
                            <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                              {result.threshold >= 60 ? '>50' : result.threshold} dB {result.passed ? '(PASS)' : '(FAIL)'}
                            </span>
                          ) : (
                            <span className="text-gray-400">20 dB(PASS)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="font-medium text-medical-blue mb-2">Left Ear</h4>
                  <div className="space-y-2">
                    {[500, 1000, 2000, 4000].map(freq => {
                      const result = thresholdResults.find(r => r.ear === 'left' && r.frequency === freq);
                      return (
                        <div key={`left-${freq}`} className="flex justify-between text-sm">
                          <span>{freq} Hz:</span>
                          {result ? (
                            <span className={result.passed ? 'text-green-600' : 'text-red-600'}>
                              {result.threshold >= 60 ? '>50' : result.threshold} dB {result.passed ? '(PASS)' : '(FAIL)'}
                            </span>
                          ) : (
                            <span className="text-gray-400">20 dB(PASS)</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {remarks && (
                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-4">Test Remarks</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {remarks}
                    </p>
                  </div>
                </div>
              )}
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
        
        <CardFooter className="pdf-hide-footer border-t bg-gray-50 p-4 flex justify-between">
          <Button 
            variant="outline"
            onClick={handleStartNewTest}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Start New Test'}
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
