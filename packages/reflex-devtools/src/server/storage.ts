/**
 * In-memory storage for raw traces and app state
 */

import { applyPatches, enablePatches } from 'immer';

// Enable Immer patches plugin for applyPatches functionality
enablePatches();

export interface Trace {
  id: number;
  start: number;
  end?: number;
  duration?: number;
  operation?: string;
  opType?: string;
  tags?: Record<string, any>;
  childOf?: number;
}

export interface HandlerKeys {
  event: string[];
  fx: string[];
  cofx: string[];
  sub: string[];
}

export class TraceStorage {
  private traces: Trace[] = [];
  private appState: any = null;
  private activeSubs: Record<string, any> = {};
  private handlerKeys: HandlerKeys | null = null;
  private readonly maxTraces: number;

  constructor(maxTraces: number = 1000) {
    this.maxTraces = maxTraces;
  }

  addTraces(traces: Trace[]): void {
    // Store raw traces without processing
    this.traces.push(...traces);

    // Apply patches from traces to the app state
    const allPatches = traces
      .filter(trace => trace.tags?.patches?.length > 0)
      .flatMap(trace => trace.tags!.patches!);

    // Apply patches to the app state if we have patches and state
    if (allPatches.length > 0 && this.appState) {
      this.appState = applyPatches(this.appState, allPatches);
    }

    // Limit stored traces
    if (this.traces.length > this.maxTraces) {
      this.traces = this.traces.slice(-this.maxTraces);
    }
  }

  updateAppState(state: any): void {
    this.appState = state;
  }

  updateActiveSubs(subs: Record<string, any>): void {
    for (const [key, value] of Object.entries(subs)) {
      if (value === "reflex-tool-sub-disposed") {
        delete this.activeSubs[key];
      } else {
        this.activeSubs[key] = value;
      }
    }
  }

  updateHandlerKeys(keys: HandlerKeys): void {
    this.handlerKeys = keys;
  }

  getTraces(options: {
    limit?: number;
    eventFilter?: string;
    minDuration?: number;
    opType?: string;
  } = {}): Trace[] {
    let filtered = [...this.traces];

    // Filter by event name
    if (options.eventFilter) {
      const filter = options.eventFilter.toLowerCase();
      filtered = filtered.filter(trace =>
        trace.operation?.toLowerCase().includes(filter)
      );
    }

    // Filter by operation type
    if (options.opType) {
      filtered = filtered.filter(trace => trace.opType === options.opType);
    }

    // Filter by minimum duration
    if (options.minDuration !== undefined) {
      filtered = filtered.filter(trace =>
        trace.duration !== undefined && trace.duration >= options.minDuration!
      );
    }

    // Apply limit
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getAppState(): any {
    return this.appState;
  }

  getActiveSubs(): Record<string, any> {
    return this.activeSubs;
  }

  getHandlerKeys(): HandlerKeys | null {
    return this.handlerKeys;
  }

  getStats(): {
    totalTraces: number;
    eventTraces: number;
    renderTraces: number;
  } {
    const eventTraces = this.traces.filter(t => t.opType === 'event').length;
    const renderTraces = this.traces.filter(t => t.opType === 'render').length;

    return {
      totalTraces: this.traces.length,
      eventTraces,
      renderTraces
    };
  }
  
  clear(): void {
    this.traces = [];
    this.appState = null;
    this.activeSubs = {};
    this.handlerKeys = null;
  }
}

