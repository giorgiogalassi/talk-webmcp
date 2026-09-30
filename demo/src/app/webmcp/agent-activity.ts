import { Component, Service, inject, signal } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';

export interface AgentCall {
  tool: string;
  args: unknown;
  at: Date;
}

/** Tiny on-screen log of agent tool calls, so the room sees them without opening DevTools. */
@Service()
export class AgentActivity {
  private readonly _calls = signal<AgentCall[]>([]);
  readonly calls = this._calls.asReadonly();

  record(tool: string, args: unknown): void {
    this._calls.update((calls) => [{ tool, args, at: new Date() }, ...calls].slice(0, 5));
  }
}

@Component({
  selector: 'app-agent-activity',
  imports: [DatePipe, JsonPipe],
  template: `
    @if (activity.calls().length) {
      <aside aria-live="polite">
        <strong>Agent calls</strong>
        <ol>
          @for (c of activity.calls(); track c.at) {
            <li>
              <span class="time">{{ c.at | date: 'HH:mm:ss' }}</span>
              <code>{{ c.tool }}({{ c.args | json }})</code>
            </li>
          }
        </ol>
      </aside>
    }
  `,
  styles: `
    aside {
      position: fixed; right: 1rem; bottom: 1rem; max-width: min(28rem, calc(100vw - 2rem));
      background: var(--agent-bg); color: var(--agent-fg); border-radius: 10px;
      padding: 0.7rem 0.9rem; font-size: 0.8rem; box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
    }
    ol { margin: 0.4rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.25rem; }
    li:first-child { font-weight: 600; }
    .time { opacity: 0.6; margin-right: 0.4rem; }
    code { word-break: break-all; }
  `,
})
export class AgentActivityComponent {
  protected readonly activity = inject(AgentActivity);
}
