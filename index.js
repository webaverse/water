/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';

const {useApp, useLocalPlayer, useFrame, useCleanup, usePhysics, useCamera, useInternals, useLodder} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();

const chunkWorldSize = 64;
// const minC = -1;
// const maxC = 1;
const numLods = 1;
const textureLoader = new THREE.TextureLoader();

const generateChunkMesh = (origin, physics) => {
  physics.generateChunkDataDualContouring(origin.x, origin.y, origin.z);
};
const setChunkLod = (origin, lod, physics) => {
  physics.setChunkLodDualContouring(origin.x, origin.y, origin.z, lod);
};
const clearChunkData = (origin, physics) => {
  physics.clearTemporaryChunkDataDualContouring();
  physics.clearChunkRootDualContouring(origin.x, origin.y, origin.z);
};

const makeTerrainChunk = (chunk, physics) => {
  console.log('make terrain chunk', chunk, physics);

  localVector.copy(chunk).multiplyScalar(chunkWorldSize);
  generateChunkMesh(localVector, physics);
  setChunkLod(localVector, 1, physics);
  const meshData = physics.createChunkMeshDualContouring(localVector.x, localVector.y, localVector.z);
  if (meshData) { // non-empty chunk
    const {positions, normals, indices, biomes, biomesWeights, bufferAddress} = meshData;

    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals.slice(), 3))
    geometry.setAttribute('biomes', new THREE.BufferAttribute(biomes.slice(), 4))
    geometry.setAttribute('biomesWeights', new THREE.BufferAttribute(biomesWeights.slice(), 4))
    geometry.setIndex(new THREE.BufferAttribute(indices.slice(), 1))

    // XXX need to Module._free the bufferAddress

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

    const mesh = new THREE.Mesh(geometry, material);

    clearChunkData(origin, physics);

    return mesh;
  } else {
    return null;
  }
};

class TerrainChunkGenerator {
  constructor(parent, physics) {
    // parameters
    this.parent = parent;
    this.physics = physics;

    // mesh
    this.object = new THREE.Group();
    this.object.name = 'terrain-chunk-generator';
  }
  getMeshes() {
    return this.object.children;
  }
  generateChunk(chunk) {
    const mesh = makeTerrainChunk(chunk, this.physics);
    if (mesh) {
      this.object.add(mesh);
      mesh.updateMatrixWorld();
    
      const physicsObject = this.physics.addGeometry(mesh);

      chunk.binding = {
        mesh,
        physicsObject,
      };
    }
  }
  disposeChunk(chunk) {
    const binding = chunk.binding;
    if (binding) {
      const {mesh, physicsObject} = binding;
      this.object.remove(mesh);

      this.physics.removeGeometry(physicsObject);

      chunk.binding = null;
    }
  }
  update(timestamp, timeDiff) {
    for (const mesh of this.getMeshes()) {
      mesh.update(timestamp, timeDiff);
    }
  }
  destroy() {
    // nothing; the owning lod tracker disposes of our contents
  }
}

export default e => {
  const app = useApp()
  const physics = usePhysics()
  const {LodChunkTracker} = useLodder();

  app.name = 'dual-contouring-terrain';

  const generator = new TerrainChunkGenerator(this, physics);
  const tracker = new LodChunkTracker(generator, {
    chunkWorldSize,
    numLods,
  });

  app.add(generator.object);
  generator.object.updateMatrixWorld();

  useFrame(() => {
    const localPlayer = useLocalPlayer();
    tracker.update(localPlayer.position);
  });

  useCleanup(() => {
    tracker.destroy();
  });

  return app
}
