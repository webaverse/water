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
class BufferManager {
  constructor() {
    this.ELEMENT_BYTES = 4
  }

  readBuffer(outputBuffer, index) {
    const offset = outputBuffer / this.ELEMENT_BYTES
    return Module.HEAP32[offset + index]
  }

  readAttribute(buffer, size) {
    return Module.HEAPF32.slice(
      buffer / this.ELEMENT_BYTES,
      buffer / this.ELEMENT_BYTES + size
    )
  }

  readIndices(buffer, size) {
    return Module.HEAPU32.slice(
      buffer / this.ELEMENT_BYTES,
      buffer / this.ELEMENT_BYTES + size
    )
  }
}

export default (e) => {
  const app = useApp()
  app.name = 'neon-club'
  const gl = useInternals().renderer
  const physics = usePhysics()
  gl.outputEncoding = THREE.sRGBEncoding

  const outputBuffer = Module._createChunk()

  const bufferManager = new BufferManager()

  // the order is defined in C++
  const positionCount = bufferManager.readBuffer(outputBuffer, 0)
  const positionBuffer = bufferManager.readBuffer(outputBuffer, 1)

  const normalCount = bufferManager.readBuffer(outputBuffer, 2)
  const normalBuffer = bufferManager.readBuffer(outputBuffer, 3)

  const indicesCount = bufferManager.readBuffer(outputBuffer, 4)
  const indicesBuffer = bufferManager.readBuffer(outputBuffer, 5)

  const positions = bufferManager.readAttribute(
    positionBuffer,
    positionCount * 3
  )

  const normals = bufferManager.readAttribute(normalBuffer, normalCount * 3)

  const indices = bufferManager.readIndices(indicesBuffer, indicesCount)

  Module._doFree(positionBuffer)
  Module._doFree(normalBuffer)
  Module._doFree(indicesBuffer)
  Module._doFree(outputBuffer)

  const geometry = new THREE.BufferGeometry()

  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

  const material = new THREE.MeshBasicMaterial({
    color: '#145734',
    wireframe: true,
  })

  const mesh = new THREE.Mesh(geometry, material)

  app.add(mesh)

  const terrainPhysics = physics.addGeometry(mesh)
  physicsIds.push(terrainPhysics)

  useFrame(({ timestamp }) => {})
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}
