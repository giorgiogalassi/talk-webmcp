import { APP_CURRENCY, CATEGORIES, MAX_EXPENSE_AMOUNT } from '../expenses/expense.model';

/**
 * Tool descriptions are part of the agent's prompt, not documentation for humans.
 * Two sets, same code behind them: open the app with `?descriptions=sloppy` to hand the agent
 * the left column instead of the right one, and compare what it does.
 */
export type DescriptionMode = 'precise' | 'sloppy';

const categories = CATEGORIES.join(', ');

export const TOOL_TEXT: Record<
  DescriptionMode,
  Record<'getVisibleExpenses' | 'getSpendingSummary' | 'filterDashboard' | 'prefillExpenseForm' | 'addExpense', string>
> = {
  sloppy: {
    getVisibleExpenses: 'Gets expenses.',
    getSpendingSummary: 'Summary.',
    filterDashboard: 'Filter.',
    prefillExpenseForm: 'Prefill the form.',
    addExpense: 'Expense form.',
  },
  precise: {
    getVisibleExpenses:
      `Returns the expenses currently listed in the user's expense dashboard as JSON ` +
      `(description, amount in ${APP_CURRENCY}, category, date YYYY-MM-DD). ` +
      `Respects the category filter the user selected on screen. Read-only. ` +
      `Categories: accommodation (hotels, rentals), transport (trains, taxis, flights, fuel), ` +
      `meals (restaurants, food, drinks), equipment (hardware, gadgets).`,
    getSpendingSummary:
      `Returns total spend and per-category totals (count and sum in ${APP_CURRENCY}) across all ` +
      `expenses, ignoring the on-screen filter. Read-only. Prefer this over getVisibleExpenses ` +
      `for "how much did I spend" questions.`,
    filterDashboard:
      `Changes which category the user sees in the expense table (the same filter as the ` +
      `buttons above the table). Use it when the user asks to see or show a category; ` +
      `"all" clears the filter. Changes only the view, never data.`,
    prefillExpenseForm:
      `Fills in the "Add expense" form on screen so the user can review it. Saves nothing: ` +
      `the user must press "Add expense". Prefer this over addExpense unless the user has ` +
      `explicitly confirmed the description, amount, category and date.`,
    addExpense:
      `Adds an expense to the user's dashboard and saves it immediately. Only call it when the ` +
      `user explicitly asked to add or record an expense and gave the amount. ` +
      `Fields: description (what it was for, max 80 characters); ` +
      `amount (a number in ${APP_CURRENCY}, greater than 0, at most ${MAX_EXPENSE_AMOUNT}; ` +
      `larger amounts need manager approval, never split them); ` +
      `category (exactly one of: ${categories}); ` +
      `date (YYYY-MM-DD, not in the future). ` +
      `If the result says the submission failed, fix the listed fields and retry once, otherwise ask the user.`,
  },
};
