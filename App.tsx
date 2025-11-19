import React from 'react';
import Header from './components/Header';
import GridWorld from './components/GridWorld';
import Controls from './components/Controls';
import Stats from './components/Stats';
import { useRLEngine } from './hooks/useRLEngine';

const App: React.FC = () => {
  const { grid, config, trainingState, episodeStats, currentEpisode, agentPath, resources, routeHistory, qTable, actions } = useRLEngine();

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-gray-100 font-sans">
      <Header />
      <main className="container mx-auto p-6 lg:p-10 space-y-8">
        <section className="relative rounded-3xl bg-[#131417] border border-white/5 p-6 shadow-2xl shadow-black/40 overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(66,220,163,0.18),transparent_60%)] opacity-70 rounded-3xl" />
          <div className="relative">
            <GridWorld 
              grid={grid} 
              agentPath={agentPath}
              routeHistory={routeHistory}
              trainingState={trainingState}
              onGridChange={actions.updateGrid}
              qTable={qTable}
              distractionLayout={config.distractionLayout}
              distractionTypes={config.distractionTypes}
              defaultDistractionType={config.defaultDistractionType}
            />
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="w-full">
            <Controls
              config={config}
              onConfigChange={actions.updateConfig}
              trainingState={trainingState}
              onStart={actions.start}
              onPause={actions.pause}
              onStop={actions.stop}
              currentEpisode={currentEpisode}
              maxEpisodes={config.episodes}
              resources={resources}
            />
          </div>
          <div className="w-full">
            <Stats stats={episodeStats} maxEpisodes={config.episodes} />
          </div>
        </section>
      </main>
      <footer className="text-center py-6 mt-6 text-gray-500 text-sm border-t border-white/5">
        <p>Built with React, TypeScript, and Tailwind CSS.</p>
      </footer>
    </div>
  );
};

export default App;
