import { Trace } from '../../types/Trace';
import { Badge } from '../Badge';

export default function TraceRenderDetails({ traces }: { traces: Trace[] }) {

    return (
        <div className="overflow-x-auto">
            <table className="table table-zebra w-full table-xs">
                <thead>
                    <tr>
                        <th>Op Type</th>
                        <th>Operation</th>
                        <th>Duration (ms)</th>
                    </tr>
                </thead>
                <tbody>
                    {traces.map((trace, index) => (
                        <tr key={trace.id || index}>
                            <td>
                                <Badge opType={trace.opType ?? ''} label={trace.opType ?? ''} />
                            </td>
                            <td className="font-mono text-xs">
                                {trace.operation || '-'}
                            </td>
                            <td className="text-xs">
                                {trace.duration ? `${trace.duration.toFixed(2)}` : '-'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}; 