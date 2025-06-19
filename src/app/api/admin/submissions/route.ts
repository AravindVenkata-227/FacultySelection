
import { type NextRequest, NextResponse } from 'next/server';
// Cookies import is no longer needed here as middleware handles auth
import { getAllStudentSubmissions, getSubjects, getFaculties, type StudentSubmission, type Subject, type Faculty } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic'; // Opt into dynamic behavior

interface FormattedSubmission {
  [key: string]: string | number;
  Timestamp: string;
  "Roll Number": string;
  Name: string;
  "Email ID": string;
  "WhatsApp Number": string;
  // Subject names will be dynamic keys
}

export async function GET(request: NextRequest) {
  // Authentication is now handled by middleware. If the request reaches here, it's authorized.
  console.log('[API Admin Submissions GET] Request received. Fetching submissions from Firestore.');
  try {
    const submissions: StudentSubmission[] | null = await getAllStudentSubmissions();
    
    if (submissions === null) {
      console.error('[API Admin Submissions GET] Failed to retrieve submissions from Firestore (getAllStudentSubmissions returned null).');
      return NextResponse.json({ message: 'Failed to retrieve data from source. Service might be unavailable or an error occurred.' }, { status: 503 });
    }
    
    const subjectsList: Subject[] = await getSubjects();
    const facultiesList: Faculty[] = await getFaculties();

    // Transform submissions to the format expected by the admin panel
    const formattedSubmissions: FormattedSubmission[] = submissions.map(submission => {
      const formatted: FormattedSubmission = {
        "Timestamp": submission.timestamp instanceof Timestamp ? submission.timestamp.toDate().toISOString() : new Date().toISOString(),
        "Roll Number": submission.rollNumber,
        "Name": submission.name,
        "Email ID": submission.email,
        "WhatsApp Number": submission.whatsappNumber,
      };

      subjectsList.forEach(subject => {
        const facultyId = submission.selections[subject.id];
        if (facultyId) {
          const faculty = facultiesList.find(f => f.id === facultyId);
          formatted[subject.name] = faculty ? faculty.name : `Faculty ID ${facultyId} Not Found`;
        } else {
          formatted[subject.name] = 'Not Selected';
        }
      });
      return formatted;
    });
    console.log(`[API Admin Submissions GET] Successfully fetched and formatted ${formattedSubmissions.length} submissions.`);
    return NextResponse.json(formattedSubmissions, { status: 200 });
  } catch (error: any) {
    console.error('[API Admin Submissions GET] Error fetching submissions:', error.message, error.stack);
    return NextResponse.json({ message: 'Failed to fetch submissions due to an internal error.' }, { status: 500 });
  }
}
