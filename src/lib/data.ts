
export interface Faculty {
  id: string;
  name: string;
  initialSlots: number;
}

export interface Subject {
  id: string;
  name: string;
  facultyOptions: Faculty['id'][]; // Array of faculty IDs that can teach this subject
}

const _faculties: Faculty[] = [
  { id: 'f1', name: 'Dr. Eleanor Vance', initialSlots: 72 },
  { id: 'f2', name: 'Prof. Samuel Green', initialSlots: 72 },
  { id: 'f3', name: 'Dr. Olivia Chen', initialSlots: 72 },
];

const _subjects: Subject[] = [
  { id: 's1', name: 'Advanced Quantum Physics', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's2', name: 'Organic Chemistry Symphony', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's3', name: 'Computational Linguistics', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's4', name: 'Ancient Civilizations & Mythology', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's5', name: 'Modern Political Theory', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's6', name: 'Astrobiology Fundamentals', facultyOptions: ['f1', 'f2', 'f3'] },
];

// In-memory store for slots: key is `${facultyId}_${subjectId}`
let facultySlotsData: Record<string, number> = {};
let dataInitialized = false;

const initializeDataStore = () => {
  // Re-initialize if not initialized or if the structure implies a reset is needed
  // This is a simplified check for development; a real app might need more robust versioning or migration
  const expectedKeysCount = _subjects.reduce((count, subject) => {
    const teachingFaculty = _faculties.filter(f => subject.facultyOptions.includes(f.id));
    return count + teachingFaculty.length;
  }, 0);

  if (dataInitialized && Object.keys(facultySlotsData).length === expectedKeysCount) {
     // Basic check to see if it might be already initialized.
     // More robust checks could verify specific keys or values if faculty/subject data changes frequently.
    let allKeysMatchInitialValue = true;
    for (const subject of _subjects) {
        for (const facultyId of subject.facultyOptions) {
            const faculty = _faculties.find(f => f.id === facultyId);
            if (faculty) {
                const key = `${faculty.id}_${subject.id}`;
                if (facultySlotsData[key] !== faculty.initialSlots && facultySlotsData[key] !== undefined /* existing value may be less due to selections */) {
                    // This part of the check is tricky as slots can be legitimately lower.
                    // The primary goal is to ensure initialization if the set of keys changes.
                }
            }
        }
    }
    // If the number of keys is right, assume it's initialized enough for demo.
    // A full re-check of initial values for all keys might be too aggressive if slots are meant to persist.
    // For now, if key count matches, we assume it's mostly fine. Reset is explicit.
    return;
  }

  facultySlotsData = {}; // Clear previous data
   _faculties.forEach(faculty => {
    _subjects.forEach(subject => {
      if (subject.facultyOptions.includes(faculty.id)) {
        const key = `${faculty.id}_${subject.id}`;
        facultySlotsData[key] = faculty.initialSlots;
      }
    });
  });
  dataInitialized = true;
  console.log('Faculty slots initialized (per-subject):', facultySlotsData);
};

initializeDataStore();

export async function getFaculties(): Promise<Faculty[]> {
  initializeDataStore();
  return JSON.parse(JSON.stringify(_faculties));
}

export async function getFacultyById(id: string): Promise<Faculty | undefined> {
  initializeDataStore();
  return _faculties.find(f => f.id === id);
}

export async function getSubjects(): Promise<Subject[]> {
  initializeDataStore();
  return JSON.parse(JSON.stringify(_subjects));
}

export async function getFacultySlots(): Promise<Record<string, number>> {
  initializeDataStore();
  return JSON.parse(JSON.stringify(facultySlotsData));
}

export function updateFacultySlotSync(facultyId: string, subjectId: string): { success: boolean; error?: string; currentSlots?: number } {
  initializeDataStore();
  const key = `${facultyId}_${subjectId}`;
  if (facultySlotsData[key] === undefined) {
    return { success: false, error: 'Faculty not assigned to this subject or slot data missing.' };
  }
  if (facultySlotsData[key] > 0) {
    facultySlotsData[key]--;
    return { success: true, currentSlots: facultySlotsData[key] };
  }
  return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
}

export async function resetAllFacultySlots(): Promise<void> {
  // Reset the slots data to initial values by re-running initialization
  dataInitialized = false; // Force re-initialization
  initializeDataStore();
  console.log('Faculty slots reset (per-subject) to:', facultySlotsData);
}
