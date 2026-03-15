'use server';
/**
 * @fileOverview A Genkit flow for extracting salon appointment details from natural language requests.
 *
 * - extractAppointmentDetails - A function that processes a natural language request to extract appointment information.
 * - NaturalLanguageAppointmentBookingInput - The input type for the extractAppointmentDetails function.
 * - NaturalLanguageAppointmentBookingOutput - The return type for the extractAppointmentDetails function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const NaturalLanguageAppointmentBookingInputSchema = z.object({
  request: z
    .string()
    .describe('The natural language appointment request from the client.'),
  currentDate: z
    .string()
    .describe(
      'The current date in YYYY-MM-DD format (e.g., "2024-07-20"), to help resolve relative dates like "tomorrow" or "next Tuesday".'
    ),
  prefilledClientName: z
    .string()
    .optional()
    .describe('Pre-filled client name from the user session, if available.'),
  prefilledClientPhone: z
    .string()
    .optional()
    .describe('Pre-filled client phone number from the user session, if available.'),
});
export type NaturalLanguageAppointmentBookingInput = z.infer<
  typeof NaturalLanguageAppointmentBookingInputSchema
>;

const NaturalLanguageAppointmentBookingOutputSchema = z.object({
  service: z
    .string()
    .describe(
      'The type of salon service requested (e.g., "women\'s haircut", "manicure", "full highlights").'
    ),
  date: z
    .string()
    .optional()
    .describe(
      'The requested date for the appointment in YYYY-MM-DD format (e.g., "2024-07-25"). If only a relative date is given (e.g., "next Tuesday"), provide an estimated concrete date based on the `currentDate` provided. If the year is not specified, assume the current year.'
    ),
  time: z
    .string()
    .optional()
    .describe(
      'The requested time for the appointment in HH:MM (24-hour) format (e.g., "10:00", "14:30").'
    ),
  stylist: z
    .string()
    .optional()
    .describe('The name of the preferred stylist, if mentioned (e.g., "Sarah", "John").'),
  clientName: z
    .string()
    .optional()
    .describe(
      'The name of the client making the booking, if explicitly mentioned in the natural language request.'
    ),
  clientPhone: z
    .string()
    .optional()
    .describe(
      'The phone number of the client, if explicitly mentioned in the natural language request.'
    ),
  additionalNotes: z
    .string()
    .optional()
    .describe('Any other relevant details or specific requests from the client.'),
});
export type NaturalLanguageAppointmentBookingOutput = z.infer<
  typeof NaturalLanguageAppointmentBookingOutputSchema
>;

export async function extractAppointmentDetails(
  input: NaturalLanguageAppointmentBookingInput
): Promise<NaturalLanguageAppointmentBookingOutput> {
  const output = await naturalLanguageAppointmentBookingFlow(input);
  // Merge pre-filled data if not extracted by the LLM
  return {
    ...output,
    clientName: output?.clientName || input.prefilledClientName,
    clientPhone: output?.clientPhone || input.prefilledClientPhone,
  };
}

const prompt = ai.definePrompt({
  name: 'naturalLanguageAppointmentBookingPrompt',
  input: { schema: NaturalLanguageAppointmentBookingInputSchema },
  output: { schema: NaturalLanguageAppointmentBookingOutputSchema },
  prompt: `You are an intelligent assistant for a salon appointment booking system.\nYour primary goal is to extract key appointment details from a client's natural language request.\n\nFollow these instructions carefully:\n1.  **Extract Service**: Identify the primary salon service requested (e.g., "women's haircut", "manicure", "full highlights"). This field is mandatory. If no specific service is identified, infer a common salon service or state "general service".\n2.  **Extract Date**: Determine the requested date for the appointment.\n    - Convert any relative dates (e.g., "tomorrow", "next Tuesday", "in two weeks") into a concrete date in 'YYYY-MM-DD' format.\n    - Use the provided 'currentDate' ({{{currentDate}}}) as the reference point for resolving relative dates.\n    - If a specific year is not mentioned, assume the current year.\n    - If no date is mentioned, omit this field.\n3.  **Extract Time**: Determine the requested time for the appointment.\n    - Convert it to 'HH:MM' (24-hour) format (e.g., "10:00", "14:30").\n    - If no specific time is mentioned, omit this field.\n4.  **Extract Stylist**: Identify the name of the preferred stylist if explicitly mentioned in the request. If no stylist is mentioned, omit this field.\n5.  **Extract Client Name**: Identify the name of the client making the booking, if explicitly mentioned in the natural language request. If not mentioned, omit this field.\n6.  **Extract Client Phone**: Identify the phone number of the client, if explicitly mentioned in the natural language request. If not mentioned, omit this field.\n7.  **Extract Additional Notes**: Capture any other specific requests or details the client provides that don't fit into the above categories. If no additional notes, omit this field.\n\n**Natural Language Request**: {{{request}}}`
});

const naturalLanguageAppointmentBookingFlow = ai.defineFlow(
  {
    name: 'naturalLanguageAppointmentBookingFlow',
    inputSchema: NaturalLanguageAppointmentBookingInputSchema,
    outputSchema: NaturalLanguageAppointmentBookingOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
