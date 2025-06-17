import { z } from 'zod';

export const studentInfoSchema = z.object({
  rollNumber: z.string()
    .min(1, "Roll number is required")
    .regex(/^2[0-3]09[15]A05[0-9A-K][0-9]$/, "Invalid roll number format."),
  name: z.string().min(2, "Name must be at least 2 characters long.").max(100, "Name must be less than 100 characters."),
  email: z.string().email({ message: "Invalid email address." }).min(1, "Email ID is required."),
  whatsappNumber: z.string()
    .min(10, "WhatsApp number must be 10 digits.")
    .regex(/^[6789]\d{9}$/, { message: "Invalid WhatsApp number. Must be a 10-digit number starting with 6, 7, 8, or 9." })
    .max(10, "WhatsApp number must be 10 digits."),
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
  email: z.string().email(),
  whatsappNumber: z.string(),
  selections: z.array(facultySelectionEntrySchema),
});

export type SubmissionPayload = z.infer<typeof submissionSchema>;
