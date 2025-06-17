
'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import type { Subject, Faculty } from '@/lib/data';
import type { FacultyConnectFormValues } from '@/lib/schema';
import { LibraryBig, Users, Gauge } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  allFaculties: Faculty[];
  facultySlots: Record<string, number>; // Key is `${facultyId}_${subjectId}`
  control: Control<FacultyConnectFormValues>;
  isSubmitted: boolean;
  onFacultySelectionChange: (subjectId: string, newFacultyId: string, oldFacultyId: string | undefined | null) => void;
}

export function SubjectCard({ 
  subject, 
  allFaculties, 
  facultySlots, 
  control, 
  isSubmitted,
  onFacultySelectionChange 
}: SubjectCardProps) {
  const facultyDetails = (facultyId: string) => {
    return allFaculties.find(f => f.id === facultyId);
  };

  return (
    <Card className="mb-6 shadow-md transition-all duration-300 ease-in-out hover:shadow-xl">
      <CardHeader>
        <CardTitle className="text-xl font-headline flex items-center">
          <LibraryBig className="mr-3 h-6 w-6 text-primary" />
          {subject.name}
        </CardTitle>
        <CardDescription>Select one faculty for this subject.</CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={control}
          name={`selections.${subject.id}`}
          render={({ field, fieldState: { error } }) => (
            <FormItem className="space-y-3">
              <FormLabel className="sr-only">Select Faculty for {subject.name}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(newFacultyId) => {
                    const oldFacultyId = field.value;
                    field.onChange(newFacultyId); 
                    if (!isSubmitted) { 
                       onFacultySelectionChange(subject.id, newFacultyId, oldFacultyId);
                    }
                  }}
                  value={field.value || ''} 
                  className="flex flex-col space-y-2"
                  disabled={isSubmitted}
                >
                  {subject.facultyOptions.map((facultyIdOption) => {
                    const faculty = facultyDetails(facultyIdOption);
                    if (!faculty) return null;

                    const slotKey = `${faculty.id}_${subject.id}`;
                    const slots = facultySlots[slotKey] ?? faculty.initialSlots; 
                    
                    // Disable if slots are 0 AND it's not the currently selected faculty for this subject
                    const isOptionDisabled = slots === 0 && field.value !== faculty.id;

                    return (
                      <FormItem 
                        key={faculty.id} 
                        className={`flex items-center space-x-3 space-y-0 p-3 rounded-md border transition-all ${field.value === faculty.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-border hover:bg-muted/50'} ${(isOptionDisabled && !isSubmitted) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <FormControl>
                           <RadioGroupItem 
                             value={faculty.id} 
                             disabled={isOptionDisabled || isSubmitted} 
                             id={`${subject.id}-${faculty.id}`} 
                           />
                        </FormControl>
                        <Label htmlFor={`${subject.id}-${faculty.id}`} className={`font-normal text-base flex-grow ${(isOptionDisabled && !isSubmitted) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                          <div className="flex justify-between items-center">
                            <span className="flex items-center">
                              <Users className="mr-2 h-5 w-5 text-secondary-foreground" />
                              {faculty.name}
                            </span>
                            <span className={`flex items-center text-sm ${slots <= 10 && slots > 0 ? 'text-destructive animate-subtle-pulse' : slots === 0 ? 'text-muted-foreground' : 'text-green-600'}`}>
                              <Gauge className="mr-1 h-4 w-4" />
                              {slots} slots left
                            </span>
                          </div>
                        </Label>
                      </FormItem>
                    );
                  })}
                </RadioGroup>
              </FormControl>
              <FormMessage>{error?.message}</FormMessage>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
