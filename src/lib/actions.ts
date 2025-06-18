
'use server';

import { z } from 'zod';
import { studentInfoSchema, submissionSchema, FacultyConnectFormValues, FacultySelectionEntry } from './schema';
import { 
  getSubjects, 
  updateFacultySlot, 
  getFacultySlots, 
  resetAllFacultySlots as resetSlotsData, 
  getFaculties, 
  Faculty, 
  Subject,
  addStudentSubmission,
  getStudentSubmissionByRollNumber,
  incrementFacultySlot // Ensure this is imported if used for compensation
} from './data';
import { getScalingGuidance as fetchScalingGuidance } from '@/ai/flows/scaling-guidance';
import type { ScalingGuidanceOutput } from '@/ai/flows/scaling-guidance';
// Google Sheets service is being deprecated for submissions
// import { appendToSheet, ensureSheetHeaders, getRollNumbersFromSheet } from '@/services/google-sheets-service';

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

  const initialSlotsBeforeOperation = await getFacultySlots(); // Get current slots before trying to update

  try {
    const existingSubmission = await getStudentSubmissionByRollNumber(parsedStudentInfo.data.rollNumber);
    if (existingSubmission) {
      return {
        message: `Roll number ${parsedStudentInfo.data.rollNumber} has already submitted the form. Please contact administration if you need to make changes.`,
        success: false,
        updatedSlots: initialSlotsBeforeOperation, 
      };
    }
  } catch (error) {
    console.error('[Action: submitFacultySelection] Error checking existing roll number in Firestore:', error);
    return {
      message: 'An unexpected error occurred while verifying your submission. Please try again.',
      success: false,
      updatedSlots: initialSlotsBeforeOperation,
    };
  }

  const selectionsArray: FacultySelectionEntry[] = Object.entries(formValues.selections)
    .map(([subjectId, facultyId]) => ({
      subjectId,
      facultyId: facultyId as string,
    }))
    .filter(selection => selection.facultyId && selection.facultyId !== ''); // Ensure facultyId is present

  if (selectionsArray.length !== subjects.length) {
     return { message: 'Please select a faculty for all subjects.', success: false, updatedSlots: initialSlotsBeforeOperation };
  }
  for (const subject of subjects) {
    if (!formValues.selections[subject.id] || formValues.selections[subject.id] === '') {
      return { message: `Faculty selection is missing for ${subject.name}.`, success: false, updatedSlots: initialSlotsBeforeOperation };
    }
  }
  
  const finalPayloadForValidation = { // This is for Zod validation
    ...parsedStudentInfo.data,
    selections: selectionsArray, // Use the filtered and mapped array
  };
  
  const validatedData = submissionSchema.safeParse(finalPayloadForValidation);

  if (!validatedData.success) {
    return {
      message: 'Invalid submission data. Please check your selections.',
      issues: validatedData.error.flatten().formErrors,
      success: false,
      updatedSlots: initialSlotsBeforeOperation,
    };
  }

  // Attempt to update slots
  const successfullyUpdatedSlotInfo: {facultyId: string, subjectId: string}[] = [];
  for (const selection of validatedData.data.selections) {
    const result = await updateFacultySlot(selection.facultyId, selection.subjectId);
    if (!result.success) {
      // Revert already decremented slots if one fails
      for (const revertedSlot of successfullyUpdatedSlotInfo) {
        await incrementFacultySlot(revertedSlot.facultyId, revertedSlot.subjectId);
        console.warn(`Compensated slot for ${revertedSlot.facultyId} - ${revertedSlot.subjectId} due to subsequent failure.`);
      }
      const currentSlotsAfterPartialFailure = await getFacultySlots();
      return {
        message: `Failed to secure slot for faculty for subject ${subjects.find(s=>s.id === selection.subjectId)?.name}. ${result.error || 'Slot not available or error occurred.'}`,
        success: false,
        updatedSlots: currentSlotsAfterPartialFailure, 
      };
    }
    successfullyUpdatedSlotInfo.push({facultyId: selection.facultyId, subjectId: selection.subjectId});
  }
  
  const finalUpdatedSlotsAfterSuccess = await getFacultySlots(); 

  // Prepare data for Firestore (using IDs for selections)
  const submissionToStore = {
    rollNumber: validatedData.data.rollNumber,
    name: validatedData.data.name,
    email: validatedData.data.email,
    whatsappNumber: validatedData.data.whatsappNumber,
    selections: validatedData.data.selections.reduce((acc, sel) => {
      acc[sel.subjectId] = sel.facultyId;
      return acc;
    }, {} as Record<string, string>),
    // timestamp will be added by addStudentSubmission using serverTimestamp
  };

  const saveResult = await addStudentSubmission(submissionToStore);

  if (!saveResult.success) {
    console.error('Submission processed slots, but failed to write data to Firestore. Attempting to revert slot allocations.');
    // Revert all successfully updated slots
    for (const revertedSlot of successfullyUpdatedSlotInfo) {
        await incrementFacultySlot(revertedSlot.facultyId, revertedSlot.subjectId);
        console.warn(`Compensated slot for ${revertedSlot.facultyId} - ${revertedSlot.subjectId} due to Firestore save failure.`);
    }
    const compensatedSlots = await getFacultySlots();
    return {
        message: saveResult.error || 'Your selections were processed, but there was an issue saving your submission to the database. Please contact administration. Your slot reservations might be temporary.',
        success: false, 
        updatedSlots: compensatedSlots, 
    };
  }
  
  console.log('Submission successful and saved to Firestore:', validatedData.data.rollNumber);

  return {
    message: `Thank you, ${validatedData.data.name}! Your faculty selections have been submitted successfully.`,
    success: true,
    updatedSlots: finalUpdatedSlotsAfterSuccess,
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

export async function resetAllFacultySlotsForApp(): Promise<{success: boolean, message: string}> {
    try {
        await resetSlotsData(); // This now calls resetAllFacultySlots in data.ts which handles Firestore
        return { success: true, message: "All faculty slots have been reset in Firestore." };
    } catch (error) {
        console.error("Error resetting faculty slots via action:", error);
        return { success: false, message: "Failed to reset faculty slots." };
    }
}
