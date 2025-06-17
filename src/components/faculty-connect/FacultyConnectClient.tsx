
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { StudentInfoForm } from './StudentInfoForm';
import { FacultySelectionList } from './FacultySelectionList';
import { ScalabilityGuidance } from './ScalabilityGuidance';
import type { Subject, Faculty } from '@/lib/data';
import { facultyConnectFormSchema, type FacultyConnectFormValues } from '@/lib/schema';
import { submitFacultySelection, fetchCurrentFacultySlots, resetAllFacultySlots, type FormState } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Send, Info, Loader2, RotateCcw } from 'lucide-react';

interface FacultyConnectClientProps {
  initialSubjects: Subject[];
  initialFaculties: Faculty[];
  initialSlots: Record<string, number>;
}

const defaultFormValues: Partial<FacultyConnectFormValues> = {
  rollNumber: '',
  name: '',
  selections: {},
};

export default function FacultyConnectClient({
  initialSubjects,
  initialFaculties,
  initialSlots,
}: FacultyConnectClientProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const [formState, setFormState] = useState<FormState | undefined>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentFacultySlots, setCurrentFacultySlots] = useState<Record<string, number>>(initialSlots);

  const form = useForm<FacultyConnectFormValues>({
    resolver: zodResolver(facultyConnectFormSchema),
    defaultValues: {
      ...defaultFormValues,
      selections: initialSubjects.reduce((acc, subject) => {
        acc[subject.id] = ''; // Initialize selections
        return acc;
      }, {} as Record<string, string>),
    },
    mode: 'onChange', // Real-time validation for student info
  });

  const { control, handleSubmit, reset, formState: { errors: clientErrors } } = form;

  const handleFacultySelectionChange = (subjectId: string, newFacultyId: string, oldFacultyId: string | undefined | null) => {
    setCurrentFacultySlots(prevSlots => {
      const updatedSlots = { ...prevSlots };
      const oldFacultyDetail = oldFacultyId ? initialFaculties.find(f => f.id === oldFacultyId) : undefined;

      if (oldFacultyId && oldFacultyId !== newFacultyId && oldFacultyDetail) {
        // Increment slot for the old faculty, ensuring it doesn't exceed initial capacity
        if (updatedSlots[oldFacultyId] < oldFacultyDetail.initialSlots) {
           updatedSlots[oldFacultyId] = (updatedSlots[oldFacultyId] || 0) + 1;
        }
      }
      
      // Decrement slot for the new faculty
      if (newFacultyId && newFacultyId !== oldFacultyId) {
        if (updatedSlots[newFacultyId] > 0) {
          updatedSlots[newFacultyId] = (updatedSlots[newFacultyId] || 0) - 1;
        }
      }
      return updatedSlots;
    });
  };

  const onSubmit = (data: FacultyConnectFormValues) => {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('rollNumber', data.rollNumber);
      formData.append('name', data.name);
      Object.entries(data.selections).forEach(([subjectId, facultyId]) => {
        if (facultyId) {
          formData.append(`selections.${subjectId}`, facultyId);
        }
      });
      
      const result = await submitFacultySelection(undefined, formData);
      setFormState(result);

      if (result.success) {
        toast({
          title: 'Submission Successful!',
          description: result.message,
          variant: 'default',
          duration: 5000,
        });
        setIsSubmitted(true);
        // Ensure final slots are accurate from server after submission
        if (result.updatedSlots) {
          setCurrentFacultySlots(result.updatedSlots);
        }
      } else {
        toast({
          title: 'Submission Failed',
          description: result.message || 'Please check your inputs and try again.',
          variant: 'destructive',
          duration: 5000,
        });
        // If specific field errors are returned from server action
        if (result.fields) {
            if (result.fields.rollNumber) form.setError("rollNumber", { type: "server", message: result.fields.rollNumber });
            if (result.fields.name) form.setError("name", { type: "server", message: result.fields.name });
        }
        // If selections caused the issue, update slots to reflect current server state
        // This also implicitly reverts any optimistic client-side changes if submission fails.
        const latestSlots = await fetchCurrentFacultySlots();
        setCurrentFacultySlots(latestSlots);
      }
    });
  };

  const handleResetForm = async () => {
    startTransition(async () => {
      await resetAllFacultySlots(); // Resets on the server
      const latestSlots = await fetchCurrentFacultySlots(); // Fetches fresh state
      setCurrentFacultySlots(latestSlots);
      reset({
        ...defaultFormValues,
        selections: initialSubjects.reduce((acc, subject) => {
          acc[subject.id] = '';
          return acc;
        }, {} as Record<string, string>),
      });
      setIsSubmitted(false);
      setFormState(undefined);
      toast({
        title: "Form Reset",
        description: "The form and all faculty slots have been reset.",
      });
    });
  };
  
  useEffect(() => {
    // Initialize slots on mount if they weren't passed or are empty
    if (Object.keys(currentFacultySlots).length === 0 && Object.keys(initialSlots).length > 0) {
      setCurrentFacultySlots(initialSlots);
    }
  }, [initialSlots, currentFacultySlots]);


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-headline font-bold text-primary">Faculty Connect</h1>
        <p className="text-lg text-muted-foreground mt-2">Streamlined faculty selection for your subjects.</p>
      </header>

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <StudentInfoForm control={control} isSubmitted={isSubmitted} formFields={formState?.fields} />
            <FacultySelectionList
              subjects={initialSubjects}
              allFaculties={initialFaculties}
              facultySlots={currentFacultySlots}
              control={control}
              isSubmitted={isSubmitted}
              onFacultySelectionChange={handleFacultySelectionChange}
            />
          </div>

          {formState && !formState.success && formState.message && (
             <Alert variant="destructive" className="mt-6">
               <Info className="h-4 w-4" />
               <AlertTitle>Error</AlertTitle>
               <AlertDescription>{formState.message}</AlertDescription>
               {formState.issues && (
                 <ul className="list-disc list-inside mt-2">
                   {formState.issues.map((issue, idx) => <li key={idx}>{issue}</li>)}
                 </ul>
               )}
             </Alert>
           )}
           {formState && formState.success && (
             <Alert variant="default" className="mt-6 bg-primary/10 border-primary/30 text-primary-dark">
               <CheckCircle className="h-4 w-4 text-primary" />
               <AlertTitle className="text-primary">Success!</AlertTitle>
               <AlertDescription className="text-primary">
                 {formState.message}
               </AlertDescription>
             </Alert>
           )}
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10 pt-6 border-t">
            {!isSubmitted ? (
              <Button 
                type="submit" 
                disabled={isPending || isSubmitted} 
                className="w-full sm:w-auto text-lg py-3 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform transform hover:scale-105"
                aria-label="Submit Selections"
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                Submit Selections
              </Button>
            ) : (
              <p className="text-lg text-green-600 font-semibold flex items-center">
                <CheckCircle className="mr-2 h-6 w-6" /> Your selections have been submitted!
              </p>
            )}
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleResetForm} 
              disabled={isPending}
              className="w-full sm:w-auto text-lg py-3 px-8 border-accent text-accent hover:bg-accent/10 shadow-sm transition-colors"
              aria-label="Reset Form and Slots"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset Form & Slots
            </Button>
          </div>
        </form>
      </Form>
      <ScalabilityGuidance />
    </div>
  );
}
