import { createContext, useCallback, useState } from 'react';
import { APP_VARIANT } from '@/config/appVariant';

export const LccContext = createContext();

const IS_WAL = APP_VARIANT === 'wal';

export const LccProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    gridKm: 9,
    layer: 0,
    tstep: 0,
    bgPoll: 'PM2.5',
    arrowGap: 3,
    polygonMode: IS_WAL ? 'single' : 'single',
    zoom: 7.8,
  });

  const [style, setStyle] = useState({
    concPolygonOpacity: 0.5,
    windArrowsOpacity: 1.0,
    earthScalarOpacity: 0.5,
    shpOpacity: IS_WAL ? 0.7 : 1.0,
    arrowColor: '#FFFF00',
    windColor: '#1480FE',
    windLineWidth: 1,
    earthWindColor: '#ffffff',
    earthWindLineWidth: 1.5,
    webglWindLineWidth: 1.0,
    shpColor: '#000000',
  });

  const [layerVisible, setLayerVisible] = useState({
    shp: IS_WAL ? true : true,
    concPolygon: true,
    windArrows: IS_WAL ? false : false,
    windAnimation: IS_WAL ? false : false,
    earthWind: true,
    earthScalar: false,
    webglWind: IS_WAL ? false : true,
    grid: false,
  });

  const updateSettings = useCallback((key, value) => {
    setSettings(prev => {
      if (IS_WAL && key === 'polygonMode') {
        return { ...prev, polygonMode: 'single' };
      }
      return { ...prev, [key]: value };
    });
  });

  const updateStyle = useCallback((key, value) => {
    setStyle(prev => {
      if (IS_WAL && key === 'shpOpacity') {
        return { ...prev, shpOpacity: 0.7 };
      }
      return { ...prev, [key]: value };
    });
  });

  const toggleLayer = useCallback((key, checked) => {
    setLayerVisible(prev => {
      if (IS_WAL && key === 'shp') {
        return { ...prev, shp: true };
      }

      if (
        IS_WAL &&
        (key === 'windArrows' || key === 'windAnimation' || key === 'webglWind')
      ) {
        return { ...prev, [key]: false };
      }

      return { ...prev, [key]: checked };
    });
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
