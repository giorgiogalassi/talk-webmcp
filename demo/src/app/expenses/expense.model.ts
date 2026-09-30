/**
 * Expense domain model. Plain TypeScript, no Angular, no WebMCP: reusable as-is by any UI
 * (this dashboard, the A2UI talk, tests).
 */
export const ExpenseCategory = {
  Accommodation: 'accommodation',
  Transport: 'transport',
  Meals: 'meals',
  Equipment: 'equipment',
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

/** Single source of truth for the allowed categories (UI options, validators, tool schemas). */
export const CATEGORIES: readonly ExpenseCategory[] = Object.values(ExpenseCategory);

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  accommodation: 'Accommodation',
  transport: 'Transport',
  meals: 'Meals',
  equipment: 'Equipment',
};

/** Every amount in the app is in this currency; there is no per-expense currency on purpose. */
export const APP_CURRENCY = 'EUR';

/** Business rule shared by humans and agents: above this, it's a manager's call. */
export const MAX_EXPENSE_AMOUNT = 5000;

export interface Expense {
  id: string;
  description: string;
  /** In {@link APP_CURRENCY}. */
  amount: number;
  category: ExpenseCategory;
  /** ISO calendar date, `YYYY-MM-DD`. A string, not a `Date`: see the forms-schema spike. */
  date: string;
}

export interface CategoryTotal {
  category: ExpenseCategory;
  count: number;
  total: number;
}

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value);
}

export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
