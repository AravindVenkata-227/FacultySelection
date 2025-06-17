'use client';

import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'; // Assuming these are part of shadcn setup
import type { FacultyConnectFormValues } from '@/lib/schema';
import { Fingerprint, User } from 'lucide-react';

interface StudentInfoFormProps {
  control: Control<FacultyConnectFormValues>;
  isSubmitted: boolean;
  formFields?: Record<string, string>; // For displaying server-side field errors
}

export function StudentInfoForm({ control, isSubmitted, formFields }: StudentInfoFormProps) {
  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">Student Information</CardTitle>
        <CardDescription>Please enter your details to proceed with faculty selection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={control}
          name="rollNumber"
          render={({ field, fieldState: { error } }) => (
            <FormItem>
              <FormLabel htmlFor="rollNumber" className="flex items-center text-base">
                <Fingerprint className="mr-2 h-5 w-5 text-primary" />
                Roll Number
              </FormLabel>
              <FormControl>
                <Input
                  id="rollNumber"
                  placeholder="e.g., AA1234"
                  {...field}
                  disabled={isSubmitted}
                  aria-describedby="rollNumber-error"
                  className="text-base"
                />
              </FormControl>
              <FormMessage id="rollNumber-error">
                {error?.message || formFields?.rollNumber}
              </FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="name"
          render={({ field, fieldState: { error } }) => (
            <FormItem>
              <FormLabel htmlFor="name" className="flex items-center text-base">
                <User className="mr-2 h-5 w-5 text-primary" />
                Full Name
              </FormLabel>
              <FormControl>
                <Input
                  id="name"
                  placeholder="e.g., John Doe"
                  {...field}
                  disabled={isSubmitted}
                  aria-describedby="name-error"
                  className="text-base"
                />
              </FormControl>
              <FormMessage id="name-error">
                {error?.message || formFields?.name}
              </FormMessage>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
