import { BrowserRouter, Route, Routes } from 'react-router-dom';

import MapProvider from '@/components/map/MapProvider';
import Lcc from '@/pages/Lcc';

function App() {
  return (
    <BrowserRouter>
      <div className="">
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex flex-col w-screen h-screen">
                <MapProvider id="LccOverlayTest">
                  <Lcc mapId="LccOverlayTest" />
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
