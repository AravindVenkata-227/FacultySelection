
import FacultyConnectClient from '@/components/faculty-connect/FacultyConnectClient';
import { getSubjects, getFaculties, getFacultySlots, resetAllFacultySlots } from '@/lib/data';

export default async function Home() {
  // Optional: Reset slots on each page load for demo purposes if persistence across sessions is not desired.
  // await resetAllFacultySlots(); 
  // Comment out above line if you want slots to persist (in memory on server) across reloads until server restarts.

  const subjects = await getSubjects();
  const faculties = await getFaculties();
  // initialFacultySlots will now have keys like "facultyId_subjectId"
  const initialFacultySlots = await getFacultySlots();

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
