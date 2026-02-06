'use strict';

import { RGBA_RANGES, rgbaToRgbArray } from '@/components/earth/earth-colors';

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);

  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }

  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const program = gl.createProgram();

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }

  const wrapper = { program: program };

  const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < numAttributes; i++) {
    const attribute = gl.getActiveAttrib(program, i);
    wrapper[attribute.name] = gl.getAttribLocation(program, attribute.name);
  }
  const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i$1 = 0; i$1 < numUniforms; i$1++) {
    const uniform = gl.getActiveUniform(program, i$1);
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

function buildColorRampFromRanges(ranges) {
  const finiteForDomain = ranges.filter(
    r => Number.isFinite(r.min) && Number.isFinite(r.max),
  );

  if (!finiteForDomain.length) {
    const out = new Uint8Array(16 * 16 * 4);
    for (let i = 0; i < 256; i++) {
      out[i * 4 + 0] = 255;
      out[i * 4 + 1] = 0;
      out[i * 4 + 2] = 0;
      out[i * 4 + 3] = 255;
    }
    return out;
  }

  const minV = finiteForDomain[0].min;
  const maxV = finiteForDomain[finiteForDomain.length - 1].max;

  const out = new Uint8Array(16 * 16 * 4);

  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const v = minV + t * (maxV - minV);

    const seg =
      ranges.find(r => v >= r.min && v < r.max) || ranges[ranges.length - 1];

    const [rr, gg, bb] = rgbaToRgbArray(seg.color);

    const idx = i * 4;
    out[idx + 0] = rr;
    out[idx + 1] = gg;
    out[idx + 2] = bb;
    out[idx + 3] = 255;
  }

  return out;
}

const drawVert =
  "precision mediump float;\n\nattribute float a_index;\n\nuniform sampler2D u_particles;\nuniform float u_particles_res;\n\nvarying vec2 v_particle_pos;\n\nvoid main() {\n    vec4 color = texture2D(u_particles, vec2(\n        fract(a_index / u_particles_res),\n        floor(a_index / u_particles_res) / u_particles_res));\n\n    // decode current particle position from the pixel's RGBA value\n    v_particle_pos = vec2(\n        color.r / 255.0 + color.b,\n        color.g / 255.0 + color.a);\n\n    gl_PointSize = 1.0;\n    gl_Position = vec4(2.0 * v_particle_pos.x - 1.0, 1.0 - 2.0 * v_particle_pos.y, 0, 1);\n}\n";

// const drawFrag =
//   'precision mediump float;\n\nuniform sampler2D u_wind;\nuniform sampler2D u_scalar;\nuniform vec2 u_wind_min;\nuniform vec2 u_wind_max;\nuniform sampler2D u_color_ramp;\n\nvarying vec2 v_particle_pos;\n\nvoid main() {\n    vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);\n    float speed_t = length(velocity) / length(u_wind_max);\n\n    // color ramp is encoded in a 16x16 texture\n    vec2 ramp_pos = vec2(\n        fract(16.0 * speed_t),\n        floor(16.0 * speed_t) / 16.0);\n\n    gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n}\n';
const drawFrag =
  'precision mediump float;\n\nuniform sampler2D u_wind;\nuniform sampler2D u_scalar;\nuniform sampler2D u_color_ramp;\n\nuniform vec2 u_wind_min;\nuniform vec2 u_wind_max;\nuniform int u_color_mode;\n\nvarying vec2 v_particle_pos;\n\nvoid main() {\n  float t;\n\n  if (u_color_mode == 0) {\n    vec2 velocity = mix(\n      u_wind_min,\n     u_wind_max,\n     texture2D(u_wind, v_particle_pos).rg\n    );\n    t = length(velocity) / length(u_wind_max);\n  } else {\n    t = texture2D(u_scalar, v_particle_pos).r;\n }\n\n t = clamp(t, 0.0, 1.0);\n\n  float idx = floor(t * 255.0);\n  float x = mod(idx, 16.0);\n  float y = floor(idx / 16.0);\n\n  vec2 ramp_pos = vec2(\n   (x + 0.5) / 16.0,\n   (y + 0.5) / 16.0\n  );\n\n  gl_FragColor = texture2D(u_color_ramp, ramp_pos);\n}\n';

