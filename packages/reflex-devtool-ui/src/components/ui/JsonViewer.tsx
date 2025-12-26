import { useRef } from 'react';
import { ObjectView, ObjectViewHandle, themeOneDark, themeQuietLight, extendTheme, ResolverFn } from 'react-obj-view';
import "react-obj-view/dist/react-obj-view.css";
import { useTheme } from '../../contexts/ThemeContext';
import { SearchBox } from './SearchBox';

const darkTheme = extendTheme(themeOneDark, {
    background: 'transparent',
});

const lightTheme = extendTheme(themeQuietLight, {
    background: 'transparent',
});

// Custom resolver for Set - renders as plain array of values
const setResolver: ResolverFn<Set<any>> = (set, _cb, next) => {
    // Delegate to array renderer - shows values directly without key/value wrapper
    next(Array.from(set));
};

// Custom resolver for Map - renders as plain array of [key, value] entries
const mapResolver: ResolverFn<Map<any, any>> = (map, _cb, next) => {
    // Delegate to array renderer - shows entries as [key, value] tuples
    next(Array.from(map.entries()));
};

const customResolver = new Map<any, ResolverFn>([
    [Set, setResolver],
    [Map, mapResolver],
]);

export function JsonViewer({ src, name }: { src: any; name: string }) {
    const { theme } = useTheme();
    const objViewRef = useRef<ObjectViewHandle>(undefined);

    return (
        <div className="w-full h-full relative">
            <div className="absolute top-1 right-1 z-10">
                <SearchBox objViewRef={objViewRef} />
            </div>
            <ObjectView
                ref={objViewRef}
                valueGetter={() => src}
                name={name}
                expandLevel={1}
                showLineNumbers={false}
                objectGroupSize={100}
                arrayGroupSize={100}
                highlightUpdate={true}
                style={theme === 'dark' ? darkTheme : lightTheme}
                resolver={customResolver}
            />
        </div>
    );
} 