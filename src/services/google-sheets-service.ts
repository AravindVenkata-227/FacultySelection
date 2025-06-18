
'use server';

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

console.log(`[Google Sheets Service] Initialized. SPREADSHEET_ID: "${SPREADSHEET_ID}", SHEET_NAME: "${SHEET_NAME}"`);
console.log(`[Google Sheets Service] GOOGLE_APPLICATION_CREDENTIALS path from env: "${process.env.GOOGLE_APPLICATION_CREDENTIALS}"`);

async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  console.log('[Google Sheets Service] Attempting to get Sheets client...');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('[Google Sheets Service] CRITICAL: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set. Cannot authenticate.');
    return null;
  }
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    console.log('[Google Sheets Service] GoogleAuth client obtained successfully.');
    const client = google.sheets({ version: 'v4', auth: authClient });
    console.log('[Google Sheets Service] Sheets API client created successfully.');
    return client;
  } catch (error) {
    console.error('[Google Sheets Service] Failed to get Google Sheets client:', error);
    if (error instanceof Error && error.message.includes('Could not load the default credentials')) {
        console.error("[Google Sheets Service] Detailed error: Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly to the path of your service account JSON key file, or you're running in a GCP environment with default credentials.");
    }
    return null;
  }
}

export async function appendToSheet(rowData: any[][]): Promise<boolean> {
  console.log('[Google Sheets Service] Attempting to append data to sheet:', rowData);
  if (!SPREADSHEET_ID) {
    console.error('[Google Sheets Service] SPREADSHEET_ID environment variable is not set. Cannot write to sheet.');
    return false;
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('[Google Sheets Service] Sheet client not available for append. Cannot append to sheet.');
    return false;
  }

  try {
    const range = `${SHEET_NAME}!A1`;
    console.log(`[Google Sheets Service] Appending to range: ${range}`);

    const resource: sheets_v4.Params$Resource$Spreadsheets$Values$Append = {
      spreadsheetId: SPREADSHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: rowData,
      },
    };

    const response = await sheets.spreadsheets.values.append(resource);
    console.log('[Google Sheets Service] Append API response status:', response.status);

    if (response.status === 200) {
      console.log('[Google Sheets Service] Data successfully appended to Google Sheet. Updates:', response.data.updates);
      return true;
    } else {
      console.error('[Google Sheets Service] Error appending data to Google Sheet. Status:', response.status, 'StatusText:', response.statusText, 'Response Data:', response.data);
      return false;
    }
  } catch (error) {
    console.error('[Google Sheets Service] Failed to append data to Google Sheet (exception caught):', error);
    if (error instanceof Error && 'errors' in error) {
        console.error('[Google Sheets Service] Google API specific errors from exception:', (error as any).errors);
    }
    return false;
  }
}

export async function ensureSheetHeaders(expectedHeaders: string[]): Promise<boolean> {
  console.log('[Google Sheets Service] Attempting to ensure sheet headers:', expectedHeaders);
  if (!SPREADSHEET_ID) {
    console.error('[Google Sheets Service] SPREADSHEET_ID environment variable is not set. Cannot check/write headers.');
    return false;
  }
  
  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('[Google Sheets Service] Sheet client not available for headers. Cannot ensure headers.');
    return false;
  }

  try {
    const range = `${SHEET_NAME}!1:1`; 
    console.log(`[Google Sheets Service] Checking headers in range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });
    console.log('[Google Sheets Service] Get Headers API response status:', response.status);

    const currentHeaders = response.data.values?.[0] as string[] | undefined;
    console.log('[Google Sheets Service] Current headers found:', currentHeaders);

    let headersMatch = false;
    if (currentHeaders && currentHeaders.length === expectedHeaders.length) {
      headersMatch = expectedHeaders.every((h, i) => currentHeaders[i] === h);
    }
    
    if (!headersMatch) {
      console.log('[Google Sheets Service] Headers are missing or incorrect. Writing new headers.');
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [expectedHeaders],
        },
      });
      console.log('[Google Sheets Service] Update Headers API response status:', updateResponse.status);
      console.log('[Google Sheets Service] Headers written successfully.');
    } else {
      console.log('[Google Sheets Service] Headers are already correct.');
    }
    return true;
  } catch (error: any) {
    console.error('[Google Sheets Service] Failed to ensure sheet headers (exception caught):', error.message);
     if (error.code === 404 || (error.errors && error.errors.some((e: any) => e.reason === 'notFound' || e.message.includes('Unable to parse range')))) {
        console.warn(`[Google Sheets Service] Sheet "${SHEET_NAME}" or range might not be found in spreadsheet "${SPREADSHEET_ID}". Attempting to write headers (which might create the sheet or row).`);
         try {
            const createResponse = await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1`, 
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [expectedHeaders],
                },
            });
            console.log('[Google Sheets Service] Headers written (creation attempt) API response status:', createResponse.status);
            console.log('[Google Sheets Service] Headers written successfully (sheet might have been created).');
            return true;
        } catch (creationError: any) {
             console.error('[Google Sheets Service] Failed to create sheet or write headers after "not found" error:', creationError.message);
             if (creationError instanceof Error && 'errors' in creationError) {
                console.error('[Google Sheets Service] Google API specific errors from creation attempt exception:', (creationError as any).errors);
            }
        }
    } else if (error.code === 403) {
        console.error('[Google Sheets Service] Permission denied (403). Check service account permissions on the Sheet and ensure Sheets API is enabled.');
    }
    
    if (error instanceof Error && 'errors' in error) {
        console.error('[Google Sheets Service] Google API specific errors from ensureSheetHeaders exception:', (error as any).errors);
    }
    return false;
  }
}

