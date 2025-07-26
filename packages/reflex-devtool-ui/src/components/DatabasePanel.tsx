import { useSubscription } from '@flexsurfer/reflex';
import ReactJson from '@microlink/react-json-view';
import '../styles/DatabasePanel.css';

export default function DatabasePanel() {
    const db = useSubscription(['db']);

    return (
        <div className="db-container">
            <div className="panel-content">
                {!db ? (
                    <div className="empty-state">
                        <p>No database events yet...</p>
                        <p>Database state changes will appear here!</p>
                    </div>
                ) : (
                    <div className="json-container">
                        <ReactJson
                            src={db}
                            theme="monokai"
                            collapsed={1}
                            displayDataTypes={false}
                            displayObjectSize={false}
                            enableClipboard={false}
                            style={{
                                backgroundColor: 'transparent',
                                fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
                                fontSize: '13px',
                                lineHeight: '1.4'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
} 