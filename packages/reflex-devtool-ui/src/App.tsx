import Header from './components/Header';
import TracesPanel from './components/TracesPanel';
import DatabasePanel from './components/DatabasePanel';
import TracePanel from './components/TracePanel';
import Splitter from './components/Splitter';
import VerticalSplitter from './components/VerticalSplitter';
import './App.css';

function App() {

  return (
    <div className="app">
      <Header />

      <main className="main">
        <div className="split-container">
          <TracesPanel />
          <Splitter />
          <div className="right-panels">
            <DatabasePanel />
            <VerticalSplitter />
            <TracePanel />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App; 