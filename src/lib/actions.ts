
'use server';

import { z } from 'zod';
import { studentInfoSchema, submissionSchema, FacultyConnectFormValues } from './schema';
import { getSubjects, updateFacultySlotSync, getFacultySlots, resetAllFacultySlots as resetSlotsData, getFaculties, Faculty, Subject } from './data';
import { getScalingGuidance as fetchScalingGuidance } from '@/ai/flows/scaling-guidance';
import type { ScalingGuidanceOutput } from '@/ai/flows/scaling-guidance';
import { appendToSheet, ensureSheetHeaders } from '@/services/google-sheets-service';

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
  });

  if (!parsedStudentInfo.success) {
    return {
      message: 'Invalid student information.',
      fields: {
        rollNumber: parsedStudentInfo.error.flatten().fieldErrors.rollNumber?.join(', ') ?? '',
        name: parsedStudentInfo.error.flatten().fieldErrors.name?.join(', ') ?? '',
      },
      success: false,
    };
  }

  const selectionsArray = Object.entries(formValues.selections).map(([subjectId, facultyId]) => ({
    subjectId,
    facultyId: facultyId as string,
  }));

  if (selectionsArray.length !== subjects.length) {
     return { message: 'Please select a faculty for all subjects.', success: false };
  }
  for (const subject of subjects) {
    if (!formValues.selections[subject.id] || formValues.selections[subject.id] === '') {
      return { message: `Faculty selection is missing for ${subject.name}.`, success: false };
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
    };
  }

  const originalSlots = await getFacultySlots(); 

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

  // Append to Google Sheet after successful slot update
  try {
    const submissionTimestamp = new Date().toISOString();
    const studentRollNumber = validatedData.data.rollNumber;
    const studentName = validatedData.data.name;

    const sheetHeaders = ["Timestamp", "Roll Number", "Name"];
    subjects.forEach(subject => sheetHeaders.push(subject.name)); // Subject names as headers

    const sheetRowData = [submissionTimestamp, studentRollNumber, studentName];
    subjects.forEach(subject => {
      const selection = validatedData.data.selections.find(s => s.subjectId === subject.id);
      if (selection) {
        const faculty = allFaculties.find(f => f.id === selection.facultyId);
        sheetRowData.push(faculty ? faculty.name : 'N/A - Faculty ID not found');
      } else {
        // This case should ideally be caught by earlier validation
        sheetRowData.push('Not Selected'); 
      }
    });
    
    const headersEnsured = await ensureSheetHeaders(sheetHeaders);
    if (headersEnsured) {
      const appendedToSheet = await appendToSheet([sheetRowData]);
      if (appendedToSheet) {
        console.log('Submission data successfully written to Google Sheet.');
      } else {
        console.warn('Submission successful, but failed to write data to Google Sheet. Check service account permissions and SPREADSHEET_ID/SHEET_NAME.');
        // Not failing the entire submission, but logging a warning.
      }
    } else {
      console.warn('Failed to ensure Google Sheet headers. Submission data not written to sheet.');
    }
  } catch (sheetError) {
    console.error('Error during Google Sheet operation:', sheetError);
    // Log the error but don't fail the user's submission if other parts were successful.
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
