
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  writeBatch, 
  Timestamp,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

export interface Faculty {
  id: string;
  name: string;
  initialSlots: number;
}

export interface Subject {
  id: string;
  name: string;
  facultyOptions: Faculty['id'][];
}

// Student Submission data structure for Firestore
export interface StudentSubmission {
  rollNumber: string;
  name: string;
  email: string;
  whatsappNumber: string;
  timestamp: Timestamp;
  selections: Record<string, string>; // subjectId -> facultyId
}


const _faculties: Faculty[] = [
  { id: 'f1', name: 'Dr. V N V Satya Prakash (ECE)', initialSlots: 72 },
  { id: 'f2', name: 'Mr. T. Raghavendra (CE)', initialSlots: 72 },
  { id: 'f3', name: 'Mrs. S. Rubiya Parveen', initialSlots: 72 },
  { id: 'f4', name: 'Dr. P. Sreedevi', initialSlots: 72 },
  { id: 'f5', name: 'Dr. N. Ramanjaneya Reddy', initialSlots: 72 },
  { id: 'f6', name: 'Mr. K. Vishwanath', initialSlots: 72 },
  { id: 'f7', name: 'Dr. K. Nageswara Reddy', initialSlots: 72 },
  { id: 'f8', name: 'Mr. B. Rameswara Reddy', initialSlots: 72 },
  { id: 'f9', name: 'Mr. L. Bhavani Sankar', initialSlots: 72 },
  { id: 'f10', name: 'Mrs. D. Sravanthi', initialSlots: 72 },
  { id: 'f11', name: 'Mr. B. V. Chandra Sekhar', initialSlots: 72 },
  { id: 'f12', name: 'Mr. A. Ramesh', initialSlots: 72 },
  { id: 'f13', name: 'Mr. K. Ramakrishna (MBA)', initialSlots: 72 },
  { id: 'f14', name: 'Mrs. Shahin (MBA)', initialSlots: 72 },
  { id: 'f15', name: 'Dr. N. Rajasekhar (MBA)', initialSlots: 72 },
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
  { id: 's6', name: 'Block Chain Technologies (BCT)', facultyOptions: ['f16', 'f17', 'f18'] },
];

const FACULTY_SLOTS_COLLECTION = 'facultySubjectSlots';
const STUDENT_SUBMISSIONS_COLLECTION = 'studentSubmissions';

export async function getFaculties(): Promise<Faculty[]> {
  return JSON.parse(JSON.stringify(_faculties));
}

export async function getFacultyById(id: string): Promise<Faculty | undefined> {
  return _faculties.find(f => f.id === id);
}

export async function getSubjects(): Promise<Subject[]> {
  return JSON.parse(JSON.stringify(_subjects));
}

export async function getSubjectById(id: string): Promise<Subject | undefined> {
  return _subjects.find(s => s.id === id);
}

// Initialize slots if they don't exist, or ensure they match _faculties definition
async function ensureSlotDocument(facultyId: string, subjectId: string): Promise<number> {
  const faculty = _faculties.find(f => f.id === facultyId);
  const subject = _subjects.find(s => s.id === subjectId);

  if (!faculty || !subject || !subject.facultyOptions.includes(facultyId)) {
    throw new Error(`Invalid faculty (${facultyId}) or subject (${subjectId}) combination for slot initialization.`);
  }

  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);

  try {
    const docSnap = await getDoc(slotDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.slots === 'number') {
        return data.slots;
      } else {
        // Data exists but is malformed, reset it.
        await setDoc(slotDocRef, { slots: faculty.initialSlots });
        return faculty.initialSlots;
      }
    } else {
      // Document does not exist, create it.
      await setDoc(slotDocRef, { slots: faculty.initialSlots });
      return faculty.initialSlots;
    }
  } catch (error) {
    console.error(`Error ensuring slot document for ${slotKey}:`, error);
    // Fallback to initial slots in case of read/write error during ensure
    return faculty.initialSlots; 
  }
}


export async function getFacultySlots(): Promise<Record<string, number>> {
  const slots: Record<string, number> = {};
  for (const subject of _subjects) {
    for (const facultyId of subject.facultyOptions) {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        try {
          slots[slotKey] = await ensureSlotDocument(faculty.id, subject.id);
        } catch (error) {
          console.error(`Failed to fetch/ensure slot for ${slotKey}, defaulting to initial:`, error);
          slots[slotKey] = faculty.initialSlots; // Fallback
        }
      }
    }
  }
  return slots;
}

