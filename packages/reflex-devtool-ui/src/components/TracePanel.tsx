import { useSubscription } from '@flexsurfer/reflex';
import { TraceItem } from '../types/Trace';
import ReactJson from '@microlink/react-json-view';
import '../styles/TracePanel.css';

export default function TracePanel() {
    const selectedTrace = useSubscription<TraceItem | null>(['selectedTrace']);
    
    const getOpTypeColor = (opType: string | undefined): string => {
        if (!opType) return '#666';
        
        switch (opType.toLowerCase()) {
            case 'render':
                return '#3b82f6'; // blue
            case 'delete':
            case 'unmount':
                return '#ef4444'; // red
            case 'sub/run':
                return '#a855f7'; // purple
            case 'sub':
                return '#f59e0b'; // amber
            default:
                return '#64748b'; // slate
        }
    };
    
    return (
        <div className="trace-panel-container">
            <div className="panel-content">
                {!selectedTrace ? (
                    <div className="empty-state">
                        <p>No trace selected...</p>
                        <p>Click on a trace item to see its details here!</p>
                    </div>
                ) : (
                    <div className="trace-details">
                        <div className="trace-header">
                            <h3>Trace Details - {selectedTrace.type}</h3>
                        </div>
                        {selectedTrace.type === 'event' && (
                            <div className="json-container">
                            <ReactJson
                                src={selectedTrace.traces[0].tags || {}}
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
                        {selectedTrace.type === 'render' && (
                            <div className="render-table-container">
                                <table className="render-table">
                                    <thead>
                                        <tr>
                                            <th>Op Type</th>
                                            <th>Operation</th>
                                            <th>Duration (ms)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTrace.traces.map((trace, index) => (
                                            <tr key={trace.id || index}>
                                                <td>
                                                    <span 
                                                        className="op-type-badge"
                                                        style={{ 
                                                            backgroundColor: getOpTypeColor(trace.opType),
                                                            color: 'white'
                                                        }}
                                                    >
                                                        {trace.opType || 'unknown'}
                                                    </span>
                                                </td>
                                                <td className="operation-cell">
                                                    {trace.operation || '-'}
                                                </td>
                                                <td className="duration-cell">
                                                    {trace.duration ? `${trace.duration.toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        
                    </div>
                )}
            </div>
        </div>
    );
} 