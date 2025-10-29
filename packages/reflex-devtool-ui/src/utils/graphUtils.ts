import { Trace } from '../types/Trace';

export function createGraphData(traces: Trace[]) {
    const nodes = new Map<string, { id: string; type: string; label: string }>();
    const links: Array<{ source: string; target: string }> = [];

    // First pass: collect all existing sub/run reaction IDs
    const existingReactions = new Set<string>();
    traces.forEach(trace => {
        if (trace.opType === 'sub/run' && trace.tags?.reaction) {
            existingReactions.add(trace.tags.reaction);
        }
    });

    // Add root node
    nodes.set('appdb', { id: 'appdb', type: 'appdb', label: 'appdb' });

    // Process traces
    traces.forEach(trace => {
        if (trace.opType === 'sub/run') {
            const reactionId = trace.tags?.reaction;
            if (reactionId) {
                // Add the sub/run node
                if (!nodes.has(reactionId)) {
                    nodes.set(reactionId, {
                        id: reactionId,
                        type: 'sub/run',
                        label: reactionId
                    });
                }

                // Add links to dependencies
                const deps = trace.tags?.deps || [];
                if (deps.length === 0) {
                    // Connect to root if no deps
                    links.push({ source: 'appdb', target: reactionId });
                } else {
                    deps.forEach((dep: string) => {
                        // Only add dependency if it exists as a sub/run
                        if (existingReactions.has(dep)) {
                            if (!nodes.has(dep)) {
                                nodes.set(dep, {
                                    id: dep,
                                    type: 'sub/run',
                                    label: dep
                                });
                            }
                            links.push({ source: dep, target: reactionId });
                        }
                    });
                }
            }
        } else if (trace.opType === 'render') {
            const dep = trace.tags?.reaction;
            if (dep) {
                // Create render node
                const renderId = `render_${trace.id}`;
                nodes.set(renderId, {
                    id: renderId,
                    type: 'render',
                    label: trace.operation ?? 'Component'
                });

                // Add links to dependencies (same as sub/run)
                if (existingReactions.has(dep)) {
                    if (!nodes.has(dep)) {
                        nodes.set(dep, {
                            id: dep,
                            type: 'sub/run',
                            label: dep
                        });
                    }
                    links.push({ source: dep, target: renderId });
                }
                // Note: renders don't connect to root if dep doesn't exist
            }
        }
    });

    return {
        nodes: Array.from(nodes.values()),
        links
    };
}