export async function getSheetData(): Promise<any[] | null> {
  console.log('[Google Sheets Service] Attempting to get all sheet data...');
  if (!SPREADSHEET_ID) {
    console.error('[Google Sheets Service] SPREADSHEET_ID environment variable is not set. Cannot read sheet data.');
    return null;
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('[Google Sheets Service] Sheet client not available for get. Cannot read sheet data.');
    return null;
  }

  try {
    const range = `${SHEET_NAME}`; 
    console.log(`[Google Sheets Service] Getting data from range: ${range}`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });
    console.log('[Google Sheets Service] Get All Data API response status:', response.status);

    const rows = response.data.values;
    if (rows && rows.length) {
      console.log(`[Google Sheets Service] Successfully retrieved ${rows.length} rows.`);
      const headers = rows[0] as string[];
      const data = rows.slice(1).map(rowArray => {
        let obj: {[key: string]: string} = {};
        headers.forEach((header, index) => {
          obj[header] = rowArray[index];
        });
        return obj;
      });
      return data;
    } else {
      console.log('[Google Sheets Service] No data found in the sheet or sheet is empty.');
      return [];
    }
  } catch (error: any) {
    console.error('[Google Sheets Service] Failed to get sheet data (exception caught):', error.message);
    if (error.code === 403) {
        console.error('[Google Sheets Service] Permission denied (403) while trying to read sheet. Check service account read permissions.');
    }
    if (error instanceof Error && 'errors' in error) {
        console.error('[Google Sheets Service] Google API specific errors from getSheetData exception:', (error as any).errors);
    }
    return null;
  }
}

export async function getRollNumbersFromSheet(): Promise<string[] | null> {
  console.log('[Google Sheets Service] Attempting to get all roll numbers from sheet...');
  const allData = await getSheetData(); // This already handles headers and returns objects or null/empty array

  if (allData === null) { // Error fetching data
    console.error('[Google Sheets Service] Failed to retrieve sheet data for roll number check.');
    return null;
  }
  if (allData.length === 0) { // Sheet is empty or has only headers
    console.log('[Google Sheets Service] No student data found in sheet for roll number check.');
    return [];
  }

  // Assuming "Roll Number" is a header. If not, this will filter out undefineds.
  const rollNumbers = allData.map(row => row['Roll Number']).filter(Boolean);
  console.log(`[Google Sheets Service] Retrieved ${rollNumbers.length} roll numbers from sheet.`);
  return rollNumbers;
}


