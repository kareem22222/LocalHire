<script setup>
import { Color, Mesh, Program, Renderer, Triangle } from 'ogl'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  size: { type: String, default: 'lg' },
  radius: { type: Number, default: 18 },
  lineColor: { type: String, default: '#07559a' },
  baseColor: { type: String, default: '#c8dce5' },
  autoAnimate: { type: Boolean, default: false },
  disabled: Boolean,
  type: { type: String, default: 'button' },
})

const button = ref(null)
const effect = ref(null)
let renderer
let gl
let resizeObserver
let frame
let pointerAngle = 2.4
let proximity = 0

const vertex = `#version 300 es
in vec2 position;
void main(){gl_Position=vec4(position,0.,1.);}`

const fragment = `#version 300 es
precision highp float;
uniform vec2 uCenter,uHalfSize;
uniform float uRadius,uAngle,uIntensity,uPx;
uniform vec3 uLineColor,uBaseColor;
out vec4 fragColor;
float roundedBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
void main(){vec2 p=gl_FragCoord.xy-uCenter;float d=roundedBox(p,uHalfSize,uRadius);vec2 light=vec2(cos(uAngle),sin(uAngle));vec2 normal=normalize(p/(uHalfSize*uHalfSize)+1e-6);float rim=pow(abs(dot(normal,light)),18.);float base=(1.-smoothstep(0.,uPx*1.3,abs(d)))*.45;float shine=exp(-pow(d/(uPx*1.2),2.))*rim*uIntensity;fragColor=vec4(uBaseColor*base+uLineColor*shine,clamp(base+shine,0.,1.));}`

function onPointerMove(event) {
  const rect = button.value.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  pointerAngle = Math.atan2(cy - event.clientY, event.clientX - cx)
  const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right)
  const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom)
  proximity = Math.max(0, 1 - Math.hypot(dx, dy) / 240)
}

onMounted(() => {
  if (typeof WebGLRenderingContext === 'undefined' && typeof WebGL2RenderingContext === 'undefined') return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  try {
    renderer = new Renderer({ alpha: true, antialias: true, dpr })
  } catch {
    return
  }
  gl = renderer.gl
  gl.clearColor(0, 0, 0, 0)
  const geometry = new Triangle(gl)
  if (geometry.attributes.uv) delete geometry.attributes.uv
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uCenter: { value: [0, 0] }, uHalfSize: { value: [1, 1] }, uRadius: { value: props.radius * dpr },
      uAngle: { value: pointerAngle }, uIntensity: { value: 0 }, uPx: { value: dpr },
      uLineColor: { value: [1, 1, 1] }, uBaseColor: { value: [.3, .3, .3] },
    },
  })
  const mesh = new Mesh(gl, { geometry, program })
  effect.value.appendChild(gl.canvas)
  const line = new Color(props.lineColor)
  const base = new Color(props.baseColor)
  program.uniforms.uLineColor.value = [line.r, line.g, line.b]
  program.uniforms.uBaseColor.value = [base.r, base.g, base.b]

  const resize = () => {
    const rect = button.value.getBoundingClientRect()
    renderer.setSize(rect.width + 40, rect.height + 40)
    program.uniforms.uCenter.value = [(20 + rect.width / 2) * dpr, (20 + rect.height / 2) * dpr]
    program.uniforms.uHalfSize.value = [(rect.width / 2) * dpr, (rect.height / 2) * dpr]
  }
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(button.value)
  }
  resize()
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  let angle = pointerAngle
  const render = () => {
    frame = requestAnimationFrame(render)
    if (props.autoAnimate) pointerAngle += .006
    angle += (pointerAngle - angle) * .08
    program.uniforms.uAngle.value = angle
    program.uniforms.uIntensity.value += ((props.autoAnimate ? 1 : proximity) - program.uniforms.uIntensity.value) * .08
    renderer.render({ scene: mesh })
  }
  frame = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  window.removeEventListener('pointermove', onPointerMove)
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
})
</script>

<template>
  <button ref="button" :type="type" :disabled="disabled" class="specular-button" :class="`specular-button--${size}`">
    <span ref="effect" class="specular-button__effect" aria-hidden="true"></span>
    <span class="specular-button__label"><slot /></span>
  </button>
</template>

<style scoped>
.specular-button { position: relative; display: inline-flex; align-items: center; justify-content: center; color: #12324a; border: 1px solid rgba(7,85,154,.12); border-radius: 18px; background: rgba(255,255,255,.9); box-shadow: inset 0 1px #fff,0 12px 34px rgba(7,85,154,.14); backdrop-filter: blur(12px); transition: transform .15s ease; }
.specular-button:active { transform: scale(.97); }.specular-button:focus-visible { outline: 2px solid #07559a; outline-offset: 4px; }.specular-button:disabled { opacity: .55; }
.specular-button--sm { padding: 10px 20px; font-size: 13px; }.specular-button--md { padding: 14px 28px; font-size: 15px; }.specular-button--lg { padding: 18px 38px; font-size: 17px; }
.specular-button__effect { position: absolute; inset: -20px; pointer-events: none; }.specular-button__effect :deep(canvas) { width: 100%; height: 100%; }
.specular-button__label { position: relative; z-index: 2; font-weight: 700; }
</style>
