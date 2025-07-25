import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface CalibrationData {
  referenceDb500: number | null;
  referenceDb1000: number | null;
  referenceDb2000: number | null;
  referenceDb4000: number | null;
  appliedDb500: number | null;
  appliedDb1000: number | null;
  appliedDb2000: number | null;
  appliedDb4000: number | null;
  isCalibrated500: boolean;
  isCalibrated1000: boolean;
  isCalibrated2000: boolean;
  isCalibrated4000: boolean;
  // Arrays to store the latest 3 values for each frequency
  referenceDb500Values: number[];
  referenceDb1000Values: number[];
  referenceDb2000Values: number[];
  referenceDb4000Values: number[];
  // Last calibration date
  lastCalibrationDate: string | null;
}

// Helper function to add a new value to an array and keep only the latest 3
const addToCalibrationArray = (currentArray: number[], newValue: number): number[] => {
  const updatedArray = [...currentArray, newValue];
  return updatedArray.slice(-3); // Keep only the latest 3 values
};

// Helper function to get the minimum value from an array
const getMinimumValue = (values: number[]): number | null => {
  return values.length > 0 ? Math.min(...values) : null;
};

export const saveCalibrationValue = async (frequency: 500 | 1000 | 2000 | 4000, value: number): Promise<void> => {
  try {
    console.log(`Saving calibration value for ${frequency}Hz:`, value);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Get existing calibration data
    const { data: existingData, error: fetchError } = await supabase
      .from('calibrations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Initialize arrays from existing data or create new ones
    let values500 = existingData?.reference_db_500_values || [];
    let values1000 = existingData?.reference_db_1000_values || [];
    let values2000 = existingData?.reference_db_2000_values || [];
    let values4000 = existingData?.reference_db_4000_values || [];

    // Add new value to the appropriate array
    switch (frequency) {
      case 500:
        values500 = addToCalibrationArray(values500, value);
        break;
      case 1000:
        values1000 = addToCalibrationArray(values1000, value);
        break;
      case 2000:
        values2000 = addToCalibrationArray(values2000, value);
        break;
      case 4000:
        values4000 = addToCalibrationArray(values4000, value);
        break;
    }

    // Calculate applied values (minimum of each array)
    const appliedDb500 = getMinimumValue(values500);
    const appliedDb1000 = getMinimumValue(values1000);
    const appliedDb2000 = getMinimumValue(values2000);
    const appliedDb4000 = getMinimumValue(values4000);

    const currentDate = new Date().toISOString();

    const calibrationRecord = {
      reference_db_500_values: values500,
      reference_db_1000_values: values1000,
      reference_db_2000_values: values2000,
      reference_db_4000_values: values4000,
      applied_db_500: appliedDb500,
      applied_db_1000: appliedDb1000,
      applied_db_2000: appliedDb2000,
      applied_db_4000: appliedDb4000,
      is_calibrated_500: values500.length > 0,
      is_calibrated_1000: values1000.length > 0,
      is_calibrated_2000: values2000.length > 0,
      is_calibrated_4000: values4000.length > 0,
      user_id: user.id,
      updated_at: currentDate,
      last_calibration_date: currentDate,
    };

    console.log('Calibration record to save:', calibrationRecord);

    if (existingData) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('calibrations')
        .update(calibrationRecord)
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new record
      const { error: insertError } = await supabase
        .from('calibrations')
        .insert({
          ...calibrationRecord,
          id: uuidv4(),
        });

      if (insertError) {
        throw insertError;
      }
    }

    console.log(`Calibration value for ${frequency}Hz saved successfully`);
  } catch (error) {
    console.error(`Error saving calibration value for ${frequency}Hz:`, error);
    throw error;
  }
};

export const loadCalibrationData = async (): Promise<CalibrationData | null> => {
  try {
    console.log('Loading calibration data');
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log('No user found, returning null');
      return null;
    }

    // Fetch calibration data for this user
    const { data, error } = await supabase
      .from('calibrations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found, return null
        console.log('No calibration data found for user');
        return null;
      }
      throw error;
    }

    const result: CalibrationData = {
      referenceDb500: data.applied_db_500,
      referenceDb1000: data.applied_db_1000,
      referenceDb2000: data.applied_db_2000,
      referenceDb4000: data.applied_db_4000,
      appliedDb500: data.applied_db_500,
      appliedDb1000: data.applied_db_1000,
      appliedDb2000: data.applied_db_2000,
      appliedDb4000: data.applied_db_4000,
      isCalibrated500: data.is_calibrated_500,
      isCalibrated1000: data.is_calibrated_1000,
      isCalibrated2000: data.is_calibrated_2000,
      isCalibrated4000: data.is_calibrated_4000,
      referenceDb500Values: data.reference_db_500_values || [],
      referenceDb1000Values: data.reference_db_1000_values || [],
      referenceDb2000Values: data.reference_db_2000_values || [],
      referenceDb4000Values: data.reference_db_4000_values || [],
      lastCalibrationDate: data.last_calibration_date,
    };
    
    console.log('Loaded calibration data:', result);
    return result;
  } catch (error) {
    console.error('Error loading calibration data:', error);
    return null;
  }
};