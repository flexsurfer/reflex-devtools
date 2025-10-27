import { useState, useEffect, useCallback } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

export function DispatchEventModal() {
    const dispatchModalState = useSubscription(['dispatchModalOpenState']) as {
        isOpen: boolean;
        eventName: string;
        initialParams: any[];
    } | undefined;

    const [eventName, setEventName] = useState(dispatchModalState?.eventName || 'event');
    const [eventParams, setEventParams] = useState<any[]>(dispatchModalState?.initialParams || []);
    const [paramTexts, setParamTexts] = useState<string[]>([]);
    const [paramErrors, setParamErrors] = useState<(string | null)[]>([]);

    useEffect(() => {
        if (dispatchModalState?.isOpen) {
            const initialEventName = dispatchModalState.eventName;
            const initialParams = dispatchModalState.initialParams || [];
            setEventName(initialEventName);
            setEventParams(initialParams);
            setParamTexts(initialParams.map(p => JSON.stringify(p, null, 2)));
            setParamErrors(initialParams.map(() => null));
        }
    }, [dispatchModalState?.isOpen, dispatchModalState?.eventName, dispatchModalState?.initialParams]);

    const handleDispatch = useCallback(() => {
        dispatch(['dispatch-to-client', eventName, ...eventParams]);
        dispatch(['close-dispatch-modal']);
    }, [eventName, eventParams]);

    const handleClose = useCallback(() => {
        dispatch(['close-dispatch-modal']);
    }, []);

    const handleParamTextChange = useCallback((index: number, text: string) => {
        const newTexts = [...paramTexts];
        newTexts[index] = text;
        setParamTexts(newTexts);

        // Try to parse the JSON
        try {
            const parsed = JSON.parse(text);
            const newParams = [...eventParams];
            newParams[index] = parsed;
            setEventParams(newParams);
            
            const newErrors = [...paramErrors];
            newErrors[index] = null;
            setParamErrors(newErrors);
        } catch (e) {
            const newErrors = [...paramErrors];
            newErrors[index] = e instanceof Error ? e.message : 'Invalid JSON';
            setParamErrors(newErrors);
        }
    }, [paramTexts, eventParams, paramErrors]);

    const handleAddParam = () => {
        setEventParams([...eventParams, {}]);
        setParamTexts([...paramTexts, '']);
        setParamErrors([...paramErrors, null]);
    };

    const handleRemoveParam = (index: number) => {
        setEventParams(eventParams.filter((_, i) => i !== index));
        setParamTexts(paramTexts.filter((_, i) => i !== index));
        setParamErrors(paramErrors.filter((_, i) => i !== index));
    };

    const hasErrors = paramErrors.some(e => e !== null);

    if (!dispatchModalState?.isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
        >
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-base-300">
                    <h2 className="text-xl font-bold">Dispatch Event</h2>
                    <button
                        className="btn btn-sm btn-ghost btn-circle"
                        onClick={handleClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {/* Event Name Input */}
                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text font-semibold">Event ID</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="event-name"
                        />
                    </div>

                    {/* Event Parameters Editor */}
                    <div className="form-control mb-4">
                        <label className="label">
                            <span className="label-text font-semibold">Event Parameters</span>
                            <span className="label-text-alt text-base-content/60">
                                (JSON values)
                            </span>
                        </label>
                        <div className="space-y-2">
                            {eventParams.map((_, index) => (
                                <div key={index} className="flex gap-2 items-start">
                                    <div className="flex-1">
                                        <div className="text-xs text-base-content/60 mb-1 mt-2">
                                            Parameter {index + 1}
                                        </div>
                                        <textarea
                                            className={`textarea textarea-bordered w-full font-mono text-sm ${
                                                paramErrors[index] ? 'textarea-error' : ''
                                            }`}
                                            value={paramTexts[index]}
                                            onChange={(e) => handleParamTextChange(index, e.target.value)}
                                            placeholder='Enter JSON: "text", 123, true, {"key": "value"}, [1,2,3]'
                                            rows={3}
                                        />
                                        {paramErrors[index] && (
                                            <div className="text-error text-xs mt-1">{paramErrors[index]}</div>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-sm btn-ghost btn-circle mt-6"
                                        onClick={() => handleRemoveParam(index)}
                                        title="Remove parameter"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                            <button
                                className="btn btn-sm btn-ghost w-full"
                                onClick={handleAddParam}
                            >
                                + Add Parameter
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="form-control">
                        <div className="mockup-code text-xs">
                            <pre><code>dispatch(['{eventName}'{eventParams.length > 0 ? ', ' : ''}{eventParams.map(p => JSON.stringify(p)).join(', ')}])</code></pre>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-base-300">
                    <button
                        className="btn btn-ghost"
                        onClick={handleClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn btn-primary"
                        onClick={handleDispatch}
                        disabled={!eventName.trim() || hasErrors}
                    >
                        Dispatch
                    </button>
                </div>
            </div>
        </div>
    );
}

