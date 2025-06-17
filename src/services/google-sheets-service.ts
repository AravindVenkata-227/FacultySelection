'use server';

import { google } from 'googleapis';
import type { sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';

async function getSheetsClient(): Promise<sheets_v4.Sheets | null> {
  try {
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      // Credentials will be automatically sourced from GOOGLE_APPLICATION_CREDENTIALS
      // environment variable if set, or from the GCE metadata server if running on Google Cloud.
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
  } catch (error) {
    console.error('Failed to get Google Sheets client:', error);
    // Log specific error details if available (e.g., ADC not found)
    if (error instanceof Error && error.message.includes('Could not load the default credentials')) {
        console.error("Detailed error: Ensure GOOGLE_APPLICATION_CREDENTIALS is set correctly or you're running in a GCP environment with default credentials.");
    }
    return null;
  }
}

export async function appendToSheet(rowData: any[][]): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    console.error('GOOGLE_SHEET_ID environment variable is not set. Cannot write to sheet.');
    return false;
  }

  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('Sheet client not available. Cannot append to sheet.');
    return false;
  }

  try {
    const range = `${SHEET_NAME}!A1`; // Appends after the last row with data in this sheet

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

    if (response.status === 200) {
      console.log('Data successfully appended to Google Sheet.');
      return true;
    } else {
      console.error('Error appending data to Google Sheet:', response.statusText, response.data);
      return false;
    }
  } catch (error) {
    console.error('Failed to append data to Google Sheet:', error);
    if (error instanceof Error && 'errors' in error) {
        console.error('Google API specific errors:', (error as any).errors);
    }
    return false;
  }
}

export async function ensureSheetHeaders(expectedHeaders: string[]): Promise<boolean> {
  if (!SPREADSHEET_ID) {
    console.error('GOOGLE_SHEET_ID environment variable is not set. Cannot check/write headers.');
    return false;
  }
  
  const sheets = await getSheetsClient();
  if (!sheets) {
    console.error('Sheet client not available. Cannot ensure headers.');
    return false;
  }

  try {
    const range = `${SHEET_NAME}!1:1`; // Check the first row

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });

    const currentHeaders = response.data.values?.[0] as string[] | undefined;

    let headersMatch = false;
    if (currentHeaders && currentHeaders.length === expectedHeaders.length) {
      headersMatch = expectedHeaders.every((h, i) => currentHeaders[i] === h);
    }
    
    if (!headersMatch) {
      console.log('Headers are missing or incorrect. Writing new headers.');
      // Clear the first row before updating to avoid issues if new headers are shorter
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [expectedHeaders],
        },
      });
      console.log('Headers written successfully.');
    } else {
      console.log('Headers are already correct.');
    }
    return true;
  } catch (error: any) {
    // Handle common error: "Requested entity was not found" if sheet doesn't exist.
    if (error.code === 404 || (error.errors && error.errors.some((e: any) => e.reason === 'notFound'))) {
        console.warn(`Sheet "${SHEET_NAME}" not found in spreadsheet "${SPREADSHEET_ID}". Attempting to write headers to create it.`);
         try {
            await sheets.spreadsheets.values.update({ // This will create the sheet if it doesn't exist and is empty, or update first row
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!1:1`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [expectedHeaders],
                },
            });
            console.log('Headers written successfully (sheet might have been created).');
            return true;
        } catch (creationError) {
             console.error('Failed to create sheet or write headers after not found error:', creationError);
             if (creationError instanceof Error && 'errors' in creationError) {
                console.error('Google API specific errors on creation attempt:', (creationError as any).errors);
            }
        }
    } else {
        console.error('Failed to ensure sheet headers:', error);
        if (error instanceof Error && 'errors' in error) {
            console.error('Google API specific errors:', (error as any).errors);
        }
    }
    return false;
  }
}
