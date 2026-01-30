function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Failed to create shader');

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const ok = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!ok) {
    const log = gl.getShaderInfoLog(shader) || '';
    gl.deleteShader(shader);
    throw new Error(`Shader compile failed: ${log}`);
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

  const program = gl.createProgram();
  if (!program) throw new Error('Failed to create program');

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  gl.deleteShader(vs);
  gl.deleteShader(fs);

  const ok = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!ok) {
    const log = gl.getShaderInfoLog(program) || '';
    gl.deleteProgram(program);
    throw new Error(`Program link failed: ${log}`);
  }

  return program;
}

function resizeCanvasToDisplaySize(canvas, pixelRatio = 1) {
  const displayWidth = Math.floor(canvas.clientWidth * pixelRatio);
  const displayHeight = Math.floor(canvas.clientHeight * pixelRatio);

  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    return true;
  }
  return false;
}

function createFullscreenQuad(gl) {
  const vaoExt = gl.getExtension('OES_vertex_array_object');
  const vao = vaoExt ? vaoExt.createVertexArrayOES() : null;

  const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

  const vbo = gl.createBuffer();
  if (!vbo) throw new Error('Failed to create buffer');

  if (vaoExt && vao) vaoExt.bindVertexArrayOES(vao);

  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  if (vaoExt && vao) vaoExt.bindVertexArrayOES(null);

  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vaoExt, vao, vbo, vertexCount: 6 };
}

function createWindTextureData(uRec, vRec) {
  const { nx, ny } = uRec.header;
  const uData = uRec.data;
  const vData = vRec.data;

  const size = nx * ny * 4;
  const pixels = new Uint8Array(size);

  let uMin = Infinity,
    uMax = -Infinity;
  let vMin = Infinity,
    vMax = -Infinity;

  for (let i = 0; i < uData.length; i++) {
    const u = uData[i];
    const v = vData[i];
    if (u == null || v == null) continue;

    uMin = Math.min(uMin, u);
    uMax = Math.max(uMax, u);
    vMin = Math.min(vMin, v);
    vMax = Math.max(vMax, v);
  }

  for (let i = 0; i < uData.length; i++) {
    const u = uData[i];
    const v = vData[i];

    const idx = i * 4;

    if (u == null || v == null) {
      pixels[idx + 0] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
      pixels[idx + 3] = 255;
    } else {
      pixels[idx + 0] = Math.floor((255 * (u - uMin)) / (uMax - uMin));
      pixels[idx + 1] = Math.floor((255 * (v - vMin)) / (vMax - vMin));
      pixels[idx + 2] = 255;
      pixels[idx + 3] = 255;
    }
  }

  return {
    pixels,
    width: nx,
    height: ny,
    uMin,
    uMax,
    vMin,
    vMax,
  };
}

const TEST_VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  // NDC(-1..1) -> UV(0..1)
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const TEST_FS = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
void main() {
  // 시간에 따라 살짝 변하는 그라데이션(테스트)
  float t = 0.5 + 0.5 * sin(u_time);
  gl_FragColor = vec4(v_uv.x, v_uv.y, t, 0.65);
}
`;

const WIND_DEBUG_VS = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const WIND_DEBUG_FS = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_wind;
void main() {
  vec4 w = texture2D(u_wind, v_uv);
  // R=U, G=V를 그대로 보여줌 (B=valid도 같이 보면 좋음)
  gl_FragColor = vec4(w.r, w.g, w.b, 0.85);
}
`;

const FRAGMENT_SHADER = `
precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_wind;

// 지도 정보
uniform vec4 u_mapExtent; // minX, minY, maxX, maxY

// wind grid 정보
uniform vec2 u_windOrigin; // lo1, la1
uniform vec2 u_windDelta;  // dx, dy
uniform vec2 u_windSize;   // nx, ny

void main() {
  // 1. 화면 UV → 지도 LCC 좌표
  float x = mix(u_mapExtent.x, u_mapExtent.z, v_uv.x);
  float y = mix(u_mapExtent.y, u_mapExtent.w, 1.0 - v_uv.y);

  // 2. convert center-origin -> corner-origin
  float originX = u_windOrigin.x - u_windDelta.x * 0.5;
  float originY = u_windOrigin.y - u_windDelta.y * 0.5;

  // 3. map coord -> grid index
  float i = (x - originX) / u_windDelta.x;
  float j = (y - originY) / u_windDelta.y;

  // dy < 0 이므로 j는 자동으로 양수 방향
  if (i < 0.0 || j < 0.0 || i >= u_windSize.x || j >= u_windSize.y) {
    discard;
  }

  // 4. grid index → texture UV
  vec2 windUV = vec2(
    (i + 0.5) / u_windSize.x,
    (j + 0.5) / u_windSize.y
  );

  vec4 w = texture2D(u_wind, windUV);

  gl_FragColor = vec4(w.r, w.g, w.b, 0.9);
}
`;

export class WebGLWindOLAnimator {
  constructor({ map, grid }) {
    this.map = map;
    this.grid = grid;

    this.canvas = null;
    this.gl = null;

    this.pixelRatio = 1;

    // this._testProgram = null;
    // this._testLocations = null;
    this._quad = null;

    this._running = false;
    this._startTime = 0;
  }

  init(container, pixelRatio = 1) {
    this.pixelRatio = pixelRatio;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // 지도 이벤트 방해 안 하게
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    container.appendChild(canvas);

    this.canvas = canvas;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) throw new Error('WebGL not supported or context creation failed');

    this.gl = gl;

