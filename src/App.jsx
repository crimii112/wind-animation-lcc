import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MapProvider from '@/components/map/MapProvider';
import Lcc from '@/pages/Lcc';
import { LccProvider } from '@/components/lcc/LccContext';

function App() {
  const basename = import.meta.env.PROD
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined;

  return (
    <BrowserRouter basename={basename}>
      <div id="fullscreen-area">
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex flex-col w-screen h-screen">
                <LccProvider>
                  <MapProvider id="LccOverlayTest">
                    <Lcc mapId="LccOverlayTest" />
                  </MapProvider>
                </LccProvider>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
