
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSheetRowByRollNumber } from '@/services/google-sheets-service';
import { incrementFacultySlotSync, getFaculties, getSubjects, type Faculty, type Subject } from '@/lib/data';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('admin-auth-token')?.value;

  if (!authToken || authToken !== 'true') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { rollNumber } = await request.json();

    if (!rollNumber || typeof rollNumber !== 'string') {
      return NextResponse.json({ message: 'Roll number is required.' }, { status: 400 });
    }

    console.log(`[API Delete Submission] Attempting to delete submission for roll number: ${rollNumber}`);
    const deleteResult = await deleteSheetRowByRollNumber(rollNumber);

    if (!deleteResult.success || !deleteResult.deletedStudentChoices) {
      console.error(`[API Delete Submission] Failed to delete from sheet or extract choices: ${deleteResult.error}`);
      return NextResponse.json({ message: deleteResult.error || 'Failed to delete submission from Google Sheet or extract choices.' }, { status: 500 });
    }

    console.log('[API Delete Submission] Submission deleted from sheet. Restoring faculty slots. Choices extracted:', deleteResult.deletedStudentChoices);
    
    const allFaculties: Faculty[] = await getFaculties();
    const allSubjects: Subject[] = await getSubjects(); // Fetch all subjects
    let slotRestorationErrors: string[] = [];
    let slotsSuccessfullyRestoredCount = 0;

    for (const [subjectName, facultyName] of Object.entries(deleteResult.deletedStudentChoices)) {
      console.log(`[API Delete Submission] Processing choice - Subject: "${subjectName}", Faculty: "${facultyName}"`);
      
      const subject = allSubjects.find(s => s.name === subjectName); // Corrected: Search in allSubjects
      const faculty = allFaculties.find(f => f.name === facultyName);

      if (subject && faculty) {
        console.log(`[API Delete Submission] Found Subject: ${subject.name} (ID: ${subject.id}), Faculty: ${faculty.name} (ID: ${faculty.id})`);
        console.log(`[API Delete Submission] Attempting to restore slot for Subject ID: ${subject.id}, Faculty ID: ${faculty.id}`);
        const restoreResult = incrementFacultySlotSync(faculty.id, subject.id);
        if (!restoreResult.success) {
          const errorMsg = `Failed to restore slot for ${faculty.name} - ${subject.name}: ${restoreResult.error || 'Unknown error'}`;
          console.error(`[API Delete Submission] ${errorMsg}`);
          slotRestorationErrors.push(errorMsg);
        } else {
          console.log(`[API Delete Submission] Slot restored successfully for ${faculty.name} - ${subject.name}. New count: ${restoreResult.currentSlots}`);
          slotsSuccessfullyRestoredCount++;
        }
      } else {
        let notFoundMessage = '';
        if (!subject) {
          notFoundMessage += `Could not find subject with name "${subjectName}" in system. `;
          console.warn(`[API Delete Submission] Subject named "${subjectName}" not found in src/lib/data.ts. Available subjects: ${allSubjects.map(s => s.name).join(', ')}`);
        }
        if (!faculty) {
          notFoundMessage += `Could not find faculty with name "${facultyName}" in system. `;
          console.warn(`[API Delete Submission] Faculty named "${facultyName}" not found in src/lib/data.ts. Available faculties: ${allFaculties.map(f => f.name).join(', ')}`);
        }
        const errorMsg = `Skipping slot restoration for "${subjectName}" - "${facultyName}": ${notFoundMessage.trim()}`;
        console.warn(`[API Delete Submission] ${errorMsg}`);
        slotRestorationErrors.push(errorMsg);
      }
    }

    if (slotRestorationErrors.length > 0) {
      const baseMessage = `Submission deleted for ${rollNumber}.`;
      const successMessage = slotsSuccessfullyRestoredCount > 0 ? `${slotsSuccessfullyRestoredCount} slot(s) restored.` : '';
      const errorMessage = `Encountered errors restoring ${slotRestorationErrors.length} slot(s): ${slotRestorationErrors.join('; ')}`;
      
      return NextResponse.json({ 
        message: `${baseMessage} ${successMessage} ${errorMessage}`.trim(),
        partialSuccess: true 
      }, { status: 207 }); // Multi-Status
    }

    console.log(`[API Delete Submission] Successfully deleted submission and restored all (${slotsSuccessfullyRestoredCount}) slots for roll number: ${rollNumber}`);
    return NextResponse.json({ message: `Successfully deleted submission for ${rollNumber} and restored faculty slots.` }, { status: 200 });

  } catch (error) {
    console.error('[API Delete Submission] Error processing delete request:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
