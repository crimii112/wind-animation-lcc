function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);

  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);

  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(program));

  const wrapper = { program };

  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttributes; i++) {
    const attribute = gl.getActiveAttrib(program, i);
    wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
  }

  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < numUniforms; i++) {
    const uniform = gl.getActiveUniform(program, i);
    wrapper[uniform.name] = gl.getUniformLocation(program, uniform.name);
  }

  return wrapper;
}

function createTexture(gl, filter, data, width, height) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);

  if (data instanceof Uint8Array) {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      width,
      height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      data,
    );
  } else {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, data);
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
  return texture;
}

function bindTexture(gl, texture, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
}

function createBuffer(gl, data) {
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function bindAttribute(gl, buffer, attribute, numComponents) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, numComponents, gl.FLOAT, false, 0, 0);
}

function bindFramebuffer(gl, framebuffer, texture) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  if (texture) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0,
    );
  }
}

// ------------------------------
// 2) 셰이더 (Mapbox 원형 최대 유지)
//    단, wind uv를 "particle(0..1)->extent(LCC)->gridUV"로 변환
// ------------------------------

// particle state에서 pos(0..1) 복원해서 point 위치로 사용 (그대로 유지)
const drawVert = `
precision mediump float;

attribute float a_index;

uniform sampler2D u_particles;
uniform float u_particles_res;

varying vec2 v_particle_pos;

void main() {
    vec4 color = texture2D(u_particles, vec2(
        fract(a_index / u_particles_res),
        floor(a_index / u_particles_res) / u_particles_res));

    // decode current particle position from the pixel's RGBA value (0..1)
    v_particle_pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a);

    gl_PointSize = 2.5;
    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0.0, 1.0);
}
`;

// drawFrag: particle pos(0..1)에서 wind를 샘플링하려면 변환 필요
// - u_extent: [minX, minY, maxX, maxY] in LCC meters
// - u_grid_origin: (x0,y0) in LCC meters (lo1, la1)
// - u_grid_step: (dx, dy) in meters (dy는 음수일 수 있음)
// - u_grid_size: (nx, ny)
const drawFrag = `
precision mediump float;

uniform sampler2D u_wind;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;

uniform sampler2D u_color_ramp;

// LCC/그리드 변환용
uniform vec4 u_extent;
uniform vec2 u_grid_origin;
uniform vec2 u_grid_step;
uniform vec2 u_grid_size;

varying vec2 v_particle_pos;

// wind speed lookup; manual bilinear (Mapbox updateFrag와 동일 개념)
vec2 lookup_wind(const vec2 uv, const vec2 windRes) {
    vec2 px = 1.0 / windRes;
    vec2 vc = (floor(uv * windRes)) * px;
    vec2 f = fract(uv * windRes);
    vec2 tl = texture2D(u_wind, vc).rg;
    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0.0)).rg;
    vec2 bl = texture2D(u_wind, vc + vec2(0.0, px.y)).rg;
    vec2 br = texture2D(u_wind, vc + px).rg;
    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    // particle pos(0..1) -> LCC meters (extent 기반)
    float x = mix(u_extent.x, u_extent.z, v_particle_pos.x);
    float y = mix(u_extent.y, u_extent.w, 1.0 - v_particle_pos.y); // y는 화면좌표라 뒤집어줌

    // LCC meters -> grid UV(0..1)
    // grid index = (x - x0)/dx, (y - y0)/dy
    float gx = (x - u_grid_origin.x) / u_grid_step.x;
    float gy = (y - u_grid_origin.y) / u_grid_step.y;

    vec2 gridUV = vec2(gx / (u_grid_size.x - 1.0), gy / (u_grid_size.y - 1.0));

    // 밖이면 안그리기 (투명)
    if (gridUV.x < 0.0 || gridUV.x > 1.0 || gridUV.y < 0.0 || gridUV.y > 1.0) {
        discard;
    }

    // 바람 벡터 복원
    vec2 wind01 = lookup_wind(gridUV, u_grid_size);
    vec2 velocity = mix(u_wind_min, u_wind_max, wind01);

    float speed_t = length(velocity) / length(u_wind_max);

    // color ramp is encoded in a 16x16 texture
    vec2 ramp_pos = vec2(
        fract(16.0 * speed_t),
        floor(16.0 * speed_t) / 16.0);

    gl_FragColor = texture2D(u_color_ramp, ramp_pos);
}
`;

