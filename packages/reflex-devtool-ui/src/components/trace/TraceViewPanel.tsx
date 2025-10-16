import { useCallback } from 'react';
import { useSubscription, dispatch } from '@flexsurfer/reflex';

interface TraceViewPanelProps {
  isOpen: boolean;
}

export default function TraceViewPanel({ isOpen }: TraceViewPanelProps) {
  const showRenders = useSubscription<boolean>(['showRenders']);
  const showBadges = useSubscription<boolean>(['showBadges']);
  const showParams = useSubscription<boolean>(['showParams']);
  const showTimestamps = useSubscription<boolean>(['showTimestamps']);

  const handleToggleShowRenders = useCallback(() => {
    dispatch(['toggle-show-renders']);
  }, []);

  const handleToggleShowBadges = useCallback(() => {
    dispatch(['toggle-show-badges']);
  }, []);

  const handleToggleShowParams = useCallback(() => {
    dispatch(['toggle-show-params']);
  }, []);

  const handleToggleShowTimestamps = useCallback(() => {
    dispatch(['toggle-show-timestamps']);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 mt-1 bg-base-100 border border-base-300 rounded-md shadow-lg p-2 z-50 min-w-48">
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-base-200 rounded text-sm">
          <input
            type="checkbox"
            checked={showRenders || false}
            onChange={handleToggleShowRenders}
            className="checkbox checkbox-xs"
          />
          <span>Show renders</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-base-200 rounded text-sm">
          <input
            type="checkbox"
            checked={showBadges || false}
            onChange={handleToggleShowBadges}
            className="checkbox checkbox-xs"
          />
          <span>Show badges</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-base-200 rounded text-sm">
          <input
            type="checkbox"
            checked={showParams || false}
            onChange={handleToggleShowParams}
            className="checkbox checkbox-xs"
          />
          <span>Show params</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-base-200 rounded text-sm">
          <input
            type="checkbox"
            checked={showTimestamps || false}
            onChange={handleToggleShowTimestamps}
            className="checkbox checkbox-xs"
          />
          <span>Show timestamps</span>
        </label>
      </div>
    </div>
  );
}
