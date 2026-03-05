import WindGL from './wind-gl';

export class WebGLWindOLAnimator {
  constructor({
    map,
    extentLCC,
    windData,
    scalarData = null,
    poll = 'WS',
    lineWidth,
  }) {
    this.map = map;
    this.extentLCC = extentLCC;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';

    const viewport = map.getViewport();
    const overlayContainer = viewport.querySelector(
      '.ol-overlaycontainer-stopevent',
    );
    viewport.insertBefore(this.canvas, overlayContainer);

    const gl = this.canvas.getContext('webgl', {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this.wind = new WindGL(gl, map, extentLCC);

    // particle 수
    const particleMultiplier = windData.gridKm === '9' ? 1.3 : 0.9;
    const n = windData.width * windData.height * particleMultiplier;
    this.wind.numParticles = Math.min(n, 65536);

    // webgl 데이터 주입
    this.wind.setWind(windData);

    if (scalarData) this.wind.setScalar(scalarData, poll);

    this.wind.setColorMode(poll);
    this.wind.setColorRampByPoll(poll);

    this.lineWidth = lineWidth;
    this.wind.setPointSize(this.lineWidth);

    this._lastZoom = null;
    this._lastResolution = null;

    this._running = true;
    this._bind();
  }

  _bind() {
    this._onMoveStart = () => {
      this._running = false;

      if (this._rafId) {
        cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
      const gl = this.wind.gl;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    this._onMoveEnd = () => {
      this.updateCanvas();
      this.wind.resize();

      this._running = true;
      this._rafId = requestAnimationFrame(this._loop);
    };

    this.map.on('movestart', this._onMoveStart);
    this.map.on('moveend', this._onMoveEnd);

    this.updateCanvas();
    this._rafId = requestAnimationFrame(this._loop);
  }

  _loop = () => {
    if (!this._running) return;

    this.wind.draw();
    this._rafId = requestAnimationFrame(this._loop);
  };

  applyZoomDependentSettings(size, zoom, resolution) {
    console.log('zoom: ', zoom);
    console.log('resolution: ', resolution);

    // zoom 기반 particle 개수 증가
    const screenArea = size[0] * size[1];

    let density = 0.002;
    if (zoom >= 12) density = 0.008;
    else if (zoom >= 11) density = 0.006;
    else if (zoom >= 10) density = 0.004;

    const maxParticles = 200000;
    const newCount = Math.min(screenArea * density, maxParticles);
    this.wind.numParticles = newCount;

    console.log('newCount:', newCount);

    // zoom 기반 pointSize 증가
    let pointSize = 1.3;

    if (zoom >= 11) pointSize = 2.6;
    else if (zoom >= 10) pointSize = 2.3;
    else if (zoom >= 9) pointSize = 1.8;
    else if (zoom >= 8) pointSize = 1.5;

    this.wind.setPointSize(pointSize);
    console.log('pointSize: ', pointSize);

    // resolution 기반 speedFactor 감소
    const baseResolution = 180;
    const baseSpeed = 0.15;

    let speed = baseSpeed * Math.sqrt(resolution / baseResolution);
    speed = Math.max(speed, 0.12);
    speed = Math.min(speed, 0.28);

    this.wind.setSpeedFactor(speed);
    console.log('speedFactor: ', speed);

    // zoom 기반 faceOpacity 증가
    let fadeOpacity = 0.998;

    if (zoom >= 12) fadeOpacity = 0.9999;
    else if (zoom >= 11) fadeOpacity = 0.9993;
    else if (zoom >= 10) fadeOpacity = 0.9988;
    else if (zoom >= 9) fadeOpacity = 0.9983;

    this.wind.setFadeOpacity(fadeOpacity);
  }

  updateCanvas() {
    const size = this.map.getSize();
    if (!size) return;

    // 항상 지도 전체를 덮음
    this.canvas.style.left = '0px';
    this.canvas.style.top = '0px';

    this.canvas.width = size[0];
    this.canvas.height = size[1];

    const view = this.map.getView();
    const zoom = view.getZoom();
    const resolution = view.getResolution();

    const zoomChanged =
      this._lastZoom !== zoom || this._lastResolution !== resolution;

    if (zoomChanged) {
      this.applyZoomDependentSettings(size, zoom, resolution);
      this._lastZoom = zoom;
      this._lastResolution = resolution;
    }

    this.wind.resize();
  }

  destroy() {
    this._running = false;

    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }

    this.map.un('movestart', this._onMoveStart);
    this.map.un('moveend', this._onMoveEnd);

    this.canvas.remove();
  }
}
