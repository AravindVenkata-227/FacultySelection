
'use client';

import type { Control } from 'react-hook-form';
import { SubjectCard } from './SubjectCard';
import type { Subject, Faculty } from '@/lib/data';
import type { FacultyConnectFormValues } from '@/lib/schema';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface FacultySelectionListProps {
  subjects: Subject[];
  allFaculties: Faculty[];
  facultySlots: Record<string, number>; // Key is `${facultyId}_${subjectId}`
  control: Control<FacultyConnectFormValues>;
  isSubmitted: boolean;
  onFacultySelectionChange: (subjectId: string, newFacultyId: string, oldFacultyId: string | undefined | null) => void;
}

export function FacultySelectionList({
  subjects,
  allFaculties,
  facultySlots,
  control,
  isSubmitted,
  onFacultySelectionChange,
}: FacultySelectionListProps) {
  if (!subjects || subjects.length === 0) {
    return <p>No subjects available for selection.</p>;
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Faculty Selection</CardTitle>
        <CardDescription>Choose your preferred faculty for each subject below. Slots are limited.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              allFaculties={allFaculties}
              facultySlots={facultySlots} // Pass composite-key slots
              control={control}
              isSubmitted={isSubmitted}
              onFacultySelectionChange={onFacultySelectionChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

