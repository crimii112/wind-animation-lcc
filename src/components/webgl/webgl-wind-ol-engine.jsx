import WindGL from './wind-gl';

export class WebGLWindOLAnimator {
  constructor({ map, extentLCC, windData, scalarData = null, poll = 'WIND' }) {
    this.map = map;
    this.extentLCC = extentLCC;

    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    // this.canvas.style.zIndex = 100;

    // map.getViewport().appendChild(this.canvas);
    const viewport = map.getViewport();
    const overlayContainer = viewport.querySelector(
      '.ol-overlaycontainer-stopevent',
    );
    viewport.insertBefore(this.canvas, overlayContainer);

    const gl = this.canvas.getContext('webgl', { antialias: false });
    this.wind = new WindGL(gl);

    // particle 수
    const particleMultiplier = windData.gridKm === '9' ? 1.3 : 0.9;
    const n = windData.width * windData.height * particleMultiplier;
    this.wind.numParticles = Math.min(n, 65536);

    // webgl 데이터 주입
    this.wind.setWind(windData);

    if (scalarData) this.wind.setScalar(scalarData, poll);

    this.wind.setColorMode(poll);
    this.wind.setColorRampByPoll(poll);

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

      this.canvas.style.display = 'none';
    };

    this._onMoveEnd = () => {
      this.updateCanvas();
      this.canvas.style.display = 'block';

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

  updateCanvas() {
    const view = this.map.getView();
    const size = this.map.getSize();
    if (!size) return;

    this.canvas.width = size[0];
    this.canvas.height = size[1];
    this.canvas.style.left = '0px';
    this.canvas.style.top = '0px';

    const extentLCC = this.extentLCC;
    const minPx = this.map.getPixelFromCoordinate([extentLCC[0], extentLCC[3]]);
    const maxPx = this.map.getPixelFromCoordinate([extentLCC[2], extentLCC[1]]);

    const left = minPx[0];
    const top = minPx[1];
    const width = maxPx[0] - minPx[0];
    const height = maxPx[1] - minPx[1];

    this.canvas.style.left = `${left}px`;
    this.canvas.style.top = `${top}px`;
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);

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
