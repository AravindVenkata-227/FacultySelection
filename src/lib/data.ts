
export interface Faculty {
  id: string;
  name: string;
  initialSlots: number; // This will represent initial slots for the specific subject they teach
}

export interface Subject {
  id: string;
  name: string;
  facultyOptions: Faculty['id'][]; // Array of faculty IDs that can teach this subject
}

const _faculties: Faculty[] = [
  // AI Faculty
  { id: 'f1', name: 'Dr. V N V Satya Prakash (ECE)', initialSlots: 72 },
  { id: 'f2', name: 'Mr. T. Raghavendra (CE)', initialSlots: 72 },
  { id: 'f3', name: 'Mrs. S. Rubiya Parveen', initialSlots: 72 },
  // CS Faculty
  { id: 'f4', name: 'Dr. P. Sreedevi', initialSlots: 72 },
  { id: 'f5', name: 'Dr. N. Ramanjaneya Reddy', initialSlots: 72 },
  { id: 'f6', name: 'Mr. K. Vishwanath', initialSlots: 72 },
  // LSA Faculty
  { id: 'f7', name: 'Dr. K. Nageswara Reddy', initialSlots: 72 },
  { id: 'f8', name: 'Mr. B. Rameswara Reddy', initialSlots: 72 },
  { id: 'f9', name: 'Mr. L. Bhavani Sankar', initialSlots: 72 },
  // OOAD Faculty
  { id: 'f10', name: 'Mrs. D. Sravanthi', initialSlots: 72 },
  { id: 'f11', name: 'Mr. B. V. Chandra Sekhar', initialSlots: 72 },
  { id: 'f12', name: 'Mr. A. Ramesh', initialSlots: 72 },
  // MS Faculty
  { id: 'f13', name: 'Mr. K. Ramakrishna (MBA)', initialSlots: 72 },
  { id: 'f14', name: 'Mrs. Shahin (MBA)', initialSlots: 72 },
  { id: 'f15', name: 'Dr. N. Rajasekhar (MBA)', initialSlots: 72 },
  // BCT Faculty
  { id: 'f16', name: 'Mr. G. Rajasekhar Reddy', initialSlots: 72 },
  { id: 'f17', name: 'Mr. E. Narasimhulu (EEE)', initialSlots: 72 },
  { id: 'f18', name: 'Mr. J. Nagarjuna Reddy (EEE)', initialSlots: 72 },
];

const _subjects: Subject[] = [
  { id: 's1', name: 'Artificial Intelligence (AI)', facultyOptions: ['f1', 'f2', 'f3'] },
  { id: 's2', name: 'Cyber Security (CS)', facultyOptions: ['f4', 'f5', 'f6'] },
  { id: 's3', name: 'Linux System Administration (LSA)', facultyOptions: ['f7', 'f8', 'f9'] },
  { id: 's4', name: 'Object Oriented Analysis & Design (OOAD)', facultyOptions: ['f10', 'f11', 'f12'] },
  { id: 's5', name: 'Management Sciences (MS)', facultyOptions: ['f13', 'f14', 'f15'] },
  { id: 's6', name: 'BCT', facultyOptions: ['f16', 'f17', 'f18'] },
];

let facultySlotsData: Record<string, number> = {}; // Key: `${facultyId}_${subjectId}`
let dataInitialized = false;

const initializeDataStore = () => {
  if (dataInitialized) {
    let expectedKeysCount = 0;
    _subjects.forEach(subject => {
        subject.facultyOptions.forEach(facultyId => {
            // Ensure the faculty is actually in the _faculties list
            if (_faculties.some(f => f.id === facultyId)) {
                expectedKeysCount++;
            }
        });
    });
    if (Object.keys(facultySlotsData).length === expectedKeysCount &&
        _faculties.every(f => _subjects.some(s => s.facultyOptions.includes(f.id) && facultySlotsData[`${f.id}_${s.id}`] !== undefined))) {
        return; 
    }
    console.log('Re-initializing data store due to potential structure change or mismatch.');
  }

  facultySlotsData = {};
  _subjects.forEach(subject => {
    subject.facultyOptions.forEach(facultyId => {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) { // Ensure faculty exists
        const key = `${faculty.id}_${subject.id}`;
        facultySlotsData[key] = faculty.initialSlots; // Each faculty has distinct slots for the subject they teach
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
  initializeDataStore(); 
  const key = `${facultyId}_${subjectId}`;
  
  const faculty = _faculties.find(f => f.id === facultyId);
  const subject = _subjects.find(s => s.id === subjectId);

  if (!faculty || !subject || !subject.facultyOptions.includes(facultyId)) {
     return { success: false, error: 'Faculty not assigned to this subject or invalid IDs.' };
  }

  if (facultySlotsData[key] === undefined) {
    console.warn(`Slot key ${key} was undefined despite valid faculty/subject. Initializing it.`);
    facultySlotsData[key] = faculty.initialSlots; // Initialize if somehow missed
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

