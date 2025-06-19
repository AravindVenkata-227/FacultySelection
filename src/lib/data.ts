
import { adminDb, admin } from './firebase-admin'; // Use Firebase Admin SDK
import type { Timestamp } from 'firebase-admin/firestore'; // Admin SDK Timestamp
const { FieldValue } = admin.firestore; // Admin SDK FieldValue for serverTimestamp

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

// Student Submission data structure for Firestore (using Admin SDK types)
export interface StudentSubmission {
  rollNumber: string;
  name: string;
  email: string;
  whatsappNumber: string;
  timestamp: Timestamp; // Firebase Admin Timestamp
  selections: Record<string, string>; // subjectId -> facultyId
}

// Admin Session data structure for Firestore (using Admin SDK types)
export interface AdminSession {
  sessionId: string;
  userId: string;
  createdAt: Timestamp; // Firebase Admin Timestamp
  expiresAt: Timestamp; // Firebase Admin Timestamp
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

// These functions deal with in-memory data, no change needed for Admin SDK
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
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot ensure slot document.");
    throw new Error("Firebase Admin SDK not initialized.");
  }
  const faculty = _faculties.find(f => f.id === facultyId);
  const subject = _subjects.find(s => s.id === subjectId);

  if (!faculty || !subject || !subject.facultyOptions.includes(facultyId)) {
    const errorMsg = `[Data Service Admin] Invalid faculty (${facultyId}) or subject (${subjectId}) combination for slot initialization.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = adminDb.collection(FACULTY_SLOTS_COLLECTION).doc(slotKey);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';

  try {
    const docSnap = await slotDocRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data && typeof data.slots === 'number') {
        return data.slots;
      } else {
        console.warn(`[Data Service Admin] Slot data for ${slotKey} is not a number or missing (${data ? typeof data.slots : 'undefined'}), re-initializing with ${faculty.initialSlots}. Project: ${activeProjectId}`);
        await slotDocRef.set({ slots: faculty.initialSlots });
        return faculty.initialSlots;
      }
    } else {
      console.log(`[Data Service Admin] Slot document for ${slotKey} not found, creating with initial slots: ${faculty.initialSlots}. Project: ${activeProjectId}`);
      await slotDocRef.set({ slots: faculty.initialSlots });
      return faculty.initialSlots;
    }
  } catch (error: any) {
    console.error(`[Data Service Admin] Error ensuring slot document for ${slotKey}. Active Project ID: ${activeProjectId}:`, error);
    throw error;
  }
}


export async function getFacultySlots(): Promise<Record<string, number>> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot get faculty slots.");
    // Return a default structure or throw an error
    const defaultSlots: Record<string, number> = {};
     _subjects.forEach(subject => {
      subject.facultyOptions.forEach(facultyId => {
        const faculty = _faculties.find(f => f.id === facultyId);
        if (faculty) {
          defaultSlots[`${faculty.id}_${subject.id}`] = faculty.initialSlots;
        }
      });
    });
    return defaultSlots; // Or throw an error
  }
  const slots: Record<string, number> = {};
  for (const subject of _subjects) {
    for (const facultyId of subject.facultyOptions) {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        try {
          slots[slotKey] = await ensureSlotDocument(faculty.id, subject.id);
        } catch (error) {
          console.error(`[Data Service Admin] Failed to fetch/ensure slot for ${slotKey} from Firestore, defaulting to initial in-memory value: ${faculty.initialSlots}. Error was logged above.`);
          slots[slotKey] = faculty.initialSlots;
        }
      }
    }
  }
  return slots;
}

export async function updateFacultySlot(facultyId: string, subjectId: string): Promise<{ success: boolean; error?: string; currentSlots?: number }> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot update faculty slot.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = adminDb.collection(FACULTY_SLOTS_COLLECTION).doc(slotKey);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists) {
        const faculty = _faculties.find(f => f.id === facultyId);
        if (!faculty) throw new Error(`Faculty ${facultyId} not found during slot update transaction.`);
        console.warn(`[Data Service Admin Transaction] Slot document ${slotKey} not found. Initializing with ${faculty.initialSlots} slots. Project: ${activeProjectId}`);
        currentSlotValue = faculty.initialSlots;
        transaction.set(slotDocRef, { slots: faculty.initialSlots }); 
      } else {
        const data = slotDoc.data();
        if (!data || typeof data.slots !== 'number') {
            console.error(`[Data Service Admin Transaction] Slot value for ${slotKey} is not a number or data is missing. Data: ${JSON.stringify(data)}. Project: ${activeProjectId}`);
            throw new Error(`Slot value for ${slotKey} is not a number or data is missing.`);
        }
        currentSlotValue = data.slots;
      }

      if (currentSlotValue > 0) {
        transaction.update(slotDocRef, { slots: currentSlotValue - 1 });
        return { success: true, currentSlots: currentSlotValue - 1 };
      } else {
        console.warn(`[Data Service Admin Transaction] No slots available for ${slotKey}. Current value: ${currentSlotValue}. Project: ${activeProjectId}`);
        return { success: false, error: 'No slots available for this faculty in this subject.', currentSlots: 0 };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Admin Transaction] Error updating faculty slot ${slotKey}. Active Project ID: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Failed to update slot due to a transaction error.' };
  }
}

export async function incrementFacultySlot(facultyId: string, subjectId: string): Promise<{ success: boolean; error?: string; currentSlots?: number }> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot increment faculty slot.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const slotKey = `${facultyId}_${subjectId}`;
  const slotDocRef = adminDb.collection(FACULTY_SLOTS_COLLECTION).doc(slotKey);
  const faculty = _faculties.find(f => f.id === facultyId);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';

  if (!faculty) {
    const errorMsg = `[Data Service Admin Transaction] Faculty ${facultyId} not found during increment. Project: ${activeProjectId}`;
    console.error(errorMsg);
    return { success: false, error: `Faculty ${facultyId} not found.` };
  }
  const maxSlots = faculty.initialSlots;

  try {
    return await adminDb.runTransaction(async (transaction) => {
      const slotDoc = await transaction.get(slotDocRef);
      let currentSlotValue;

      if (!slotDoc.exists) {
        console.warn(`[Data Service Admin Transaction] Slot document ${slotKey} not found during increment. Initializing to 0 before incrementing (will be set to 1). Project: ${activeProjectId}`);
        currentSlotValue = 0;
         transaction.set(slotDocRef, { slots: 1 });
         return { success: true, currentSlots: 1 };
      } else {
        const data = slotDoc.data();
        if (!data || typeof data.slots !== 'number') {
            console.error(`[Data Service Admin Transaction] Slot value for ${slotKey} is not a number during increment or data missing. Data: ${JSON.stringify(data)}. Project: ${activeProjectId}`);
            throw new Error(`Slot value for ${slotKey} is not a number during increment or data missing.`);
        }
        currentSlotValue = data.slots;
      }

      if (currentSlotValue < maxSlots) {
        transaction.update(slotDocRef, { slots: currentSlotValue + 1 });
        return { success: true, currentSlots: currentSlotValue + 1 };
      } else {
        console.log(`[Data Service Admin Transaction] Slot for ${slotKey} already at max (${maxSlots}). No change. Project: ${activeProjectId}`);
        return { success: true, currentSlots: maxSlots };
      }
    });
  } catch (error: any) {
    console.error(`[Data Service Admin Transaction] Error incrementing faculty slot ${slotKey}. Active Project ID: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || 'Failed to increment slot due to a transaction error.' };
  }
}

