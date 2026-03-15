'use server';
/**
 * @fileOverview An AI agent that provides a daily appointment summary for administrators.
 *
 * - adminDailyAppointmentSummary - A function that fetches daily appointments and generates a summary.
 * - AdminDailyAppointmentSummaryInput - The input type for the adminDailyAppointmentSummary function.
 * - AdminDailyAppointmentSummaryOutput - The return type for the adminDailyAppointmentSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Schemas ---

const AdminDailyAppointmentSummaryInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('The date for which to summarize appointments, in YYYY-MM-DD format.'),
  appointments: z.array(z.any()).describe('The array of appointment objects for the day.'),
});
export type AdminDailyAppointmentSummaryInput = z.infer<typeof AdminDailyAppointmentSummaryInputSchema>;

const AdminDailyAppointmentSummaryOutputSchema = z.object({
  summary: z.string().describe('A concise, AI-generated summary of the day\'s appointments.'),
});
export type AdminDailyAppointmentSummaryOutput = z.infer<typeof AdminDailyAppointmentSummaryOutputSchema>;

// --- Prompt Definition ---

const adminDailyAppointmentSummaryPrompt = ai.definePrompt({
  name: 'adminDailyAppointmentSummaryPrompt',
  input: {
    schema: z.object({
      date: z.string().describe('The date of the appointments.'),
      appointmentsData: z.string().describe('A JSON string representation of the day\'s appointments.'),
      totalAppointments: z.number().describe('The total number of appointments for the day.'),
      serviceBreakdown: z.record(z.string(), z.number()).describe('An object detailing the count of each service booked.'),
    }),
  },
  output: { schema: AdminDailyAppointmentSummaryOutputSchema },
  prompt: `You are an assistant for a salon administrator. Your task is to provide a concise summary of the day's appointments.

Date: {{{date}}}

Here are the raw appointments for the day:
{{{appointmentsData}}}

Total appointments: {{{totalAppointments}}}

Service breakdown:
{{#each serviceBreakdown}}
- {{{@key}}}: {{{this}}}
{{/each}}

Based on the provided data, generate a summary that includes:
1. The total number of bookings.
2. A clear breakdown of services booked today.
3. Any notable patterns or observations (e.g., busy times, popular services, unusually high/low booking numbers).

The summary should be easy to read and provide a quick overview for an administrator.`,
});

// --- Flow Definition ---

const adminDailyAppointmentSummaryFlow = ai.defineFlow(
  {
    name: 'adminDailyAppointmentSummaryFlow',
    inputSchema: AdminDailyAppointmentSummaryInputSchema,
    outputSchema: AdminDailyAppointmentSummaryOutputSchema,
  },
  async (input) => {
    const { date, appointments } = input;

    // 1. Process data for the prompt
    const totalAppointments = appointments.length;
    const serviceBreakdown: Record<string, number> = {};
    appointments.forEach((appointment: any) => {
      const service = appointment.service || 'Unknown';
      serviceBreakdown[service] = (serviceBreakdown[service] || 0) + 1;
    });

    const appointmentsData = JSON.stringify(appointments, null, 2);

    // 2. Call the prompt to generate the summary
    const { output } = await adminDailyAppointmentSummaryPrompt({
      date,
      appointmentsData,
      totalAppointments,
      serviceBreakdown,
    });

    if (!output) {
      throw new Error('Failed to generate daily appointment summary.');
    }

    return output;
  }
);

// --- Exported Wrapper Function ---

export async function adminDailyAppointmentSummary(input: AdminDailyAppointmentSummaryInput): Promise<AdminDailyAppointmentSummaryOutput> {
  return adminDailyAppointmentSummaryFlow(input);
}
