import { useState } from 'react';
import { JsonViewer } from '../ui/JsonViewer';
import { DiffViewer } from '../ui/DiffViewer';

export default function TraceEventDetails({ tags }: { tags: { [key: string]: any } }) {
    const [viewMode, setViewMode] = useState<'json' | 'diff'>('json');

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex gap-2 p-2 border-b border-base-300">
                <button
                    onClick={() => setViewMode('json')}
                    className={`btn btn-xs ${viewMode === 'json' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    JSON
                </button>
                <button
                    onClick={() => setViewMode('diff')}
                    className={`btn btn-xs ${viewMode === 'diff' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Diff
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'json' ? (
                    <JsonViewer src={tags} name="event" />
                ) : (
                    <DiffViewer patches={tags.patches} />
                )}
            </div>
        </div>
    );
}
