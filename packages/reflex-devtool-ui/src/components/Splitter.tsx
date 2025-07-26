import { useEffect, useRef } from 'react';
import '../styles/Splitter.css';

export default function Splitter() {
  const splitterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const splitter = splitterRef.current;
    if (!splitter) return;

    let isDragging = false;
    let startX = 0;
    let startSplitPosition = 20; // Default split position

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      
      // Get current split position from CSS variable
      const splitContainer = splitter.closest('.split-container') as HTMLElement;
      if (splitContainer) {
        const currentPos = getComputedStyle(splitContainer).getPropertyValue('--split-position').trim();
        startSplitPosition = parseFloat(currentPos) || 20;
      }
      
      splitter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const splitContainer = splitter.closest('.split-container') as HTMLElement;
      if (!splitContainer) return;

      const containerRect = splitContainer.getBoundingClientRect();
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / containerRect.width) * 100;
      const newPosition = Math.max(10, Math.min(90, startSplitPosition + deltaPercent));
      
      // Update CSS variable
      splitContainer.style.setProperty('--split-position', `${newPosition}%`);
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
      className="splitter"
    />
  );
} 