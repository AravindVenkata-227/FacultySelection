'use client';

import type { Control } from 'react-hook-form';
import { SubjectCard } from './SubjectCard';
import type { Subject, Faculty } from '@/lib/data';
import type { FacultyConnectFormValues } from '@/lib/schema';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FacultySelectionListProps {
  subjects: Subject[];
  allFaculties: Faculty[];
  facultySlots: Record<string, number>;
  control: Control<FacultyConnectFormValues>;
  isSubmitted: boolean;
}

export function FacultySelectionList({
  subjects,
  allFaculties,
  facultySlots,
  control,
  isSubmitted,
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
        <ScrollArea className="h-[calc(100vh-450px)] sm:h-[calc(100vh-400px)] pr-4"> {/* Adjust height as needed */}
          <div className="space-y-6">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                allFaculties={allFaculties}
                facultySlots={facultySlots}
                control={control}
                isSubmitted={isSubmitted}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
