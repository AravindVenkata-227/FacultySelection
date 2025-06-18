
'use server';

import { z } from 'zod';
import { studentInfoSchema, submissionSchema, FacultyConnectFormValues } from './schema';
import { getSubjects, updateFacultySlotSync, getFacultySlots, resetAllFacultySlots as resetSlotsData, getFaculties, Faculty, Subject } from './data';
import { getScalingGuidance as fetchScalingGuidance } from '@/ai/flows/scaling-guidance';
import type { ScalingGuidanceOutput } from '@/ai/flows/scaling-guidance';
import { appendToSheet, ensureSheetHeaders, getRollNumbersFromSheet } from '@/services/google-sheets-service';

export interface FormState {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
  success: boolean;
  updatedSlots?: Record<string, number>; // Key will be `${facultyId}_${subjectId}`
}

export async function submitFacultySelection(
  prevState: FormState | undefined,
  formData: FormData
): Promise<FormState> {
  const subjects: Subject[] = await getSubjects();
  const allFaculties: Faculty[] = await getFaculties();
  const formValues: Record<string, any> = { selections: {} };

  formData.forEach((value, key) => {
    if (key.startsWith('selections.')) {
      const subjectId = key.split('.')[1];
      formValues.selections[subjectId] = value;
    } else {
      formValues[key] = value;
    }
  });
  
  const parsedStudentInfo = studentInfoSchema.safeParse({
    rollNumber: formValues.rollNumber,
    name: formValues.name,
    email: formValues.email,
    whatsappNumber: formValues.whatsappNumber,
  });

  if (!parsedStudentInfo.success) {
    const fieldErrors = parsedStudentInfo.error.flatten().fieldErrors;
    return {
      message: 'Invalid student information. Please check the highlighted fields.',
      fields: {
        rollNumber: fieldErrors.rollNumber?.join(', ') ?? '',
        name: fieldErrors.name?.join(', ') ?? '',
        email: fieldErrors.email?.join(', ') ?? '',
        whatsappNumber: fieldErrors.whatsappNumber?.join(', ') ?? '',
      },
      success: false,
    };
  }

  // Server-side check for existing roll number
  const originalSlots = await getFacultySlots(); // Get slots before potential early return
  try {
    const existingRollNumbers = await getRollNumbersFromSheet();
    if (existingRollNumbers === null) {
      return {
        message: 'Could not verify submission due to a server error. Please try again later.',
        success: false,
        updatedSlots: originalSlots,
      };
    }
    if (existingRollNumbers.includes(parsedStudentInfo.data.rollNumber)) {
      return {
        message: `Roll number ${parsedStudentInfo.data.rollNumber} has already submitted the form. Please contact administration if you need to make changes.`,
        success: false,
        updatedSlots: originalSlots, 
      };
    }
  } catch (error) {
    console.error('[Action: submitFacultySelection] Error checking existing roll number:', error);
    return {
      message: 'An unexpected error occurred while verifying your submission. Please try again.',
      success: false,
      updatedSlots: originalSlots,
    };
  }


  const selectionsArray = Object.entries(formValues.selections).map(([subjectId, facultyId]) => ({
    subjectId,
    facultyId: facultyId as string,
  }));

  if (selectionsArray.length !== subjects.length) {
     return { message: 'Please select a faculty for all subjects.', success: false, updatedSlots: originalSlots };
  }
  for (const subject of subjects) {
    if (!formValues.selections[subject.id] || formValues.selections[subject.id] === '') {
      return { message: `Faculty selection is missing for ${subject.name}.`, success: false, updatedSlots: originalSlots };
    }
  }
  
  const finalPayload = {
    ...parsedStudentInfo.data,
    selections: selectionsArray,
  };
  
  const validatedData = submissionSchema.safeParse(finalPayload);

  if (!validatedData.success) {
    return {
      message: 'Invalid submission data. Please check your selections.',
      issues: validatedData.error.flatten().formErrors,
      success: false,
      updatedSlots: originalSlots,
    };
  }

  // const originalSlots = await getFacultySlots(); // Moved up for early return

  for (const selection of validatedData.data.selections) {
    const result = updateFacultySlotSync(selection.facultyId, selection.subjectId);
    if (!result.success) {
      return {
        message: `Failed to secure slot for faculty for subject ${subjects.find(s=>s.id === selection.subjectId)?.name}. ${result.error}`,
        success: false,
        updatedSlots: originalSlots, 
      };
    }
  }
  
  const finalUpdatedSlots = await getFacultySlots(); 

  try {
    const submissionTimestamp = new Date().toISOString();
    const studentRollNumber = validatedData.data.rollNumber;
    const studentName = validatedData.data.name;
    const studentEmail = validatedData.data.email;
    const studentWhatsApp = validatedData.data.whatsappNumber;

    const sheetHeaders = ["Timestamp", "Roll Number", "Name", "Email ID", "WhatsApp Number"];
    subjects.forEach(subject => sheetHeaders.push(subject.name)); 

    const sheetRowData: (string | number | boolean)[] = [
        submissionTimestamp, 
        studentRollNumber, 
        studentName, 
        studentEmail, 
        studentWhatsApp
    ];
    subjects.forEach(subject => {
      const selection = validatedData.data.selections.find(s => s.subjectId === subject.id);
      if (selection) {
        const faculty = allFaculties.find(f => f.id === selection.facultyId);
        sheetRowData.push(faculty ? faculty.name : 'N/A - Faculty ID not found');
      } else {
        sheetRowData.push('Not Selected'); 
      }
    });
    
    const headersEnsured = await ensureSheetHeaders(sheetHeaders);
    if (headersEnsured) {
      const appendedToSheet = await appendToSheet([sheetRowData]);
      if (appendedToSheet) {
        console.log('Submission data successfully written to Google Sheet.');
      } else {
        // Attempt to revert slot updates if sheet write fails (basic compensation)
        console.warn('Submission processed, but failed to write data to Google Sheet. Attempting to revert slot allocations.');
        // This is a simplistic rollback; a proper transactional system would be better.
        validatedData.data.selections.forEach(sel => {
            // In a real system, you'd need to ensure this increment doesn't exceed initial max,
            // but for this basic compensation, we just increment.
            const faculty = allFaculties.find(f => f.id === sel.facultyId);
            const subject = subjects.find(s => s.id === sel.subjectId);
            if (faculty && subject) {
                 // We don't have the 'incrementFacultySlotSync' in this scope directly,
                 // but the principle is to reverse the update.
                 // For now, we'll log and the slots will remain decremented on the server.
                 // A full solution would require a robust transaction/compensation mechanism.
                 console.warn(`Need to implement slot increment for ${faculty.name} - ${subject.name} due to sheet write failure.`);
            }
        });
        // Return current slots which are the decremented ones, as rollback is not fully implemented here
        return {
            message: 'Your selections were processed, but there was an issue saving to the central record. Please contact administration. Your slot reservations might be temporary.',
            success: false, // Indicate an issue despite processing
            updatedSlots: finalUpdatedSlots,
        };
      }
    } else {
      console.warn('Failed to ensure Google Sheet headers. Submission data not written to sheet.');
       // Slots are already decremented, similar to above, a rollback would be ideal.
        return {
            message: 'Your selections were processed, but there was an issue preparing the central record. Please contact administration. Your slot reservations might be temporary.',
            success: false, 
            updatedSlots: finalUpdatedSlots,
        };
    }
  } catch (sheetError) {
    console.error('Error during Google Sheet operation:', sheetError);
     // Slots are already decremented.
    return {
        message: 'Your selections were processed, but a critical error occurred while finalizing your submission. Please contact administration.',
        success: false, 
        updatedSlots: finalUpdatedSlots,
    };
  }

  console.log('Submission successful:', validatedData.data);

  return {
    message: `Thank you, ${validatedData.data.name}! Your faculty selections have been submitted successfully.`,
    success: true,
    updatedSlots: finalUpdatedSlots,
  };
}

export async function getAIScalingGuidance(): Promise<ScalingGuidanceOutput> {
  try {
    const guidance = await fetchScalingGuidance({});
    return guidance;
  } catch (error) {
    console.error("Error fetching scaling guidance:", error);
    return { recommendations: "Could not retrieve scaling guidance at this time. Please try again later." };
  }
}

export async function fetchCurrentFacultySlots(): Promise<Record<string, number>> {
  return getFacultySlots();
}

export async function resetAllFacultySlots(): Promise<{success: boolean, message: string}> {
    try {
        await resetSlotsData();
        return { success: true, message: "All faculty slots have been reset to their initial values (per subject)." };
    } catch (error) {
        console.error("Error resetting faculty slots:", error);
        return { success: false, message: "Failed to reset faculty slots." };
    }
}

