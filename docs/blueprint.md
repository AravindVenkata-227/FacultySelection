# **App Name**: Faculty Connect

## Core Features:

- Student Info Input and Validation: Displays a form to collect student's roll number and name, with real-time validation of the roll number format.
- Faculty Selection UI: Presents available faculties (each with 70 slots) and their associated subjects (each subject with 3 faculty options).
- Real-time Slot Management: Implements server-side logic to decrement faculty slots immediately upon selection.
- Submission Rules Engine: Enforces submission rules: students must select a faculty for each subject and cannot change selections after submission.
- Scalability Guidance: An LLM tool provides guidance on scaling the application, suggesting technologies or strategies to handle concurrent access by 300 students to avoid performance issues, displayed via in-app help.
- Responsive Design: Adapts the display for optimal viewing and interaction on both desktop and mobile devices.

## Style Guidelines:

- Primary color: Deep sky blue (#00BFFF) for a modern and engaging feel.
- Background color: Alice blue (#F0F8FF), for a clean and calming base.
- Accent color: Coral (#FF80AB) to highlight interactive elements and key information.
- Body and headline font: 'Nunito' (sans-serif) for a clean and modern look, suitable for all text.
- Use simple, clear icons to represent faculties and subjects, enhancing usability.
- Prioritize a clear, linear layout to guide the student through the selection process. Use distinct sections for student info, subject/faculty selection, and submission.
- Use subtle animations to confirm selections and provide feedback, improving user engagement without being distracting.