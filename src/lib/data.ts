
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
    const errorMsg = `[Data Service] Invalid faculty (${facultyId}) or subject (${subjectId}) combination for slot initialization.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';

  try {
    console.log(`[Data Service] Attempting getDoc for ${FACULTY_SLOTS_COLLECTION}/${slotKey}. Project ID from db.app.options: ${activeProjectId}`);
    const docSnap = await getDoc(slotDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (typeof data.slots === 'number') {
        return data.slots;
      } else {
        console.warn(`[Data Service] Slot data for ${slotKey} is not a number (${typeof data.slots}), re-initializing with ${faculty.initialSlots}. Project: ${activeProjectId}`);
        console.log(`[Data Service] Attempting setDoc (re-init) for ${FACULTY_SLOTS_COLLECTION}/${slotKey}. Project ID from db.app.options: ${activeProjectId}`);
        await setDoc(slotDocRef, { slots: faculty.initialSlots });
        return faculty.initialSlots;
      }
    } else {
      console.log(`[Data Service] Slot document for ${slotKey} not found, creating with initial slots: ${faculty.initialSlots}. Project: ${activeProjectId}`);
      console.log(`[Data Service] Attempting setDoc (create) for ${FACULTY_SLOTS_COLLECTION}/${slotKey}. Project ID from db.app.options: ${activeProjectId}`);
      await setDoc(slotDocRef, { slots: faculty.initialSlots });
      return faculty.initialSlots;
    }
  } catch (error: any) {
    console.error(`[Data Service] Error ensuring slot document for ${slotKey}. Active Project ID: ${activeProjectId}:`, error);
    // Fallback to initialSlots might hide underlying issues, so re-throwing.
    throw error;
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
          // Error is already logged in ensureSlotDocument.
          // We will let the page load with default slots for resilience, but this state indicates a problem.
          console.error(`[Data Service] Failed to fetch/ensure slot for ${slotKey} from Firestore, defaulting to initial in-memory value: ${faculty.initialSlots}. Error was logged above.`);
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
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service Transaction] Initiating updateFacultySlot for ${slotKey}. Active Project ID: ${activeProjectId}`);

  try {
    return await runTransaction(db, async (transaction) => {
      console.log(`[Data Service Transaction] Getting slot document ${slotKey} inside transaction. Project: ${activeProjectId}`);
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists()) {
        const faculty = _faculties.find(f => f.id === facultyId);
        if (!faculty) throw new Error(`Faculty ${facultyId} not found during slot update transaction.`);
        console.warn(`[Data Service Transaction] Slot document ${slotKey} not found. Initializing with ${faculty.initialSlots} slots. Project: ${activeProjectId}`);
        currentSlotValue = faculty.initialSlots;
      } else {
        currentSlotValue = slotDoc.data().slots;
      }

      if (typeof currentSlotValue !== 'number') {
          console.error(`[Data Service Transaction] Slot value for ${slotKey} is not a number: ${currentSlotValue}. Project: ${activeProjectId}`);
          throw new Error(`Slot value for ${slotKey} is not a number.`);
      }

      if (currentSlotValue > 0) {
        console.log(`[Data Service Transaction] Decrementing slot for ${slotKey} from ${currentSlotValue} to ${currentSlotValue - 1}. Project: ${activeProjectId}`);
        transaction.set(slotDocRef, { slots: currentSlotValue - 1 }, { merge: !slotDoc.exists() });
        return { success: true, currentSlots: currentSlotValue - 1 };
      } else {
        console.warn(`[Data Service Transaction] No slots available for ${slotKey}. Current value: ${currentSlotValue}. Project: ${activeProjectId}`);
        return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Transaction] Error updating faculty slot ${slotKey}. Active Project ID: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Failed to update slot due to a transaction error.' };
  }
}

