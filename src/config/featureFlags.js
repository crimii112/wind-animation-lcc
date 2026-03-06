import { APP_VARIANT } from './appVariant';

const FEATURES_BY_VARIANT = {
  wal: {
    fullscreen: false, // 전체화면 기능
    showLayerSelect: false, // 패널-LAYER select
    showTstepSelect: false, // 패널-TSTEP select
    showPolygonModeSelect: false, // 패널-폴리곤 방식(모델링 농도장) select
    showModelingWindSection: false, // 패널-모델링 바람장 section
    showWebglWindSection: false,
    showEtcSection: false, // 패널-기타 section
  },
  wal2: {
    fullscreen: true,
    showLayerSelect: true,
    showTstepSelect: true,
    showPolygonModeSelect: true,
    showModelingWindSection: true,
    showWebglWindSection: true,
    showEtcSection: true,
  },
  nier: {
    fullscreen: false,
    showLayerSelect: false,
    showTstepSelect: false,
    showPolygonModeSelect: false,
    showModelingWindSection: false,
    showWebglWindSection: false,
    showEtcSection: false,
  },
  //   local: {
  //     fullscreen: false,
  //     showLayerSelect: false,
  //     showPolygonModeSelect: false,
  //     showModelingWindSection: false,
  //     showWebglWindSection: false,
  //     showEtcSection: false,
  //   },
  local: {
    fullscreen: true,
    showLayerSelect: true,
    showTstepSelect: false,
    showPolygonModeSelect: true,
    showModelingWindSection: true,
    showWebglWindSection: true,
    showEtcSection: true,
  },
};

export const FEATURES =
  FEATURES_BY_VARIANT[APP_VARIANT] || FEATURES_BY_VARIANT.local;
