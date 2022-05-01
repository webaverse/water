/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile'
import * as THREE from 'three'

const { useApp, useLoaders, useFrame, useCleanup, usePhysics, useInternals } =
  metaversefile

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1')

const physicsIds = []

export default (e) => {
  const app = useApp()
  app.name = 'neon-club'
  const physics = usePhysics()

  const addChunk = (origin, lod) => {
    const { positions, normals, indices } =
      physics.createChunkWithDualContouring(origin.x, origin.y, origin.z, lod)

    const geometry = new THREE.BufferGeometry()

    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

    const material = new THREE.MeshBasicMaterial({
      color: '#0822b4',
      wireframe: true,
    })

    const mesh = new THREE.Mesh(geometry, material)

    app.add(mesh)

    const terrainPhysics = physics.addGeometry(mesh)
    physicsIds.push(terrainPhysics)
  }

  const addSeam = (origin) => {
    const { positions, normals, indices } =
      physics.createSeamsWithDualContouring(origin.x, origin.y, origin.z)

    const geometry = new THREE.BufferGeometry()

    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

    const material = new THREE.MeshBasicMaterial({
      color: '#f58814',
      wireframe: true,
    })

    const mesh = new THREE.Mesh(geometry, material)

    app.add(mesh)

    const terrainPhysics = physics.addGeometry(mesh)
    physicsIds.push(terrainPhysics)
  }

  // const min = -((64 * 3) / 2)
  // const max = (64 * 3) / 2

  // for (let x = min; x < max; x += 64) {
  //   for (let y = min; y < max; y += 64) {
  //     for (let z = min; z < max; z += 64) {
  //       addChunk(new THREE.Vector3(x, y, z), 1)
  //     }
  //   }
  // }
  // for (let x = min; x < max; x += 64) {
  //   for (let y = min; y < max; y += 64) {
  //     for (let z = min; z < max; z += 64) {
  //       addSeam(new THREE.Vector3(x, y, z))
  //     }
  //   }
  // }

  const chunkPosition1 = new THREE.Vector3(0, 0, 0)
  const chunkPosition2 = new THREE.Vector3(64, 0, 0)
  const chunkPosition3 = new THREE.Vector3(-64, 0, 0)
  const chunkPosition4 = new THREE.Vector3(-128, 0, 0)

  addChunk(chunkPosition1, 8)
  addChunk(chunkPosition2, 2)
  addChunk(chunkPosition3, 4)
  addChunk(chunkPosition4, 1)

  addSeam(chunkPosition1)
  addSeam(chunkPosition2)
  addSeam(chunkPosition3)
  addSeam(chunkPosition4)

  //     color: '#840e06',
  //     color: '#145734',

  useFrame(({ timestamp }) => {})

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}
