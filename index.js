/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile'
import * as THREE from 'three'
import Module from '../../public/bin/geometry'

const { useApp, useLoaders, useFrame, useCleanup, usePhysics, useInternals } =
  metaversefile

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1')

let physicsIds = []
let elapsedTime

// let rotationAnimation = false
// let lastRotationNumber = 0

const ELEMENT_BYTES = 4
const readBuffer = (outputBuffer, index) => {
  const offset = outputBuffer / ELEMENT_BYTES
  return Module.HEAP32.subarray(offset + index, offset + index + 1)[0]
}

const readAttribute = (buffer, count) => {
  Module._doFree(buffer)
  return Module.HEAPF32.slice(
    buffer / ELEMENT_BYTES,
    buffer / ELEMENT_BYTES + count
  )
}

export default (e) => {
  const app = useApp()
  app.name = 'neon-club'
  const gl = useInternals().renderer
  const physics = usePhysics()
  gl.outputEncoding = THREE.sRGBEncoding
  const positionCount = 10
  const outputBuffer = Module._generateVertices(positionCount)
  const vertexCount = readBuffer(outputBuffer, 0)
  const positionBuffer = readBuffer(outputBuffer, 1)
  const positions = readAttribute(positionBuffer, vertexCount * 3)
  console.log(positions)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.MeshBasicMaterial({
    color: 0xff0000,
    // wireframe: true,
  })
  const mesh = new THREE.Mesh(geometry, material)

  app.add(mesh)

  const groundGeometry = new THREE.PlaneGeometry(100, 100)
  const ground = new THREE.Mesh(groundGeometry)
  ground.position.set(0, -2, 0)
  ground.rotation.x -= Math.PI / 2
  ground.updateMatrixWorld()
  const groundPhysics = physics.addGeometry(ground)
  physicsIds.push(groundPhysics)

  useFrame(({ timestamp }) => {})
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}
