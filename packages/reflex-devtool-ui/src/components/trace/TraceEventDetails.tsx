import { JsonViewer } from '../ui/JsonViewer';

export default function TraceEventDetails({ tags }: { tags: { [key: string]: any } }) {
    return (
        <div className="flex-1">
            <JsonViewer src={tags} name="event" />
        </div>
    );
}
