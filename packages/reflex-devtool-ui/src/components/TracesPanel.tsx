import { useRef, useEffect, useCallback, useState } from 'react';
import { TraceItem } from '../types/Trace';
import TraceComponent from './Trace';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import '../styles/TracesPanel.css';

export default function TracesPanel() {
    const eventsEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const [isAtBottom, setIsAtBottom] = useState(true);

    const traces = useSubscription<TraceItem[]>(['traces']);
    const filter = useSubscription<string>(['filter']);
    const selectedTrace = useSubscription<TraceItem | null>(['selectedTrace']);

    const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(['set-filter', e.target.value]);
    }, []);

    const handleClearEvents = useCallback(() => {
        dispatch(['clear-events']);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            const el = contentRef.current;
            if (el) {
                setIsAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 10);
            }
        };

        const el = contentRef.current;
        el?.addEventListener('scroll', handleScroll);
        return () => el?.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (isAtBottom) {
            eventsEndRef.current?.scrollIntoView();
        }
    }, [traces, isAtBottom]);

    return (
        <div className="events-container">

            <div className="panel-events-filter">
                <input
                    type="text"
                    placeholder="Filter events..."
                    value={filter}
                    onChange={handleFilterChange}
                    className="filter-input"
                />
                <button onClick={handleClearEvents} className="clear-button">
                    Clear
                </button>
            </div>
            <div className="panel-content" ref={contentRef}>
                {traces.length === 0 ? (
                    <div className="empty-state">
                        <p>No events yet...</p>
                        <p>Start sending events from your app to see them here!</p>
                    </div>
                ) : (
                    traces.map((trace, index) => (
                        <TraceComponent key={index} item={trace} index={index} selected={selectedTrace?.id === trace.id} />
                    ))
                )}
                <div ref={eventsEndRef} />
            </div>
        </div>
    );
} 