
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { StudentInfoForm } from './StudentInfoForm';
import { FacultySelectionList } from './FacultySelectionList';
import { ScalabilityGuidance } from './ScalabilityGuidance';
import { ThankYouDisplay } from './ThankYouDisplay';
import type { Subject, Faculty } from '@/lib/data';
import { facultyConnectFormSchema, type FacultyConnectFormValues, type StudentInfo } from '@/lib/schema';
import { submitFacultySelection, fetchCurrentFacultySlots, type FormState } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, Send, Info, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';

interface FacultyConnectClientProps {
  initialSubjects: Subject[];
  initialFaculties: Faculty[];
  initialSlots: Record<string, number>; // Key is `${facultyId}_${subjectId}`
}

const defaultFormValues: Partial<FacultyConnectFormValues> = {
  rollNumber: '',
  name: '',
  email: '',
  whatsappNumber: '',
  selections: {},
};

interface PersistentSubmissionData {
  name: string;
  message: string;
  rollNumber: string;
}

const LOCAL_STORAGE_KEY = 'facultyAllotment_submissionCompleted';

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
  const [currentStep, setCurrentStep] = useState(1);
  const [persistentSubmission, setPersistentSubmission] = useState<PersistentSubmissionData | null>(null);

  const form = useForm<FacultyConnectFormValues>({
    resolver: zodResolver(facultyConnectFormSchema),
    defaultValues: {
      ...defaultFormValues,
      selections: initialSubjects.reduce((acc, subject) => {
        acc[subject.id] = ''; 
        return acc;
      }, {} as Record<string, string>),
    },
    mode: 'onChange', 
  });

  const { control, handleSubmit, reset, formState: { errors: clientErrors }, trigger, getValues } = form;

  useEffect(() => {
    // For a production scenario, the line below should be removed or commented out.
    // It was added to allow re-testing by clearing the submission flag on each load.
    // localStorage.removeItem(LOCAL_STORAGE_KEY); 

    const storedSubmission = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedSubmission) {
      try {
        const submissionData = JSON.parse(storedSubmission) as PersistentSubmissionData;
        if (submissionData && submissionData.name && submissionData.message && submissionData.rollNumber) {
          setPersistentSubmission(submissionData);
          setIsSubmitted(true); // Lock form controls if already submitted
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear invalid data
        }
      } catch (e) {
        console.error("Error parsing stored submission data", e);
        localStorage.removeItem(LOCAL_STORAGE_KEY); // Clear corrupted data
      }
    }
  }, []);

  const handleNextStep = async () => {
    const studentInfoFields: (keyof FacultyConnectFormValues)[] = ['rollNumber', 'name', 'email', 'whatsappNumber'];
    const isValid = await trigger(studentInfoFields as unknown as (keyof FacultyConnectFormValues)[]); 
    if (isValid) {
      setCurrentStep(2);
    } else {
      toast({
        title: "Validation Error",
        description: "Please correct the errors in the student information form before proceeding.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  const handleFacultySelectionChange = (subjectId: string, newFacultyId: string, oldFacultyId: string | undefined | null) => {
    setCurrentFacultySlots(prevSlots => {
      const updatedSlots = { ...prevSlots };
      const facultyDetails = (facultyId: string) => initialFaculties.find(f => f.id === facultyId);

      if (oldFacultyId && oldFacultyId !== newFacultyId) {
        const oldFaculty = facultyDetails(oldFacultyId);
        if (oldFaculty) {
          const oldSlotKey = `${oldFacultyId}_${subjectId}`;
          if (updatedSlots[oldSlotKey] < oldFaculty.initialSlots) {
             updatedSlots[oldSlotKey] = (updatedSlots[oldSlotKey] || 0) + 1;
          }
        }
      }
      
      if (newFacultyId && newFacultyId !== oldFacultyId) {
        const newSlotKey = `${newFacultyId}_${subjectId}`;
        if (updatedSlots[newSlotKey] > 0) {
          updatedSlots[newSlotKey] = (updatedSlots[newSlotKey] || 0) - 1;
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
      formData.append('email', data.email || '');
      formData.append('whatsappNumber', data.whatsappNumber || '');
      Object.entries(data.selections).forEach(([subjectId, facultyId]) => {
        if (facultyId) {
          formData.append(`selections.${subjectId}`, facultyId);
        }
      });
      
      const result = await submitFacultySelection(undefined, formData);
      setFormState(result);

      if (result.success) {
        setIsSubmitted(true);
        const submissionDataToStore: PersistentSubmissionData = {
          name: data.name,
          message: result.message,
          rollNumber: data.rollNumber,
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(submissionDataToStore));
        setPersistentSubmission(submissionDataToStore);
        
        if (result.updatedSlots) {
          setCurrentFacultySlots(result.updatedSlots); 
        }
        // Toast for immediate feedback can be removed if ThankYouDisplay is prominent enough
        // toast({
        //   title: 'Submission Successful!',
        //   description: result.message,
        //   variant: 'default',
        //   duration: 5000,
        // });
      } else {
        toast({
          title: 'Submission Failed',
          description: result.message || 'Please check your inputs and try again.',
          variant: 'destructive',
          duration: 5000,
        });
        if (result.fields) {
            if (result.fields.rollNumber) form.setError("rollNumber", { type: "server", message: result.fields.rollNumber });
            if (result.fields.name) form.setError("name", { type: "server", message: result.fields.name });
            if (result.fields.email) form.setError("email", { type: "server", message: result.fields.email });
            if (result.fields.whatsappNumber) form.setError("whatsappNumber", { type: "server", message: result.fields.whatsappNumber });
        }
        const latestSlots = result.updatedSlots || await fetchCurrentFacultySlots();
        setCurrentFacultySlots(latestSlots);
      }
    });
  };
  
  useEffect(() => {
    if (Object.keys(currentFacultySlots).length === 0 && Object.keys(initialSlots).length > 0) {
      setCurrentFacultySlots(initialSlots);
    }
  }, [initialSlots, currentFacultySlots]);


  return (
    <div className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow">
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-headline font-bold text-primary">IV-I CSE-Subject Allotment-June2025</h1>
        {!persistentSubmission && (
           <p className="text-lg text-muted-foreground mt-2">Streamlined faculty selection for your subjects.</p>
        )}
      </header>

      {persistentSubmission ? (
        <ThankYouDisplay 
          name={persistentSubmission.name} 
          message={persistentSubmission.message}
          rollNumber={persistentSubmission.rollNumber}
        />
      ) : (
        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {currentStep === 1 && (
              <div className="flex flex-col items-center">
                <div className="w-full max-w-2xl">
                  <StudentInfoForm control={control} isSubmitted={isSubmitted} formFields={formState?.fields} />
                </div>
                <div className="flex justify-end mt-8 w-full max-w-2xl">
                  <Button 
                    type="button" 
                    onClick={handleNextStep} 
                    disabled={isPending || isSubmitted} 
                    className="text-lg py-3 px-8 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-transform transform hover:scale-105"
                  >
                    Next <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="flex flex-col items-center">
                 <div className="w-full max-w-3xl">
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
                   <Alert variant="destructive" className="mt-6 w-full max-w-3xl">
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
                {/* Success alert can be removed or kept if ThankYouDisplay isn't shown immediately for some reason */}
                 {formState && formState.success && !persistentSubmission && ( // Only show if not yet transitioning to ThankYouDisplay
                   <Alert variant="default" className="mt-6 bg-primary/10 border-primary/30 text-primary-dark w-full max-w-3xl">
                     <CheckCircle className="h-4 w-4 text-primary" />
                     <AlertTitle className="text-primary">Success!</AlertTitle>
                     <AlertDescription className="text-primary">
                       {formState.message}
                     </AlertDescription>
                   </Alert>
                 )}
                
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10 pt-6 border-t w-full max-w-3xl">
                  {!isSubmitted && ( // isSubmitted will be true if persistentSubmission is set too
                     <Button 
                      type="button" 
                      onClick={() => setCurrentStep(1)} 
                      variant="outline" 
                      disabled={isPending} 
                      className="w-full sm:w-auto text-lg py-3 px-8"
                    >
                      <ArrowLeft className="mr-2 h-5 w-5" /> Previous
                    </Button>
                  )}
                  {!isSubmitted ? ( // isSubmitted will be true if persistentSubmission is set too
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
                    // This part might not be reached if persistentSubmission immediately shows ThankYouDisplay
                    // Kept for safety, but ThankYouDisplay is the primary success indicator
                    !persistentSubmission && ( 
                        <p className="text-lg text-green-600 font-semibold flex items-center">
                        <CheckCircle className="mr-2 h-6 w-6" /> Your selections have been submitted!
                        </p>
                    )
                  )}
                </div>
              </div>
            )}
          </form>
        </Form>
      )}
      {!persistentSubmission && <ScalabilityGuidance />}
    </div>
  );
}
