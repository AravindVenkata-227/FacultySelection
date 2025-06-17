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
  { id: 'f1', name: 'Dr. Eleanor Vance', initialSlots: 70 },
  { id: 'f2', name: 'Prof. Samuel Green', initialSlots: 70 },
  { id: 'f3', name: 'Dr. Olivia Chen', initialSlots: 70 },
  { id: 'f4', name: 'Prof. Marcus Bellwether', initialSlots: 70 },
  { id: 'f5', name: 'Dr. Anya Sharma', initialSlots: 70 },
  { id: 'f6', name: 'Prof. Kenji Tanaka', initialSlots: 70 },
];

const _subjects: Subject[] = [
  { id: 's1', name: 'Advanced Quantum Physics', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's2', name: 'Organic Chemistry Symphony', facultyOptions: ['f2', 'f4', 'f5'] },
  { id: 's3', name: 'Computational Linguistics', facultyOptions: ['f3', 'f5', 'f6'] },
  { id: 's4', name: 'Ancient Civilizations & Mythology', facultyOptions: ['f1', 'f4', 'f6'] },
];

// In-memory store for slots - this is a simplification for demo purposes.
// In a real app, this would be a database.
let facultySlotsData: Record<string, number> = {};
let dataInitialized = false;

const initializeDataStore = () => {
  if (dataInitialized && Object.keys(facultySlotsData).length > 0) return;

  _faculties.forEach(faculty => {
    facultySlotsData[faculty.id] = faculty.initialSlots;
  });
  dataInitialized = true;
};

// Ensure data is initialized on module load or first call
initializeDataStore();

export async function getFaculties(): Promise<Faculty[]> {
  return JSON.parse(JSON.stringify(_faculties)); // Return deep copy
}

export async function getFacultyById(id: string): Promise<Faculty | undefined> {
  return _faculties.find(f => f.id === id);
}

export async function getSubjects(): Promise<Subject[]> {
  return JSON.parse(JSON.stringify(_subjects)); // Return deep copy
}

export async function getFacultySlots(): Promise<Record<string, number>> {
  // Always re-initialize if empty, to simulate fetching fresh data or reset state for new interaction.
  // For a more persistent demo, you might remove this forceful re-init.
  if (Object.keys(facultySlotsData).length === 0 || !dataInitialized) {
     initializeDataStore();
  }
  return JSON.parse(JSON.stringify(facultySlotsData)); // Return deep copy
}

// This function is for server actions to update slots.
// It's synchronous as it modifies an in-memory object.
export function updateFacultySlotSync(facultyId: string): { success: boolean; error?: string; currentSlots?: number } {
  if (facultySlotsData[facultyId] === undefined) {
    return { success: false, error: 'Faculty not found.' };
  }
  if (facultySlotsData[facultyId] > 0) {
    facultySlotsData[facultyId]--;
    return { success: true, currentSlots: facultySlotsData[facultyId] };
  }
  return { success: false, error: 'No slots available.', currentSlots: 0 };
}

export async function resetAllFacultySlots(): Promise<void> {
    // Reset the slots data to initial values
    _faculties.forEach(faculty => {
        facultySlotsData[faculty.id] = faculty.initialSlots;
    });
    dataInitialized = true; // Ensure it's marked as initialized
}
