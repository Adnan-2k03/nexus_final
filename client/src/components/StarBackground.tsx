import { useEffect, useRef } from "react";

export function StarBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let renderer: any, pointers: any;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);

    const resize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      if (renderer) renderer.updateScale(dpr);
    };

    const source = fragmentShaderSource;
    renderer = new Renderer(canvas, dpr);
    pointers = new PointerHandler(canvas, dpr);
    renderer.setup();
    renderer.init();
    resize();

    if (renderer.test(source) === null) {
      renderer.updateShader(source);
    }

    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      renderer.updateMouse(pointers.first);
      renderer.updatePointerCount(pointers.count);
      renderer.updatePointerCoords(pointers.coords);
      renderer.render(now);
      requestAnimationFrame(loop);
    };
    loop(0);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.4,
      }}
    />
  );
}

// --- GLSL Fragment Shader ---
const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec2 touch;
uniform int pointerCount;
#define mouse (touch / R)
#define P pointerCount
#define FC gl_FragCoord.xy
#define R resolution
#define T time
#define rot(a) mat2(cos(a - vec4(0,11,33,0)))

vec3 stars(vec2 uv) {
  vec3 col = vec3(0.0);
  vec3 ro = vec3(0.2 + sin(T * 0.2) * 0.1, 1.0, T * 0.1);
  vec3 rd = vec3(uv, 0.2);
  float d = 0.0, e = 0.0;
  for (int i = 0; i < 40; i++) {
    vec3 p = ro + rd * d;
    p.z = fract(p.z);
    for (int j = 0; j < 10; j++) {
      p = abs(p) / dot(p, p * 0.5) - 0.8;
    }
    e += (1.0 - e) * dot(p, p) * 0.002;
    col += vec3(e * 0.8, 0.5 - d, d * 0.5) * e * 0.05;
    d += 0.01;
  }
  return col;
}

void cam(inout vec3 p) {
  if (P > 0) {
    p.yz *= rot(-mouse.y * 3.14 + 1.57);
    p.xz *= rot(1.57 - mouse.x * 3.14);
  } else {
    p.xz *= rot(sin(T * 0.125) * 0.75);
  }
}

void main() {
  vec2 uv = (FC - 0.5 * R) / min(R.x, R.y);
  vec3 col = vec3(0.0);
  vec3 p = vec3(sin(T), cos(T), T * 0.5);
  vec3 rd = normalize(vec3(uv, 1.0));
  cam(p);
  cam(rd);
  col = stars(rd.xy);
  col = mix(col, vec3(0.3, 0.6, 0.9), pow(abs(rd.y), 1.4));
  O = vec4(col, 1.0);
}
`;

// --- Renderer + PointerHandler classes ---
class Renderer {
  #vertexSrc =
    "#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}";
  #vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    this.gl = canvas.getContext("webgl2")!;
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
    this.shaderSource = this.#vertexSrc;
    this.mouseCoords = [0, 0];
    this.pointerCoords = [0, 0];
    this.nbrOfPointers = 0;
  }

  updateShader(source: string) {
    this.reset();
    this.shaderSource = source;
    this.setup();
    this.init();
  }
  updateMouse(coords: number[]) {
    this.mouseCoords = coords;
  }
  updatePointerCoords(coords: number[]) {
    this.pointerCoords = coords;
  }
  updatePointerCount(n: number) {
    this.nbrOfPointers = n;
  }
  updateScale(scale: number) {
    this.scale = scale;
    this.gl.viewport(
      0,
      0,
      this.canvas.width * scale,
      this.canvas.height * scale,
    );
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
  }

  test(source: string) {
    const gl = this.gl;
    const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS)
      ? null
      : gl.getShaderInfoLog(shader);
  }

  reset() {
    const { gl, program, vs, fs } = this as any;
    if (!program) return;
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
  }

  setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.compile(this.vs, this.#vertexSrc);
    this.compile(this.fs, this.shaderSource);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
  }

  init() {
    const { gl, program } = this as any;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array(this.#vertices),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    program.resolution = gl.getUniformLocation(program, "resolution");
    program.time = gl.getUniformLocation(program, "time");
    program.touch = gl.getUniformLocation(program, "touch");
    program.pointerCount = gl.getUniformLocation(program, "pointerCount");
  }

  render(now = 0) {
    const {
      gl,
      program,
      buffer,
      canvas,
      mouseCoords,
      pointerCoords,
      nbrOfPointers,
    } = this as any;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f(program.resolution, canvas.width, canvas.height);
    gl.uniform1f(program.time, now * 1e-3);
    gl.uniform2f(program.touch, ...mouseCoords);
    gl.uniform1i(program.pointerCount, nbrOfPointers);
    gl.uniform2fv(program.pointers, pointerCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

class PointerHandler {
  pointers: Map<number, number[]> = new Map();
  lastCoords: number[] = [0, 0];
  active = false;
  constructor(element: HTMLCanvasElement, scale: number) {
    const map = (el: HTMLCanvasElement, s: number, x: number, y: number) => [
      x * s,
      el.height - y * s,
    ];
    element.addEventListener("pointerdown", (e) => {
      this.active = true;
      this.pointers.set(e.pointerId, map(element, scale, e.clientX, e.clientY));
    });
    const clear = (e: PointerEvent) => {
      if (this.count === 1) this.lastCoords = this.first;
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    };
    element.addEventListener("pointerup", clear);
    element.addEventListener("pointerleave", clear);
    element.addEventListener("pointermove", (e) => {
      if (!this.active) return;
      this.lastCoords = [e.clientX, e.clientY];
      this.pointers.set(e.pointerId, map(element, scale, e.clientX, e.clientY));
    });
  }
  get count() {
    return this.pointers.size;
  }
  get coords() {
    return this.pointers.size > 0
      ? Array.from(this.pointers.values()).flat()
      : [0, 0];
  }
  get first() {
    return this.pointers.values().next().value || this.lastCoords;
  }
}
