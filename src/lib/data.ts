
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

let facultySlotsData: Record<string, number> = {};
let dataInitialized = false;

const initializeDataStore = () => {
  if (dataInitialized) {
    // A simple check: if the number of faculties or subjects changes, re-initialize.
    // This is a basic way to handle potential structural changes during development.
    let expectedKeysCount = 0;
    _subjects.forEach(subject => {
        subject.facultyOptions.forEach(facultyId => {
            if (_faculties.some(f => f.id === facultyId)) {
                expectedKeysCount++;
            }
        });
    });
    if (Object.keys(facultySlotsData).length === expectedKeysCount) {
        return; // Assume data is fine if key count matches expected.
    }
    // If key count mismatch, means structure might have changed, so re-initialize.
    console.log('Re-initializing data store due to potential structure change.');
  }

  facultySlotsData = {}; 
   _faculties.forEach(faculty => {
    _subjects.forEach(subject => {
      // Only create slot entries if the faculty is listed as an option for the subject
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

export async function getSubjectById(id: string): Promise<Subject | undefined> {
  initializeDataStore();
  return _subjects.find(s => s.id === id);
}


export async function getFacultySlots(): Promise<Record<string, number>> {
  initializeDataStore();
  return JSON.parse(JSON.stringify(facultySlotsData));
}

export function updateFacultySlotSync(facultyId: string, subjectId: string): { success: boolean; error?: string; currentSlots?: number } {
  initializeDataStore(); // Ensure data is initialized before trying to update
  const key = `${facultyId}_${subjectId}`;
  
  if (facultySlotsData[key] === undefined) {
    // This check is important. If a facultyId_subjectId key doesn't exist,
    // it means either the faculty isn't assigned to the subject or data isn't initialized correctly.
    const facultyExists = _faculties.some(f => f.id === facultyId);
    const subjectExists = _subjects.some(s => s.id === subjectId);
    const facultyTeachesSubject = _subjects.find(s => s.id === subjectId)?.facultyOptions.includes(facultyId);

    if (!facultyExists || !subjectExists || !facultyTeachesSubject) {
         return { success: false, error: 'Faculty not assigned to this subject or invalid IDs.' };
    }
    // If IDs are valid but key is missing, it implies an initialization issue (should be caught by initializeDataStore)
    // or an attempt to select a faculty for a subject they don't teach (should be caught by UI ideally).
    // For robustness, if the key is missing but should exist, initialize it.
    // This scenario should be rare if initializeDataStore is robust and UI is correct.
    console.warn(`Slot key ${key} was undefined. Re-checking initialization.`);
    initializeDataStore(); // Attempt to re-initialize if it seems off
    if (facultySlotsData[key] === undefined) {
       return { success: false, error: 'Slot data missing even after re-check. Faculty might not be configured for this subject.' };
    }
  }

  if (facultySlotsData[key] > 0) {
    facultySlotsData[key]--;
    return { success: true, currentSlots: facultySlotsData[key] };
  }
  return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
}

export async function resetAllFacultySlots(): Promise<void> {
  dataInitialized = false; 
  initializeDataStore();
  console.log('Faculty slots reset (per-subject) to:', facultySlotsData);
}
