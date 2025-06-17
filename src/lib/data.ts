
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
  { id: 'f1', name: 'Dr. Eleanor Vance', initialSlots: 90 },
  { id: 'f2', name: 'Prof. Samuel Green', initialSlots: 90 },
  { id: 'f3', name: 'Dr. Olivia Chen', initialSlots: 90 },
];

const _subjects: Subject[] = [
  { id: 's1', name: 'Advanced Quantum Physics', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's2', name: 'Organic Chemistry Symphony', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's3', name: 'Computational Linguistics', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's4', name: 'Ancient Civilizations & Mythology', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's5', name: 'Modern Political Theory', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's6', name: 'Astrobiology Fundamentals', facultyOptions: ['f1', 'f2', 'f3'] },
];

// In-memory store for slots - this is a simplification for demo purposes.
// In a real app, this would be a database.
let facultySlotsData: Record<string, number> = {};
let dataInitialized = false;

const initializeDataStore = () => {
  if (dataInitialized && Object.keys(facultySlotsData).length > 0 &&
      Object.keys(facultySlotsData).length === _faculties.length &&
      _faculties.every(f => facultySlotsData[f.id] !== undefined)) {
    // Basic check to see if it might be already initialized with current faculty set
    return;
  }

  facultySlotsData = {}; // Clear previous data if faculties changed
  _faculties.forEach(faculty => {
    facultySlotsData[faculty.id] = faculty.initialSlots;
  });
  dataInitialized = true;
};

// Ensure data is initialized on module load or first call
initializeDataStore();

export async function getFaculties(): Promise<Faculty[]> {
  initializeDataStore(); // Ensure data is initialized, especially if hot-reloading or server restarts.
  return JSON.parse(JSON.stringify(_faculties)); // Return deep copy
}

export async function getFacultyById(id: string): Promise<Faculty | undefined> {
  initializeDataStore();
  return _faculties.find(f => f.id === id);
}

export async function getSubjects(): Promise<Subject[]> {
  initializeDataStore();
  return JSON.parse(JSON.stringify(_subjects)); // Return deep copy
}

export async function getFacultySlots(): Promise<Record<string, number>> {
  initializeDataStore(); // Ensure data is initialized with the correct set of faculties
  return JSON.parse(JSON.stringify(facultySlotsData)); // Return deep copy
}

// This function is for server actions to update slots.
// It's synchronous as it modifies an in-memory object.
export function updateFacultySlotSync(facultyId: string): { success: boolean; error?: string; currentSlots?: number } {
  initializeDataStore(); // Ensure slots are loaded
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
    facultySlotsData = {}; // Clear previous data
    _faculties.forEach(faculty => {
        facultySlotsData[faculty.id] = faculty.initialSlots;
    });
    dataInitialized = true; // Ensure it's marked as initialized
    console.log('Faculty slots reset to:', facultySlotsData);
}