export async function incrementFacultySlot(facultyId: string, subjectId: string): Promise<{ success: boolean; error?: string; currentSlots?: number }> {
  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
  const faculty = _faculties.find(f => f.id === facultyId);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service Transaction] Initiating incrementFacultySlot for ${slotKey}. Active Project ID: ${activeProjectId}`);

  if (!faculty) {
    const errorMsg = `[Data Service Transaction] Faculty ${facultyId} not found during increment. Project: ${activeProjectId}`;
    console.error(errorMsg);
    return { success: false, error: `Faculty ${facultyId} not found.` };
  }
  const maxSlots = faculty.initialSlots;

  try {
    return await runTransaction(db, async (transaction) => {
      console.log(`[Data Service Transaction] Getting slot document ${slotKey} inside increment transaction. Project: ${activeProjectId}`);
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists()) {
        console.warn(`[Data Service Transaction] Slot document ${slotKey} not found during increment. Assuming 0 current slots. Project: ${activeProjectId}`);
        currentSlotValue = 0;
      } else {
        currentSlotValue = slotDoc.data().slots;
      }

      if (typeof currentSlotValue !== 'number') {
          console.error(`[Data Service Transaction] Slot value for ${slotKey} is not a number during increment: ${currentSlotValue}. Project: ${activeProjectId}`);
          throw new Error(`Slot value for ${slotKey} is not a number during increment.`);
      }

      if (currentSlotValue < maxSlots) {
        console.log(`[Data Service Transaction] Incrementing slot for ${slotKey} from ${currentSlotValue} to ${currentSlotValue + 1}. Project: ${activeProjectId}`);
        transaction.set(slotDocRef, { slots: currentSlotValue + 1 }, { merge: !slotDoc.exists() });
        return { success: true, currentSlots: currentSlotValue + 1 };
      } else {
        console.log(`[Data Service Transaction] Slot for ${slotKey} already at max (${maxSlots}). No change. Project: ${activeProjectId}`);
        return { success: true, currentSlots: maxSlots };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Transaction] Error incrementing faculty slot ${slotKey}. Active Project ID: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Failed to increment slot due to a transaction error.' };
  }
}

export async function resetAllFacultySlots(): Promise<void> {
  const batch = writeBatch(db);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Starting reset of all faculty slots in Firestore. Active Project ID: ${activeProjectId}`);
  _subjects.forEach(subject => {
    subject.facultyOptions.forEach(facultyId => {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        const slotDocRef = doc(db, FACULTY_SLOTS_COLLECTION, slotKey);
        batch.set(slotDocRef, { slots: faculty.initialSlots });
        console.log(`[Data Service] Queued reset for ${slotKey} to ${faculty.initialSlots} slots. Project: ${activeProjectId}`);
      }
    });
  });
  try {
    await batch.commit();
    console.log(`[Data Service] All faculty slots have been successfully reset in Firestore. Project: ${activeProjectId}`);
  } catch (error) {
    console.error(`[Data Service] Error resetting faculty slots in Firestore. Project: ${activeProjectId}:`, error);
    throw error; 
  }
}

// --- Student Submission Functions (Firestore) ---

export async function addStudentSubmission(submissionData: Omit<StudentSubmission, 'timestamp' | 'rollNumber'> & { rollNumber: string }): Promise<{success: boolean, error?: string}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, submissionData.rollNumber);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Attempting to add student submission to Firestore. Collection: '${STUDENT_SUBMISSIONS_COLLECTION}', Roll Number (Doc ID): '${submissionData.rollNumber}'. Project: ${activeProjectId}`);
  try {
    await setDoc(submissionDocRef, {
      ...submissionData,
      timestamp: serverTimestamp(), 
    });
    console.log(`[Data Service] Student submission for '${submissionData.rollNumber}' added successfully to Firestore. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error adding student submission for '${submissionData.rollNumber}' to Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to save submission to Firestore." };
  }
}

export async function getStudentSubmissionByRollNumber(rollNumber: string): Promise<StudentSubmission | null> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Fetching student submission for roll number '${rollNumber}' from Firestore. Project: ${activeProjectId}`);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (docSnap.exists()) {
      console.log(`[Data Service] Submission found for '${rollNumber}'. Project: ${activeProjectId}`);
      return { ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission;
    }
    console.log(`[Data Service] No submission found for '${rollNumber}'. Project: ${activeProjectId}`);
    return null;
  } catch (error: any) {
    console.error(`[Data Service] Error fetching student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null; 
  }
}

