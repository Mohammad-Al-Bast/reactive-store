import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z, type ZodType } from 'zod';

/**
 * Validates a request part (body, query, params) against a shared Zod schema and
 * returns the parsed value. Usage: `@Body(new ZodValidationPipe(schema))`.
 */
export class ZodValidationPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        issues: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}
