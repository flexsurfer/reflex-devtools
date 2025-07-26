import '../styles/Header.css';
import { useSubscription } from '@flexsurfer/reflex';

export default function Header() {

    const isConnected = useSubscription<boolean>(['isConnected']);

    return (
        <header className="header">
            <h1>🔧 Reflex Devtools</h1>
            <div className="header-controls">
                <div className={`status ${isConnected ? 'connected' : 'disconnected'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                </div>
            </div>
        </header>
    );
} 