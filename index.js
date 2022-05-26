/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile'
import * as THREE from 'three'
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js'

const { useApp, useLoaders, useFrame, useCleanup, usePhysics, useInternals } =
  metaversefile

const baseUrl = import.meta.url.replace(/(\/)[^\/\/]*$/, '$1')

const physicsIds = []

export default (e) => {
  const app = useApp()
  app.name = 'neon-club'
  const physics = usePhysics()
  const camera = useInternals().camera
  // console.log(camera);

  //   color: '#f2b02c',

  const generateChunk = (origin) => {
    physics.generateChunkDataDualContouring(origin.x, origin.y, origin.z)
  }

  const setChunkLod = (origin, lod) => {
    physics.setChunkLodDualContouring(origin.x, origin.y, origin.z, lod)
  }

  const clearChunkData = (origin) => {
    physics.clearTemporaryChunkDataDualContouring()
    physics.clearChunkRootDualContouring(origin.x, origin.y, origin.z)
  }

  const addChunk = (origin, y = 0) => {
    const meshData = physics.createChunkMeshDualContouring(
      origin.x,
      origin.y,
      origin.z
    )

    const { positions, normals, indices, biomes, biomesWeights } = meshData

    if (!positions || !normals || !indices || !biomes || !biomesWeights) {
      return
    }

    const geometry = new THREE.BufferGeometry()

    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geometry.setAttribute('biomes', new THREE.BufferAttribute(biomes, 4))
    geometry.setAttribute(
      'biomesWeights',
      new THREE.BufferAttribute(biomesWeights, 4)
    )

    // console.log(geometry.attributes.biomesWeights.getX(0));

    const earthTexture = new THREE.TextureLoader().load(
      baseUrl + 'assets/textures/EarthBaseColor1.png'
    )
    earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping
    earthTexture.encoding = THREE.sRGBEncoding
    const earthNormal = new THREE.TextureLoader().load(
      baseUrl + 'assets/textures/EarthNormal1.png'
    )
    earthNormal.wrapS = earthNormal.wrapT = THREE.RepeatWrapping

    const grassTexture = new THREE.TextureLoader().load(
      baseUrl + 'assets/textures/GrassBaseColor1.png'
    )
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
    const grassNormal = new THREE.TextureLoader().load(
      baseUrl + 'assets/textures/GrassNormal1.png'
    )
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping

    const material = new THREE.ShaderMaterial({
      vertexShader: terrainVertex,
      fragmentShader: terrainFragment,
      // wireframe: true,
      vertexColors: true,
      side: THREE.FrontSide,
      uniforms: {
        uTime: { value: 0 },
        uEarthBaseColor: {
          value: earthTexture,
        },
        uGrassBaseColor: {
          value: grassTexture,
        },
        uEarthNormal: {
          value: earthNormal,
        },
        uGrassNormal: {
          value: grassNormal,
        },
        // diffuseMap: {
        //   value: {
        //     textures: [
        //       new THREE.TextureLoader(
        //         baseUrl + '/assets/texture/EarthBaseColor.png'
        //       ),
        //       new THREE.TextureLoader(
        //         baseUrl + '/assets/texture/GrassBaseColor.png'
        //       ),
        //     ],
        //   },
        // },
        // normalMap: {
        //   value: {
        //     textures: [
        //       new THREE.TextureLoader(
        //         baseUrl + '/assets/texture/EarthNormal.png'
        //       ),
        //       new THREE.TextureLoader(
        //         baseUrl + '/assets/texture/GrassNormal.png'
        //       ),
        //     ],
        //   },
        // },
        noiseMap: {
          value: new THREE.TextureLoader().load(
            baseUrl + '/assets/texture/noiseMap.png'
          ),
        },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uTexture: { value: null },
      },
    })

    const mesh = new THREE.Mesh(geometry, material)

    mesh.position.y = y

    app.add(mesh)

    const terrainPhysics = physics.addGeometry(mesh)
    physicsIds.push(terrainPhysics)

    clearChunkData(origin)
  }

  const chunkGridNumber = 1

  const min = -((64 * chunkGridNumber) / 2)
  const max = (64 * chunkGridNumber) / 2

  const chunkLocalPosition = new THREE.Vector3()

  // generate the chunk data

  for (let x = min; x < max; x += 64) {
    for (let y = min; y < max; y += 64) {
      for (let z = min; z < max; z += 64) {
        chunkLocalPosition.set(x + 32, y + 32, z + 32)
        generateChunk(chunkLocalPosition)
        console.log(
          'Generating : ' +
            chunkLocalPosition.x +
            ', ' +
            chunkLocalPosition.y +
            ', ' +
            chunkLocalPosition.z
        )
      }
    }
  }

  // set the lod (switching lod)

  for (let x = min; x < max; x += 64) {
    for (let y = min; y < max; y += 64) {
      for (let z = min; z < max; z += 64) {
        const lod = Math.abs(Math.max(x, y, z)) / 64
        chunkLocalPosition.set(x + 32, y + 32, z + 32)
        setChunkLod(chunkLocalPosition, 1)
        console.log(
          'Setting Lod : ' +
            chunkLocalPosition.x +
            ', ' +
            chunkLocalPosition.y +
            ', ' +
            chunkLocalPosition.z
        )
      }
    }
  }

  // adding the chunk to the scene
  for (let x = min; x < max; x += 64) {
    for (let y = min; y < max; y += 64) {
      for (let z = min; z < max; z += 64) {
        chunkLocalPosition.set(x + 32, y + 32, z + 32)
        addChunk(chunkLocalPosition, -40)
        console.log(
          'Adding Chunk : ' +
            chunkLocalPosition.x +
            ', ' +
            chunkLocalPosition.y +
            ', ' +
            chunkLocalPosition.z
        )
      }
    }
  }

  useFrame(({ timestamp }) => {})

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}
