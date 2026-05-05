import { useEffect, useRef } from "react";

const VS = `
  precision mediump float;
  attribute vec2 a_pos;
  attribute float a_size;
  attribute float a_opacity;
  varying float v_opacity;
  uniform vec2 u_mouse;
  void main() {
    v_opacity = a_opacity;
    vec2 pos = a_pos + u_mouse * a_size * 0.0012;
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = a_size;
  }
`;

const FS = `
  precision mediump float;
  varying float v_opacity;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float alpha = v_opacity * (1.0 - d * d);
    gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
  }
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function StarfieldBackground() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const COUNT = 900;
    const pos = new Float32Array(COUNT * 2);
    const sizes = new Float32Array(COUNT);
    const opacities = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      pos[i * 2]     = Math.random() * 2 - 1;
      pos[i * 2 + 1] = Math.random() * 2 - 1;
      const depth    = Math.random();
      sizes[i]       = depth * 2.8 + 0.4;
      opacities[i]   = depth * 0.65 + 0.05;
    }

    const aPos = gl.getAttribLocation(prog, "a_pos");
    const aSize = gl.getAttribLocation(prog, "a_size");
    const aOp = gl.getAttribLocation(prog, "a_opacity");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const sizeBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aSize);
    gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 0, 0);

    const opBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, opBuf);
    gl.bufferData(gl.ARRAY_BUFFER, opacities, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(aOp);
    gl.vertexAttribPointer(aOp, 1, gl.FLOAT, false, 0, 0);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    resize();
    window.addEventListener("resize", resize);

    let raf;
    function draw() {
      // Smooth parallax lerp
      mouse.current.x += (target.current.x - mouse.current.x) * 0.04;
      mouse.current.y += (target.current.y - mouse.current.y) * 0.04;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uMouse, mouse.current.x, mouse.current.y);
      gl.drawArrays(gl.POINTS, 0, COUNT);
      raf = requestAnimationFrame(draw);
    }
    draw();

    function onMove(e) {
      target.current = {
        x:  (e.clientX / window.innerWidth  - 0.5) * 2,
        y: -(e.clientY / window.innerHeight - 0.5) * 2,
      };
    }
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
