<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const canvasRef = ref(null)
let renderer, scene, camera, nodes, edges, animId, nodeGeometry, edgeGeometry, edgeMaterial
let mouse = { x: 0, y: 0 }
let windowSize = { w: window.innerWidth, h: window.innerHeight }

// ponytail: single component, no abstractions — Three.js scene inline
const NODE_COUNT = 60
const CONNECT_DIST = 2.8

function createScene() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  camera = new THREE.PerspectiveCamera(60, windowSize.w / windowSize.h, 0.1, 100)
  camera.position.z = 8

  renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true })
  renderer.setSize(windowSize.w, windowSize.h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Nodes — small spheres representing people/jobs
  nodeGeometry = new THREE.SphereGeometry(0.06, 12, 12)
  const colors = [0x4f46e5, 0x7c3aed, 0x06b6d4, 0x10b981, 0xf59e0b]
  nodes = []

  for (let i = 0; i < NODE_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i % colors.length],
      transparent: true,
      opacity: 0.7
    })
    const mesh = new THREE.Mesh(nodeGeometry, mat)
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 4
    )
    mesh.userData.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.003,
      (Math.random() - 0.5) * 0.003,
      (Math.random() - 0.5) * 0.001
    )
    mesh.userData.baseScale = 0.8 + Math.random() * 0.6
    mesh.scale.setScalar(mesh.userData.baseScale)
    scene.add(mesh)
    nodes.push(mesh)
  }

  // Edges — dynamic lines between nearby nodes
  edgeGeometry = new THREE.BufferGeometry()
  const maxEdges = NODE_COUNT * NODE_COUNT
  const positions = new Float32Array(maxEdges * 6)
  edgeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  edgeGeometry.setDrawRange(0, 0)

  edgeMaterial = new THREE.LineBasicMaterial({
    color: 0x4f46e5,
    transparent: true,
    opacity: 0.12
  })
  edges = new THREE.LineSegments(edgeGeometry, edgeMaterial)
  scene.add(edges)
}

function animate() {
  animId = requestAnimationFrame(animate)

  // Mouse influence — camera parallax
  const targetX = mouse.x * 1.5
  const targetY = mouse.y * 1.5
  camera.position.x += (targetX - camera.position.x) * 0.05
  camera.position.y += (targetY - camera.position.y) * 0.05
  camera.lookAt(0, 0, 0)

  // Mouse position in world space
  const mx = mouse.x * 6
  const my = mouse.y * 4

  // Move nodes
  for (const node of nodes) {
    node.position.add(node.userData.velocity)

    // Bounce at bounds
    if (Math.abs(node.position.x) > 6) node.userData.velocity.x *= -1
    if (Math.abs(node.position.y) > 4) node.userData.velocity.y *= -1
    if (Math.abs(node.position.z) > 2) node.userData.velocity.z *= -1

    // Mouse repulsion — nodes push away from cursor
    const dx = node.position.x - mx
    const dy = node.position.y - my
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < 2.5 && dist > 0.01) {
      const force = (2.5 - dist) * 0.004
      node.userData.velocity.x += (dx / dist) * force
      node.userData.velocity.y += (dy / dist) * force
    }

    // Dampen velocity to prevent runaway
    node.userData.velocity.x *= 0.995
    node.userData.velocity.y *= 0.995
    node.userData.velocity.z *= 0.995

    // Scale boost near cursor
    const scale = node.userData.baseScale + Math.max(0, 1 - dist / 2.5) * 0.8
    node.scale.setScalar(scale)

    // Opacity boost near cursor
    node.material.opacity = 0.5 + Math.max(0, 1 - dist / 3) * 0.5
  }

  // Update edges
  const posAttr = edges.geometry.attributes.position
  let idx = 0
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const d = nodes[i].position.distanceTo(nodes[j].position)
      if (d < CONNECT_DIST) {
        posAttr.array[idx++] = nodes[i].position.x
        posAttr.array[idx++] = nodes[i].position.y
        posAttr.array[idx++] = nodes[i].position.z
        posAttr.array[idx++] = nodes[j].position.x
        posAttr.array[idx++] = nodes[j].position.y
        posAttr.array[idx++] = nodes[j].position.z
      }
    }
  }
  posAttr.needsUpdate = true
  edges.geometry.setDrawRange(0, idx / 3)

  renderer.render(scene, camera)
}

function onMouseMove(e) {
  mouse.x = (e.clientX / windowSize.w) * 2 - 1
  mouse.y = -(e.clientY / windowSize.h) * 2 + 1
}

function onResize() {
  windowSize.w = window.innerWidth
  windowSize.h = window.innerHeight
  camera.aspect = windowSize.w / windowSize.h
  camera.updateProjectionMatrix()
  renderer.setSize(windowSize.w, windowSize.h)
}

onMounted(() => {
  createScene()
  renderer.render(scene, camera)

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  animate()
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('resize', onResize)
  nodes?.forEach(node => node.material.dispose())
  nodeGeometry?.dispose()
  edgeGeometry?.dispose()
  edgeMaterial?.dispose()
  scene?.clear()
  renderer?.dispose()
})
</script>

<template>
  <canvas ref="canvasRef" class="network-bg"></canvas>
</template>

<style scoped>
.network-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
</style>
