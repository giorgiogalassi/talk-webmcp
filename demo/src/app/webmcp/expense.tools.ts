import { WebMcpToolDescriptor, inject, provideExperimentalWebMcpTools } from '@angular/core';
import {
  APP_CURRENCY,
  CATEGORIES,
  ExpenseCategory,
  isExpenseCategory,
} from '../expenses/expense.model';
import { ExpenseDraft, ExpenseDraftState } from '../expenses/expense-draft';
import { ExpenseStore } from '../expenses/expense.store';
import { AgentActivity } from './agent-activity';
import { DescriptionMode, TOOL_TEXT } from './tool-descriptions';

type JsonSchema = Parameters<typeof provideExperimentalWebMcpTools>[0][number]['inputSchema'];
type AnyTool = WebMcpToolDescriptor<JsonSchema>;

/** Keeps each tool's argument types inferred from its own `inputSchema`. */
const defineTool = <const S extends JsonSchema>(tool: WebMcpToolDescriptor<S>) =>
  tool as unknown as AnyTool;

const categoryParam = (mode: DescriptionMode, description: string) =>
  mode === 'precise'
    ? ({ type: 'string', enum: [...CATEGORIES], description } as const)
    : ({ type: 'string' } as const);

/**
 * The service-backed tools. Same `execute` code in both modes: only the words (and the enum)
 * the agent sees change. Every `execute` runs in the environment injector's context, so plain
 * `inject()` reaches the same DI-scoped services, and the same signals, the UI renders from.
 */
export function expenseTools(mode: DescriptionMode): AnyTool[] {
  const text = TOOL_TEXT[mode];

  return [
    defineTool({
      name: 'getVisibleExpenses',
      description: text.getVisibleExpenses,
      inputSchema: {
        type: 'object',
        properties: {
          category: categoryParam(mode, 'Optional. Only return expenses in this category.'),
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: ({ category }) => {
        const store = inject(ExpenseStore); // injection context: this is the app's live store
        inject(AgentActivity).record('getVisibleExpenses', { category });

        if (category !== undefined && !isExpenseCategory(category)) {
          return unknownCategory(category);
        }
        const rows = category ? store.visible().filter((e) => e.category === category) : store.visible();
        return JSON.stringify({ currency: APP_CURRENCY, filterOnScreen: store.filter(), expenses: rows });
      },
    }),

    defineTool({
      name: 'getSpendingSummary',
      description: text.getSpendingSummary,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true },
      execute: () => {
        const store = inject(ExpenseStore);
        inject(AgentActivity).record('getSpendingSummary', {});
        return JSON.stringify({
          currency: APP_CURRENCY,
          total: store.grandTotal(),
          byCategory: store.totalsByCategory(),
        });
      },
    }),

    defineTool({
      name: 'filterDashboard',
      description: text.filterDashboard,
      inputSchema: {
        type: 'object',
        properties: {
          category:
            mode === 'precise'
              ? ({
                  type: 'string',
                  enum: ['all', ...CATEGORIES],
                  description: 'The category to show, or "all" to clear the filter.',
                } as const)
              : ({ type: 'string' } as const),
        },
        required: ['category'],
        additionalProperties: false,
      },
      execute: ({ category }) => {
        const store = inject(ExpenseStore);
        inject(AgentActivity).record('filterDashboard', { category });

        if (category !== 'all' && !isExpenseCategory(category)) {
          return unknownCategory(category, true);
        }
        store.filter.set(category); // the same signal the filter buttons write
        return `The dashboard now shows ${category === 'all' ? 'all categories' : category} (${store.visible().length} expenses).`;
      },
    }),

    defineTool({
      name: 'prefillExpenseForm',
      description: text.prefillExpenseForm,
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the expense was for.' },
          amount: { type: 'number', description: `Amount in ${APP_CURRENCY}.` },
          category: categoryParam(mode, 'Expense category.'),
          date: { type: 'string', description: 'YYYY-MM-DD.' },
        },
        additionalProperties: false,
      },
      execute: (args) => {
        inject(AgentActivity).record('prefillExpenseForm', args);
        // Copy known fields only; validation happens when the human presses "Add expense".
        const draft: Partial<ExpenseDraft> = {};
        if (typeof args.description === 'string') draft.description = args.description;
        if (typeof args.amount === 'number') draft.amount = args.amount;
        if (isExpenseCategory(args.category)) draft.category = args.category as ExpenseCategory;
        if (typeof args.date === 'string') draft.date = args.date;
        inject(ExpenseDraftState).stage(draft);
        return 'The draft is in the "Add expense" form. Nothing is saved yet: ask the user to review it and press "Add expense".';
      },
    }),
  ];
}

function unknownCategory(value: unknown, allowAll = false): string {
  const allowed = [...(allowAll ? ['all'] : []), ...CATEGORIES].join(', ');
  return `Error: unknown category ${JSON.stringify(value)}. Use one of: ${allowed}.`;
}
