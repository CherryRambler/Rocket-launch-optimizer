import{j as r,C as f,O as g,r as s,u as x,d as m,L as M}from"./vendor-r3f-WqxiSTjP.js";import{q as v,c as h,z as y,D as j,y as w,E as S,G as D}from"./vendor-three-DWKxiL03.js";const E=`
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`,P=`
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  void main() {
    float cosA = dot(normalize(vWorldNormal), normalize(sunDir));
    float blend = smoothstep(-0.18, 0.18, cosA);
    vec4 day   = texture2D(dayMap, vUv);
    vec4 night = texture2D(nightMap, vUv);
    gl_FragColor = mix(night * 0.9, day, blend);
  }
`,R=`
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`,_=`
  uniform vec3 glowColor;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    float intensity = pow(0.72 - dot(vNormal, vViewDir), 3.2);
    gl_FragColor = vec4(glowColor * intensity, intensity * 0.75);
  }
`;function c(t,n,e=2.05){const a=t*Math.PI/180,o=n*Math.PI/180;return new h(e*Math.cos(a)*Math.cos(o),e*Math.sin(a),e*Math.cos(a)*Math.sin(o))}function C({isMobile:t}){const n=s.useRef(),e=t?32:64,[a,o]=x(D,["https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg","https://threejs.org/examples/textures/planets/earth_lights_2048.png"]),u=s.useMemo(()=>new v({uniforms:{dayMap:{value:a},nightMap:{value:o},sunDir:{value:new h(5,3,5)}},vertexShader:E,fragmentShader:P}),[a,o]);return m(()=>{n.current&&(n.current.rotation.y+=8e-4)}),r.jsx("mesh",{ref:n,material:u,children:r.jsx("sphereGeometry",{args:[2,e,e]})})}function L({isMobile:t}){const n=t?32:64,e=s.useMemo(()=>new v({uniforms:{glowColor:{value:new w(54527)}},vertexShader:R,fragmentShader:_,side:j,blending:y,transparent:!0,depthWrite:!1}),[]);return r.jsx("mesh",{material:e,children:r.jsx("sphereGeometry",{args:[2.18,n,n]})})}function b({orbitType:t}){const n=s.useRef(),e=s.useMemo(()=>t==="SSO"?Math.PI/2+.17:t==="GEO"?0:Math.PI/3,[t]);return m(({clock:a})=>{if(n.current){const o=a.getElapsedTime();n.current.material.opacity=.28+.28*Math.sin(o*1.8)}}),r.jsxs("mesh",{ref:n,rotation:[e,0,.1],children:[r.jsx("torusGeometry",{args:[3.2,.018,16,180]}),r.jsx("meshBasicMaterial",{color:"#00d4ff",transparent:!0,opacity:.4})]})}function z({active:t,orbitType:n}){const[e,a]=s.useState(0);s.useEffect(()=>{if(a(0),!t)return;let i=0;const l=setInterval(()=>{i=Math.min(1,i+.018),a(i),i>=1&&clearInterval(l)},16);return()=>clearInterval(l)},[t,n]);const o=s.useMemo(()=>{const i=c(13.9,80.4,2.05),l=c(20,86,2.5),d=c(30,95,3),p=c(38,105,3.2);return new S(i,l,d,p)},[]),u=s.useMemo(()=>{const i=Math.max(2,Math.ceil(60*e));return o.getPoints(i)},[o,e]);return e<.01?null:r.jsx(M,{points:u,color:"#00ff88",lineWidth:2.5,transparent:!0,opacity:.9})}function G(){const t=s.useRef();m(({clock:e})=>{if(t.current){const a=1+.3*Math.abs(Math.sin(e.getElapsedTime()*3));t.current.scale.setScalar(a)}});const n=s.useMemo(()=>c(13.9,80.4,2.06),[]);return r.jsxs("mesh",{ref:t,position:n,children:[r.jsx("sphereGeometry",{args:[.025,8,8]}),r.jsx("meshBasicMaterial",{color:"#ff4444"})]})}function V({isMobile:t,selectedWindow:n,orbitType:e}){return r.jsxs(s.Suspense,{fallback:null,children:[r.jsx(C,{isMobile:t}),r.jsx(L,{isMobile:t}),r.jsx(b,{orbitType:e}),r.jsx(z,{active:!!n,orbitType:e}),r.jsx(G,{})]})}function N({selectedWindow:t,orbitType:n="LEO"}){const e=typeof window<"u"&&window.innerWidth<768;return r.jsxs(f,{camera:{position:[0,1,6],fov:45},gl:{antialias:!e,alpha:!0},style:{background:"transparent"},dpr:e?1:Math.min(window.devicePixelRatio,2),children:[r.jsx("ambientLight",{intensity:.15}),r.jsx("directionalLight",{position:[5,3,5],intensity:1.2,color:"#fff8e1"}),r.jsx(V,{isMobile:e,selectedWindow:t,orbitType:n}),r.jsx(g,{enablePan:!1,minDistance:3.5,maxDistance:9,autoRotate:!t,autoRotateSpeed:.4,enableDamping:!0,dampingFactor:.06})]})}export{N as default};
