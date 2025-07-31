import { useCallback } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';
import EventFilter from './TraceEventFilter';

export default function TracesControls() {
    const showRenderTraces = useSubscription<boolean>(['showRenderTraces']);

    const handleClearEvents = useCallback(() => {
        dispatch(['clear-traces']);
    }, []);

    const handleToggleshowRenderTraces = useCallback(() => {
        dispatch(['toggle-show-render-traces']);
    }, []);

    return (
        <div className="flex flex-col p-2 gap-2 bg-base-200 border-b border-base-300">
            <div className="flex items-center gap-2 justify-between">
                <label className="label cursor-pointer flex items-center gap-2 p-0">
                    <input
                        type="checkbox"
                        checked={showRenderTraces || false}
                        onChange={handleToggleshowRenderTraces}
                        className="toggle toggle-xs"
                    />
                    <span className="label-text text-xs">Show render traces</span>
                </label>
                <button onClick={handleClearEvents} className="btn btn-sm">
                    Clear
                </button>
            </div>
            <div className="flex gap-2">
                <EventFilter />
            </div>
        </div>
    );
} 