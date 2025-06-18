
'use server';

/*
// GOOGLE SHEETS SERVICE IS DEPRECATED FOR SUBMISSION DATA.
// Faculty slot data is now in Firestore.
// Student submission data is now in Firestore.
// This file's contents are commented out. It can be removed if no longer needed for any other purpose.

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

console.log(`[Google Sheets Service - DEPRECATED] Initialized. SPREADSHEET_ID: "${SPREADSHEET_ID}", SHEET_NAME: "${SHEET_NAME}"`);
console.log(`[Google Sheets Service - DEPRECATED] GOOGLE_APPLICATION_CREDENTIALS path from env: "${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`);

async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  console.log('[Google Sheets Service - DEPRECATED] Attempting to get Sheets client...');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('[Google Sheets Service - DEPRECATED] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Cannot authenticate.');
    return null;
  }
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    console.log('[Google Sheets Service - DEPRECATED] GoogleAuth client obtained successfully.');
    const client = google.sheets({ version: 'v4', auth: authClient });
    console.log('[Google Sheets Service - DEPRECATED] Sheets API client created successfully.');
    return client;
  } catch (error) {
    console.error('[Google Sheets Service - DEPRECATED] Failed to get Google Sheets client:', error);
    if (error instanceof Error && error.message.includes('Could not load the default credentials')) {
        console.error("[Google Sheets Service - DEPRECATED] Detailed error: Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly to the path of your service account JSON key file, or you're running in a GCP environment with default credentials.");
    }
    return null;
  }
}

export async function appendToSheet(rowData: any[][]): Promise<boolean> {
  console.warn('[Google Sheets Service - DEPRECATED] appendToSheet called. Submissions now go to Firestore.');
  return false; // Indicate failure or no-op
  // ... original implementation commented out ...
}

export async function ensureSheetHeaders(expectedHeaders: string[]): Promise<boolean> {
  console.warn('[Google Sheets Service - DEPRECATED] ensureSheetHeaders called. Submissions now go to Firestore.');
  return true; // Indicate success or no-op as headers are not managed here for submissions
  // ... original implementation commented out ...
}

export async function getSheetData(): Promise<any[] | null> {
  console.warn('[Google Sheets Service - DEPRECATED] getSheetData called. Submissions now come from Firestore.');
  return []; // Return empty or null to signify no data from this source for submissions
  // ... original implementation commented out ...
}

export async function getRollNumbersFromSheet(): Promise<string[] | null> {
  console.warn('[Google Sheets Service - DEPRECATED] getRollNumbersFromSheet called. Roll numbers now checked against Firestore.');
  return []; // Return empty or null
  // ... original implementation commented out ...
}


export async function deleteSheetRowByRollNumber(
  rollNumberToDelete: string
): Promise<{ success: boolean; error?: string; deletedStudentChoices?: Record<string, string> }> {
  console.warn('[Google Sheets Service - DEPRECATED] deleteSheetRowByRollNumber called. Deletions now happen in Firestore.');
  return { success: false, error: "Operation deprecated; deletions handled by Firestore." };
  // ... original implementation commented out ...
}
*/

// Placeholder for any future non-submission related Google Sheets functionality if needed.
// For now, this service is effectively deprecated for core app logic.
export {};
