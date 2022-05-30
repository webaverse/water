/* eslint-disable arrow-parens */
/* eslint-disable semi */
/* eslint-disable object-curly-spacing */
/* eslint-disable linebreak-style */
import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';

const {useApp, useLocalPlayer, useFrame, useCleanup, usePhysics, useHitManager, useTerrainManager, useLodder} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();

const terrainManager = useTerrainManager();
const chunkWorldSize = terrainManager.chunkSize;
const numLods = 1;
const textureLoader = new THREE.TextureLoader();

const makeTerrainChunk = async (chunk) => {
  // console.log('make terrain chunk', chunk, physics);

  const lod = 1;
  const meshData = await terrainManager.generateChunk(chunk, lod);
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

    // console.log('clear chunk data', chunk.toArray().join(','), localVector.toArray().join(','));
    // clearChunkData(chunk, physics);

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
    // XXX support signal
    (async () => {
      // console.log('generate chunk', chunk.toArray().join(','));
      const mesh = await makeTerrainChunk(chunk);
      if (mesh) {
        this.object.add(mesh);
        mesh.updateMatrixWorld();
      
        const physicsObject = this.physics.addGeometry(mesh);

        chunk.binding = {
          mesh,
          physicsObject,
        };
        mesh.chunk = chunk;

        console.log('generate chunk', chunk.toArray().join(','), mesh, physicsObject);
      }
    })();
  }
  disposeChunk(chunk) {
    const binding = chunk.binding;
    if (binding) {
      const {mesh, physicsObject} = binding;
      this.object.remove(mesh);
      console.log('dispose chunk', chunk.toArray().join(','), mesh, physicsObject);

      this.physics.removeGeometry(physicsObject);

      chunk.binding = null;
      mesh.chunk = null;
    } /* else {
      console.log('do not dispose chunk', chunk.toArray().join(','));
    } */
  }
  getMeshAtWorldPosition(p) {
    localVector.copy(p).divideScalar(chunkWorldSize);
    const mesh = this.object.children.find(m => !!m.chunk && m.chunk.equals(localVector)) || null;
    return mesh;
  }
  hit(position) {
    const neededChunkMins = this.physics.drawDamage(position, 3, 2);
    const oldMeshes = neededChunkMins.map(v => {
      return this.getMeshAtWorldPosition(v);
    });
    const oldChunks = oldMeshes.filter(mesh => mesh !== null).map(mesh => mesh.chunk);
    /* console.log('got needed', {
      neededChunkMins,
      oldMeshes,
      oldChunks,
      chunks: this.object.children.map(m => m.chunk),
    }); */
    for (const oldChunk of oldChunks) {
      this.disposeChunk(oldChunk);
    }

    setTimeout(async () => {
      await Promise.all(neededChunkMins.map(async minVector => {
        const chunkPosition = localVector.copy(minVector).divideScalar(chunkWorldSize).clone();
        const chunk = await this.generateChunk(chunkPosition);
        return chunk;
      }));
      // console.log('got hit result', result, chunks, this.object.children.map(m => m.chunk.toArray().join(',')));
    }, 1000);
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
  const app = useApp();
  const physics = usePhysics();
  const hitManager = useHitManager();
  const {LodChunkTracker} = useLodder();

  app.name = 'dual-contouring-terrain';

  const generator = new TerrainChunkGenerator(this, physics);
  const tracker = new LodChunkTracker(generator, {
    chunkWorldSize,
    numLods,
    chunkHeight: chunkWorldSize,
  });

  app.add(generator.object);
  generator.object.updateMatrixWorld();

  let lastHitTime = 0;
  hitManager.addEventListener('hitattempt', e => {
    const {type, args} = e.data;
    if (type === 'sword') {
      const now = performance.now();
      const timeDiff = now - lastHitTime;
      if (timeDiff > 1000) {
        const {
          position,
          quaternion,
          // hitHalfHeight,
        } = args;
        generator.hit(position);

        lastHitTime = now;
      }
    }
  });

  useFrame(() => {
    const localPlayer = useLocalPlayer();
    tracker.update(localPlayer.position);
  });

  useCleanup(() => {
    tracker.destroy();
  });

  return app
}