const quadVert =
  'precision mediump float;\n\nattribute vec2 a_pos;\n\nvarying vec2 v_tex_pos;\n\nvoid main() {\n    v_tex_pos = a_pos;\n    gl_Position = vec4(1.0 - 2.0 * a_pos, 0, 1);\n}\n';

const screenFrag =
  'precision mediump float;\n\nuniform sampler2D u_screen;\nuniform float u_opacity;\n\nvarying vec2 v_tex_pos;\n\nvoid main() {\n    vec4 color = texture2D(u_screen, 1.0 - v_tex_pos);\n    // a hack to guarantee opacity fade out even with a value close to 1.0\n    gl_FragColor = vec4(floor(255.0 * color * u_opacity) / 255.0);\n}\n';

const updateFrag =
  'precision highp float;\n\nuniform sampler2D u_particles;\nuniform sampler2D u_wind;\nuniform vec2 u_wind_res;\nuniform vec2 u_wind_min;\nuniform vec2 u_wind_max;\nuniform float u_rand_seed;\nuniform float u_speed_factor;\nuniform float u_drop_rate;\nuniform float u_drop_rate_bump;\n\nvarying vec2 v_tex_pos;\n\n// pseudo-random generator\nconst vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);\nfloat rand(const vec2 co) {\n    float t = dot(rand_constants.xy, co);\n    return fract(sin(t) * (rand_constants.z + t));\n}\n\n// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation\nvec2 lookup_wind(const vec2 uv) {\n    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering\n    vec2 px = 1.0 / u_wind_res;\n    vec2 vc = (floor(uv * u_wind_res)) * px;\n    vec2 f = fract(uv * u_wind_res);\n    vec2 tl = texture2D(u_wind, vc).rg;\n    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;\n    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;\n    vec2 br = texture2D(u_wind, vc + px).rg;\n    return mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);\n}\n\nvoid main() {\n    vec4 color = texture2D(u_particles, v_tex_pos);\n    vec2 pos = vec2(\n        color.r / 255.0 + color.b,\n        color.g / 255.0 + color.a); // decode particle position from pixel RGBA\n\n    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos));\n    float speed_t = length(velocity) / length(u_wind_max);\n\n    // take EPSG:4236 distortion into account for calculating where the particle moved\n    //float distortion = cos(radians(pos.y * 180.0 - 90.0));\n    //vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;\n\n    vec2 offset = vec2(velocity.x, -velocity.y) * 0.001 * u_speed_factor;\n    // update particle position, wrapping around the date line\n    pos = fract(1.0 + pos + offset);\n\n    // a random seed to use for the particle drop\n    vec2 seed = (pos + v_tex_pos) * u_rand_seed;\n\n    // drop rate is a chance a particle will restart at random position, to avoid degeneration\n    float drop_rate = u_drop_rate + speed_t * u_drop_rate_bump;\n    float drop = step(1.0 - drop_rate, rand(seed));\n\n    vec2 random_pos = vec2(\n        rand(seed + 1.3),\n        rand(seed + 2.1));\n    pos = mix(pos, random_pos, drop);\n\n    // encode the new particle position back into RGBA\n    gl_FragColor = vec4(\n        fract(pos * 255.0),\n        floor(pos * 255.0) / 255.0);\n}\n';

const DEFAULT_RAMP = {
  0.0: '#3288bd',
  0.1: '#66c2a5',
  0.2: '#abdda4',
  0.3: '#e6f598',
  0.4: '#fee08b',
  0.5: '#fdae61',
  0.6: '#f46d43',
  1.0: '#d53e4f',
};

class WindGL {
  constructor(gl) {
    this.gl = gl;

    this.colorMode = 0; // 0: wind, 1: scalar

    this.scalarData = null;
    this.scalarTexture = null;

    this.fadeOpacity = 0.998; // how fast the particle trails fade on each frame
    this.speedFactor = 0.2; // how fast the particles move
    this.dropRate = 0.003; // how often the particles move to a random place
    this.dropRateBump = 0.01; // drop rate increase relative to individual particle speed

    this.drawProgram = createProgram(gl, drawVert, drawFrag);
    this.screenProgram = createProgram(gl, quadVert, screenFrag);
    this.updateProgram = createProgram(gl, quadVert, updateFrag);

    this.quadBuffer = createBuffer(
      gl,
      new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    );
    this.framebuffer = gl.createFramebuffer();

    this.setColorRamp(DEFAULT_RAMP);
    this.resize();
  }

