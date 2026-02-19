import { createContext, useCallback, useState } from 'react';

export const LccContext = createContext();

export const LccProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    gridKm: 9,
    layer: 0,
    tstep: 0,
    bgPoll: 'WIND',
    arrowGap: 3,
    polygonMode: 'single',
  });

  const [style, setStyle] = useState({
    concPolygonOpacity: 0.5,
    windArrowsOpacity: 1.0,
    earthScalarOpacity: 0.5,
    shpOpacity: 1.0,
    arrowColor: '#FFFF00',
    windColor: '#1480FE',
    earthWindColor: '#ffffff',
    shpColor: '#000000',
  });

  const [layerVisible, setLayerVisible] = useState({
    shp: true,
    concPolygon: true,
    windArrows: false,
    windAnimation: false,
    earthWind: true,
    earthScalar: false,
    webglWind: false,
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
