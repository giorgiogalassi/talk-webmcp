/**
 * Minimal stand-in for the browser's `document.modelContext` (WebMCP), used by the specs.
 *
 * Angular 22.2 looks up `globalThis.document.modelContext ?? globalThis.navigator.modelContext`
 * and silently does nothing when neither exists, so without this fake the tools would never
 * register under jsdom.
 */
export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: unknown;
  annotations?: Record<string, unknown>;
  execute: (args: unknown, client?: { signal?: AbortSignal }) => unknown;
}

export interface FakeModelContext {
  readonly tools: Map<string, RegisteredTool>;
  call(name: string, args?: unknown): Promise<string>;
  uninstall(): void;
}

export function installFakeModelContext(): FakeModelContext {
  const tools = new Map<string, RegisteredTool>();
  const doc = document as Document & { modelContext?: unknown };

  doc.modelContext = {
    registerTool: async (tool: RegisteredTool, options?: { signal?: AbortSignal }) => {
      tools.set(tool.name, tool);
      options?.signal?.addEventListener('abort', () => tools.delete(tool.name));
    },
  };

  return {
    tools,
    async call(name, args = {}) {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Tool "${name}" is not registered`);
      const result = (await tool.execute(args, { signal: new AbortController().signal })) as
        | string
        | { content: { type: string; text: string }[] };
      return typeof result === 'string' ? result : result.content.map((c) => c.text).join('\n');
    },
    uninstall() {
      delete doc.modelContext;
    },
  };
}
