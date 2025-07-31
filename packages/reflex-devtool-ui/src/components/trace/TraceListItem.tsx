import { useCallback } from 'react';
import { TraceItem } from '../../types/Trace';
import { dispatch } from '@flexsurfer/reflex';
import { Badge } from '../ui/Badge';

interface EventProps {
  item: TraceItem;
  selected: boolean;
}

export default function TraceListItem({ item, selected }: EventProps) {
  const isEvent = item.type === 'event';

  const handleClick = useCallback(() => {
    dispatch(['set-selected-trace', item]);
  }, [item]);

  return (
    <li
      className={`hover:bg-base-300 border-b border-base-300 cursor-pointer ${selected ? 'bg-base-300' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1 px-2 py-2 text-sm whitespace-nowrap">
        {item.badges.map((badge) => {
          return <Badge key={badge.label} opType={badge.label} label={badge.label + (badge.number > 1 ? (": " + badge.number) : "")} />
        })}
        {isEvent ? JSON.stringify(item.traces[0]?.tags?.event).slice(0, 70) : ""}
      </div>
    </li>
  );
} 