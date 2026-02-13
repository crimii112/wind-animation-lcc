import axios from 'axios';
import { useCallback } from 'react';

export function useLccApi(settings) {
  const baseUrl = import.meta.env.VITE_WIND_API_URL;

  const fetchSidoShp = useCallback(async () => {
    const { data } = await axios.post(`${baseUrl}/api/marker/sidoshp`);
    return data;
  }, [baseUrl]);

  const fetchLccData = useCallback(async () => {
    const { data } = await axios.post(`${baseUrl}/api/marker/lcc`, {
      gridKm: settings.gridKm,
      layer: settings.layer,
      tstep: settings.tstep,
      bgPoll: settings.bgPoll,
      arrowGap: settings.arrowGap,
    });
    return data;
  }, [
    baseUrl,
    settings.gridKm,
    settings.layer,
    settings.tstep,
    settings.bgPoll,
    settings.arrowGap,
  ]);

  const fetchEarthData = useCallback(async () => {
    const { data } = await axios.post(`${baseUrl}/api/marker/earth`, {
      gridKm: settings.gridKm,
      layer: settings.layer,
      tstep: settings.tstep,
      bgPoll: settings.bgPoll,
    });
    return data;
  }, [
    baseUrl,
    settings.gridKm,
    settings.layer,
    settings.tstep,
    settings.bgPoll,
  ]);

  const fetchWebGLData = useCallback(async () => {
    const { data } = await axios.post(`${baseUrl}/api/marker/webgl`, {
      gridKm: settings.gridKm,
      layer: settings.layer,
      tstep: settings.tstep,
      poll: settings.bgPoll,
    });
    return data;
  }, [
    baseUrl,
    settings.gridKm,
    settings.layer,
    settings.tstep,
    settings.bgPoll,
  ]);

  return {
    fetchSidoShp,
    fetchLccData,
    fetchEarthData,
    fetchWebGLData,
  };
}
