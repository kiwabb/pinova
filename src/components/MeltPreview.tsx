import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { BeadColor, PatternProject } from '../domain/types'

interface MeltPreviewProps {
  project: PatternProject
  palette: BeadColor[]
  melt: number
}

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uPattern;
  uniform vec2 uGrid;
  uniform float uMelt;

  float sdCircle(vec2 p, float r) { return length(p) - r; }
  float sdBox(vec2 p, vec2 b) {
    vec2 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  }
  float occupied(vec2 cell) {
    if (cell.x < 0.0 || cell.y < 0.0 || cell.x >= uGrid.x || cell.y >= uGrid.y) return 0.0;
    return texture2D(uPattern, (cell + 0.5) / uGrid).a;
  }

  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    vec2 gridPosition = uv * uGrid;
    vec2 cell = floor(gridPosition);
    vec2 local = fract(gridPosition) - 0.5;
    vec4 bead = texture2D(uPattern, (cell + 0.5) / uGrid);
    vec2 unit = fract(gridPosition);
    float gridEdge = min(min(unit.x, 1.0 - unit.x), min(unit.y, 1.0 - unit.y));
    vec3 board = mix(vec3(0.915, 0.916, 0.905), vec3(0.965, 0.965, 0.955), smoothstep(0.0, 0.045, gridEdge));
    float peg = 1.0 - smoothstep(0.055, 0.09, length(local));
    board = mix(board, vec3(0.81, 0.815, 0.80), peg * 0.32);

    if (bead.a < 0.1) {
      gl_FragColor = vec4(board, 1.0);
      return;
    }

    float radius = mix(0.385, 0.545, uMelt);
    float holeRadius = mix(0.155, 0.026, uMelt);
    float bridge = mix(0.035, 0.28, uMelt);
    float shape = sdCircle(local, radius);
    if (occupied(cell + vec2(1.0, 0.0)) > 0.1) shape = min(shape, sdBox(local - vec2(0.25, 0.0), vec2(0.25, bridge)));
    if (occupied(cell + vec2(-1.0, 0.0)) > 0.1) shape = min(shape, sdBox(local + vec2(0.25, 0.0), vec2(0.25, bridge)));
    if (occupied(cell + vec2(0.0, 1.0)) > 0.1) shape = min(shape, sdBox(local - vec2(0.0, 0.25), vec2(bridge, 0.25)));
    if (occupied(cell + vec2(0.0, -1.0)) > 0.1) shape = min(shape, sdBox(local + vec2(0.0, 0.25), vec2(bridge, 0.25)));
    float hole = sdCircle(local, holeRadius);
    float ring = max(shape, -hole);
    float aa = max(fwidth(ring), 0.002);
    float alpha = 1.0 - smoothstep(-aa, aa, ring);

    vec2 gradient = vec2(dFdx(ring), dFdy(ring));
    vec3 normal = normalize(vec3(-gradient * 20.0, 1.0));
    vec3 lightDirection = normalize(vec3(-0.45, 0.65, 0.9));
    float diffuse = 0.72 + 0.28 * max(dot(normal, lightDirection), 0.0);
    float edgeGlow = 1.0 - smoothstep(-0.08, -0.015, ring);
    float specular = pow(max(dot(reflect(-lightDirection, normal), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * mix(0.34, 0.17, uMelt);
    float innerShade = 1.0 - (1.0 - smoothstep(holeRadius, holeRadius + 0.085, length(local))) * 0.3;
    vec3 color = bead.rgb * diffuse * innerShade + specular + edgeGlow * 0.035;
    gl_FragColor = vec4(mix(board, color, alpha), 1.0);
  }
`

export function MeltPreview({ project, palette, melt }: MeltPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const renderRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0xf3f3f1, 1)
    host.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    camera.position.z = 1
    const data = new Uint8Array(project.width * project.height * 4)
    for (let index = 0; index < project.cells.length; index += 1) {
      const value = project.cells[index]
      if (value < 0) continue
      const color = palette[value].rgb
      data[index * 4] = color.r
      data[index * 4 + 1] = color.g
      data[index * 4 + 2] = color.b
      data[index * 4 + 3] = 255
    }
    const texture = new THREE.DataTexture(data, project.width, project.height, THREE.RGBAFormat)
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.needsUpdate = true
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPattern: { value: texture },
        uGrid: { value: new THREE.Vector2(project.width, project.height) },
        uMelt: { value: melt },
      },
    })
    materialRef.current = material
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    scene.add(mesh)
    const render = () => renderer.render(scene, camera)
    renderRef.current = render
    const resize = () => {
      const width = Math.max(1, host.clientWidth)
      const height = Math.max(1, host.clientHeight)
      renderer.setSize(width, height, false)
      const containerAspect = width / height
      const patternAspect = project.width / project.height
      if (patternAspect > containerAspect) mesh.scale.set(1, containerAspect / patternAspect, 1)
      else mesh.scale.set(patternAspect / containerAspect, 1, 1)
      render()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    return () => {
      observer.disconnect()
      materialRef.current = null
      renderRef.current = null
      texture.dispose()
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [palette, project])

  useEffect(() => {
    const material = materialRef.current
    if (!material) return
    material.uniforms.uMelt.value = melt
    renderRef.current?.()
  }, [melt])

  return <div ref={hostRef} className="melt-preview" aria-label="烫后融合效果预览" />
}
