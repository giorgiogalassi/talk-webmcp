import { TestBed } from '@angular/core/testing';
import { FakeModelContext, installFakeModelContext } from '../../testing/fake-model-context';
import { ExpenseFormComponent } from '../expenses/expense-form';
import { ExpenseDraftState } from '../expenses/expense-draft';
import { ExpenseStore } from '../expenses/expense.store';
import { provideExpenseWebMcp } from './provide-expense-webmcp';
import { TOOL_TEXT } from './tool-descriptions';

describe('WebMCP layer', () => {
  let mc: FakeModelContext;

  async function setup(mode: 'precise' | 'sloppy' = 'precise') {
    mc = installFakeModelContext();
    TestBed.configureTestingModule({ providers: [provideExpenseWebMcp(mode)] });
    const store = TestBed.inject(ExpenseStore); // runs the environment initializers → tools register
    const fixture = TestBed.createComponent(ExpenseFormComponent); // the form opts in as a tool
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    return { store, fixture };
  }

  afterEach(() => mc.uninstall());

  it('registers the service tools and the form tool', async () => {
    await setup();
    expect([...mc.tools.keys()].sort()).toEqual([
      'addExpense',
      'filterDashboard',
      'getSpendingSummary',
      'getVisibleExpenses',
      'prefillExpenseForm',
    ]);
    expect(mc.tools.get('getVisibleExpenses')!.annotations).toEqual({ readOnlyHint: true });
    expect(mc.tools.get('addExpense')!.annotations).toEqual({
      consequentialHint: true,
      readOnlyHint: false,
      untrustedContentHint: false,
    });
  });

  describe('service tools (provideExperimentalWebMcpTools)', () => {
    it('execute() runs in the injector context and reads the live signal state', async () => {
      const { store } = await setup();
      // A human adds an expense and filters the table...
      store.add({ description: 'Parking', amount: 12, category: 'transport', date: '2026-09-29' });
      store.filter.set('transport');
      // ...and the agent sees exactly that, through inject(ExpenseStore) inside execute().
      const result = JSON.parse(await mc.call('getVisibleExpenses'));
      expect(result.filterOnScreen).toBe('transport');
      expect(result.expenses.map((e: { description: string }) => e.description)).toEqual([
        'Parking',
        'Train Milan to Zurich',
        'Taxi to the venue',
      ]);
    });

    it('agent writes go to the same signals the UI renders', async () => {
      const { store } = await setup();
      expect(await mc.call('filterDashboard', { category: 'meals' })).toContain('1 expenses');
      expect(store.filter()).toBe('meals');
    });

    it('unknown categories get an actionable error, not an empty list', async () => {
      await setup();
      expect(await mc.call('getVisibleExpenses', { category: 'travel' })).toBe(
        'Error: unknown category "travel". Use one of: accommodation, transport, meals, equipment.',
      );
    });

    it('prefillExpenseForm stages a draft but saves nothing (human in the loop)', async () => {
      const { store } = await setup();
      await mc.call('prefillExpenseForm', {
        description: 'Team lunch',
        amount: 64,
        category: 'meals',
        date: '2026-09-30',
        approved: true,
      });
      expect(TestBed.inject(ExpenseDraftState).draft()).toEqual({
        description: 'Team lunch',
        amount: 64,
        category: 'meals',
        date: '2026-09-30',
      });
      expect(store.expenses().length).toBe(5);
    });

    it('sloppy mode: same code, vaguer words, no enum', async () => {
      await setup('sloppy');
      const tool = mc.tools.get('getVisibleExpenses')!;
      expect(tool.description).toBe(TOOL_TEXT.sloppy.getVisibleExpenses);
      expect(tool.inputSchema).toEqual({
        type: 'object',
        properties: { category: { type: 'string' } },
        additionalProperties: false,
      });
    });
  });

  describe('form tool (provideExperimentalWebMcpForms + experimentalWebMcpTool)', () => {
    it('derives the schema from the form model', async () => {
      await setup();
      expect(mc.tools.get('addExpense')!.inputSchema).toEqual({
        type: 'object',
        properties: {
          description: { type: 'string' },
          amount: { type: 'number' },
          category: { type: 'string' },
          date: { type: 'string' },
        },
        required: ['description', 'amount', 'category', 'date'],
        additionalProperties: false,
      });
    });

    it('runs the same validators a human hits, and returns their messages', async () => {
      const { store } = await setup();
      const result = await mc.call('addExpense', {
        description: 'Conference ticket',
        amount: 7200,
        category: 'tickets',
        date: '2999-01-01',
      });
      expect(result).toContain('Form submission failed:');
      expect(result).toContain('amount: Amounts above 5000 EUR need manager approval');
      expect(result).toContain('category: Category must be one of: accommodation, transport, meals, equipment.');
      expect(result).toContain('date: Expenses cannot be dated in the future.');
      expect(store.expenses().length).toBe(5);
    });

    it('rejects a string amount even though the schema says number', async () => {
      const { store } = await setup();
      const result = await mc.call('addExpense', {
        description: 'Taxi',
        amount: '12',
        category: 'transport',
        date: '2026-09-01',
      });
      expect(result).toContain('amount: Amount must be a JSON number in EUR');
      expect(store.expenses().length).toBe(5);
    });

    it('a valid call goes through the one submit handler, extra fields dropped', async () => {
      const { store, fixture } = await setup();
      expect(
        await mc.call('addExpense', {
          description: 'Taxi back to the hotel',
          amount: 27.5,
          category: 'transport',
          date: '2026-09-01',
          approvedByManager: true,
        }),
      ).toBe('Form submitted successfully.');
      expect(store.expenses()[0]).toEqual({
        id: 'e6',
        description: 'Taxi back to the hotel',
        amount: 27.5,
        category: 'transport',
        date: '2026-09-01',
      });
      await fixture.whenStable();
      expect(TestBed.inject(ExpenseDraftState).draft().description).toBe('');
    });

    it('the form tool is unregistered when the component is destroyed', async () => {
      const { fixture } = await setup();
      fixture.destroy();
      expect(mc.tools.has('addExpense')).toBe(false);
      expect(mc.tools.has('getVisibleExpenses')).toBe(true);
    });
  });
});
