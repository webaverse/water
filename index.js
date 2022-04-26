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

  setTimeout(() => {
    const { positions, normals, indices } = physics.createChunkWithDualContouring(-32, 0, -32)

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
  }, 100)

  setTimeout(() => {
    const { positions, normals, indices } = physics.createChunkWithDualContouring(32, 0, -32)

    const geometry = new THREE.BufferGeometry()

    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

    const material = new THREE.MeshBasicMaterial({
      color: '#840e06',
      wireframe: true,
    })

    const mesh = new THREE.Mesh(geometry, material)

    app.add(mesh)

    const terrainPhysics = physics.addGeometry(mesh)
    physicsIds.push(terrainPhysics)
  }, 100)

  setTimeout(() => {
    const { positions, normals, indices } = physics.createSeamsWithDualContouring(-32, 0, -32)

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
  }, 100)

  // setTimeout(() => {
  //   const { positions, normals, indices } = physics.createChunkWithDualContouring(-32, 0, 32)

  //   const geometry = new THREE.BufferGeometry()

  //   geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  //   geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  //   geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

  //   const material = new THREE.MeshBasicMaterial({
  //     color: '#145734',
  //     wireframe: true,
  //   })

  //   const mesh = new THREE.Mesh(geometry, material)

  //   app.add(mesh)

  //   const terrainPhysics = physics.addGeometry(mesh)
  //   physicsIds.push(terrainPhysics)
  // }, 3000)
  // setTimeout(() => {
  //   const { positions, normals, indices } = physics.createChunkWithDualContouring(32, 0, 32)

  //   const geometry = new THREE.BufferGeometry()

  //   geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  //   geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  //   geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

  //   const material = new THREE.MeshBasicMaterial({
  //     color: '#840e06',
  //     wireframe: true,
  //   })

  //   const mesh = new THREE.Mesh(geometry, material)

  //   app.add(mesh)

  //   const terrainPhysics = physics.addGeometry(mesh)
  //   physicsIds.push(terrainPhysics)
  // }, 3000)

  useFrame(({ timestamp }) => {})

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}