export async function resetAllFacultySlots(): Promise<void> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot reset all faculty slots.");
    throw new Error("Firebase Admin SDK not initialized.");
  }
  const batch = adminDb.batch();
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  console.log(`[Data Service Admin] Starting reset of all faculty slots in Firestore. Active Project ID: ${activeProjectId}`);
  _subjects.forEach(subject => {
    subject.facultyOptions.forEach(facultyId => {
      const faculty = _faculties.find(f => f.id === facultyId);
      if (faculty) {
        const slotKey = `${faculty.id}_${subject.id}`;
        const slotDocRef = adminDb.collection(FACULTY_SLOTS_COLLECTION).doc(slotKey);
        batch.set(slotDocRef, { slots: faculty.initialSlots });
      }
    });
  });
  try {
    await batch.commit();
    console.log(`[Data Service Admin] All faculty slots have been successfully reset in Firestore. Project: ${activeProjectId}`);
  } catch (error) {
    console.error(`[Data Service Admin] Error resetting faculty slots in Firestore. Project: ${activeProjectId}:`, error);
    throw error;
  }
}

// --- Student Submission Functions (Firestore Admin SDK) ---

export async function addStudentSubmission(submissionData: Omit<StudentSubmission, 'timestamp' | 'rollNumber'> & { rollNumber: string }): Promise<{success: boolean, error?: string}> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot add student submission.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const submissionDocRef = adminDb.collection(STUDENT_SUBMISSIONS_COLLECTION).doc(submissionData.rollNumber);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    await submissionDocRef.set({
      ...submissionData,
      timestamp: FieldValue.serverTimestamp(),
    });
    console.log(`[Data Service Admin] Student submission for '${submissionData.rollNumber}' added successfully to Firestore. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service Admin] Error adding student submission for '${submissionData.rollNumber}' to Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to save submission to Firestore." };
  }
}

export async function getStudentSubmissionByRollNumber(rollNumber: string): Promise<StudentSubmission | null> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot get student submission by roll number.");
    return null;
  }
  const submissionDocRef = adminDb.collection(STUDENT_SUBMISSIONS_COLLECTION).doc(rollNumber);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    const docSnap = await submissionDocRef.get();
    if (docSnap.exists) {
      const data = docSnap.data();
      if (!data) return null;
      return { ...data, rollNumber: docSnap.id } as StudentSubmission;
    }
    return null;
  } catch (error: any) {
    console.error(`[Data Service Admin] Error fetching student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null; 
  }
}

