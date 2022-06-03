import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';

const {useApp, useLocalPlayer, useFrame, useCleanup, usePhysics, useHitManager, useDcWorkerManager, useLodder} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localColor = new THREE.Color();

const dcWorkerManager = useDcWorkerManager();
const chunkWorldSize = dcWorkerManager.chunkSize;
const numLods = 1;
const bufferSize = 20 * 1024 * 1024;

const textureLoader = new THREE.TextureLoader();
const abortError = new Error('chunk disposed');
const fakeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

const biomeSpecs = [
  [
    "biOcean",
    6316128,
    "Vol_26_5_Stone_Base_Color"
  ],
  [
    "biPlains",
    9286496,
    "Vol_11_4_Vegetation_Base_Color"
  ],
  [
    "biDesert",
    16421912,
    "Vol_16_4_Sand_Base_Color"
  ],
  [
    "biExtremeHills",
    6316128,
    "Vol_15_4_Rocks_Base_Color"
  ],
  [
    "biForest",
    353825,
    "Vol_17_1_Vegetation_Base_Color"
  ],
  [
    "biTaiga",
    747097,
    "Vol_21_1_Vegetation_Base_Color"
  ],
  [
    "biSwampland",
    3145690,
    "Vol_19_3_Vegetation_Base_Color"
  ],
  [
    "biRiver",
    16440917,
    "Vol_14_1_Dirt_Base_Color"
  ],
  [
    "biNether",
    8323072,
    "Vol_43_7_Lava_Base_Color"
  ],
  [
    "biEnd",
    32767,
    "Vol_42_4_Vegetation_Base_Color"
  ],
  [
    "biFrozenOcean",
    9474192,
    "Vol_22_1_Snow_Ice_Base_Color"
  ],
  [
    "biFrozenRiver",
    16445632,
    "Vol_22_4_Snow_Ice_Base_Color"
  ],
  [
    "biTundra",
    16777215,
    "Vol_20_4_Snow_Ice_Base_Color"
  ],
  [
    "biIceMountains",
    10526880,
    "Vol_20_3_Snow_Ice_Base_Color"
  ],
  [
    "biMushroomIsland",
    16711935,
    "Vol_43_1_Rocks_Base_Color"
  ],
  [
    "biMushroomShore",
    10486015,
    "Vol_43_5_Stone_Base_Color"
  ],
  [
    "biBeach",
    16440917,
    "Vol_16_4_Sand_Base_Color"
  ],
  [
    "biDesertHills",
    13786898,
    "Vol_16_6_Sand_Base_Color"
  ],
  [
    "biForestHills",
    2250012,
    "Vol_17_2_Vegetation_Base_Color"
  ],
  [
    "biTaigaHills",
    1456435,
    "Vol_21_4_Vegetation_Base_Color"
  ],
  [
    "biExtremeHillsEdge",
    8359807,
    "Vol_15_4_Rocks_Base_Color"
  ],
  [
    "biJungle",
    5470985,
    "Vol_75_4_Grass_Base_Color"
  ],
  [
    "biJungleHills",
    2900485,
    "Vol_75_1_Stone_Base_Color"
  ],
  [
    "biJungleEdge",
    6458135,
    "Vol_44_2_Stone_Base_Color"
  ],
  [
    "biDeepOcean",
    3158064,
    "Vol_26_5_Stone_Base_Color"
  ],
  [
    "biStoneBeach",
    10658436,
    "Vol_23_2_Stone_Base_Color"
  ],
  [
    "biColdBeach",
    16445632,
    "Vol_71_1_Stone_Base_Color"
  ],
  [
    "biBirchForest",
    3175492,
    "Vol_21_4_Vegetation_Base_Color"
  ],
  [
    "biBirchForestHills",
    2055986,
    "Vol_21_5_Vegetation_Base_Color"
  ],
  [
    "biRoofedForest",
    4215066,
    "Vol_21_1_Vegetation_Base_Color"
  ],
  [
    "biColdTaiga",
    3233098,
    "Vol_20_2_Snow_Ice_Base_Color"
  ],
  [
    "biColdTaigaHills",
    5864818,
    "Vol_21_1_Vegetation_Base_Color"
  ],
  [
    "biMegaTaiga",
    5858897,
    "Vol_19_2_Dirt_Base_Color"
  ],
  [
    "biMegaTaigaHills",
    5858905,
    "Vol_19_4_Dirt_Base_Color"
  ],
  [
    "biExtremeHillsPlus",
    5271632,
    "Vol_15_4_Rocks_Base_Color"
  ],
  [
    "biSavanna",
    12431967,
    "Vol_21_5_Vegetation_Base_Color"
  ],
  [
    "biSavannaPlateau",
    10984804,
    "Vol_19_5_Dirt_Base_Color"
  ],
  [
    "biMesa",
    14238997,
    "Vol_16_6_Sand_Base_Color"
  ],
  [
    "biMesaPlateauF",
    11573093,
    "Vol_23_6_Dirt_Base_Color"
  ],
  [
    "biMesaPlateau",
    13274213,
    "Vol_23_6_Dirt_Base_Color"
  ],
  [
    "biSunflowerPlains",
    11918216,
    "Vol_11_4_Vegetation_Base_Color"
  ],
  [
    "biDesertM",
    16759872,
    "Vol_40_4_Sand_Base_Color"
  ],
  [
    "biExtremeHillsM",
    8947848,
    "Vol_15_4_Rocks_Base_Color"
  ],
  [
    "biFlowerForest",
    2985545,
    "Vol_45_1_Tiles_Base_Color"
  ],
  [
    "biTaigaM",
    3378817,
    "Vol_21_1_Vegetation_Base_Color"
  ],
  [
    "biSwamplandM",
    522674,
    "Vol_19_3_Vegetation_Base_Color"
  ],
  [
    "biIcePlainsSpikes",
    11853020,
    "Vol_36_1_Snow_Ice_Base_Color"
  ],
  [
    "biJungleM",
    8102705,
    "Vol_75_4_Grass_Base_Color"
  ],
  [
    "biJungleEdgeM",
    6458135,
    "Vol_44_2_Stone_Base_Color"
  ],
  [
    "biBirchForestM",
    5807212,
    "Vol_21_4_Vegetation_Base_Color"
  ],
  [
    "biBirchForestHillsM",
    4687706,
    "Vol_21_5_Vegetation_Base_Color"
  ],
  [
    "biRoofedForestM",
    6846786,
    "Vol_21_1_Vegetation_Base_Color"
  ],
  [
    "biColdTaigaM",
    2375478,
    "Vol_20_2_Snow_Ice_Base_Color"
  ],
  [
    "biMegaSpruceTaiga",
    4542270,
    "Vol_19_2_Dirt_Base_Color"
  ],
  [
    "biMegaSpruceTaigaHills",
    4542286,
    "Vol_19_4_Dirt_Base_Color"
  ],
  [
    "biExtremeHillsPlusM",
    7903352,
    "Vol_15_4_Rocks_Base_Color"
  ],
  [
    "biSavannaM",
    15063687,
    "Vol_21_5_Vegetation_Base_Color"
  ],
  [
    "biSavannaPlateauM",
    10984820,
    "Vol_19_5_Dirt_Base_Color"
  ],
  [
    "biMesaBryce",
    16739645,
    "Vol_27_3_Cliffs_Base_Color"
  ],
  [
    "biMesaPlateauFM",
    14204813,
    "Vol_23_6_Dirt_Base_Color"
  ],
  [
    "biMesaPlateauM",
    15905933,
    "Vol_23_6_Dirt_Base_Color"
  ],
  [
    "liLava",
    16711680,
    "Vol_28_2_Lava_Base_Color"
  ],
  [
    "liWaterRiver",
    255,
    "Vol_36_3_Water_Base_Color"
  ],
  [
    "liWaterOcean",
    255,
    "Vol_36_2_Snow_Ice_Base_Color"
  ],
  [
    "liWaterRiverFrozen",
    16777215,
    "Vol_24_1_Snow_Ice_Base_Color"
  ],
  [
    "liWaterOceanFrozen",
    16777215,
    "Vol_24_2_Snow_Ice_Base_Color"
  ]
];
const biomeDataTexture = (() => {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < biomeSpecs.length; i++) {
    const biomeSpec = biomeSpecs[i];
    const [name, colorHex, texture] = biomeSpec;
    localColor.setHex(colorHex);
    data[i * 4] = localColor.r * 255;
    data[i * 4 + 1] = localColor.g * 255;
    data[i * 4 + 2] = localColor.b * 255;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
})();

