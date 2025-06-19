
import FacultyConnectClient from '@/components/faculty-connect/FacultyConnectClient';
import { getSubjects, getFaculties, getFacultySlots, resetAllFacultySlots } from '@/lib/data';
import { AlertTriangle } from 'lucide-react';

export default async function Home() {
  let subjects = [];
  let faculties = [];
  let initialFacultySlots = {};
  let errorFetchingData: string | null = null;

  try {
    // Optional: Reset slots on each page load for demo purposes if persistence across sessions is not desired.
    // await resetAllFacultySlots(); 
    // Comment out above line if you want slots to persist (in memory on server) across reloads until server restarts.

    subjects = await getSubjects();
    faculties = await getFaculties();
    // initialFacultySlots will now have keys like "facultyId_subjectId"
    initialFacultySlots = await getFacultySlots();

    if (!subjects || !faculties || Object.keys(initialFacultySlots).length === 0 && faculties.length > 0 && subjects.length > 0) {
        // This condition might indicate that getFacultySlots failed silently if adminDb wasn't ready
        const facultyData = await getFaculties(); // Re-fetch to ensure it's not an issue with faculties/subjects themselves
        const subjectData = await getSubjects();
        if (facultyData.length > 0 && subjectData.length > 0 && Object.keys(initialFacultySlots).length === 0) {
             console.error("[Page Data Fetch] getFacultySlots returned empty but faculties/subjects exist. Admin SDK might not be initialized.");
             errorFetchingData = "Critical error: Could not load faculty slot data. Firebase Admin SDK might not be initialized correctly. Check server logs for 'Firebase Admin Init' messages.";
        }
    }

  } catch (e: any) {
    console.error("[Page Data Fetch] Error fetching initial data for Home page:", e.message, e.stack);
    errorFetchingData = `Failed to load initial application data: ${e.message}. Please check server logs.`;
  }

  if (errorFetchingData) {
    return (
      <main className="flex flex-col min-h-screen bg-background items-center justify-center p-4">
        <div className="bg-destructive/10 border border-destructive text-destructive p-6 rounded-lg shadow-lg max-w-md text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Application Error</h1>
          <p>{errorFetchingData}</p>
          <p className="mt-4 text-sm">Please contact support or try again later.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen bg-background">
      <FacultyConnectClient
        initialSubjects={subjects}
        initialFaculties={faculties}
        initialSlots={initialFacultySlots}
      />
    </main>
  );
}
