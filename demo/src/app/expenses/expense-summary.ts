import { Component, computed, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { APP_CURRENCY, CATEGORY_LABELS } from './expense.model';
import { ExpenseStore } from './expense.store';

@Component({
  selector: 'app-expense-summary',
  imports: [CurrencyPipe],
  template: `
    <section class="card">
      <h2>Total spent</h2>
      <p class="grand">{{ store.grandTotal() | currency: currency }}</p>
      <ul>
        @for (t of store.totalsByCategory(); track t.category) {
          <li>
            <span class="label">{{ labels[t.category] }} <small>({{ t.count }})</small></span>
            <span class="bar"><span [style.width.%]="share(t.total)"></span></span>
            <span class="num">{{ t.total | currency: currency }}</span>
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    h2 { margin: 0; font-size: 1.05rem; }
    .grand { font-size: 2rem; font-weight: 700; margin: 0.3rem 0 1rem; font-variant-numeric: tabular-nums; }
    ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 0.6rem; }
    li { display: grid; grid-template-columns: 9rem 1fr 6rem; align-items: center; gap: 0.6rem; font-size: 0.88rem; }
    small { color: var(--muted); }
    .bar { height: 6px; background: var(--chip); border-radius: 3px; overflow: hidden; }
    .bar span { display: block; height: 100%; background: var(--accent); transition: width 0.3s; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
  `,
})
export class ExpenseSummaryComponent {
  protected readonly store = inject(ExpenseStore);
  protected readonly labels = CATEGORY_LABELS;
  protected readonly currency = APP_CURRENCY;
  private readonly max = computed(() => Math.max(1, ...this.store.totalsByCategory().map((t) => t.total)));
  protected share = (total: number) => (total / this.max()) * 100;
}
