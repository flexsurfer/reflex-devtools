import { useEffect, useRef } from 'react';
import '../styles/VerticalSplitter.css';

export default function VerticalSplitter() {
  const splitterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const splitter = splitterRef.current;
    if (!splitter) return;

    let isDragging = false;
    let startY = 0;
    let startSplitPosition = 50; // Default split position

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startY = e.clientY;
      
      // Get current split position from CSS variable
      const splitContainer = splitter.closest('.right-panels') as HTMLElement;
      if (splitContainer) {
        const currentPos = getComputedStyle(splitContainer).getPropertyValue('--vertical-split-position').trim();
        startSplitPosition = parseFloat(currentPos) || 50;
      }
      
      splitter.classList.add('dragging');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const splitContainer = splitter.closest('.right-panels') as HTMLElement;
      if (!splitContainer) return;

      const containerRect = splitContainer.getBoundingClientRect();
      const deltaY = e.clientY - startY;
      const deltaPercent = (deltaY / containerRect.height) * 100;
      const newPosition = Math.max(10, Math.min(90, startSplitPosition + deltaPercent));
      
      // Update CSS variable
      splitContainer.style.setProperty('--vertical-split-position', `${newPosition}%`);
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      splitter.classList.remove('dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    // Add event listeners
    splitter.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Cleanup
    return () => {
      splitter.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div 
      ref={splitterRef}
      className="vertical-splitter"
    />
  );
} 