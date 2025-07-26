import { regEvent } from "@flexsurfer/reflex";
import type { Trace, TraceItem } from './types/Trace';

regEvent('add-traces', ({ draftDb }, traces: Trace[]) => {
    const { eventTraceItems, renderTraceItem } = traces.reduce((acc, trace) => {
        if (trace.opType === 'event') {
            acc.eventTraceItems.push({
                id: trace.id,
                type: 'event',
                traces: [trace]
            });
        } else {
            acc.renderTraceItem.traces.push(trace);
        }
        return acc;
    }, { eventTraceItems: [] as TraceItem[], renderTraceItem: { type: 'render', traces: [] as Trace[] } });

    const renderTraceItemUpdated = renderTraceItem.traces.length > 0 ? [{...renderTraceItem, id: renderTraceItem.traces[0].id }] : []; 

    draftDb.traces.push(...eventTraceItems, ...renderTraceItemUpdated);
});

regEvent('update-db', ({ draftDb }, db: any) => {
    draftDb.db = db;
});

regEvent('clear-traces', ({ draftDb }) => {
    draftDb.traces = [];
});

regEvent('set-connected', ({ draftDb }, isConnected: boolean) => {
    draftDb.isConnected = isConnected;
});

regEvent('set-filter', ({ draftDb }, filter: string) => {
    draftDb.filter = filter;
});

regEvent('init-socket', () => {
    return [['init-socket']];
});

regEvent('set-selected-trace', ({ draftDb }, trace: TraceItem) => {
    draftDb.selectedTrace = trace;
});
