import { useMemo, useRef, useEffect, useState } from 'react';
import { Trace } from '../../types/Trace';
import { useTheme } from '../../contexts/ThemeContext';
import ForceGraph2D from 'react-force-graph-2d';
import { createGraphData } from '../../utils/graphUtils';

function getNodeColor(type: string, theme: string): string {
    const isDark = theme === 'dark';

    switch (type) {
        case 'appdb':
            // Using success color from badges: oklch(76% .177 163.223)
            return isDark ? '#22c55e' : '#16a34a';
        case 'sub/run':
            // Using primary color from badges: oklch(45% .24 277.023)
            return isDark ? '#3b82f6' : '#2563eb';
        case 'render':
            // Using info color from badges: oklch(74% .16 232.661)
            return isDark ? '#06b6d4' : '#0891b2';
        default:
            return isDark ? '#6b7280' : '#4b5563'; // gray
    }
}

export default function GraphView({ traces }: { traces: Trace[] }) {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    // Track container dimensions changes
    useEffect(() => {
        if (!containerRef.current) return;

        const updateDimensions = () => {
            const { width, height } = containerRef.current!.getBoundingClientRect();
            setDimensions({ width, height });
        };

        // Initial measurement
        updateDimensions();

        // Use ResizeObserver to track size changes
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    const graphData = useMemo(() => createGraphData(traces), [traces]);

    if (graphData.nodes.length === 1 && graphData.links.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-base-content/60">
                <p>No graph data to display</p>
            </div>
        );
    }

    // Don't render graph until we have dimensions
    if (dimensions.width === 0 || dimensions.height === 0) {
        return <div ref={containerRef} className="w-full h-full" />;
    }

    return (
        <div ref={containerRef} className="w-full h-full">
            <ForceGraph2D
                graphData={graphData}
                width={dimensions.width}
                height={dimensions.height}
                nodeLabel="label"
                backgroundColor="transparent"
                enableNodeDrag={true}
                enableZoomInteraction={true}
                linkColor={() => theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.2)'}
                dagMode="lr"
                dagLevelDistance={150}
                nodeCanvasObject={(node: any, ctx: any, globalScale: any) => {
                    const label = node.label;
                    const fontSize = 14 / globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4); // some padding

                    ctx.fillStyle = theme === 'dark' ? '#191e24' : 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    // Draw label with color based on node type and theme
                    ctx.fillStyle = getNodeColor(node.type, theme);
                    ctx.fillText(label, node.x, node.y);

                    node.__bckgDimensions = bckgDimensions; // to re-use in nodePointerAreaPaint
                }}
            />
        </div>
    );
}
