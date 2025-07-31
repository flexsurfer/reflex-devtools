import { regSub } from "@flexsurfer/reflex";
import { TraceItem } from "./types/Trace";

// Subscriptions for devtools state
regSub('db');
regSub('traces');
regSub('isConnected');
regSub('filter');
regSub('splitPosition');
regSub('isDragging');
regSub('selectedTrace');
regSub('showRenderTraces');

// Filtered traces - filter by text and toggle visibility of render traces
regSub('filteredTraces', (traces, filter, showRenderTraces) => {
    const hasTextFilter = filter && filter.trim() !== '';
    const filterLower = hasTextFilter ? filter.toLowerCase().trim() : '';
    
    return traces.filter((trace: TraceItem) => {
        // If showRenderTraces is true, hide render traces
        if (!showRenderTraces && trace.type === 'render') {
            return false;
        }
        
        // For render traces, include them if not hiding
        if (trace.type === 'render') {
            return true;
        }
        
        // For event traces, apply text filter if present
        if (trace.type === 'event') {
            if (!hasTextFilter) {
                return true; // Show all events when no text filter
            }
            
            const eventContent = trace.traces[0]?.operation;
            if (eventContent) {
                return eventContent.toLowerCase().includes(filterLower);
            }
            return false;
        }
        
        return false;
    });
}, () => [['traces'], ['filter'], ['showRenderTraces']]); 