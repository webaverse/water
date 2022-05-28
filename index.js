/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile'
import * as THREE from 'three'
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js'

const { useApp, useLoaders, useFrame, useCleanup, usePhysics, useCamera, useInternals } = metaversefile

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const physicsIds = []

export default (e) => {
  const app = useApp()
  app.name = 'dual-contouring-terrain';
  const physics = usePhysics()
  const camera = useCamera();
  // console.log(camera);

  const textureLoader = new THREE.TextureLoader();

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

  const addChunk = origin => {
    const meshData = physics.createChunkMeshDualContouring(
      origin.x,
      origin.y,
      origin.z
    )

    const { positions, normals, indices, biomes, biomesWeights } = meshData

    // if the chunk had no points
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

    // console.log(geometry.attributes.biomes.getX(0));

    const earthTexture = textureLoader.load(
      baseUrl + 'assets/textures/EarthBaseColor1.png'
    )
    earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping
    earthTexture.encoding = THREE.sRGBEncoding
    const earthNormal = textureLoader.load(
      baseUrl + 'assets/textures/EarthNormal1.png'
    )
    earthNormal.wrapS = earthNormal.wrapT = THREE.RepeatWrapping

    const grassTexture = textureLoader.load(
      baseUrl + 'assets/textures/GrassBaseColor1.png'
    )
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping
    const grassNormal = textureLoader.load(
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
          value: textureLoader.load(
            baseUrl + 'assets/textures/noiseMap.png'
          ),
        },
        uResolution: {
          value: new THREE.Vector2(window.innerWidth, window.innerHeight),
        },
        uTexture: { value: null },
      },
    })

    const mesh = new THREE.Mesh(geometry, material)

    // mesh.position.y = y

    app.add(mesh)

    const terrainPhysics = physics.addGeometry(mesh)
    physicsIds.push(terrainPhysics)

    clearChunkData(origin)
  }

  const chunkLocalPosition = new THREE.Vector3()

  const chunkSize = 64;
  const minC = -1;
  const maxC = 1;
  const _forAllChunks = (fn) => {
    for (let cx = minC; cx <= maxC; cx++) {
      for (let cz = minC; cz <= maxC; cz++) {
        for (let cy = minC; cy <= maxC; cy++) {
          fn(cx, cy, cz);
        }
      }
    }
  };
  // generate the chunk data
  _forAllChunks((x, y, z) => {
    chunkLocalPosition.set(x, y, z).multiplyScalar(chunkSize);
    generateChunk(chunkLocalPosition);
  });
  // set the lod (switching lod)
  _forAllChunks((x, y, z) => {
    chunkLocalPosition.set(x, y, z).multiplyScalar(chunkSize);
    setChunkLod(chunkLocalPosition, 1);
  });
  // adding the chunk to the scene
  _forAllChunks((x, y, z) => {
    chunkLocalPosition.set(x, y, z).multiplyScalar(chunkSize);
    addChunk(chunkLocalPosition);
  });

  // useFrame(({ timestamp }) => {})

  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId)
    }
  })

  return app
}