export async function updateFacultySlot(facultyId: string, subjectId: string): Promise<{ success: boolean; error?: string; currentSlots?: number }> {
  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);

  try {
    return await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists()) {
        // Attempt to initialize if document doesn't exist
        const faculty = _faculties.find(f => f.id === facultyId);
        if (!faculty) throw new Error(`Faculty ${facultyId} not found during slot update.`);
        console.warn(`Slot document ${slotKey} did not exist. Initializing with ${faculty.initialSlots} slots.`);
        currentSlotValue = faculty.initialSlots; 
      } else {
        currentSlotValue = slotDoc.data().slots;
      }
      
      if (typeof currentSlotValue !== 'number') {
          throw new Error(`Slot value for ${slotKey} is not a number.`);
      }

      if (currentSlotValue > 0) {
        transaction.set(slotDocRef, { slots: currentSlotValue - 1 }, { merge: !slotDoc.exists() }); // merge if creating
        return { success: true, currentSlots: currentSlotValue - 1 };
      } else {
        return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
      }
    });
  } catch (error: any) {
    console.error(`Error updating faculty slot ${slotKey} in transaction:`, error);
    return { success: false, error: error.message || 'Failed to update slot due to a transaction error.' };
  }
}

export async function incrementFacultySlot(facultyId: string, subjectId: string): Promise<{ success: boolean; error?: string; currentSlots?: number }> {
  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
  const faculty = _faculties.find(f => f.id === facultyId);

  if (!faculty) {
    return { success: false, error: `Faculty ${facultyId} not found.` };
  }
  const maxSlots = faculty.initialSlots;

  try {
    return await runTransaction(db, async (transaction) => {
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists()) {
        // This case should ideally not happen if deletion always follows a successful submission.
        // If it does, it means we're trying to increment a slot that wasn't decremented from a known state.
        // We'll initialize it to 1 assuming it's a restoration after a problem, but cap at initialSlots.
        console.warn(`Slot document ${slotKey} did not exist during increment. Initializing to 1.`);
        currentSlotValue = 0; // Treat as if it was 0 before incrementing
      } else {
        currentSlotValue = slotDoc.data().slots;
      }

      if (typeof currentSlotValue !== 'number') {
          throw new Error(`Slot value for ${slotKey} is not a number during increment.`);
      }

      if (currentSlotValue < maxSlots) {
        transaction.set(slotDocRef, { slots: currentSlotValue + 1 }, { merge: !slotDoc.exists() });
        return { success: true, currentSlots: currentSlotValue + 1 };
      } else {
        // Already at max capacity, no change needed or possible.
        console.warn(`Slot for ${slotKey} is already at max capacity (${maxSlots}). Not incrementing.`);
        return { success: true, currentSlots: maxSlots }; // Still success, just no change.
      }
    });
  } catch (error: any) {
    console.error(`Error incrementing faculty slot ${slotKey} in transaction:`, error);
    return { success: false, error: error.message || 'Failed to increment slot due to a transaction error.' };
  }
}

export async function resetAllFacultySlots(): Promise<void> {
  console.log('Attempting to reset all faculty slots in Firestore...');
  const batch = writeBatch(db);
  _subjects.forEach(subject => {
    subject.facultyOptions.forEach(facultyId => {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
        batch.set(slotDocRef, { slots: faculty.initialSlots });
      }
    });
  });
  try {
    await batch.commit();
    console.log('All faculty slots successfully reset in Firestore.');
  } catch (error) {
    console.error('Error resetting faculty slots in Firestore:', error);
    throw error; // Re-throw to be handled by caller if needed
  }
}

// --- Student Submission Functions ---

export async function addStudentSubmission(submissionData: Omit<StudentSubmission, 'timestamp'>): Promise<{success: boolean, error?: string}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, submissionData.rollNumber);
  try {
    await setDoc(submissionDocRef, {
      ...submissionData,
      timestamp: serverTimestamp(), // Use server timestamp for consistency
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error adding student submission for ${submissionData.rollNumber}:`, error);
    return { success: false, error: error.message || "Failed to save submission to database." };
  }
}

export async function getStudentSubmissionByRollNumber(rollNumber: string): Promise<StudentSubmission | null> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as StudentSubmission;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching student submission for ${rollNumber}:`, error);
    return null; // Or throw, depending on desired error handling
  }
}

export async function getAllStudentSubmissions(): Promise<StudentSubmission[]> {
  const submissions: StudentSubmission[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, STUDENT_SUBMISSIONS_COLLECTION));
    querySnapshot.forEach((docSnap) => {
      submissions.push(docSnap.data() as StudentSubmission);
    });
    // Sort by timestamp if needed, Firestore might not guarantee order by default on getDocs
    submissions.sort((a, b) => {
        const tsA = a.timestamp?.toDate?.() || new Date(0);
        const tsB = b.timestamp?.toDate?.() || new Date(0);
        return tsB.getTime() - tsA.getTime(); // Descending by time
    });
    return submissions;
  } catch (error) {
    console.error("Error fetching all student submissions:", error);
    return []; // Return empty array on error, or throw
  }
}

export async function deleteStudentSubmission(rollNumber: string): Promise<{success: boolean, error?: string, deletedData?: StudentSubmission}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (!docSnap.exists()) {
      return { success: false, error: "Submission not found." };
    }
    const deletedData = docSnap.data() as StudentSubmission;
    await deleteDoc(submissionDocRef);
    return { success: true, deletedData };
  } catch (error: any) {
    console.error(`Error deleting student submission for ${rollNumber}:`, error);
    return { success: false, error: error.message || "Failed to delete submission from database." };
  }
}
