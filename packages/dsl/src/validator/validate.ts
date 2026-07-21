import { validateDocument } from '../documentModel/validateDocument';

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates canonical normalized documents only.
 */
export function validate(doc: unknown): ValidationResult {
  return validateDocument(doc);
}
