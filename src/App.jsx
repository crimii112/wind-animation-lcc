import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MapProvider from '@/components/map/MapProvider';
import Lcc from '@/pages/Lcc';
import { LccProvider } from '@/components/lcc/LccContext';

function App() {
  return (
    <BrowserRouter basename="/wal">
      <div className="">
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex flex-col w-screen h-screen">
                <MapProvider id="LccOverlayTest">
                  <LccProvider>
                    <Lcc mapId="LccOverlayTest" />
                  </LccProvider>
                </MapProvider>
              </div>
            }
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
