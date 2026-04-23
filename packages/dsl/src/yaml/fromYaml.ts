import yaml from 'js-yaml';
import { validate } from '../validator/validate';
import type { ElucimDocument } from '../schema/types';
import type { ValidationError } from '../validator/validate';

/**
 * Parse a YAML string into a validated ElucimDocument.
 *
 * Uses JSON-compatible schema to avoid YAML-specific type coercions
 * (e.g., `on` → `true`, `NO` → `false`). All values remain strings,
 * numbers, booleans, arrays, or objects — exactly what the DSL expects.
 *
 * @throws {ElucimYamlError} if YAML parsing fails or validation produces errors.
 */
export function fromYaml(input: string): ElucimDocument {
  let parsed: unknown;
  try {
    parsed = yaml.load(input, { schema: yaml.JSON_SCHEMA });
  } catch (e: any) {
    throw new ElucimYamlError(`YAML parse error: ${e.message}`, []);
  }

  if (parsed == null || typeof parsed !== 'object') {
    throw new ElucimYamlError('YAML must be an object with version and root', []);
  }

  const doc = parsed as ElucimDocument;
  const result = validate(doc);
  const errors = result.errors.filter(e => e.severity === 'error');

  if (errors.length > 0) {
    throw new ElucimYamlError(
      `Invalid Elucim document:\n${errors.map(e => `  - ${e.message}`).join('\n')}`,
      errors,
    );
  }

  return doc;
}

/**
 * Error thrown by `fromYaml()` when parsing or validation fails.
 * Includes structured validation errors for programmatic access.
 */
export class ElucimYamlError extends Error {
  public readonly validationErrors: ValidationError[];

  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'ElucimYamlError';
    this.validationErrors = errors;
  }
}