// 화면 전체 사각형
const quadVert = `
precision mediump float;

attribute vec2 a_pos;

varying vec2 v_tex_pos;

void main() {
    v_tex_pos = a_pos;
    gl_Position = vec4(1.0 - 2.0 * a_pos, 0.0, 1.0);
}
`;

// 이전 프레임 페이드
const screenFrag = `
precision mediump float;

uniform sampler2D u_screen;
uniform float u_opacity;

varying vec2 v_tex_pos;

void main() {
    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);
    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);
}
`;

// updateFrag: EPSG:4326 왜곡 보정 제거
// 대신 velocity(m/s) -> 화면 이동(정규화)로 변환
// - u_resolution: canvas size (pixels)
// - u_map_res: meters per pixel (OpenLayers view.getResolution())
// - u_dt: seconds per frame (고정값으로 시작해도 됨)
const updateFrag = `
precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_wind;

uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;

uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_drop_rate;
uniform float u_drop_rate_bump;

// LCC/그리드 변환
uniform vec4 u_extent;
uniform vec2 u_grid_origin;
uniform vec2 u_grid_step;
uniform vec2 u_grid_size;

// 화면-이동량 변환
uniform vec2 u_resolution; // pixels
uniform float u_map_res;   // meters per pixel
uniform float u_dt;        // seconds

varying vec2 v_tex_pos;

// pseudo-random generator
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}

// manual bilinear
vec2 lookup_wind(const vec2 uv) {
    vec2 px = 1.0 / u_wind_res;
    vec2 vc = (floor(uv * u_wind_res)) * px;
    vec2 f = fract(uv * u_wind_res);
    vec2 tl = texture2D(u_wind, vc).rg;
    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0.0)).rg;
    vec2 bl = texture2D(u_wind, vc + vec2(0.0, px.y)).rg;
    vec2 br = texture2D(u_wind, vc + px).rg;
    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(
        color.r / 255.0 + color.b,
        color.g / 255.0 + color.a); // particle pos in 0..1

    // particle(0..1) -> LCC meters
    float x = mix(u_extent.x, u_extent.z, pos.x);
    float y = mix(u_extent.y, u_extent.w, 1.0 - pos.y);

    // LCC -> grid UV
    float gx = (x - u_grid_origin.x) / u_grid_step.x;
    float gy = (y - u_grid_origin.y) / u_grid_step.y;
    vec2 gridUV = vec2(gx / (u_grid_size.x - 1.0), gy / (u_grid_size.y - 1.0));

    // 바깥이면 드랍 처리 유도 (나중에 mix로 랜덤점프)
    // 밖이면 그냥 아주 높은 드랍 확률처럼 취급
    float outside = step(gridUV.x, 0.0) + step(1.0, gridUV.x) + step(gridUV.y, 0.0) + step(1.0, gridUV.y);
    outside = clamp(outside, 0.0, 1.0);

    // 샘플
    vec2 wind01 = lookup_wind(clamp(gridUV, 0.0, 1.0));
    vec2 velocity = mix(u_wind_min, u_wind_max, wind01); // m/s
    float speed_t = length(velocity) / length(u_wind_max);

    // m/s -> pixels 이동: (m/s * dt) / (m/pixel) = pixels
    vec2 pixelOffset = (velocity * u_dt) / max(u_map_res, 1e-6);

    // pixels -> normalized(0..1) 이동: pixels / canvasPixels
    vec2 normOffset = vec2(pixelOffset.x / u_resolution.x, -pixelOffset.y / u_resolution.y);

    // 속도 배율 및 안정적 스케일
    normOffset *= 3.0 * u_speed_factor;

    // 업데이트
    pos = pos + normOffset;

    // seed
    vec2 seed = (pos + v_tex_pos) * u_rand_seed;

    // drop
    float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump + 0.25 * outside;
    float drop = step(1.0 - drop_rate, rand(seed));

    vec2 random_pos = vec2(rand(seed + 1.3), rand(seed + 2.1));
    pos = mix(pos, random_pos, drop);

    // wrap (화면 반복) — 원본 컨셉 유지
    pos = fract(1.0 + pos);

    // encode back to RGBA
    gl_FragColor = vec4(
        fract(pos * 255.0),
        floor(pos * 255.0) / 255.0);
}
`;