    this._ext = {
      texFloat: gl.getExtension('OES_texture_float'),
      texHalfFloat: gl.getExtension('OES_texture_half_float'),
      vao: gl.getExtension('OES_vertex_array_object'),
    };

    this._setupGLState();
    this._setupWindMapRender();
  }

  _setupGLState() {
    const gl = this.gl;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
  }

  _setupTestRender() {
    const gl = this.gl;

    this._testProgram = createProgram(gl, TEST_VS, TEST_FS);

    this._testLocations = {
      a_pos: gl.getAttribLocation(this._testProgram, 'a_pos'),
      u_time: gl.getUniformLocation(this._testProgram, 'u_time'),
    };

    this._quad = createFullscreenQuad(gl);
  }

  _setupWindDebugRender() {
    const gl = this.gl;
    this._windDebugProgram = createProgram(gl, WIND_DEBUG_VS, WIND_DEBUG_FS);
    this._windDebugLoc = {
      a_pos: gl.getAttribLocation(this._windDebugProgram, 'a_pos'),
      u_wind: gl.getUniformLocation(this._windDebugProgram, 'u_wind'),
    };
  }

  _setupWindMapRender() {
    const gl = this.gl;
    this._windMapProgram = createProgram(gl, TEST_VS, FRAGMENT_SHADER);

    this._windMapLoc = {
      a_pos: gl.getAttribLocation(this._windMapProgram, 'a_pos'),
      u_wind: gl.getUniformLocation(this._windMapProgram, 'u_wind'),

      u_mapExtent: gl.getUniformLocation(this._windMapProgram, 'u_mapExtent'),
      u_windOrigin: gl.getUniformLocation(this._windMapProgram, 'u_windOrigin'),
      u_windDelta: gl.getUniformLocation(this._windMapProgram, 'u_windDelta'),
      u_windSize: gl.getUniformLocation(this._windMapProgram, 'u_windSize'),
    };

    this._quad = createFullscreenQuad(gl);
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._startTime = performance.now();
  }

  stop() {
    this._running = false;
  }

  drawFrame(frameState) {
    if (!this._running || !this.gl || !this.canvas) return;
    if (!this._quad || !this._windTexture) return;

    const gl = this.gl;

    resizeCanvasToDisplaySize(this.canvas, this.pixelRatio);

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this._windMapProgram);

    const { vaoExt, vao, vbo, vertexCount } = this._quad;
    if (vaoExt && vao) vaoExt.bindVertexArrayOES(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.enableVertexAttribArray(this._windMapLoc.a_pos);
    gl.vertexAttribPointer(this._windMapLoc.a_pos, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this._windTexture);
    gl.uniform1i(this._windMapLoc.u_wind, 0);

    // const extent = this.map.getView().calculateExtent(this.map.getSize());
    const extent = frameState.extent;

    gl.uniform4f(
      this._windMapLoc.u_mapExtent,
      extent[0],
      extent[1],
      extent[2],
      extent[3],
    );

    const h = this._windMetaHeader;

    gl.uniform2f(this._windMapLoc.u_windOrigin, h.lo1, h.la1);
    gl.uniform2f(this._windMapLoc.u_windDelta, h.dx, h.dy);
    gl.uniform2f(this._windMapLoc.u_windSize, h.nx, h.ny);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    if (vaoExt && vao) vaoExt.bindVertexArrayOES(null);

    // const t = (performance.now() - this._startTime) / 1000;
    // if (this._testLocations.u_time) gl.uniform1f(this._testLocations.u_time, t);

    // const { vaoExt, vao, vbo, vertexCount } = this._quad;

    // if (vaoExt && vao) {
    //   vaoExt.bindVertexArrayOES(vao);

    //   gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    //   gl.enableVertexAttribArray(this._testLocations.a_pos);
    //   gl.vertexAttribPointer(
    //     this._testLocations.a_pos,
    //     2,
    //     gl.FLOAT,
    //     false,
    //     0,
    //     0,
    //   );
    // } else {
    //   gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    //   gl.enableVertexAttribArray(this._testLocations.a_pos);
    //   gl.vertexAttribPointer(
    //     this._testLocations.a_pos,
    //     2,
    //     gl.FLOAT,
    //     false,
    //     0,
    //     0,
    //   );
    // }

    // gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

    // gl.bindBuffer(gl.ARRAY_BUFFER, null);
    // if (vaoExt && vao) vaoExt.bindVertexArrayOES(null);
  }

  destroy() {
    const gl = this.gl;
    if (!gl) return;

    // if (this._testProgram) gl.deleteProgram(this._testProgram);
    if (this._quad?.vbo) gl.deleteBuffer(this._quad.vbo);
    if (this._quad?.vaoExt && this._quad?.vao)
      this._quad.vaoExt.deleteVertexArrayOES(this._quad.vao);

    // this._testProgram = null;
    this._quad = null;
    this.gl = null;
    this.canvas = null;
  }

  setWindFromUV(uRec, vRec) {
    const wind = createWindTextureData(uRec, vRec);
    this._createWindTexture(wind);

    this._windMetaHeader = {
      lo1: uRec.header.lo1,
      la1: uRec.header.la1,
      dx: uRec.header.dx,
      dy: uRec.header.dy,
      nx: uRec.header.nx,
      ny: uRec.header.ny,
    };
  }

  _createWindTexture(wind) {
    const gl = this.gl;

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      wind.width,
      wind.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      wind.pixels,
    );

    gl.bindTexture(gl.TEXTURE_2D, null);

    this._windTexture = tex;
    this._windMeta = wind;
  }
}
