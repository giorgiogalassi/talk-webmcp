import { TestBed } from '@angular/core/testing';
import { ExpenseFormComponent } from './expense-form';
import { ExpenseStore } from './expense.store';

describe('ExpenseFormComponent (human path)', () => {
  it('adds a valid expense through the submit handler and resets the draft', async () => {
    const fixture = TestBed.createComponent(ExpenseFormComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(ExpenseStore);

    const set = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('input[type=text]', 'Airport shuttle');
    set('input[type=number]', '18');
    set('select', 'transport');
    set('input[type=date]', '2026-09-01');
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(store.expenses()[0]).toMatchObject({
      description: 'Airport shuttle',
      amount: 18,
      category: 'transport',
      date: '2026-09-01',
    });
    expect((el.querySelector('input[type=text]') as HTMLInputElement).value).toBe('');
  });

  it('blocks an invalid submission and shows the validator message', async () => {
    const fixture = TestBed.createComponent(ExpenseFormComponent);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(TestBed.inject(ExpenseStore).expenses().length).toBe(5);
    expect(el.textContent).toContain('Describe what the expense was for.');
  });
});
