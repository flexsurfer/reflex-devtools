import { useState } from 'react';
import { JsonViewer } from '../ui/JsonViewer';
import { DiffViewer } from '../ui/DiffViewer';

export default function TraceEventDetails({ tags }: { tags: { [key: string]: any } }) {
    const [viewMode, setViewMode] = useState<'data' | 'diff'>('diff');

    return (
        <div className="flex-1 flex flex-col">
            <div className="flex gap-2 p-2 border-b border-base-300">
                <button
                    onClick={() => setViewMode('diff')}
                    className={`btn btn-xs ${viewMode === 'diff' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Diff
                </button>
                <button
                    onClick={() => setViewMode('data')}
                    className={`btn btn-xs ${viewMode === 'data' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Raw Data
                </button>

            </div>
            <div className="flex-1 overflow-y-auto">
                {viewMode === 'data' ? (
                    <JsonViewer src={tags} name="event" />
                ) : (
                    <DiffViewer patches={tags.patches} reversePatches={tags.reversePatches} />
                )}
            </div>
        </div>
    );
}
