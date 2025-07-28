import { useRef, useEffect, useCallback, useState } from 'react';
import { TraceItem } from '../types/Trace';
import TraceListItem from './trace/TraceListItem';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

export default function TracesListPanel() {
    const eventsEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLUListElement>(null);
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
        <div className="flex flex-col bg-base-100 border-r border-base-300 h-full overflow-hidden">
            <div className="flex gap-2 p-3 bg-base-200 border-b border-base-300">
                <input
                    type="text"
                    placeholder="Filter events..."
                    value={filter}
                    onChange={handleFilterChange}
                    className="input input-bordered input-sm flex-1 bg-base-100"
                />
                <button onClick={handleClearEvents} className="btn btn-sm">
                    Clear
                </button>
            </div>

            <ul className="flex-1 overflow-y-auto bg-base-200 p-0" ref={contentRef}>
                {traces.length === 0 ? (
                    <li className="h-full">
                        <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-center">
                            <p className="text-sm">No events yet...</p>
                        </div>
                    </li>
                ) : (
                    traces.map((trace, index) => {
                        const selected = selectedTrace?.id === trace.id;
                        return (
                            <TraceListItem key={index} item={trace} selected={selected} />
                        );
                    })
                )}
                <div ref={eventsEndRef} />
            </ul>
        </div>
    );
} 