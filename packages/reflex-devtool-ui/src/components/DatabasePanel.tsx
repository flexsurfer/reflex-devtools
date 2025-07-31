import { useSubscription } from '@flexsurfer/reflex';
import { JsonViewer } from './ui/JsonViewer';

export default function DatabasePanel() {
    const db = useSubscription(['db']);

    return (
        <div className="flex flex-col bg-base-100 h-full overflow-hidden">
            <div className="p-2 bg-base-200 border-b border-base-300 pt-3">
                <h2 className="text-sm">Database State</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
                {!db ? (
                    <div className="flex flex-col items-center justify-center h-full text-base-content/60 text-center">
                        <p className="text-lg font-medium">No database state yet...</p>
                        <p className="text-sm">Run your app with devtools enabled to see database state here</p>
                    </div>
                ) : (
                    <JsonViewer src={db} name="db" />
                )}
            </div>
        </div>
    );
} 
