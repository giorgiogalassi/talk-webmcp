import { EnvironmentProviders, makeEnvironmentProviders, provideExperimentalWebMcpTools } from '@angular/core';
import { provideExperimentalWebMcpForms } from '@angular/forms/signals';
import { EXPENSE_FORM_AGENT_TOOL } from '../expenses/expense-form';
import { expenseTools } from './expense.tools';
import { DescriptionMode, TOOL_TEXT } from './tool-descriptions';

/**
 * The whole WebMCP layer, in one provider. Delete this call from `app.config.ts` and the
 * dashboard is a plain Angular app again: same store, same form, same validators.
 */
export function provideExpenseWebMcp(mode: DescriptionMode = 'precise'): EnvironmentProviders {
  return makeEnvironmentProviders([
    // 1. Services as tools. execute() runs in this (root) injector's context.
    provideExperimentalWebMcpTools(expenseTools(mode)),

    // 2. Signal Forms as tools: app-wide switch. Exposes nothing by itself...
    provideExperimentalWebMcpForms(),

    // ...each form opts in with `experimentalWebMcpTool` on form(). Our form reads it from here.
    {
      provide: EXPENSE_FORM_AGENT_TOOL,
      useValue: {
        name: 'addExpense',
        description: TOOL_TEXT[mode].addExpense,
        annotations: { consequentialHint: true },
      },
    },
  ]);
}

/** `?descriptions=sloppy` swaps in the sloppy tool descriptions for the side-by-side demo. */
export function descriptionModeFromUrl(search = globalThis.location?.search ?? ''): DescriptionMode {
  return new URLSearchParams(search).get('descriptions') === 'sloppy' ? 'sloppy' : 'precise';
}
