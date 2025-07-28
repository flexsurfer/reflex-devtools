import { JsonViewer } from '../JsonViewer';

export default function EventDetails({ tags }: { tags: { [key: string]: any } }) {
    return (
        <div className="flex-1">
            <JsonViewer src={tags} name="event" />
        </div>
    );
}
