
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
  serverTimestamp,
  query,
  where,
  limit
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

// Admin Session data structure for Firestore
export interface AdminSession {
  sessionId: string; // Document ID will be the sessionId
  userId: string; // e.g., 'admin'
  createdAt: Timestamp;
  expiresAt: Timestamp;
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
const ADMIN_SESSIONS_COLLECTION = 'adminSessions';

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
        await setDoc(slotDocRef, { slots: faculty.initialSlots });
        return faculty.initialSlots;
      }
    } else {
      await setDoc(slotDocRef, { slots: faculty.initialSlots });
      return faculty.initialSlots;
    }
  } catch (error) {
    console.error(`Error ensuring slot document for ${slotKey}:`, error);
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
          slots[slotKey] = faculty.initialSlots;
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
        const faculty = _faculties.find(f => f.id === facultyId);
        if (!faculty) throw new Error(`Faculty ${facultyId} not found during slot update.`);
        currentSlotValue = faculty.initialSlots; 
      } else {
        currentSlotValue = slotDoc.data().slots;
      }
      
      if (typeof currentSlotValue !== 'number') {
          throw new Error(`Slot value for ${slotKey} is not a number.`);
      }

      if (currentSlotValue > 0) {
        transaction.set(slotDocRef, { slots: currentSlotValue - 1 }, { merge: !slotDoc.exists() });
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
        currentSlotValue = 0;
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
        return { success: true, currentSlots: maxSlots }; 
      }
    });
  } catch (error: any) {
    console.error(`Error incrementing faculty slot ${slotKey} in transaction:`, error);
    return { success: false, error: error.message || 'Failed to increment slot due to a transaction error.' };
  }
}

export async function resetAllFacultySlots(): Promise<void> {
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
  } catch (error) {
    console.error('Error resetting faculty slots in Firestore:', error);
    throw error;
  }
}

// --- Student Submission Functions ---

export async function addStudentSubmission(submissionData: Omit<StudentSubmission, 'timestamp'>): Promise<{success: boolean, error?: string}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, submissionData.rollNumber);
  try {
    await setDoc(submissionDocRef, {
      ...submissionData,
      timestamp: serverTimestamp(),
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
    return null;
  }
}

export async function getAllStudentSubmissions(): Promise<StudentSubmission[]> {
  const submissions: StudentSubmission[] = [];
  try {
    const q = query(collection(db, STUDENT_SUBMISSIONS_COLLECTION)); // Removed orderBy for simplicity, can be added back if needed
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      submissions.push(docSnap.data() as StudentSubmission);
    });
     // Sort by timestamp client-side if necessary, or ensure Firestore index for server-side sorting
    submissions.sort((a, b) => {
        const tsA = a.timestamp?.toDate?.() || new Date(0);
        const tsB = b.timestamp?.toDate?.() || new Date(0);
        return tsB.getTime() - tsA.getTime(); // Descending by time
    });
    return submissions;
  } catch (error) {
    console.error("Error fetching all student submissions:", error);
    return [];
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

// --- Admin Session Functions ---
export async function createAdminSession(sessionId: string, userId: string, expiresAt: Date): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  try {
    await setDoc(sessionDocRef, {
      userId: userId,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    return { success: true };
  } catch (error: any) {
    console.error(`Error creating admin session ${sessionId}:`, error);
    return { success: false, error: error.message || "Failed to create admin session." };
  }
}

export async function getAdminSession(sessionId: string): Promise<AdminSession | null> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  try {
    const docSnap = await getDoc(sessionDocRef);
    if (docSnap.exists()) {
      const session = docSnap.data() as Omit<AdminSession, 'sessionId'>;
      // Check for expiry server-side
      if (session.expiresAt.toDate() < new Date()) {
        await deleteAdminSession(sessionId); // Clean up expired session
        return null;
      }
      return { ...session, sessionId: docSnap.id };
    }
    return null;
  } catch (error) {
    console.error(`Error fetching admin session ${sessionId}:`, error);
    return null;
  }
}

export async function deleteAdminSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  try {
    await deleteDoc(sessionDocRef);
    return { success: true };
  } catch (error: any)
 {
    console.error(`Error deleting admin session ${sessionId}:`, error);
    return { success: false, error: error.message || "Failed to delete admin session." };
  }
}

    