export async function getAllStudentSubmissions(): Promise<StudentSubmission[] | null> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot get all student submissions.");
    return null;
  }
  const submissions: StudentSubmission[] = [];
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    const querySnapshot = await adminDb.collection(STUDENT_SUBMISSIONS_COLLECTION).orderBy("timestamp", "desc").get();
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        submissions.push({ ...data, rollNumber: docSnap.id } as StudentSubmission);
      }
    });
    return submissions;
  } catch (error: any) {
    console.error(`[Data Service Admin] Error fetching all student submissions from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null;
  }
}

export async function deleteStudentSubmission(rollNumber: string): Promise<{success: boolean, error?: string, deletedData?: StudentSubmission}> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot delete student submission.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const submissionDocRef = adminDb.collection(STUDENT_SUBMISSIONS_COLLECTION).doc(rollNumber);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    const docSnap = await submissionDocRef.get();
    if (!docSnap.exists) {
      return { success: false, error: "Submission not found in Firestore." };
    }
    const data = docSnap.data();
    if (!data) return { success: false, error: "Submission data not found though document exists." };

    const deletedData = { ...data, rollNumber: docSnap.id } as StudentSubmission;
    await submissionDocRef.delete();
    console.log(`[Data Service Admin] Successfully deleted student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}`);
    return { success: true, deletedData };
  } catch (error: any) {
    console.error(`[Data Service Admin] Error deleting student submission for '${rollNumber}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete submission from Firestore." };
  }
}

// --- Admin Session Functions (Firestore Admin SDK) ---
export async function createAdminSession(sessionId: string, userId: string, expiresAtDate: Date): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot create admin session.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const sessionDocRef = adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(sessionId);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    await sessionDocRef.set({
      userId: userId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAtDate),
    });
    console.log(`[Data Service Admin] Admin session created successfully in Firestore for Session ID: '${sessionId}'. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service Admin] Error creating admin session '${sessionId}' in Firestore. Project: ${activeProjectId}:`, error.message, error.stack ? error.stack : error);
    return { success: false, error: error.message || "Failed to create admin session in Firestore." };
  }
}

export async function getAdminSession(sessionId: string): Promise<AdminSession | null> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot get admin session.");
    return null;
  }
  const sessionDocRef = adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(sessionId);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    const docSnap = await sessionDocRef.get();
    if (docSnap.exists) {
      const sessionData = docSnap.data();
      if (!sessionData) return null;

      if (!sessionData.expiresAt || !(sessionData.expiresAt instanceof admin.firestore.Timestamp)) {
        console.error(`[Data Service Admin] Admin session '${sessionId}' found but 'expiresAt' field is missing or not a Firestore Timestamp. Data:`, sessionData, `Project: ${activeProjectId}`);
        await deleteAdminSession(sessionId); // Attempt to delete invalid session
        return null;
      }
      
      const session = { ...sessionData, sessionId: docSnap.id } as AdminSession;

      if (session.expiresAt.toDate() < new Date()) {
        console.log(`[Data Service Admin] Admin session '${sessionId}' found but has expired. Deleting. Project: ${activeProjectId}`);
        await deleteAdminSession(sessionId);
        return null;
      }
      return session;
    }
    return null;
  } catch (error: any) {
    console.error(`[Data Service Admin] Error fetching admin session '${sessionId}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return null;
  }
}

export async function deleteAdminSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  if (!adminDb) {
    console.error("[Data Service Admin] Firebase Admin SDK not initialized. Cannot delete admin session.");
    return { success: false, error: "Firebase Admin SDK not initialized." };
  }
  const sessionDocRef = adminDb.collection(ADMIN_SESSIONS_COLLECTION).doc(sessionId);
  const activeProjectId = admin.instanceId()?.app?.options?.projectId || 'UNKNOWN_PROJECT_ID';
  try {
    await sessionDocRef.delete();
    console.log(`[Data Service Admin] Successfully deleted admin session for '${sessionId}' from Firestore. Project: ${activeProjectId}`);
    return { success: true };
  } catch (error: any) {
    console.error(`[Data Service Admin] Error deleting admin session '${sessionId}' from Firestore. Project: ${activeProjectId}:`, error.message, error.stack);
    return { success: false, error: error.message || "Failed to delete admin session from Firestore." };
  }
}

export type { StudentInfo, FacultySelectionEntry, FacultyConnectFormValues, SubmissionPayload } from '../lib/schema';

// This line was attempting to import from a non-existent file or had a typo in earlier versions.
// Removed, as `adminDb` and `admin` are now correctly imported from './firebase-admin'.
// export { adminDb, adminAuth, admin }; // This would cause a re-export conflict

