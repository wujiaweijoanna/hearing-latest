import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface CalibrationData {
  referenceDb500: number | null;
  referenceDb1000: number | null;
  referenceDb2000: number | null;
  referenceDb4000: number | null;
  isCalibrated500: boolean;
  isCalibrated1000: boolean;
  isCalibrated2000: boolean;
  isCalibrated4000: boolean;
}

export const saveCalibrationData = async (calibrationData: CalibrationData): Promise<void> => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if calibration data already exists for this user
    const { data: existingData, error: fetchError } = await supabase
      .from('calibrations')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    const calibrationRecord = {
      reference_db_500: calibrationData.referenceDb500,
      reference_db_1000: calibrationData.referenceDb1000,
      reference_db_2000: calibrationData.referenceDb2000,
      reference_db_4000: calibrationData.referenceDb4000,
      is_calibrated_500: calibrationData.isCalibrated500,
      is_calibrated_1000: calibrationData.isCalibrated1000,
      is_calibrated_2000: calibrationData.isCalibrated2000,
      is_calibrated_4000: calibrationData.isCalibrated4000,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

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
  } catch (error) {
    console.error('Error saving calibration data:', error);
    throw error;
  }
};

export const loadCalibrationData = async (): Promise<CalibrationData | null> => {
  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
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
        return null;
      }
      throw error;
    }

    return {
      referenceDb500: data.reference_db_500,
      referenceDb1000: data.reference_db_1000,
      referenceDb2000: data.reference_db_2000,
      referenceDb4000: data.reference_db_4000,
      isCalibrated500: data.is_calibrated_500,
      isCalibrated1000: data.is_calibrated_1000,
      isCalibrated2000: data.is_calibrated_2000,
      isCalibrated4000: data.is_calibrated_4000,
    };
  } catch (error) {
    console.error('Error loading calibration data:', error);
    return null;
  }
};