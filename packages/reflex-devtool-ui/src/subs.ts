import { regSub } from "@flexsurfer/reflex";

// Subscriptions for devtools state
regSub('db');
regSub('traces');
regSub('isConnected');
regSub('filter');
regSub('splitPosition');
regSub('isDragging');
regSub('selectedTrace');

// Computed subscriptions
regSub('eventCount', (events) => (events.length), () => [['events']]); 