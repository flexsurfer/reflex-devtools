import ReactJson from '@microlink/react-json-view';
import { useTheme } from '../contexts/ThemeContext';

export function JsonViewer({ src, name }: { src: any; name: string }) {
    const { theme } = useTheme();

    return (
        <ReactJson
            src={src}
            name={name}
            theme={theme === "dark" ? "codeschool" : "rjv-default"}
            collapsed={1}
            sortKeys={true}
            displayDataTypes={false}
            displayObjectSize={true}
            enableClipboard={true}
            quotesOnKeys={false}
        />
    );
} 