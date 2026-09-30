import { Service, computed, signal } from '@angular/core';
import {
  CATEGORIES,
  CategoryTotal,
  Expense,
  ExpenseCategory,
} from './expense.model';

export type CategoryFilter = ExpenseCategory | 'all';

export type NewExpense = Omit<Expense, 'id'>;

/**
 * Signals-based state for the dashboard. The UI reads it, the form writes to it, and (in the
 * WebMCP layer) agent tools read and write the very same signals. There is no second copy.
 */
@Service()
export class ExpenseStore {
  private readonly _expenses = signal<Expense[]>([
    { id: 'e1', description: 'Hotel Zurich, 2 nights', amount: 380, category: 'accommodation', date: '2026-09-21' },
    { id: 'e2', description: 'Train Milan to Zurich', amount: 89.9, category: 'transport', date: '2026-09-21' },
    { id: 'e3', description: 'Taxi to the venue', amount: 34.5, category: 'transport', date: '2026-09-22' },
    { id: 'e4', description: 'Speaker dinner', amount: 72, category: 'meals', date: '2026-09-22' },
    { id: 'e5', description: 'USB-C presenter clicker', amount: 49, category: 'equipment', date: '2026-09-23' },
  ]);
  private nextId = 6;

  readonly expenses = this._expenses.asReadonly();
  readonly filter = signal<CategoryFilter>('all');

  readonly visible = computed(() => {
    const filter = this.filter();
    const all = this._expenses();
    return filter === 'all' ? all : all.filter((e) => e.category === filter);
  });

  readonly totalsByCategory = computed<CategoryTotal[]>(() =>
    CATEGORIES.map((category) => {
      const items = this._expenses().filter((e) => e.category === category);
      return { category, count: items.length, total: round2(sum(items)) };
    }),
  );

  readonly grandTotal = computed(() => round2(sum(this._expenses())));
  readonly visibleTotal = computed(() => round2(sum(this.visible())));

  add(expense: NewExpense): Expense {
    const created: Expense = { ...expense, id: `e${this.nextId++}` };
    this._expenses.update((list) => [created, ...list]);
    return created;
  }

  remove(id: string): void {
    this._expenses.update((list) => list.filter((e) => e.id !== id));
  }
}

const sum = (items: readonly Expense[]) => items.reduce((acc, e) => acc + e.amount, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
