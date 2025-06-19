
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
  orderBy,
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
  rollNumber: string; // Document ID will be the rollNumber
  name: string;
  email: string;
  whatsappNumber: string;
  timestamp: Timestamp; // Firestore Timestamp
  selections: Record<string, string>; // subjectId -> facultyId
}

// Admin Session data structure for Firestore
export interface AdminSession {
  sessionId: string; // Document ID will be the sessionId
  userId: string; // e.g., 'admin_user'
  createdAt: Timestamp; // Firestore Timestamp for creation
  expiresAt: Timestamp; // Firestore Timestamp for expiry
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

async function ensureSlotDocument(facultyId: string, subjectId: string): Promise<number> {
  const faculty = _faculties.find(f => f.id === facultyId);
  const subject = _subjects.find(s => s.id === subjectId);

  if (!faculty || !subject || !subject.facultyOptions.includes(facultyId)) {
    console.error(`[Data Service] Invalid faculty (${facultyId}) or subject (${subjectId}) combination for slot initialization.`);
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
        console.warn(`[Data Service] Slot data for ${slotKey} is not a number, re-initializing.`);
        await setDoc(slotDocRef, { slots: faculty.initialSlots });
        return faculty.initialSlots;
      }
    } else {
      console.log(`[Data Service] Slot document for ${slotKey} not found, creating with initial slots: ${faculty.initialSlots}.`);
      await setDoc(slotDocRef, { slots: faculty.initialSlots });
      return faculty.initialSlots;
    }
  } catch (error) {
    console.error(`[Data Service] Error ensuring slot document for ${slotKey}:`, error);
    // Fallback to initialSlots, but this indicates a problem.
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
          console.error(`[Data Service] Failed to fetch/ensure slot for ${slotKey}, defaulting to initial:`, error);
          slots[slotKey] = faculty.initialSlots; // Fallback, though ensureSlotDocument should handle creation
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
        // This case should ideally be handled by ensureSlotDocument, but as a safeguard:
        const faculty = _faculties.find(f => f.id === facultyId);
        if (!faculty) throw new Error(`Faculty ${facultyId} not found during slot update.`);
        console.warn(`[Data Service Transaction] Slot document ${slotKey} not found during update. Initializing with ${faculty.initialSlots} slots.`);
        currentSlotValue = faculty.initialSlots;
        // We will set it, so the -1 will result in faculty.initialSlots - 1
      } else {
        currentSlotValue = slotDoc.data().slots;
      }

      if (typeof currentSlotValue !== 'number') {
          console.error(`[Data Service Transaction] Slot value for ${slotKey} is not a number: ${currentSlotValue}`);
          throw new Error(`Slot value for ${slotKey} is not a number.`);
      }

      if (currentSlotValue > 0) {
        transaction.set(slotDocRef, { slots: currentSlotValue - 1 }, { merge: !slotDoc.exists() }); // merge true if it didn't exist.
        return { success: true, currentSlots: currentSlotValue - 1 };
      } else {
        return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Transaction] Error updating faculty slot ${slotKey}:`, error.message, error.stack);
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
        // This state is unusual for an increment, means it was likely 0 or didn't exist.
        // Defaulting to 0, so incrementing makes it 1.
        console.warn(`[Data Service Transaction] Slot document ${slotKey} not found during increment. Assuming 0 current slots.`);
        currentSlotValue = 0;
      } else {
        currentSlotValue = slotDoc.data().slots;
      }

      if (typeof currentSlotValue !== 'number') {
          console.error(`[Data Service Transaction] Slot value for ${slotKey} is not a number during increment: ${currentSlotValue}`);
          throw new Error(`Slot value for ${slotKey} is not a number during increment.`);
      }

      if (currentSlotValue < maxSlots) {
        transaction.set(slotDocRef, { slots: currentSlotValue + 1 }, { merge: !slotDoc.exists() });
        return { success: true, currentSlots: currentSlotValue + 1 };
      } else {
        // Already at max slots, no change needed but operation is "successful" in that it's not an error state.
        return { success: true, currentSlots: maxSlots };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Transaction] Error incrementing faculty slot ${slotKey}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Failed to increment slot due to a transaction error.' };
  }
}

export async function resetAllFacultySlots(): Promise<void> {
  const batch = writeBatch(db);
  console.log('[Data Service] Starting reset of all faculty slots in Firestore.');
  _subjects.forEach(subject => {
    subject.facultyOptions.forEach(facultyId => {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
        batch.set(slotDocRef, { slots: faculty.initialSlots });
        console.log(`[Data Service] Queued reset for ${slotKey} to ${faculty.initialSlots} slots.`);
      }
    });
  });
  try {
    await batch.commit();
    console.log('[Data Service] All faculty slots have been successfully reset in Firestore.');
  } catch (error) {
    console.error('[Data Service] Error resetting faculty slots in Firestore:', error);
    throw error; // Re-throw to indicate failure
  }
}

// --- Student Submission Functions (Firestore) ---

export async function addStudentSubmission(submissionData: Omit<StudentSubmission, 'timestamp' | 'rollNumber'>, rollNumber: string): Promise<{success: boolean, error?: string}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  console.log(`[Data Service] Attempting to add student submission to Firestore. Collection: '${STUDENT_SUBMISSIONS_COLLECTION}', Roll Number (Doc ID): '${rollNumber}'`);
  try {
    await setDoc(submissionDocRef, {
      rollNumber: rollNumber, // Storing rollNumber also in the document body for easier querying if needed
      ...submissionData,
      timestamp: serverTimestamp(), // Use serverTimestamp for consistency
    });
    console.log(`[Data Service] Student submission for '${rollNumber}' added successfully to Firestore.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error adding student submission for '${rollNumber}' to Firestore:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to save submission to Firestore." };
  }
}