export async function deleteSheetRowByRollNumber(
  rollNumberToDelete: string
): Promise<{ success: boolean; error?: string; deletedStudentChoices?: Record<string, string> }> {
  console.log(`[Google Sheets Service] Attempting to delete row for roll number: ${rollNumberToDelete}`);
  if (!SPREADSHEET_ID) {
    console.error('[Google Sheets Service] SPREADSHEET_ID environment variable is not set. Cannot delete row.');
    return { success: false, error: 'Server configuration error: SPREADSHEET_ID not set.' };
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('[Google Sheets Service] Sheet client not available for delete. Cannot delete row.');
    return { success: false, error: 'Sheet client initialization failed.' };
  }

  try {
    // 1. Get the sheetId for the given SHEET_NAME
    console.log(`[Google Sheets Service] Fetching spreadsheet metadata to find sheetId for "${SHEET_NAME}"`);
    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetProperties = spreadsheetMeta.data.sheets?.find(s => s.properties?.title === SHEET_NAME);
    if (!sheetProperties || typeof sheetProperties.properties?.sheetId !== 'number') {
      console.error(`[Google Sheets Service] Could not find sheetId for sheet named "${SHEET_NAME}".`);
      return { success: false, error: `Sheet named "${SHEET_NAME}" not found or has no ID.` };
    }
    const sheetId = sheetProperties.properties.sheetId;
    console.log(`[Google Sheets Service] Found sheetId: ${sheetId} for "${SHEET_NAME}".`);

    // 2. Get all data to find the row index and extract choices
    console.log(`[Google Sheets Service] Getting all data from sheet "${SHEET_NAME}" to find row index.`);
    const range = `${SHEET_NAME}`; // Read the whole sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('[Google Sheets Service] No data in sheet, cannot find row to delete.');
      return { success: false, error: 'Sheet is empty or no data found.' };
    }

    const headers = rows[0] as string[];
    const rollNumberColumnIndex = headers.findIndex(header => header.toLowerCase() === 'roll number'); // Case-insensitive search

    if (rollNumberColumnIndex === -1) {
      console.error('[Google Sheets Service] "Roll Number" column not found in sheet headers:', headers);
      return { success: false, error: '"Roll Number" column not found in sheet.' };
    }
    console.log(`[Google Sheets Service] "Roll Number" column index: ${rollNumberColumnIndex}. Headers: ${headers.join(', ')}`);

    let rowIndexToDelete = -1; // 1-based index
    const deletedStudentChoices: Record<string, string> = {}; // subjectName: facultyName

    for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header row
      const row = rows[i] as string[];
      if (row[rollNumberColumnIndex] === rollNumberToDelete) {
        rowIndexToDelete = i + 1; // Sheets are 1-indexed
        
        // Extract choices
        headers.forEach((header, colIndex) => {
            // Assuming columns from "WhatsApp Number" + 1 onwards are subject selections
            // A more robust way would be to explicitly list subject columns or have a convention
            const whatsAppIndex = headers.findIndex(h => h.toLowerCase() === 'whatsapp number');
            if (whatsAppIndex !== -1 && colIndex > whatsAppIndex && row[colIndex]) {
                 // Store as "Subject Name": "Faculty Name"
                deletedStudentChoices[header] = row[colIndex];
            }
        });
        break;
      }
    }

    if (rowIndexToDelete === -1) {
      console.log(`[Google Sheets Service] Roll number "${rollNumberToDelete}" not found in sheet.`);
      return { success: false, error: `Student with roll number "${rollNumberToDelete}" not found.` };
    }
    console.log(`[Google Sheets Service] Found roll number "${rollNumberToDelete}" at row ${rowIndexToDelete}. Choices:`, deletedStudentChoices);

    // 3. Delete the row
    console.log(`[Google Sheets Service] Preparing to delete row ${rowIndexToDelete} (0-indexed: ${rowIndexToDelete -1}) from sheetId ${sheetId}.`);
    const batchUpdateRequest: sheets_v4.Params$Resource$Spreadsheets$Batchupdate = {
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndexToDelete - 1, // 0-indexed
                endIndex: rowIndexToDelete,     // Exclusive
              },
            },
          },
        ],
      },
    };

    const deleteResponse = await sheets.spreadsheets.batchUpdate(batchUpdateRequest);
    console.log('[Google Sheets Service] Delete row batchUpdate API response status:', deleteResponse.status);

    if (deleteResponse.status === 200) {
      console.log(`[Google Sheets Service] Successfully deleted row ${rowIndexToDelete} for roll number "${rollNumberToDelete}".`);
      return { success: true, deletedStudentChoices };
    } else {
      console.error(`[Google Sheets Service] Failed to delete row. Status: ${deleteResponse.status}`, deleteResponse.data);
      return { success: false, error: `Failed to delete row from sheet. Status: ${deleteResponse.status}` };
    }
  } catch (error: any) {
    console.error(`[Google Sheets Service] Error deleting row for roll number "${rollNumberToDelete}":`, error.message);
    if (error.errors) console.error('[Google Sheets Service] Google API specific errors:', error.errors);
    return { success: false, error: `An unexpected error occurred while deleting the row: ${error.message}` };
  }
}
