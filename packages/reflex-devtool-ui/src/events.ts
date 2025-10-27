import { current, regEvent } from "@flexsurfer/reflex";
import type { Badge, Trace, TraceItem } from './types/Trace';

regEvent('add-traces', ({ draftDb }, traces: Trace[]) => {
    const { eventTraceItems, renderTraceItem, badgesMap } = traces.reduce((acc, trace) => {
        if (trace.opType === 'event') {
            const badges: Badge[] = [];
            if (trace.tags?.patches?.length > 0) {
                badges.push({ label: 'db', number: trace.tags!.patches!.length });
            }
            if (trace.tags?.effects?.length > 0) {
                badges.push({ label: 'fx', number: trace.tags!.effects!.length });
            }
            acc.eventTraceItems.push({
                id: trace.id,
                type: 'event',
                badges: badges,
                traces: [trace]
            });
        } else {
            const op = trace.opType ?? '';
            acc.badgesMap.set(op, (acc.badgesMap.get(op) || 0) + 1);
            acc.renderTraceItem.traces.push(trace);
        }
        return acc;
    }, { eventTraceItems: [] as TraceItem[], renderTraceItem: { type: 'render', traces: [] as Trace[], badges: [] as Badge[] } as TraceItem, badgesMap: new Map<string, number>() });

    const getPriority = (opType: string | undefined) => {
        if (opType === 'render') return 0;
        if (opType === 'sub/create') return 1;
        if (opType === 'sub/run') return 2;
        if (opType === 'sub/dispose') return 3;
        return 4;
    };

    const sortedRenderTraces = renderTraceItem.traces.sort((a, b) => {
        return getPriority(a.opType) - getPriority(b.opType);
    });

    renderTraceItem.traces = sortedRenderTraces;

    renderTraceItem.badges = Array.from(badgesMap.entries())
        .sort((a, b) => getPriority(a[0]) - getPriority(b[0]))
        .map(([label, number]) => ({ label, number }));

    const renderTraceItemUpdated = renderTraceItem.traces.length > 0 ? [{ ...renderTraceItem, id: renderTraceItem.traces[0].id }] : [];

    draftDb.traces.push(...eventTraceItems, ...renderTraceItemUpdated);
});

regEvent('update-db', ({ draftDb }, db: any) => {
    draftDb.db = db;
});

regEvent('update-active-subs', ({ draftDb }, activeSubs: any) => {
    if (!draftDb.activeSubs) {
        draftDb.activeSubs = {};
    }

    for (const [key, value] of Object.entries(activeSubs)) {
        if (value === "reflex-tool-sub-disposed") {
            delete draftDb.activeSubs[key];
        } else {
            draftDb.activeSubs[key] = value;
        }
    }
});

regEvent('clear-traces', ({ draftDb }) => {
    draftDb.traces = [];
    draftDb.selectedTrace = null;
});

regEvent('set-connected', ({ draftDb }, isConnected: boolean) => {
    draftDb.isConnected = isConnected;
});

regEvent('set-filter', ({ draftDb }, filter: string) => {
    draftDb.filter = filter;
    draftDb.selectedTrace = null;
});

regEvent('toggle-show-renders', ({ draftDb }) => {
    draftDb.settings.showRenders = !draftDb.settings.showRenders;
    return [['save-settings', current(draftDb.settings)]];
});

regEvent('toggle-show-badges', ({ draftDb }) => {
    draftDb.settings.showBadges = !draftDb.settings.showBadges;
    return [['save-settings', current(draftDb.settings)]];
});

regEvent('toggle-show-params', ({ draftDb }) => {
    draftDb.settings.showParams = !draftDb.settings.showParams;
    return [['save-settings', current(draftDb.settings)]];
});

regEvent('toggle-show-timestamps', ({ draftDb }) => {
    draftDb.settings.showTimestamps = !draftDb.settings.showTimestamps;
    return [['save-settings', current(draftDb.settings)]];
});

regEvent('init-socket', () => {
    return [['init-socket']];
});

regEvent('set-selected-trace', ({ draftDb }, trace: TraceItem) => {
    draftDb.selectedTrace = trace;
});

regEvent('dispatch-to-client', (_ctx, eventName: string, ...params: any[]) => {
    return [['send-dispatch-to-client', { eventName, params }]];
});

regEvent('open-dispatch-modal', ({ draftDb }, eventName: string = 'event-id', initialParams: any[] = []) => {
    draftDb.dispatchModalOpenState = {
        isOpen: true,
        eventName,
        initialParams
    };
});

regEvent('close-dispatch-modal', ({ draftDb }) => {
    draftDb.dispatchModalOpenState = {
        isOpen: false,
        eventName: 'event-id',
        initialParams: []
    };
});