  resize() {
    const gl = this.gl;
    const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);

    // screen textures to hold the drawn screen for the previous and the current frame
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
    // lookup texture for colorizing the particles according to their speed
    this.colorRampTexture = createTexture(
      this.gl,
      this.gl.LINEAR,
      getColorRamp(colors),
      16,
      16,
    );
  }

  setColorRampByPoll(poll) {
    const ranges = RGBA_RANGES[poll];
    if (!ranges) {
      this.setColorRamp(DEFAULT_RAMP);
      return;
    }

    const rampData = buildColorRampFromRanges(ranges);

    this.colorRampTexture = createTexture(
      this.gl,
      this.gl.NEAREST,
      rampData,
      16,
      16,
    );
  }

  set numParticles(n) {
    const gl = this.gl;
    const particleRes = Math.ceil(Math.sqrt(n));
    this._numParticles = particleRes * particleRes;
    this.particleStateResolution = particleRes;

    const particleState = new Uint8Array(this._numParticles * 4);
    for (let i = 0; i < particleState.length; i++) {
      particleState[i] = Math.floor(Math.random() * 255); // randomize the initial particle positions
    }

    // textures to hold the particle state for the current and the next frame
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
    for (let i = 0; i < this._numParticles; i++) {
      particleIndices[i] = i;
    }
    this.particleIndexBuffer = createBuffer(gl, particleIndices);
  }

  get numParticles() {
    return this._numParticles;
  }

  setWind(windData) {
    this.windData = windData;
    this.windTexture = createTexture(this.gl, this.gl.LINEAR, windData.image);
  }

  setScalar(scalarData, poll) {
    this.scalarData = scalarData;
    this.scalarTexture = createTexture(
      this.gl,
      this.gl.LINEAR,
      scalarData.image,
    );

    this.setColorRampByPoll(poll);
    this.setColorMode(poll);
  }

  setColorMode(poll) {
    this.colorMode =
      poll !== 'WIND' && !!this.scalarData && !!this.scalarTexture ? 1 : 0;
  }

  draw() {
    if (!this.windData || !this.particleIndexBuffer) return;

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

    // draw the screen into a temporary framebuffer to retain it as the background on the next frame
    bindFramebuffer(gl, this.framebuffer, this.screenTexture);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.drawTexture(this.backgroundTexture, this.fadeOpacity);
    this.drawParticles();

    bindFramebuffer(gl, null);
    // enable blending to support drawing on top of an existing background (e.g. a map)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.drawTexture(this.screenTexture, 1.0);
    gl.disable(gl.BLEND);

    // save the current screen as the background for the next frame
    [this.backgroundTexture, this.screenTexture] = [
      this.screenTexture,
      this.backgroundTexture,
    ];
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

    if (this.scalarTexture) bindTexture(gl, this.scalarTexture, 3);

    gl.uniform1i(program.u_wind, 0);
    gl.uniform1i(program.u_particles, 1);
    gl.uniform1i(program.u_color_ramp, 2);
    gl.uniform1i(program.u_scalar, 3);

    gl.uniform1f(program.u_particles_res, this.particleStateResolution);
    gl.uniform2f(program.u_wind_min, this.windData.uMin, this.windData.vMin);
    gl.uniform2f(program.u_wind_max, this.windData.uMax, this.windData.vMax);

    gl.uniform1i(program.u_color_mode, this.colorMode);

    gl.drawArrays(gl.POINTS, 0, this._numParticles);
  }

  updateParticles() {
    const gl = this.gl;
    const program = this.updateProgram;

    bindFramebuffer(gl, this.framebuffer, this.particleStateTexture1);
    gl.viewport(
      0,
      0,
      this.particleStateResolution,
      this.particleStateResolution,
    );

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

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // swap the particle state textures so the new one becomes the current one
    [this.particleStateTexture0, this.particleStateTexture1] = [
      this.particleStateTexture1,
      this.particleStateTexture0,
    ];
  }
}

function getColorRamp(colors) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  canvas.width = 256;
  canvas.height = 1;

  const gradient = ctx.createLinearGradient(0, 0, 256, 0);
  for (const stop in colors) {
    gradient.addColorStop(+stop, colors[stop]);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 1);

  return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
}

export default WindGL;
