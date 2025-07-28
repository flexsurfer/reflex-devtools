import { useCallback } from 'react';
import { TraceItem } from '../../types/Trace';
import { dispatch } from '@flexsurfer/reflex';
import { Badge } from '../Badge';

interface EventProps {
  item: TraceItem;
  selected: boolean;
}

export default function TraceListItem({ item, selected }: EventProps) {
  const isEvent = item.type === 'event';

  const handleClick = useCallback(() => {
    dispatch(['set-selected-trace', item]);
  }, []);

  return (
    <li
      className={`hover:bg-base-300 border-b border-base-300 cursor-pointer ${selected ? 'bg-base-300' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 px-2 py-1 text-sm">
        {item.badges.map((badge) => (
          <Badge key={badge.label} opType={badge.label} label={badge.label + ": " + badge.number} />
        ))}
        {isEvent ? item.traces[0].operation : ""}
      </div>
    </li>
  );
} 