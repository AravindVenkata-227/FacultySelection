import { z } from 'zod';

export const studentInfoSchema = z.object({
  rollNumber: z.string()
    .min(1, "Roll number is required")
    .regex(/^[A-Za-z]{2}\d{4}$/, "Invalid roll number format. Must be 2 letters followed by 4 numbers (e.g., AA1234)."),
  name: z.string().min(2, "Name must be at least 2 characters long.").max(100, "Name must be less than 100 characters."),
});

export type StudentInfo = z.infer<typeof studentInfoSchema>;

export const facultySelectionEntrySchema = z.object({
  subjectId: z.string(),
  facultyId: z.string().min(1, "Faculty must be selected for this subject."),
});

export type FacultySelectionEntry = z.infer<typeof facultySelectionEntrySchema>;

// This schema will be used by react-hook-form which needs a flat structure for selections
export const facultyConnectFormSchema = studentInfoSchema.extend({
  selections: z.record(z.string(), z.string().optional()), // subjectId -> facultyId. Optional initially, validated in action.
});

export type FacultyConnectFormValues = z.infer<typeof facultyConnectFormSchema>;

// Schema for server action validation
export const submissionSchema = z.object({
  rollNumber: z.string(),
  name: z.string(),
  selections: z.array(facultySelectionEntrySchema),
});

export type SubmissionPayload = z.infer<typeof submissionSchema>;
