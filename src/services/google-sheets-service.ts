
'use server';

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1'; // Default to Sheet1 if not set

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
      // Credentials will be automatically sourced from GOOGLE_APPLICATION_CREDENTIALS
      // environment variable if set, or from the GCE metadata server if running on Google Cloud.
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
    const range = `${SHEET_NAME}!A1`; // Appends after the last row with data in this sheet
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
    const range = `${SHEET_NAME}!1:1`; // Check the first row
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
      // It's safer to clear only if we are sure we need to update, and if the sheet is supposed to be managed by this app.
      // For now, just update. If the row exists, it's updated. If not, it's created if permissions allow.
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range, // Update the first row
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
    // Attempt to get all data. This assumes a reasonable number of columns; adjust if necessary.
    // Example: 'Sheet1!A:Z' or more specific if known. Or simply SHEET_NAME to get all cells.
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
      // Convert array of arrays to array of objects using the first row as headers
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
    return null; // Indicates an error occurred rather than empty data
  }
}
