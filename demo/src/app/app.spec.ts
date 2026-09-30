import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    // No WebMCP providers here: the dashboard must work without the agent layer.
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('renders the dashboard without the WebMCP layer', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Expenses');
    expect(el.querySelectorAll('app-expense-list tbody tr').length).toBe(5);
    expect(el.querySelector('app-expense-form form')).toBeTruthy();
  });
});
