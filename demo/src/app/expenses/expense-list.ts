import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { APP_CURRENCY, CATEGORIES, CATEGORY_LABELS } from './expense.model';
import { CategoryFilter, ExpenseStore } from './expense.store';

@Component({
  selector: 'app-expense-list',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseListComponent {
  protected readonly store = inject(ExpenseStore);
  protected readonly filters: CategoryFilter[] = ['all', ...CATEGORIES];
  protected readonly labels: Record<CategoryFilter, string> = { all: 'All', ...CATEGORY_LABELS };
  protected readonly currency = APP_CURRENCY;
}
