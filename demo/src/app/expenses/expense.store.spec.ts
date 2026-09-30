import { TestBed } from '@angular/core/testing';
import { ExpenseStore } from './expense.store';

describe('ExpenseStore', () => {
  let store: ExpenseStore;
  beforeEach(() => (store = TestBed.inject(ExpenseStore)));

  it('computes totals from the seed data', () => {
    expect(store.grandTotal()).toBe(625.4);
    expect(store.totalsByCategory().find((t) => t.category === 'transport')).toEqual({
      category: 'transport',
      count: 2,
      total: 124.4,
    });
  });

  it('filters the visible list and its total', () => {
    store.filter.set('transport');
    expect(store.visible().map((e) => e.id)).toEqual(['e2', 'e3']);
    expect(store.visibleTotal()).toBe(124.4);
  });

  it('adds and removes expenses', () => {
    const created = store.add({ description: 'Coffee', amount: 4.5, category: 'meals', date: '2026-09-30' });
    expect(store.expenses()[0]).toEqual(created);
    store.remove(created.id);
    expect(store.expenses().length).toBe(5);
  });
});
