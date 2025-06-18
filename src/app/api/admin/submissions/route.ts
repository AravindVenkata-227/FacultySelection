
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllStudentSubmissions, getSubjects, getFaculties, type StudentSubmission, type Subject, type Faculty } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic'; // Opt into dynamic behavior

interface FormattedSubmission {
  [key: string]: string | number; // Allow number for rowIndex if added by client
  Timestamp: string;
  "Roll Number": string;
  Name: string;
  "Email ID": string;
  "WhatsApp Number": string;
  // Subject names will be dynamic keys
}

export async function GET(request: NextRequest) {
  const cookieStore = cookies();
  const authToken = cookieStore.get('admin-auth-token')?.value;

  if (!authToken || authToken !== 'true') { 
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const submissions: StudentSubmission[] = await getAllStudentSubmissions();
    const subjectsList: Subject[] = await getSubjects();
    const facultiesList: Faculty[] = await getFaculties();

    if (submissions === null) { 
        return NextResponse.json({ message: 'Failed to retrieve data from source. Service unavailable.' }, { status: 503 });
    }
    
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
          formatted[subject.name] = faculty ? faculty.name : 'N/A - Faculty ID Not Found';
        } else {
          formatted[subject.name] = 'Not Selected';
        }
      });
      return formatted;
    });

    return NextResponse.json(formattedSubmissions, { status: 200 });
  } catch (error) {
    console.error('API submissions error:', error);
    return NextResponse.json({ message: 'Failed to fetch submissions' }, { status: 500 });
  }
}
