import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import MapProvider from '@/components/map/MapProvider';
import Utm from '@/pages/Utm';
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
                <MapProvider id="UtmOverlayTest">
                  <Utm mapId="UtmOverlayTest" />
                </MapProvider>
              </div>
            }
          />
          <Route
            path="/lcc"
            element={
              <div className="flex flex-col w-screen h-screen">
                <MapProvider id="LccOverlayTest">
                  <Lcc mapId="LccOverlayTest" />
                </MapProvider>
              </div>
            }
          />
        </Routes>
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </div>
    </BrowserRouter>
  );
}

export default App;
