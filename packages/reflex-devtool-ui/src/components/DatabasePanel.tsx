import { useState } from 'react';
import { useSubscription } from '@flexsurfer/reflex';
import { JsonViewer } from './ui/JsonViewer';
import HandlersTable from './HandlersTable';

export default function DatabasePanel() {
    const db = useSubscription(['db']);
    const activeSubs = useSubscription(['activeSubs']);
    const [viewMode, setViewMode] = useState<'database' | 'subscriptions' | 'handlers'>('database');

    return (
        <div className="flex flex-col bg-base-100 h-full overflow-hidden">
            <div className="p-2 bg-base-200 border-b border-base-300 pt-3">
                <button
                    onClick={() => setViewMode('database')}
                    className={`btn btn-xs ${viewMode === 'database' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Database
                </button>
                <button
                    onClick={() => setViewMode('subscriptions')}
                    className={`btn btn-xs ${viewMode === 'subscriptions' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Subscriptions
                </button>
                <button
                    onClick={() => setViewMode('handlers')}
                    className={`btn btn-xs ${viewMode === 'handlers' ? 'btn-primary' : 'btn-ghost'}`}
                >
                    Handlers
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {viewMode === 'database' ? (
                    !db ? (
                        <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-center">
                            <p className="text-lg font-medium">No database state yet...</p>
                            <p className="text-sm">Run your app with devtools enabled to see database state here</p>
                        </div>
                    ) : (
                        <JsonViewer src={db} name="db" />
                    )
                ) : viewMode === 'handlers' ? (
                    <HandlersTable />
                ) : (
                    !activeSubs ? (
                        <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-center">
                            <p className="text-lg font-medium">No active subscriptions yet...</p>
                            <p className="text-sm">Active subscriptions will appear here when your app is running</p>
                        </div>
                    ) : (
                        <JsonViewer src={activeSubs} name="activeSubs" />
                    )
                )}
            </div>
        </div>
    );
} 
