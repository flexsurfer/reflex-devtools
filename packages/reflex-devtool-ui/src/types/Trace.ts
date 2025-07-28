export type TraceID = number;

export interface TraceOpts {
    operation?: string;
    opType?: string;
    tags?: Record<string, any>;
    childOf?: TraceID;
}

export interface Trace extends TraceOpts {
    id: TraceID;
    start: number;
    end?: number;
    duration?: number;
}

export type Badge = {
    label: string;
    number: number;
}

export type TraceItem = {
    id: number;
    type: string;
    traces: Trace[];
    badges: Badge[];
}
