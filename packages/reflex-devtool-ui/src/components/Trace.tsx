import { TraceItem } from '../types/Trace';
import { dispatch } from '@flexsurfer/reflex';
import '../styles/Trace.css';

interface EventProps {
  item: TraceItem;
  index: number;
  selected: boolean;
}

export default function TraceComponent({ item, index, selected }: EventProps) {
  const isEvent = item.type === 'event';
  
  const handleClick = () => {
    dispatch(['set-selected-trace', item]);
  };

  return (
    <div 
      key={index} 
      className={`trace-item trace-item-type-${item.type} ${selected ? 'trace-item-selected' : ''}`}
      onClick={handleClick}
    >
      {isEvent ? item.traces[0].operation : "render"}
    </div>
  );
} 