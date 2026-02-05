import { createContext, useCallback, useState } from 'react';

export const LccContext = createContext();

export const LccProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    gridKm: 9,
    layer: 0,
    tstep: 0,
    bgPoll: 'O3',
    webglPoll: 'WIND',
    arrowGap: 3,
  });

  const [style, setStyle] = useState({
    coordsOpacity: 0.3,
    arrowsOpacity: 1.0,
    earthScalarOpacity: 0.5,
    sidoshpOpacity: 1.0,
    arrowColor: '#FFFF00',
    windColor: '#1480FE',
    earthWindColor: '#ffffff',
    sidoshpColor: '#000000',
  });

  const [layerVisible, setLayerVisible] = useState({
    sidoshp: false,
    coords: false,
    arrows: false,
    windAnimation: false,
    earthWind: false,
    earthScalar: false,
    webglWind: true,
    grid: false,
  });

  const updateSettings = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  });

  const updateStyle = useCallback((key, value) => {
    setStyle(prev => ({ ...prev, [key]: value }));
  });

  const toggleLayer = useCallback((key, checked) => {
    setLayerVisible(prev => ({ ...prev, [key]: checked }));
  });

  const value = {
    settings,
    updateSettings,
    style,
    updateStyle,
    layerVisible,
    toggleLayer,
  };

  return <LccContext.Provider value={value}>{children}</LccContext.Provider>;
};
