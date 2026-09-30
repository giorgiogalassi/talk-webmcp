import { Service, signal } from '@angular/core';
import { max, maxLength, min, pattern, required, schema, validate } from '@angular/forms/signals';
import {
  APP_CURRENCY,
  CATEGORIES,
  ExpenseCategory,
  MAX_EXPENSE_AMOUNT,
  isExpenseCategory,
  todayIso,
} from './expense.model';

/**
 * The "add expense" form model. Deliberately flat and primitive-only (string/number):
 * Signal Forms derives a WebMCP JSON schema from the *runtime value* of this model, and it
 * cannot describe `Date`, `null`, `undefined` or empty arrays. See
 * `webmcp/forms-schema.spike.spec.ts` and IMPLEMENTATION-PLAN.md.
 */
export interface ExpenseDraft {
  description: string;
  amount: number;
  category: ExpenseCategory;
  /** `YYYY-MM-DD` */
  date: string;
}

export const emptyDraft = (): ExpenseDraft => ({
  description: '',
  amount: 0,
  category: 'meals',
  date: todayIso(),
});

/**
 * Validation rules. They are the ONLY thing standing between the input and the store, for
 * humans and agents alike: Angular does not check agent arguments against the tool's JSON
 * schema, so types, enums and formats are enforced here. Every `message` is also what an
 * agent reads back when its submission fails, so they are written to be actionable.
 */
export const expenseDraftSchema = schema<ExpenseDraft>((p) => {
  required(p.description, { message: 'Describe what the expense was for.' });
  maxLength(p.description, 80, { message: 'Keep the description under 80 characters.' });

  required(p.amount, { message: `Amount is required, in ${APP_CURRENCY}.` });
  validate(p.amount, ({ value }) =>
    typeof value() === 'number' && Number.isFinite(value())
      ? undefined
      : { kind: 'number', message: `Amount must be a JSON number in ${APP_CURRENCY}, e.g. 34.5.` },
  );
  min(p.amount, 0.01, { message: 'Amount must be greater than 0.' });
  max(p.amount, MAX_EXPENSE_AMOUNT, {
    message: `Amounts above ${MAX_EXPENSE_AMOUNT} ${APP_CURRENCY} need manager approval and cannot be added here.`,
  });

  required(p.category, { message: 'Pick a category.' });
  validate(p.category, ({ value }) =>
    isExpenseCategory(value())
      ? undefined
      : { kind: 'category', message: `Category must be one of: ${CATEGORIES.join(', ')}.` },
  );

  required(p.date, { message: 'Date is required.' });
  pattern(p.date, /^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD.' });
  validate(p.date, ({ value }) =>
    value() > todayIso()
      ? { kind: 'futureDate', message: 'Expenses cannot be dated in the future.' }
      : undefined,
  );
});

/**
 * Holds the draft being edited. Living in a service (not the component) lets anything in the
 * app stage a draft for a human to review, e.g. a "prefill" action.
 */
@Service()
export class ExpenseDraftState {
  readonly draft = signal<ExpenseDraft>(emptyDraft());

  stage(partial: Partial<ExpenseDraft>): void {
    this.draft.set({ ...emptyDraft(), ...partial });
  }

  reset(): void {
    this.draft.set(emptyDraft());
  }
}