export async function getStudentSubmissionByRollNumber(rollNumber: string): Promise<StudentSubmission | null> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  console.log(`[Data Service] Fetching student submission for roll number '${rollNumber}' from Firestore.`);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (docSnap.exists()) {
      console.log(`[Data Service] Submission found for '${rollNumber}'.`);
      return { ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission;
    }
    console.log(`[Data Service] No submission found for '${rollNumber}'.`);
    return null;
  } catch (error: any) {
    console.error(`[Data Service] Error fetching student submission for '${rollNumber}' from Firestore:`, error.message, error.stack);
    return null; // Indicate failure to retrieve
  }
}

export async function getAllStudentSubmissions(): Promise<StudentSubmission[] | null> {
  const submissions: StudentSubmission[] = [];
  console.log(`[Data Service] Fetching all student submissions from Firestore, ordered by timestamp descending.`);
  try {
    const q = query(collection(db, STUDENT_SUBMISSIONS_COLLECTION), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      submissions.push({ ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission);
    });
    console.log(`[Data Service] Fetched ${submissions.length} student submissions.`);
    return submissions;
  } catch (error: any) {
    console.error("[Data Service] Error fetching all student submissions from Firestore:", error.message, error.stack);
    return null; // Indicate failure
  }
}

export async function deleteStudentSubmission(rollNumber: string): Promise<{success: boolean, error?: string, deletedData?: StudentSubmission}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  console.log(`[Data Service] Attempting to delete student submission for roll number '${rollNumber}' from Firestore.`);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (!docSnap.exists()) {
      console.warn(`[Data Service] Submission for roll number '${rollNumber}' not found in Firestore. Cannot delete.`);
      return { success: false, error: "Submission not found in Firestore." };
    }
    const deletedData = { ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission;
    await deleteDoc(submissionDocRef);
    console.log(`[Data Service] Successfully deleted student submission for '${rollNumber}' from Firestore.`);
    return { success: true, deletedData };
  } catch (error: any) {
    console.error(`[Data Service] Error deleting student submission for '${rollNumber}' from Firestore:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete submission from Firestore." };
  }
}

// --- Admin Session Functions (Firestore) ---
export async function createAdminSession(sessionId: string, userId: string, expiresAt: Date): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  console.log(`[Data Service] Attempting to create admin session in Firestore. Collection: '${ADMIN_SESSIONS_COLLECTION}', Session ID: '${sessionId}', User ID: '${userId}', Expires At: '${expiresAt.toISOString()}'`);
  try {
    await setDoc(sessionDocRef, {
      userId: userId,
      createdAt: serverTimestamp(), // Use serverTimestamp for consistency
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    console.log(`[Data Service] Admin session created successfully in Firestore for Session ID: '${sessionId}'.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error creating admin session '${sessionId}' in Firestore:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to create admin session in Firestore." };
  }
}

export async function getAdminSession(sessionId: string): Promise<AdminSession | null> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  console.log(`[Data Service] Fetching admin session for Session ID '${sessionId}' from Firestore.`);
  try {
    const docSnap = await getDoc(sessionDocRef);
    if (docSnap.exists()) {
      const sessionData = docSnap.data();
      // Explicitly cast to ensure expiresAt is treated as Firestore Timestamp for toDate() method
      const session = { ...sessionData, sessionId: docSnap.id } as AdminSession;
      
      if (session.expiresAt && typeof session.expiresAt.toDate === 'function') {
        if (session.expiresAt.toDate() < new Date()) {
          console.log(`[Data Service] Admin session '${sessionId}' found but has expired. Deleting.`);
          await deleteAdminSession(sessionId); // Clean up expired session
          return null;
        }
        console.log(`[Data Service] Admin session '${sessionId}' found and is valid.`);
        return session;
      } else {
        console.error(`[Data Service] Admin session '${sessionId}' found but 'expiresAt' field is missing or not a Firestore Timestamp.`, sessionData);
        // Consider this an invalid session and clean up
        await deleteAdminSession(sessionId);
        return null;
      }
    }
    console.log(`[Data Service] No admin session found for Session ID '${sessionId}'.`);
    return null;
  } catch (error: any) {
    console.error(`[Data Service] Error fetching admin session '${sessionId}' from Firestore:`, error.message, error.stack);
    return null;
  }
}

export async function deleteAdminSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  console.log(`[Data Service] Attempting to delete admin session for Session ID '${sessionId}' from Firestore.`);
  try {
    await deleteDoc(sessionDocRef);
    console.log(`[Data Service] Successfully deleted admin session for '${sessionId}' from Firestore.`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error deleting admin session '${sessionId}' from Firestore:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete admin session from Firestore." };
  }
}
