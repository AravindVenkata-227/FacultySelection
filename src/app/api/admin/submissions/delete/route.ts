
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteStudentSubmission, incrementFacultySlot, getFaculties, getSubjects, type Faculty, type Subject, type StudentSubmission } from '@/lib/data';

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

    console.log(`[API Delete Submission Firestore] Attempting to delete submission for roll number: ${rollNumber}`);
    const deleteResult = await deleteStudentSubmission(rollNumber);

    if (!deleteResult.success || !deleteResult.deletedData) {
      console.error(`[API Delete Submission Firestore] Failed to delete from Firestore or extract choices: ${deleteResult.error}`);
      return NextResponse.json({ message: deleteResult.error || 'Failed to delete submission from Firestore or extract choices.' }, { status: 500 });
    }

    const deletedStudentChoicesMap = deleteResult.deletedData.selections; // This is subjectId: facultyId
    console.log('[API Delete Submission Firestore] Submission deleted from Firestore. Restoring faculty slots. Choices (IDs):', deletedStudentChoicesMap);
    
    const allFaculties: Faculty[] = await getFaculties();
    const allSubjects: Subject[] = await getSubjects(); 
    let slotRestorationErrors: string[] = [];
    let slotsSuccessfullyRestoredCount = 0;

    for (const [subjectId, facultyId] of Object.entries(deletedStudentChoicesMap)) {
      const subject = allSubjects.find(s => s.id === subjectId);
      const faculty = allFaculties.find(f => f.id === facultyId);
      
      const subjectNameForLog = subject ? subject.name : `Unknown Subject (ID: ${subjectId})`;
      const facultyNameForLog = faculty ? faculty.name : `Unknown Faculty (ID: ${facultyId})`;
      console.log(`[API Delete Submission Firestore] Processing choice - Subject: "${subjectNameForLog}", Faculty: "${facultyNameForLog}"`);

      if (subject && faculty) {
        console.log(`[API Delete Submission Firestore] Attempting to restore slot for Subject ID: ${subject.id}, Faculty ID: ${faculty.id}`);
        const restoreResult = await incrementFacultySlot(faculty.id, subject.id);
        if (!restoreResult.success) {
          const errorMsg = `Failed to restore slot for ${faculty.name} - ${subject.name}: ${restoreResult.error || 'Unknown error'}`;
          console.error(`[API Delete Submission Firestore] ${errorMsg}`);
          slotRestorationErrors.push(errorMsg);
        } else {
          console.log(`[API Delete Submission Firestore] Slot restored successfully for ${faculty.name} - ${subject.name}. New count: ${restoreResult.currentSlots}`);
          slotsSuccessfullyRestoredCount++;
        }
      } else {
        let notFoundMessage = '';
        if (!subject) {
          notFoundMessage += `Could not find subject with ID "${subjectId}" in system. `;
        }
        if (!faculty) {
          notFoundMessage += `Could not find faculty with ID "${facultyId}" in system. `;
        }
        const errorMsg = `Skipping slot restoration for Subject ID "${subjectId}" - Faculty ID "${facultyId}": ${notFoundMessage.trim()}`;
        console.warn(`[API Delete Submission Firestore] ${errorMsg}`);
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

    console.log(`[API Delete Submission Firestore] Successfully deleted submission and restored all (${slotsSuccessfullyRestoredCount}) slots for roll number: ${rollNumber}`);
    return NextResponse.json({ message: `Successfully deleted submission for ${rollNumber} and restored faculty slots.` }, { status: 200 });

  } catch (error) {
    console.error('[API Delete Submission Firestore] Error processing delete request:', error);
    return NextResponse.json({ message: 'An internal server error occurred.' }, { status: 500 });
  }
}
