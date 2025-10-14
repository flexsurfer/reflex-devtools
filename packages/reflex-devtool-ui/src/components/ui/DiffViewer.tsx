interface Patch {
    op: 'replace' | 'add' | 'remove';
    path: (string | number)[];
    value?: any;
}

interface DiffViewerProps {
    patches?: Patch[];
}

interface DiffLine {
    type: 'add' | 'remove';
    path: string;
    value: string;
}

function patchesToDiffLines(patches: Patch[]): DiffLine[] {
    const lines: DiffLine[] = [];

    patches.forEach((patch) => {
        const pathStr = patch.path.map(segment =>
            typeof segment === 'number' ? `[${segment}]` : `.${segment}`
        ).join('').replace(/^\./, '');

        const valueStr = patch.value === undefined ? '' :
            typeof patch.value === 'string' ? `"${patch.value}"` :
            JSON.stringify(patch.value);

        if (patch.op === 'add') {
            lines.push({ type: 'add', path: pathStr, value: valueStr });
        } else if (patch.op === 'replace') {
            lines.push({ type: 'remove', path: pathStr, value: "" });
            lines.push({ type: 'add', path: pathStr, value: valueStr });
        } else if (patch.op === 'remove') {
            lines.push({ type: 'remove', path: pathStr, value: '' });
        }
    });

    return lines;
}

export function DiffViewer({ patches }: DiffViewerProps) {
    const diffLines = patchesToDiffLines(patches ?? []);

    if (diffLines.length > 0) {
        return (
            <div className="font-mono text-sm bg-base-100 p-2">
                <pre className="whitespace-pre-wrap">
                    {diffLines.map((line, index) => {
                        const isAddition = line.type === 'add';
                        const textColor = isAddition ? 'text-green-400' : 'text-red-400';
                        const symbol = isAddition ? '+' : '-';

                        return (
                            <div key={index} className={textColor}>
                                {symbol} {line.path}: {line.value}
                            </div>
                        );
                    })}
                </pre>
            </div>
        );
    }
}
