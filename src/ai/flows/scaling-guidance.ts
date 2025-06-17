// scaling-guidance.ts
'use server';
/**
 * @fileOverview Provides scaling guidance for the Faculty Connect application using GenAI.
 *
 * - getScalingGuidance - A function that generates scaling recommendations based on the app's architecture.
 * - ScalingGuidanceInput - The input type for the getScalingGuidance function (currently empty).
 * - ScalingGuidanceOutput - The return type for the getScalingGuidance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ScalingGuidanceInputSchema = z.object({});
export type ScalingGuidanceInput = z.infer<typeof ScalingGuidanceInputSchema>;

const ScalingGuidanceOutputSchema = z.object({
  recommendations: z.string().describe('Scaling recommendations for the Faculty Connect application.'),
});
export type ScalingGuidanceOutput = z.infer<typeof ScalingGuidanceOutputSchema>;

export async function getScalingGuidance(input: ScalingGuidanceInput): Promise<ScalingGuidanceOutput> {
  return scalingGuidanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'scalingGuidancePrompt',
  input: {schema: ScalingGuidanceInputSchema},
  output: {schema: ScalingGuidanceOutputSchema},
  prompt: `You are an expert in scaling web applications, especially those built with Next.js and Firebase. 
Given the Faculty Connect application, which allows students to select faculty members for different subjects,
provide scaling recommendations to handle 300 concurrent users. Consider Firebase configurations, database optimizations,
and caching strategies. Present the recommendations in a clear, actionable format.

Application Description: A faculty selection application where students choose faculties for their subjects. Each faculty has a limited number of slots. Submissions are locked after selection.

Scaling Recommendations:`, // No Handlebars needed since no input is used.
});

const scalingGuidanceFlow = ai.defineFlow(
  {
    name: 'scalingGuidanceFlow',
    inputSchema: ScalingGuidanceInputSchema,
    outputSchema: ScalingGuidanceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