export async function getAllStudentSubmissions(): Promise<StudentSubmission[] | null> {
  const submissions: StudentSubmission[] = [];
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Fetching all student submissions from Firestore, ordered by timestamp descending. Project: ${activeProjectId}`);
  try {
    const q = query(collection(db, STUDENT_SUBMISSIONS_COLLECTION), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      submissions.push({ ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission);
    });
    console.log(`[Data Service] Fetched ${submissions.length} student submissions. Project: ${activeProjectId}`);
    return submissions;
  } catch (error: any) {
    console.error(`[Data Service] Error fetching all student submissions from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null; 
  }
}

export async function deleteStudentSubmission(rollNumber: string): Promise<{success: boolean, error?: string, deletedData?: StudentSubmission}> {
  const submissionDocRef = doc(db, STUDENT_SUBMISSIONS_COLLECTION, rollNumber);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Attempting to delete student submission for roll number '${rollNumber}' from Firestore. Project: ${activeProjectId}`);
  try {
    const docSnap = await getDoc(submissionDocRef);
    if (!docSnap.exists()) {
      console.warn(`[Data Service] Submission for roll number '${rollNumber}' not found in Firestore. Cannot delete. Project: ${activeProjectId}`);
      return { success: false, error: "Submission not found in Firestore." };
    }
    const deletedData = { ...docSnap.data(), rollNumber: docSnap.id } as StudentSubmission;
    await deleteDoc(submissionDocRef);
    console.log(`[Data Service] Successfully deleted student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}`);
    return { success: true, deletedData };
  } catch (error: any) {
    console.error(`[Data Service] Error deleting student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete submission from Firestore." };
  }
}

// --- Admin Session Functions (Firestore) ---
export async function createAdminSession(sessionId: string, userId: string, expiresAt: Date): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Attempting to create admin session in Firestore. Collection: '${ADMIN_SESSIONS_COLLECTION}', Session ID: '${sessionId}', User ID: '${userId}', Expires At: '${expiresAt.toISOString()}'. Project: ${activeProjectId}`);
  try {
    await setDoc(sessionDocRef, {
      userId: userId,
      createdAt: serverTimestamp(), 
      expiresAt: Timestamp.fromDate(expiresAt),
    });
    console.log(`[Data Service] Admin session created successfully in Firestore for Session ID: '${sessionId}'. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error creating admin session '${sessionId}' in Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to create admin session in Firestore." };
  }
}

export async function getAdminSession(sessionId: string): Promise<AdminSession | null> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Fetching admin session for Session ID '${sessionId}' from Firestore. Project: ${activeProjectId}`);
  try {
    const docSnap = await getDoc(sessionDocRef);
    if (docSnap.exists()) {
      const sessionData = docSnap.data();
      const session = { ...sessionData, sessionId: docSnap.id } as AdminSession;
      
      if (session.expiresAt && typeof session.expiresAt.toDate === 'function') {
        if (session.expiresAt.toDate() < new Date()) {
          console.log(`[Data Service] Admin session '${sessionId}' found but has expired. Deleting. Project: ${activeProjectId}`);
          await deleteAdminSession(sessionId); 
          return null;
        }
        console.log(`[Data Service] Admin session '${sessionId}' found and is valid. Project: ${activeProjectId}`);
        return session;
      } else {
        console.error(`[Data Service] Admin session '${sessionId}' found but 'expiresAt' field is missing or not a Firestore Timestamp. Project: ${activeProjectId}`, sessionData);
        await deleteAdminSession(sessionId);
        return null;
      }
    }
    console.log(`[Data Service] No admin session found for Session ID '${sessionId}'. Project: ${activeProjectId}`);
    return null;
  } catch (error: any) {
    console.error(`[Data Service] Error fetching admin session '${sessionId}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null;
  }
}

export async function deleteAdminSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  const sessionDocRef = doc(db, ADMIN_SESSIONS_COLLECTION, sessionId);
  const activeProjectId = db.app.options.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service] Attempting to delete admin session for Session ID '${sessionId}' from Firestore. Project: ${activeProjectId}`);
  try {
    await deleteDoc(sessionDocRef);
    console.log(`[Data Service] Successfully deleted admin session for '${sessionId}' from Firestore. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service] Error deleting admin session '${sessionId}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete admin session from Firestore." };
  }
}

    
