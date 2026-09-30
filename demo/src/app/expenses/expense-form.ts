import { Component, InjectionToken, inject } from '@angular/core';
import { FormField, FormOptions, FormRoot, form } from '@angular/forms/signals';
import { APP_CURRENCY, CATEGORIES, CATEGORY_LABELS, MAX_EXPENSE_AMOUNT } from './expense.model';
import { ExpenseDraft, ExpenseDraftState, expenseDraftSchema } from './expense-draft';
import { ExpenseStore } from './expense.store';

export type ExpenseFormAgentTool = NonNullable<FormOptions<ExpenseDraft>['experimentalWebMcpTool']>;

/**
 * Optional hook: when something provides this token, the form opts in as an agent tool.
 * The component itself knows nothing about WebMCP; remove the provider and it is a plain form.
 * (On the slide this is written inline: `form(model, schema, { experimentalWebMcpTool: {...} })`.)
 */
export const EXPENSE_FORM_AGENT_TOOL = new InjectionToken<ExpenseFormAgentTool>(
  'EXPENSE_FORM_AGENT_TOOL',
);

@Component({
  selector: 'app-expense-form',
  imports: [FormRoot, FormField],
  templateUrl: './expense-form.html',
  styleUrl: './expense-form.css',
})
export class ExpenseFormComponent {
  private readonly store = inject(ExpenseStore);
  private readonly draftState = inject(ExpenseDraftState);

  protected readonly categories = CATEGORIES;
  protected readonly labels = CATEGORY_LABELS;
  protected readonly currency = APP_CURRENCY;
  protected readonly maxAmount = MAX_EXPENSE_AMOUNT;

  protected readonly expenseForm = form(this.draftState.draft, expenseDraftSchema, {
    experimentalWebMcpTool: inject(EXPENSE_FORM_AGENT_TOOL, { optional: true }) ?? undefined,
    submission: {
      // The one submit handler. The <form> submit button and the agent tool both land here,
      // and only after the validators above have passed.
      action: async (field) => {
        const { description, amount, category, date } = field().value();
        // Copy known fields only: an agent may send extra properties, and Angular passes them through.
        this.store.add({ description: description.trim(), amount, category, date });
        this.draftState.reset();
        field().reset();
        return undefined;
      },
      // Don't let a submission slip through while an async validator is still pending.
      ignoreValidators: 'none',
    },
  });
}
