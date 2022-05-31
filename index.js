import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';

const {useApp, useLocalPlayer, useFrame, useCleanup, usePhysics, useHitManager, useTerrainManager, useLodder} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaterion = new THREE.Quaternion();

const terrainManager = useTerrainManager();
const chunkWorldSize = terrainManager.chunkSize;
const numLods = 1;
const bufferSize = 20 * 1024 * 1024;

const textureLoader = new THREE.TextureLoader();
const abortError = new Error('chunk disposed');
const fakeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

class TerrainMesh extends THREE.Mesh {
  constructor({
    physics,
  }) {
    const allocator = new terrainManager.constructor.GeometryAllocator([
      {
        name: 'position',
        Type: Float32Array,
        itemSize: 3,
      },
      {
        name: 'normal',
        Type: Float32Array,
        itemSize: 3,
      },
      {
        name: 'biomes',
        Type: Int32Array,
        itemSize: 4,
      },
      {
        name: 'biomesWeights',
        Type: Float32Array,
        itemSize: 2,
      },
    ], {
      bufferSize,
    });
    const {geometry} = allocator;

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
    });
    super(geometry, [material]); // array is needed for groups support
    this.frustumCulled = false;

    this.physics = physics;
    this.allocator = allocator;
  }
  async addChunk(chunk, {
    signal,
  }) {
    const lod = 1;
    const meshData = await terrainManager.generateChunk(chunk, lod);
    signal.throwIfAborted();
    if (meshData) { // non-empty chunk
      // const {positions, normals, indices, biomes, biomesWeights, bufferAddress} = meshData;

      const _mapOffsettedIndices = (srcIndices, dstIndices, dstOffset, positionOffset) => {
        const positionIndex = positionOffset / 3;
        for (let i = 0; i < srcIndices.length; i++) {
          dstIndices[dstOffset + i] = srcIndices[i] + positionIndex;
        }
      };
      const _renderMeshDataToGeometry = (meshData, geometry, geometryBinding) => {
        let positionOffset = geometryBinding.getAttributeOffset('position');
        let normalOffset = geometryBinding.getAttributeOffset('normal');
        let biomesOffset = geometryBinding.getAttributeOffset('biomes');
        let biomesWeightsOffset = geometryBinding.getAttributeOffset('biomesWeights');
        let indexOffset = geometryBinding.getIndexOffset();

        geometry.attributes.position.array.set(meshData.positions, positionOffset);
        geometry.attributes.normal.array.set(meshData.normals, normalOffset);
        geometry.attributes.biomes.array.set(meshData.biomes, biomesOffset);
        geometry.attributes.biomesWeights.array.set(meshData.biomesWeights, biomesWeightsOffset);
        _mapOffsettedIndices(meshData.indices, geometry.index.array, indexOffset, positionOffset);

        geometry.attributes.position.update(positionOffset, meshData.positions.length);
        geometry.attributes.normal.update(normalOffset, meshData.normals.length);
        geometry.attributes.biomes.update(biomesOffset, meshData.biomes.length);
        geometry.attributes.biomesWeights.update(biomesWeightsOffset, meshData.biomesWeights.length);
        geometry.index.update(indexOffset, meshData.indices.length);
      };
      const _updateRenderList = () => {
        this.allocator.geometry.groups = this.allocator.indexFreeList.getGeometryGroups(); // XXX memory for this can be optimized
      };
      const _handleMesh = () => {
        const geometryBinding = this.allocator.alloc(meshData.positions.length, meshData.indices.length);
        _renderMeshDataToGeometry(meshData, this.allocator.geometry, geometryBinding);
        _updateRenderList();

        signal.addEventListener('abort', e => {
          this.allocator.free(geometryBinding);
          _updateRenderList();
        });
      };
      _handleMesh();

      const _handlePhysics = async () => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
        geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        const mesh = new THREE.Mesh(geometry, fakeMaterial);
    
        // console.log('cook 1', mesh);
        const geometryBuffer = await this.physics.cookGeometryAsync(mesh, {
          signal,
        });
        // console.log('cook 2', mesh);

        mesh.matrixWorld.decompose(localVector, localQuaterion, localVector2);
        const physicsObject = this.physics.addCookedGeometry(geometryBuffer, localVector, localQuaterion, localVector2);
        
        // console.log('cook 3', mesh);

        signal.addEventListener('abort', e => {
          this.physics.removeGeometry(physicsObject);
        });
      };
      await _handlePhysics();
    }
  }
}

class TerrainChunkGenerator {
  constructor(parent, physics) {
    // parameters
    this.parent = parent;
    this.physics = physics;

    // mesh
    this.object = new THREE.Group();
    this.object.name = 'terrain-chunk-generator';

    this.terrainMesh = new TerrainMesh({
      physics: this.physics,
    });
    this.object.add(this.terrainMesh);
  }
  getMeshes() {
    return this.object.children;
  }
  generateChunk(chunk) {
    // XXX support signal cancellation
    const abortController = new AbortController();
    const {signal} = abortController;

    this.terrainMesh.addChunk(chunk, {
      signal,
    }).catch(err => {
      if (err !== abortError) {
        console.warn(err);
      }
    });

    chunk.binding = {
      abortController,
      // signal,
    }
  }
  disposeChunk(chunk) {
    const binding = chunk.binding;
    if (binding) {
      const {abortController} = binding;
      abortController.abort(abortError);

      chunk.binding = null;
    }
  }
  getMeshAtWorldPosition(p) {
    return null; // XXX will be done with intersection
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