class TerrainMesh extends THREE.Mesh {
  constructor({
    physics,
  }) {
    const allocator = new dcWorkerManager.constructor.GeometryAllocator([
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
        itemSize: 4,
      },
    ], {
      bufferSize,
    });
    const {geometry} = allocator;

    const earthTexture = textureLoader.load(
      baseUrl + 'assets/textures/EarthBaseColor1.png'
    );
    earthTexture.wrapS = earthTexture.wrapT = THREE.RepeatWrapping;
    earthTexture.encoding = THREE.sRGBEncoding;
    const earthNormal = textureLoader.load(
      baseUrl + 'assets/textures/EarthNormal1.png'
    );
    earthNormal.wrapS = earthNormal.wrapT = THREE.RepeatWrapping;

    const grassTexture = textureLoader.load(
      baseUrl + 'assets/textures/GrassBaseColor1.png'
    );
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
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
          value: textureLoader.load(baseUrl + 'assets/textures/noiseMap.png'),
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
    this.physicsObjects = [];
  }
  async addChunk(chunk, {
    signal,
  }) {
    const lod = 1;
    const meshData = await dcWorkerManager.generateChunk(chunk, lod);
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

        // geometry.attributes.position.array.set(meshData.positions, positionOffset);
        // geometry.attributes.normal.array.set(meshData.normals, normalOffset);
        // geometry.attributes.biomes.array.set(meshData.biomes, biomesOffset);
        // geometry.attributes.biomesWeights.array.set(meshData.biomesWeights, biomesWeightsOffset);
        _mapOffsettedIndices(meshData.indices, geometry.index.array, indexOffset, positionOffset);

        geometry.attributes.position.update(positionOffset, meshData.positions.length, meshData.positions, 0);
        geometry.attributes.normal.update(normalOffset, meshData.normals.length, meshData.normals, 0);
        geometry.attributes.biomes.update(biomesOffset, meshData.biomes.length, meshData.biomes, 0);
        geometry.attributes.biomesWeights.update(biomesWeightsOffset, meshData.biomesWeights.length, meshData.biomesWeights, 0);
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
        const physycsMesh = new THREE.Mesh(geometry, fakeMaterial);
    
        // console.log('cook 1', mesh);
        const geometryBuffer = await this.physics.cookGeometryAsync(physycsMesh, {
          signal,
        });
        // console.log('cook 2', mesh);

        this.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        const physicsObject = this.physics.addCookedGeometry(geometryBuffer, localVector, localQuaternion, localVector2);
        this.physicsObjects.push(physicsObject);
        
        // console.log('cook 3', mesh);

        signal.addEventListener('abort', e => {
          this.physics.removeGeometry(physicsObject);
          this.physicsObjects.splice(this.physicsObjects.indexOf(physicsObject), 1);
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
  getPhysicsObjects() {
    // console.log('get physics object', this.terrainMesh.physicsObjects);
    return this.terrainMesh.physicsObjects;
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

  /* getMeshAtWorldPosition(p) {
    return null; // XXX will be done with intersection
    localVector.copy(p).divideScalar(chunkWorldSize);
    const mesh =
      this.object.children.find(
        (m) => !!m.chunk && m.chunk.equals(localVector)
      ) || null;
    return mesh;
  } */

  hit(e) {
    const {hitPosition} = e;
    // console.log('hit 1', hitPosition.toArray().join(','));
    const result = dcWorkerManager.eraseSphereDamage(hitPosition, 3);
    // console.log('hit 2', hitPosition.toArray().join(','), result);
    /* const oldMeshes = neededChunkMins.map((v) => {
      return this.getMeshAtWorldPosition(v);
    });
    const oldChunks = oldMeshes.filter(mesh => mesh !== null).map(mesh => mesh.chunk);
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
    }, 1000); */
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

export default (e) => {
  const app = useApp();
  const physics = usePhysics();
  // const hitManager = useHitManager();
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

  app.getPhysicsObjects = () => generator.getPhysicsObjects();

  // console.log('got hit tracker', app.hitTracker);
  app.addEventListener('hit', e => {
    generator.hit(e);
  });

  /* let lastHitTime = 0;
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
  }); */

  useFrame(() => {
    const localPlayer = useLocalPlayer();
    // localMatrix.compose(localPlayer.position, localPlayer.quaternion, localPlayer.scale)
    localMatrix.copy(localPlayer.matrixWorld)
      .premultiply(
        localMatrix2.copy(app.matrixWorld).invert()
      )
      .decompose(localVector, localQuaternion, localVector2)
    // console.log('got pos', localPlayer.position.toArray().join(','), localVector.toArray().join(','));
    tracker.update(localVector);
  });

  useCleanup(() => {
    tracker.destroy();
  });

  return app
}
