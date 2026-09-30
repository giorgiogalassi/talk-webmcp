import { resource, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  form,
  min,
  provideExperimentalWebMcpForms,
  required,
  SchemaPathTree,
  validateAsync,
} from '@angular/forms/signals';
import { FakeModelContext, installFakeModelContext } from '../../testing/fake-model-context';

/**
 * SPIKE (Angular 22.2.0): what does `provideExperimentalWebMcpForms()` actually hand the agent?
 *
 * Each `it` pins one finding, so an Angular update that changes the behaviour fails loudly here
 * (the API is Experimental and may change outside majors). Findings are summarised in
 * IMPLEMENTATION-PLAN.md → "Forms schema spike".
 *
 * Source: node_modules/@angular/forms/fesm2022/signals.mjs → inferSchemaFromFieldNode().
 * The schema is inferred ONCE, from the model's *runtime value* (typeof), not its TS type.
 */
describe('SPIKE: provideExperimentalWebMcpForms() schema + execute', () => {
  let mc: FakeModelContext;

  beforeEach(() => {
    mc = installFakeModelContext();
    TestBed.configureTestingModule({ providers: [provideExperimentalWebMcpForms()] });
  });
  afterEach(() => mc.uninstall());

  const flush = async () => {
    TestBed.tick();
    await new Promise((r) => setTimeout(r));
  };

  function makeForm<T>(
    name: string,
    model: T,
    rules: (p: SchemaPathTree<T>) => void = () => {},
    options: { action?: (value: T) => void; ignoreValidators?: 'pending' | 'none' } = {},
  ) {
    return TestBed.runInInjectionContext(() =>
      form(signal(model), rules, {
        experimentalWebMcpTool: { name, description: name },
        submission: {
          action: async (f) => {
            options.action?.(f().value());
            return undefined;
          },
          ignoreValidators: options.ignoreValidators,
        },
      }),
    );
  }

  it('primitives map to type only: no enum, no per-field description, no format; only required() lands in "required"', async () => {
    makeForm(
      'flat',
      { description: '', amount: 0, category: 'meals', date: '2026-09-30', billable: false },
      (p) => {
        required(p.description);
        min(p.amount, 0.01);
      },
    );
    await flush();

    expect(mc.tools.get('flat')!.inputSchema).toEqual({
      type: 'object',
      properties: {
        description: { type: 'string' },
        amount: { type: 'number' }, // min(0.01) is NOT in the schema
        category: { type: 'string' }, // no enum, even for a union type
        date: { type: 'string' }, // no "format": "date"
        billable: { type: 'boolean' },
      },
      required: ['description'],
      additionalProperties: false,
    });
    expect(mc.tools.get('flat')!.annotations).toEqual({
      readOnlyHint: false,
      untrustedContentHint: false,
    });
  });

  it('a Date field becomes an empty object schema (unusable by an agent)', async () => {
    makeForm('dateObj', { date: new Date('2026-09-30') });
    await flush();
    expect(mc.tools.get('dateObj')!.inputSchema).toEqual({
      type: 'object',
      properties: {
        date: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
      required: [],
      additionalProperties: false,
    });
  });

  it('nested line items work, but only if the array has at least one item at init', async () => {
    makeForm('lineItems', { items: [{ label: '', amount: 0 }] });
    await flush();
    expect(mc.tools.get('lineItems')!.inputSchema).toEqual({
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: { label: { type: 'string' }, amount: { type: 'number' } },
            required: [],
            additionalProperties: false,
          },
        },
      },
      required: [],
      additionalProperties: false,
    });
  });

  it('an undefined field silently disappears from the schema', async () => {
    makeForm('optional', { note: undefined as string | undefined });
    await flush();
    expect(mc.tools.get('optional')!.inputSchema).toEqual({
      type: 'object',
      properties: {},
      required: [],
      additionalProperties: false,
    });
  });
  // Not pinned here because it surfaces as an *unhandled promise rejection* (form() itself does
  // not throw): a `null` field or an empty array at init means the tool is never registered,
  // with "Could not accurately infer WebMCP schema for form ...".

  it('validators run on agent input; their messages are what the agent reads back', async () => {
    makeForm('msgs', { description: '', amount: 0 }, (p) => {
      required(p.description, { message: 'Say what the expense was for' });
      min(p.amount, 0.01); // no message → the agent only gets the error kind
    });
    await flush();
    expect(await mc.call('msgs', { description: '', amount: -1 })).toBe(
      'Form submission failed:\ndescription: Say what the expense was for\namount: min',
    );
  });

  it('agent args are NOT checked against the schema: missing, mistyped and extra fields reach the submit handler', async () => {
    let submitted: unknown;
    makeForm('loose', { description: '', amount: 0, currency: 'EUR' }, (p) => required(p.description), {
      action: (v) => (submitted = v),
    });
    await flush();

    expect(await mc.call('loose', { description: 'Taxi', amount: '12', approved: true })).toBe(
      'Form submitted successfully.',
    );
    // no currency, string amount, extra prop: node.value.set(args) takes the args as-is
    expect(submitted).toEqual({ description: 'Taxi', amount: '12', approved: true });
  });

  it('a pending async validator does NOT block an agent submission by default', async () => {
    let submitted = false;
    makeForm(
      'asyncPending',
      { code: 'X' },
      (p) =>
        validateAsync(p.code, {
          params: ({ value }) => value(),
          factory: (params) => resource({ params, loader: () => new Promise<string>(() => {}) }),
          onSuccess: () => ({ kind: 'taken', message: 'Code already used' }),
          onError: () => undefined,
        }),
      { action: () => (submitted = true) },
    );
    await flush();
    expect(await mc.call('asyncPending', { code: 'Y' })).toBe('Form submitted successfully.');
    expect(submitted).toBe(true);
  });

  it('...unless submission.ignoreValidators is "none" (then the agent gets an empty failure)', async () => {
    let submitted = false;
    makeForm(
      'asyncNone',
      { code: 'X' },
      (p) =>
        validateAsync(p.code, {
          params: ({ value }) => value(),
          factory: (params) => resource({ params, loader: () => new Promise<string>(() => {}) }),
          onSuccess: () => undefined,
          onError: () => undefined,
        }),
      { action: () => (submitted = true), ignoreValidators: 'none' },
    );
    await flush();
    expect(await mc.call('asyncNone', { code: 'Y' })).toBe('Form submission failed:\n');
    expect(submitted).toBe(false);
  });

  it('a resolved async validator error blocks the submission and is reported', async () => {
    let submitted = false;
    makeForm(
      'asyncResolved',
      { code: 'X' },
      (p) =>
        validateAsync(p.code, {
          params: ({ value }) => value(),
          factory: (params) => resource({ params, loader: async () => 'duplicate' }),
          onSuccess: (r) =>
            r === 'duplicate' ? { kind: 'taken', message: 'Code already used' } : undefined,
          onError: () => undefined,
        }),
      { action: () => (submitted = true) },
    );
    await flush();
    await new Promise((r) => setTimeout(r, 20));
    TestBed.tick();
    expect(await mc.call('asyncResolved', { code: 'X' })).toBe(
      'Form submission failed:\ncode: Code already used',
    );
    expect(submitted).toBe(false);
  });
});