const defaultRampColors = {
  0.0: '#3288bd',
  0.1: '#66c2a5',
  0.2: '#abdda4',
  0.3: '#e6f598',
  0.4: '#fee08b',
  0.5: '#fdae61',
  0.6: '#f46d43',
  1.0: '#d53e4f',
};

function getColorRamp(colors) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 256;
  canvas.height = 1;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const stop in colors) gradient.addColorStop(+stop, colors[stop]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
}

class WindGL {
  constructor(gl) {
    this.gl = gl;

    this.fadeOpacity = 0.94;
    this.speedFactor = 1.2;
    this.dropRate = 0.01;
    this.dropRateBump = 0.02;

    this.drawProgram = createProgram(gl, drawVert, drawFrag);
    this.screenProgram = createProgram(gl, quadVert, screenFrag);
    this.updateProgram = createProgram(gl, quadVert, updateFrag);

    this.quadBuffer = createBuffer(
      gl,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    );

    this.framebuffer = gl.createFramebuffer();

    this.setColorRamp(defaultRampColors);
    this.resize();

    // 매 프레임 외부에서 업데이트할 uniforms (LCC/OL)
    this._extent = [0, 0, 1, 1]; // [minX, minY, maxX, maxY] in LCC meters
    this._gridOrigin = [0, 0]; // [x0, y0]
    this._gridStep = [1, 1]; // [dx, dy]
    this._gridSize = [1, 1]; // [nx, ny]
    this._mapRes = 1; // meters per pixel
    this._dt = 1 / 60; // seconds
  }

  setViewParams({ extent, mapRes, dt }) {
    if (extent) this._extent = extent;
    if (mapRes != null) this._mapRes = mapRes;
    if (dt != null) this._dt = dt;
  }

  setGridParams({ origin, step, size }) {
    if (origin) this._gridOrigin = origin;
    if (step) this._gridStep = step;
    if (size) this._gridSize = size;
  }

  resize() {
    const gl = this.gl;
    const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);

