import { useEffect, useRef } from "react";

export function WebGLStarBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, 0.5 * devicePixelRatio);
    let renderer: Renderer | null = null;
    let pointers: PointerHandler | null = null;

    const resize = () => {
      const { innerWidth: width, innerHeight: height } = window;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      if (renderer) renderer.updateScale(dpr);
    };

    const fragmentShaderSource = `#version 300 es
/*********
* Based on shader by Matthias Hurrle (@atzedent)
* Simplified version without 3D ball geometry
*/ 
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

  // Only stars and background color
  col = stars(rd.xy);
  col = mix(col, vec3(0.3, 0.6, 0.9), pow(abs(rd.y), 1.4));

  O = vec4(col, 1.0);
}`;

    try {
      renderer = new Renderer(canvas, dpr);
      pointers = new PointerHandler(canvas, dpr);
      renderer.setup();
      renderer.init();
      resize();

      if (renderer.test(fragmentShaderSource) === null) {
        renderer.updateShader(fragmentShaderSource);
      }

      window.addEventListener("resize", resize);

      const loop = (now: number) => {
        if (renderer && pointers) {
          renderer.updateMouse(pointers.first);
          renderer.updatePointerCount(pointers.count);
          renderer.updatePointerCoords(pointers.coords);
          renderer.render(now);
        }
        requestAnimationFrame(loop);
      };
      loop(0);
    } catch (error) {
      console.error("WebGL background error:", error);
    }

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
        opacity: 0.6,
      }}
    />
  );
}

class Renderer {
  private vertexSrc = "#version 300 es\nprecision highp float;\nin vec4 position;\nvoid main(){gl_Position=position;}";
  private fragmtSrc = "#version 300 es\nprecision highp float;\nout vec4 O;\nuniform float time;\nuniform vec2 resolution;\nvoid main(){vec2 uv=gl_FragCoord.xy/resolution;O=vec4(uv,sin(time)*.5+.5,1);}";
  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];
  
  canvas: HTMLCanvasElement;
  scale: number;
  gl: WebGL2RenderingContext;
  shaderSource: string;
  mouseCoords: [number, number];
  pointerCoords: number[];
  nbrOfPointers: number;
  
  program?: WebGLProgram | null;
  vs?: WebGLShader | null;
  fs?: WebGLShader | null;
  buffer?: WebGLBuffer | null;

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 not supported");
    this.gl = gl;
    this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
    this.shaderSource = this.fragmtSrc;
    this.mouseCoords = [0, 0];
    this.pointerCoords = [0, 0];
    this.nbrOfPointers = 0;
  }

  get defaultSource() {
    return this.fragmtSrc;
  }

  updateShader(source: string) {
    this.reset();
    this.shaderSource = source;
    this.setup();
    this.init();
  }

  updateMouse(coords: [number, number]) {
    this.mouseCoords = coords;
  }

  updatePointerCoords(coords: number[]) {
    this.pointerCoords = coords;
  }

  updatePointerCount(nbr: number) {
    this.nbrOfPointers = nbr;
  }

  updateScale(scale: number) {
    this.scale = scale;
    this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale);
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
    }
  }

  test(source: string): string | null {
    let result: string | null = null;
    const gl = this.gl;
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!shader) return "Failed to create shader";
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      result = gl.getShaderInfoLog(shader);
    }
    return result;
  }

  reset() {
    const { gl, program, vs, fs } = this;
    if (!program) return;
    gl.deleteProgram(program);
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
  }

  setup() {
    const gl = this.gl;
    this.vs = gl.createShader(gl.VERTEX_SHADER);
    this.fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!this.vs || !this.fs) throw new Error("Failed to create shaders");
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, this.shaderSource);
    this.program = gl.createProgram();
    if (!this.program) throw new Error("Failed to create program");
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
  }

  init() {
    const { gl, program } = this;
    if (!program) throw new Error("Program not initialized");
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    (program as any).resolution = gl.getUniformLocation(program, "resolution");
    (program as any).time = gl.getUniformLocation(program, "time");
    (program as any).touch = gl.getUniformLocation(program, "touch");
    (program as any).pointerCount = gl.getUniformLocation(program, "pointerCount");
    (program as any).pointers = gl.getUniformLocation(program, "pointers");
  }

  render(now: number = 0) {
    const { gl, program, buffer, canvas, mouseCoords, pointerCoords, nbrOfPointers } = this;
    if (!program || !buffer) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.uniform2f((program as any).resolution, canvas.width, canvas.height);
    gl.uniform1f((program as any).time, now * 1e-3);
    gl.uniform2f((program as any).touch, ...mouseCoords);
    gl.uniform1i((program as any).pointerCount, nbrOfPointers);
    gl.uniform2fv((program as any).pointers, pointerCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

class PointerHandler {
  scale: number;
  active: boolean;
  pointers: Map<number, [number, number]>;
  lastCoords: [number, number];

  constructor(element: HTMLCanvasElement, scale: number) {
    this.scale = scale;
    this.active = false;
    this.pointers = new Map();
    this.lastCoords = [0, 0];
    
    const map = (el: HTMLCanvasElement, s: number, x: number, y: number): [number, number] => 
      [x * s, el.height - y * s];

    element.addEventListener("pointerdown", (e) => {
      this.active = true;
      this.pointers.set(e.pointerId, map(element, this.scale, e.clientX, e.clientY));
    });
    
    element.addEventListener("pointerup", (e) => {
      if (this.count === 1) this.lastCoords = this.first;
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });
    
    element.addEventListener("pointerleave", (e) => {
      if (this.count === 1) this.lastCoords = this.first;
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });
    
    element.addEventListener("pointermove", (e) => {
      if (!this.active) return;
      this.lastCoords = [e.clientX, e.clientY];
      this.pointers.set(e.pointerId, map(element, this.scale, e.clientX, e.clientY));
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

  get first(): [number, number] {
    return this.pointers.values().next().value || this.lastCoords;
  }
}
