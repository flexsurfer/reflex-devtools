import { dispatch, regEffect } from "@flexsurfer/reflex";

const connectWebSocket = () => {
    const wsHost = import.meta.env.VITE_WS_HOST || window.location.host;
    const wsUrl = `ws://${wsHost}/ui`;
    const wsRef = new WebSocket(wsUrl);

    wsRef.onopen = () => {
        dispatch(['set-connected', true]);
        console.log('Connected to Reflex Devtools');
    };

    wsRef.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'reflex-traces') {
                dispatch(['add-traces', data.payload]);
            } else if (data.type === 'reflex-app-db') {
                dispatch(['update-db', data.payload]);
            }
        } catch (error) {
            console.error('Error parsing event:', error);
        }
    };

    wsRef.onclose = () => {
        dispatch(['set-connected', false]);
        console.log('Disconnected from Reflex Devtools');
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
    };

    wsRef.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
};

regEffect('init-socket', () => {
    connectWebSocket();
});