    this.backgroundTexture = createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height,
    );
    this.screenTexture = createTexture(
      gl,
      gl.NEAREST,
      emptyPixels,
      gl.canvas.width,
      gl.canvas.height,
    );
  }

  setColorRamp(colors) {
    this.colorRampTexture = createTexture(
      this.gl,
      this.gl.LINEAR,
      getColorRamp(colors),
      16,
      16,
    );
  }

  set numParticles(numParticles) {
    const gl = this.gl;
    const particleRes = (this.particleStateResolution = Math.ceil(
      Math.sqrt(numParticles),
    ));
    this._numParticles = particleRes * particleRes;

    const particleState = new Uint8Array(this._numParticles * 4);
    for (let i = 0; i < particleState.length; i++) {
      particleState[i] = Math.floor(Math.random() * 256);
    }

    this.particleStateTexture0 = createTexture(
      gl,
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes,
    );
    this.particleStateTexture1 = createTexture(
      gl,
      gl.NEAREST,
      particleState,
      particleRes,
      particleRes,
    );

    const particleIndices = new Float32Array(this._numParticles);
    for (let i = 0; i < this._numParticles; i++) particleIndices[i] = i;

    this.particleIndexBuffer = createBuffer(gl, particleIndices);
  }
  get numParticles() {
    return this._numParticles;
  }

  setWindFromUVGrid({ uData, vData, nx, ny, uMin, uMax, vMin, vMax }) {
    const gl = this.gl;
    const data = new Uint8Array(nx * ny * 4);

    const uDen = Math.max(uMax - uMin, 1e-9);
    const vDen = Math.max(vMax - vMin, 1e-9);

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const idx = j * nx + i;
        const k = idx * 4;

        const u01 = (uData[idx] - uMin) / uDen;
        const v01 = (vData[idx] - vMin) / vDen;

        data[k + 0] = Math.max(0, Math.min(255, Math.round(u01 * 255)));
        data[k + 1] = Math.max(0, Math.min(255, Math.round(v01 * 255)));
        data[k + 2] = 0;
        data[k + 3] = 255;
      }
    }

    this.windData = {
      width: nx,
      height: ny,
      uMin,
      uMax,
      vMin,
      vMax,
    };

    if (this.windTexture) gl.deleteTexture(this.windTexture);
    this.windTexture = createTexture(gl, gl.LINEAR, data, nx, ny);
  }

  draw() {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);

    bindTexture(gl, this.windTexture, 0);
    bindTexture(gl, this.particleStateTexture0, 1);

    this.drawScreen();
    this.updateParticles();
  }

  drawScreen() {
    const gl = this.gl;

    bindFramebuffer(gl, this.framebuffer, this.screenTexture);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.drawTexture(this.backgroundTexture, this.fadeOpacity);
    this.drawParticles();

    bindFramebuffer(gl, null);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.drawTexture(this.screenTexture, 1.0);
    gl.disable(gl.BLEND);

    const temp = this.backgroundTexture;
    this.backgroundTexture = this.screenTexture;
    this.screenTexture = temp;
  }

  drawTexture(texture, opacity) {
    const gl = this.gl;
    const program = this.screenProgram;

    gl.useProgram(program.program);
    bindAttribute(gl, this.quadBuffer, program.a_pos, 2);
    bindTexture(gl, texture, 2);
    gl.uniform1i(program.u_screen, 2);
    gl.uniform1f(program.u_opacity, opacity);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  drawParticles() {
    const gl = this.gl;
    const program = this.drawProgram;
    gl.useProgram(program.program);

    bindAttribute(gl, this.particleIndexBuffer, program.a_index, 1);
    bindTexture(gl, this.colorRampTexture, 2);

    gl.uniform1i(program.u_wind, 0);
    gl.uniform1i(program.u_particles, 1);
    gl.uniform1i(program.u_color_ramp, 2);

    gl.uniform1f(program.u_particles_res, this.particleStateResolution);

    gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
    gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);

    gl.uniform4f(
      program.u_extent,
      this._extent[0],
      this._extent[1],
      this._extent[2],
      this._extent[3],
    );
    gl.uniform2f(
      program.u_grid_origin,
      this._gridOrigin[0],
      this._gridOrigin[1],
    );
    gl.uniform2f(program.u_grid_step, this._gridStep[0], this._gridStep[1]);
    gl.uniform2f(program.u_grid_size, this._gridSize[0], this._gridSize[1]);

    gl.drawArrays(gl.POINTS, 0, this._numParticles);
  }

  updateParticles() {
    const gl = this.gl;

    bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
    gl.viewport(
      0,
      0,
      this.particleStateResolution,
      this.particleStateResolution,
    );

    const program = this.updateProgram;
    gl.useProgram(program.program);

    bindAttribute(gl, this.quadBuffer, program.a_pos, 2);

    gl.uniform1i(program.u_wind, 0);
    gl.uniform1i(program.u_particles, 1);

    gl.uniform1f(program.u_rand_seed, Math.random());
    gl.uniform2f(program.u_wind_res, this.windData.width, this.windData.height);
    gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
    gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);

    gl.uniform1f(program.u_speed_factor, this.speedFactor);
    gl.uniform1f(program.u_drop_rate, this.dropRate);
    gl.uniform1f(program.u_drop_rate_bump, this.dropRateBump);

    gl.uniform4f(
      program.u_extent,
      this._extent[0],
      this._extent[1],
      this._extent[2],
      this._extent[3],
    );
    gl.uniform2f(
      program.u_grid_origin,
      this._gridOrigin[0],
      this._gridOrigin[1],
    );
    gl.uniform2f(program.u_grid_step, this._gridStep[0], this._gridStep[1]);
    gl.uniform2f(program.u_grid_size, this._gridSize[0], this._gridSize[1]);

    gl.uniform2f(program.u_resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(program.u_map_res, this._mapRes);
    gl.uniform1f(program.u_dt, this._dt);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    const temp = this.particleStateTexture0;
    this.particleStateTexture0 = this.particleStateTexture1;
    this.particleStateTexture1 = temp;

    bindFramebuffer(gl, null);
  }
}

