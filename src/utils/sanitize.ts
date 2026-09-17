/**
 * Input sanitization & validation utility for AKRA
 * Protects against XSS, null bytes, excessive payloads, and empty submissions
 * while fully preserving emojis, international characters, and line breaks.
 */

export interface ValidationResult<T = string> {
  isValid: boolean;
  value: T;
  error?: string;
}

/**
 * Strips dangerous HTML tags, scripts, null bytes, and non-printable control characters.
 * Preserves standard newlines (\n, \r), tabs, and unicode/emojis.
 */
export function sanitizeText(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes and dangerous control characters (except tab, LF, CR)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Strip direct <script> ... </script> blocks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Strip dangerous javascript: URI protocols
    .replace(/javascript:/gi, '')
    // Strip on* event attributes (e.g. onerror=, onclick=)
    .replace(/\bon\w+\s*=/gi, '');
}

/**
 * Validates and sanitizes a required string field.
 */
export function validateString(
  input: unknown,
  options: {
    fieldName: string;
    minLength?: number;
    maxLength?: number;
    required?: boolean;
  }
): ValidationResult<string> {
  const { fieldName, minLength = 1, maxLength = 1000, required = true } = options;
  const raw = typeof input === 'string' ? input : '';
  const sanitized = sanitizeText(raw).trim();

  if (required && sanitized.length === 0) {
    return {
      isValid: false,
      value: '',
      error: `${fieldName} cannot be empty.`,
    };
  }

  if (sanitized.length < minLength && required) {
    return {
      isValid: false,
      value: sanitized,
      error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}.`,
    };
  }

  if (sanitized.length > maxLength) {
    return {
      isValid: false,
      value: sanitized.slice(0, maxLength),
      error: `${fieldName} exceeds maximum length of ${maxLength} characters (currently ${sanitized.length}).`,
    };
  }

  return {
    isValid: true,
    value: sanitized,
  };
}

/**
 * Validates Chat Messages:
 * - 1 to 2000 characters
 * - Trim whitespace
 * - No empty messages
 */
export function validateChatMessage(text: unknown): ValidationResult<string> {
  return validateString(text, {
    fieldName: 'Message',
    minLength: 1,
    maxLength: 2000,
    required: true,
  });
}

/**
 * Validates Letters:
 * - Title: 1 to 150 characters
 * - Content: 1 to 5000 characters
 */
export function validateLetterInput(
  title: unknown,
  content: unknown
): { isValid: boolean; title: string; content: string; error?: string } {
  const titleVal = validateString(title, {
    fieldName: 'Letter title',
    minLength: 1,
    maxLength: 150,
    required: true,
  });
  if (!titleVal.isValid) {
    return { isValid: false, title: '', content: '', error: titleVal.error };
  }

  const contentVal = validateString(content, {
    fieldName: 'Letter content',
    minLength: 1,
    maxLength: 5000,
    required: true,
  });
  if (!contentVal.isValid) {
    return { isValid: false, title: titleVal.value, content: '', error: contentVal.error };
  }

  return {
    isValid: true,
    title: titleVal.value,
    content: contentVal.value,
  };
}

/**
 * Validates Timeline Milestones:
 * - Title: 1 to 120 characters
 * - Description: up to 1000 characters
 * - Date: valid string
 */
export function validateTimelineInput(
  title: unknown,
  description: unknown,
  dateStr?: unknown
): { isValid: boolean; title: string; description: string; date: string; error?: string } {
  const titleVal = validateString(title, {
    fieldName: 'Event title',
    minLength: 1,
    maxLength: 120,
    required: true,
  });
  if (!titleVal.isValid) {
    return { isValid: false, title: '', description: '', date: '', error: titleVal.error };
  }

  const descVal = validateString(description, {
    fieldName: 'Event description',
    minLength: 0,
    maxLength: 1000,
    required: false,
  });
  if (!descVal.isValid) {
    return { isValid: false, title: titleVal.value, description: '', date: '', error: descVal.error };
  }

  const cleanDate = typeof dateStr === 'string' && dateStr.trim().length > 0
    ? dateStr.trim()
    : new Date().toISOString().split('T')[0];

  return {
    isValid: true,
    title: titleVal.value,
    description: descVal.value,
    date: cleanDate,
  };
}

/**
 * Validates Bucket List / Future items:
 * - Title: 1 to 140 characters
 * - Notes/Details: up to 1000 characters
 */
export function validateBucketListInput(
  title: unknown,
  notes?: unknown,
  category?: unknown
): { isValid: boolean; title: string; notes: string; category: string; error?: string } {
  const titleVal = validateString(title, {
    fieldName: 'Dream title',
    minLength: 1,
    maxLength: 140,
    required: true,
  });
  if (!titleVal.isValid) {
    return { isValid: false, title: '', notes: '', category: 'travel', error: titleVal.error };
  }

  const notesVal = validateString(notes, {
    fieldName: 'Notes',
    minLength: 0,
    maxLength: 1000,
    required: false,
  });
  if (!notesVal.isValid) {
    return { isValid: false, title: titleVal.value, notes: '', category: 'travel', error: notesVal.error };
  }

  const catVal = validateString(category || 'travel', {
    fieldName: 'Category',
    minLength: 1,
    maxLength: 50,
    required: false,
  });

  return {
    isValid: true,
    title: titleVal.value,
    notes: notesVal.value,
    category: catVal.value || 'travel',
  };
}

/**
 * Validates Memory entry:
 * - Title: 1 to 120 characters
 * - Story/Description: up to 2000 characters
 */
export function validateMemoryInput(
  title: unknown,
  story?: unknown,
  location?: unknown
): { isValid: boolean; title: string; story: string; location: string; error?: string } {
  const titleVal = validateString(title, {
    fieldName: 'Memory title',
    minLength: 1,
    maxLength: 120,
    required: true,
  });
  if (!titleVal.isValid) {
    return { isValid: false, title: '', story: '', location: '', error: titleVal.error };
  }

  const storyVal = validateString(story, {
    fieldName: 'Memory story',
    minLength: 0,
    maxLength: 2000,
    required: false,
  });
  if (!storyVal.isValid) {
    return { isValid: false, title: titleVal.value, story: '', location: '', error: storyVal.error };
  }

  const locVal = validateString(location, {
    fieldName: 'Location',
    minLength: 0,
    maxLength: 100,
    required: false,
  });

  return {
    isValid: true,
    title: titleVal.value,
    story: storyVal.value,
    location: locVal.value,
  };
}
