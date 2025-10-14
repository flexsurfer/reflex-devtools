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
regSub('showRenders');
regSub('showBadges');
regSub('showParams');

// Filtered traces - filter by text and toggle visibility of render traces
regSub('filteredTraces', (traces, filter, showRenders) => {
    const hasTextFilter = filter && filter.trim() !== '';
    const filterLower = hasTextFilter ? filter.toLowerCase().trim() : '';
    
    return traces.filter((trace: TraceItem) => {
        // If showRenders is true, hide render traces
        if (!showRenders && trace.type === 'render') {
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
}, () => [['traces'], ['filter'], ['showRenders']]); 