export class WebGLWindOLAnimator {
  constructor({ map, uRec, vRec, options = {} }) {
    this.map = map;

    this.uRec = uRec;
    this.vRec = vRec;

    const h = uRec.header;
    this.grid = {
      nx: h.nx,
      ny: h.ny,
      dx: h.dx,
      dy: h.dy,
      x0: h.lo1,
      y0: h.la1,
    };

    const uData = uRec.data;
    const vData = vRec.data;
    const uMin = Math.min(...uData);
    const uMax = Math.max(...uData);
    const vMin = Math.min(...vData);
    const vMax = Math.max(...vData);

    this.canvas = document.createElement('canvas');
    this.gl = this.canvas.getContext('webgl', {
      antialias: false,
      alpha: true,
    });
    if (!this.gl) throw new Error('WebGL not supported');

    this.wind = new WindGL(this.gl);

    if (options.fadeOpacity != null)
      this.wind.fadeOpacity = options.fadeOpacity;
    if (options.speedFactor != null)
      this.wind.speedFactor = options.speedFactor;
    if (options.dropRate != null) this.wind.dropRate = options.dropRate;
    if (options.dropRateBump != null)
      this.wind.dropRateBump = options.dropRateBump;

    this.wind.numParticles = options.numParticles ?? 65536;

    this.wind.setWindFromUVGrid({
      uData,
      vData,
      nx: this.grid.nx,
      ny: this.grid.ny,
      uMin,
      uMax,
      vMin,
      vMax,
    });

    this.wind.setGridParams({
      origin: [this.grid.x0, this.grid.y0],
      step: [this.grid.dx, this.grid.dy],
      size: [this.grid.nx, this.grid.ny],
    });

    this._lastTs = null;

    this._lastW = 0;
    this._lastH = 0;
  }

  drawFrame(e) {
    const ctx = e.context;
    const frameState = e.frameState;

    const map = this.map;
    const size = map.getSize();
    if (!size) return;

    const pixelRatio = frameState.pixelRatio || 1;
    const wCss = size[0];
    const hCss = size[1];

    const w = Math.floor(wCss * pixelRatio);
    const h = Math.floor(hCss * pixelRatio);

    if (w !== this._lastW || h !== this._lastH) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.wind.resize();

      this._lastW = w;
      this._lastH = h;
    }

    // const extent = map.getView().calculateExtent(size);
    // const mapRes = map.getView().getResolution() || 1;

    const extent = frameState.extent;
    const mapRes = frameState.viewState.resolution || 1;

    const now = performance.now();
    let dt = 1 / 60;
    if (this._lastTs != null) {
      dt = (now - this._lastTs) / 1000;
      dt = Math.min(0.05, Math.max(0.016, dt));
    }
    this._lastTs = now;

    this.wind.setViewParams({ extent, mapRes, dt });
    this.wind.draw();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.canvas, 0, 0, wCss, hCss);
    ctx.restore();
  }

  stop() {
    this._lastTs = null;
  }

  clearTrails() {
    this.wind.resize();
  }

  setOptions(opts = {}) {
    if (opts.fadeOpacity != null) this.wind.fadeOpacity = opts.fadeOpacity;
    if (opts.speedFactor != null) this.wind.speedFactor = opts.speedFactor;
    if (opts.dropRate != null) this.wind.dropRate = opts.dropRate;
    if (opts.dropRateBump != null) this.wind.dropRateBump = opts.dropRateBump;
    if (opts.numParticles != null) this.wind.numParticles = opts.numParticles;
  }
}
