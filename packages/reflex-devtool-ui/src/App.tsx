import Header from './components/Header';
import TracesListPanel from './components/TracesListPanel';
import DatabasePanel from './components/DatabasePanel';
import TraceDetailsPanel from './components/trace/TraceDetailsPanel';
import Splitter from './components/ui/Splitter';
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Header />

        <main className="main-content">
          <div className="split-layout" style={{'--split-position': '25%'} as React.CSSProperties}>
            <TracesListPanel />
            <Splitter />
            <div className="vertical-split-layout" style={{'--vertical-split-position': '70%'} as React.CSSProperties}>
              <DatabasePanel />
              <Splitter orientation="vertical" />
              <TraceDetailsPanel />
            </div>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App; 