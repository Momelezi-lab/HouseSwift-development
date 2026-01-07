/**
 * Input validation and sanitization utilities
 */

export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input.trim().replace(/[<>]/g, '');
}

export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  // Remove all non-digit characters except +
  return phone.replace(/[^\d+]/g, '');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // South African phone numbers: 10 digits (starting with 0) or 11 digits (starting with +27)
  const cleaned = phone.replace(/[^\d+]/g, '');
  return /^(\+27|0)\d{9}$/.test(cleaned);
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  return { valid: true };
}

export function sanitizeHtml(input: string): string {
  if (!input) return '';
  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '').trim();
}

export function validateDate(dateString: string): { valid: boolean; date?: Date; error?: string } {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
    return { valid: false, error: 'Date cannot be in the past' };
  }
  return { valid: true, date };
}

export function validateTime(timeString: string): { valid: boolean; error?: string } {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeString)) {
    return { valid: false, error: 'Invalid time format. Use HH:MM format' };
  }
  return { valid: true };
}

export function sanitizeNumber(input: string | number | null | undefined): number {
  if (typeof input === 'number') return input;
  if (!input) return 0;
  const num = parseFloat(input.toString());
  return isNaN(num) ? 0 : num;
}

export function validateQuantity(quantity: number | string): { valid: boolean; value?: number; error?: string } {
  const num = typeof quantity === 'string' ? parseInt(quantity) : quantity;
  if (isNaN(num) || num < 1) {
    return { valid: false, error: 'Quantity must be at least 1' };
  }
  if (num > 10) {
    return { valid: false, error: 'Quantity cannot exceed 10' };
  }
  return { valid: true, value: num };
}

