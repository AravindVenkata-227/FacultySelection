
'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface ThankYouDisplayProps {
  name: string;
  message: string;
  rollNumber?: string; 
}

export function ThankYouDisplay({ name, message, rollNumber }: ThankYouDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <Card className="w-full max-w-lg shadow-xl bg-background">
        <CardHeader className="items-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-headline text-primary">Thank You, {name}!</CardTitle>
          {rollNumber && (
            <CardDescription className="text-md text-muted-foreground mt-1">
              Roll Number: {rollNumber}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-lg text-foreground whitespace-pre-line">{message}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            You have successfully submitted your faculty selections.
            <br />
            If you need to make any changes, please contact the department administration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
