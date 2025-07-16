import React, { createContext, useContext, useState, ReactNode } from 'react';

type Ear = 'right' | 'left';
type TestPhase = 'environment' | 'screening' | 'threshold' | 'results';
type Frequency = 500 | 1000 | 2000 | 4000;
type ResponseStatus = 'waiting' | 'responded' | 'failed';

interface EnvironmentCheck {
  noiseLevel: number | null;
  calibrationConfirmed: boolean;
  headphonesConfirmed: boolean;
}

interface CalibrationData {
  referenceDb500: number | null;
  referenceDb1000: number | null;
  referenceDb2000: number | null;
  isCalibrated500: boolean;
  isCalibrated1000: boolean;
  isCalibrated2000: boolean;
}

interface ThresholdResult {
  ear: Ear;
  frequency: Frequency;
  threshold: number;
  passed: boolean;
}

interface TestContextType {
  currentPhase: TestPhase;
  setCurrentPhase: React.Dispatch<React.SetStateAction<TestPhase>>;
  environmentCheck: EnvironmentCheck;
  updateEnvironmentCheck: (check: Partial<EnvironmentCheck>) => void;
  calibrationData: CalibrationData;
  updateCalibrationData: (data: Partial<CalibrationData>) => void;
  currentEar: Ear;
  setCurrentEar: React.Dispatch<React.SetStateAction<Ear>>;
  currentFrequency: Frequency;
  setCurrentFrequency: React.Dispatch<React.SetStateAction<Frequency>>;
  currentDb: number;
  setCurrentDb: React.Dispatch<React.SetStateAction<number>>;
  responseStatus: ResponseStatus;
  setResponseStatus: React.Dispatch<React.SetStateAction<ResponseStatus>>;
  thresholdResults: ThresholdResult[];
  addThresholdResult: (result: ThresholdResult) => void;
  patientInfo: PatientInfo;
  updatePatientInfo: (info: Partial<PatientInfo>) => void;
  resetTest: () => void;
  startTime: Date | null;
  setStartTime: React.Dispatch<React.SetStateAction<Date | null>>;
  currentAttempt: number;
  setCurrentAttempt: React.Dispatch<React.SetStateAction<number>>;
  remarks: string;
  setRemarks: React.Dispatch<React.SetStateAction<string>>;
}

interface PatientInfo {
  name: string;
  id: string;
  age: string;
  notes: string;
}

const initialEnvironmentCheck: EnvironmentCheck = {
  noiseLevel: null,
  calibrationConfirmed: false,
  headphonesConfirmed: false,
};

const initialPatientInfo: PatientInfo = {
  name: '',
  id: '',
  age: '',
  notes: '',
};

const initialCalibrationData: CalibrationData = {
  referenceDb500: null,
  referenceDb1000: null,
  referenceDb2000: null,
  isCalibrated500: false,
  isCalibrated1000: false,
  isCalibrated2000: false,
};

const TestContext = createContext<TestContextType | undefined>(undefined);

export const TestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('environment');
  const [environmentCheck, setEnvironmentCheck] = useState<EnvironmentCheck>(initialEnvironmentCheck);
  const [calibrationData, setCalibrationData] = useState<CalibrationData>(initialCalibrationData);
  const [currentEar, setCurrentEar] = useState<Ear>('right');
  const [currentFrequency, setCurrentFrequency] = useState<Frequency>(500);
  const [currentDb, setCurrentDb] = useState<number>(20);
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>('waiting');
  const [thresholdResults, setThresholdResults] = useState<ThresholdResult[]>([]);
  const [patientInfo, setPatientInfo] = useState<PatientInfo>(initialPatientInfo);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>('');

  const updateEnvironmentCheck = (check: Partial<EnvironmentCheck>) => {
    setEnvironmentCheck({ ...environmentCheck, ...check });
  };

  const updateCalibrationData = (data: Partial<CalibrationData>) => {
    setCalibrationData({ ...calibrationData, ...data });
  };

  const addThresholdResult = (result: ThresholdResult) => {
    setThresholdResults(prev => [...prev, result]);
  };

  const updatePatientInfo = (info: Partial<PatientInfo>) => {
    setPatientInfo({ ...patientInfo, ...info });
  };

  const resetTest = () => {
    setCurrentPhase('environment');
    setEnvironmentCheck(initialEnvironmentCheck);
    setCalibrationData(initialCalibrationData);
    setCurrentEar('right');
    setCurrentFrequency(500);
    setCurrentDb(20);
    setResponseStatus('waiting');
    setThresholdResults([]);
    setPatientInfo(initialPatientInfo);
    setStartTime(null);
    setCurrentAttempt(0);
    setRemarks('');
  };

  return (
    <TestContext.Provider
      value={{
        currentPhase,
        setCurrentPhase,
        environmentCheck,
        updateEnvironmentCheck,
        calibrationData,
        updateCalibrationData,
        currentEar,
        setCurrentEar,
        currentFrequency,
        setCurrentFrequency,
        currentDb,
        setCurrentDb,
        responseStatus,
        setResponseStatus,
        thresholdResults,
        addThresholdResult,
        patientInfo,
        updatePatientInfo,
        resetTest,
        startTime,
        setStartTime,
        currentAttempt,
        setCurrentAttempt,
        remarks,
        setRemarks
      }}
    >
      {children}
    </TestContext.Provider>
  );
};

export const useTest = (): TestContextType => {
  const context = useContext(TestContext);
  if (context === undefined) {
    throw new Error('useTest must be used within a TestProvider');
  }
  return context;
};
