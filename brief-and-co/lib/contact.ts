// Shared by the contact form (client) and the API route (server).

export type BriefInput = {
  name: string;
  company: string;
  email: string;
  type: string;
  message: string;
  budget: string;
  timeline: string;
};

export type BriefErrors = Partial<Record<"name" | "email" | "message", "required" | "format">>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBrief(input: Partial<BriefInput>): BriefErrors {
  const errors: BriefErrors = {};
  if (!input.name?.trim()) errors.name = "required";
  if (!input.email?.trim()) errors.email = "required";
  else if (!EMAIL.test(input.email.trim())) errors.email = "format";
  if (!input.message?.trim()) errors.message = "required";
  return errors;
}
