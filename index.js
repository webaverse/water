import metaversefile from 'metaversefile';
import * as THREE from 'three';
// import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';

const {useApp, useLocalPlayer, useFrame, useCleanup, usePhysics, useLoaders, useDcWorkerManager, useLodder} = metaversefile;

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
for (const biome of biomeSpecs) {
  biome[2] = biome[2].replace(/Base_Color/, '');
}
const mapNames = [
  'Base_Color',
  'Height',
  'Normal',
  'Roughness',
  'Ambient_Occlusion',
];
const biomesPngTexturePrefix = `/images/stylized-textures/png/`;
const biomesKtx2TexturePrefix = `/images/land-textures/`;
const neededTexturePrefixes = (() => {
  const neededTexturePrefixesSet = new Set();
  for (const biomeSpec of biomeSpecs) {
    const [name, colorHex, textureName] = biomeSpec;
    neededTexturePrefixesSet.add(textureName);
  }
  const neededTexturePrefixes = Array.from(neededTexturePrefixesSet);
  return neededTexturePrefixes;
})();
const texturesPerRow = Math.ceil(Math.sqrt(neededTexturePrefixes.length));
// window.neededTexturePrefixes = neededTexturePrefixes;

const loadImage = u => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => {
    resolve(img);
  };
  img.onerror = reject;
  img.crossOrigin = 'Anonymous';
  img.src = u;
});
function downloadFile(file, filename) {
  const blobURL = URL.createObjectURL(file);
  const tempLink = document.createElement('a');
  tempLink.style.display = 'none';
  tempLink.href = blobURL;
  tempLink.setAttribute('download', filename);

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
}
const bakeBiomesAtlas = async ({
  size = 8 * 1024,
} = {}) => {
  const atlasTextures = [];
  const textureTileSize = size / texturesPerRow;
  const halfTextureTileSize = textureTileSize / 2;

  for (const mapName of mapNames) {
    const neededTextureNames = neededTexturePrefixes.map(prefix => `${prefix}${mapName}`);

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    document.body.appendChild(canvas);
    canvas.style.cssText = `\
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      width: 1024px;
      height: 1024px;
    `;

    let index = 0;
    for (const textureName of neededTextureNames) {
      const x = index % texturesPerRow;
      const y = Math.floor(index / texturesPerRow);

      const u = biomesPngTexturePrefix + textureName + '.png';
      const img = await loadImage(u);
      console.log('load u', u, textureName, img.width, img.height);

      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          ctx.drawImage(
            img,
            x * textureTileSize + halfTextureTileSize * dx,
            y * textureTileSize + halfTextureTileSize * dy,
            halfTextureTileSize,
            halfTextureTileSize
          );
        }
      }
      atlasTextures.push({
        name: textureName,
        uv: [
          x * textureTileSize / size,
          y * textureTileSize / size,
          (x + 1) * textureTileSize / size,
          (y + 1) * textureTileSize / size,
        ],
      });
    
      index++;
    }

    const canvasBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(resolve, 'image/png');
    });
    downloadFile(canvasBlob, `${mapName}.png`);

    document.body.removeChild(canvas);
  }

  const atlasJson = {
    textures: atlasTextures,
  };
  const atlasJsonString = JSON.stringify(atlasJson, null, 2);
  const atlasJsonBlob = new Blob([atlasJsonString], {type: 'application/json'});
  downloadFile(atlasJsonBlob, `megatexture-atlas.json`);
};
window.bakeBiomesAtlas = bakeBiomesAtlas;

class TerrainMesh extends THREE.Mesh {
  constructor({
    physics,
    biomeDataTexture,
    biomeUvDataTexture,
    atlasTextures,
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

    /* const earthTexture = textureLoader.load(
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
    grassNormal.wrapS = grassNormal.wrapT = THREE.RepeatWrapping */
    const material = new THREE.MeshStandardMaterial({
      map: biomeDataTexture,
      normalMap: new THREE.Texture(),
      transparent: true,
      onBeforeCompile: (shader) => {
        console.log('on before compile', shader.fragmentShader);

        shader.uniforms.biomeUvDataTexture = {
          value: biomeUvDataTexture,
          needsUpdate: true,
        };
        for (const mapName of mapNames) {
          shader.uniforms[mapName] = {
            value: atlasTextures[mapName],
            needsUpdate: true,
          };
        }
        
        //

        shader.vertexShader = shader.vertexShader.replace(`#include <uv_pars_vertex>`, `\
#ifdef USE_UV
	#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif

attribute ivec4 biomes;
attribute vec4 biomesWeights;
uniform sampler2D map;
flat varying ivec4 vBiomes;
varying vec4 vBiomesWeights;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
vec4 sampleBiome(ivec4 biomes, vec4 biomesWeights) {
  vec2 uv0 = vec2((float(biomes.x) + 0.5) / 256.0, 0.5);
  vec4 sampledDiffuseColor0 = texture2D(map, uv0);

  vec2 uv1 = vec2((float(biomes.y) + 0.5) / 256.0, 0.5);
  vec4 sampledDiffuseColor1 = texture2D(map, uv1);

  vec2 uv2 = vec2((float(biomes.z) + 0.5) / 256.0, 0.5);
  vec4 sampledDiffuseColor2 = texture2D(map, uv2);

  vec2 uv3 = vec2((float(biomes.w) + 0.5) / 256.0, 0.5);
  vec4 sampledDiffuseColor3 = texture2D(map, uv3);

  return vec4(
    sampledDiffuseColor0.rgb * biomesWeights.x +
    sampledDiffuseColor1.rgb * biomesWeights.y +
    sampledDiffuseColor2.rgb * biomesWeights.z +
    sampledDiffuseColor3.rgb * biomesWeights.w,
    1.
  );
}
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <worldpos_vertex>`, `\
// #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION )
  vec4 worldPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    worldPosition = instanceMatrix * worldPosition;
  #endif
  worldPosition = modelMatrix * worldPosition;
// #endif

vWorldPosition = worldPosition.xyz;
vWorldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
// vSampleColor = sampleBiome(biomes, biomesWeights);
vBiomes = biomes;
vBiomesWeights = biomesWeights;
        `);

        //

        shader.fragmentShader = shader.fragmentShader.replace(`#include <map_pars_fragment>`, `\
#ifdef USE_MAP
  uniform sampler2D map;
#endif

// uniform sampler2D uEarthBaseColor;
uniform sampler2D Base_Color;
uniform sampler2D Normal;
uniform sampler2D biomeUvDataTexture;
flat varying ivec4 vBiomes;
varying vec4 vBiomesWeights;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

vec4 fourTapSample(
  sampler2D atlas,
  vec2 tileUV,
  vec2 tileOffset,
  vec2 tileSize
) {
  //Initialize accumulators
  vec4 color = vec4(0.0, 0.0, 0.0, 0.0);
  float totalWeight = 0.0;

  for (int dx=0; dx<2; ++dx) {
    for (int dy=0; dy<2; ++dy) {
      //Compute coordinate in 2x2 tile patch
      vec2 tileCoord = 2.0 * fract(0.5 * (tileUV + vec2(dx,dy)));

      //Weight sample based on distance to center
      float w = pow(1.0 - max(abs(tileCoord.x-1.0), abs(tileCoord.y-1.0)), 16.0);

      //Compute atlas coord
      vec2 atlasUV = tileOffset + tileSize * tileCoord;

      //Sample and accumulate
      color += w * texture2D(atlas, atlasUV);
      totalWeight += w;
    }
  }

  return color / totalWeight;
}
vec4 triplanarMap(sampler2D Base_Color, vec3 position, vec3 normal) {
  // Triplanar mapping
  vec2 tx = position.yz;
  vec2 ty = position.zx;
  vec2 tz = position.xy;

  vec2 tileOffset = texture2D(biomeUvDataTexture, vec2((float(vBiomes.x) + 0.5) / 256., 0.5)).rg;
  const vec2 tileSize = vec2(1. / ${texturesPerRow.toFixed(8)}) * 0.5;

  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));

  vec4 cx = fourTapSample(Base_Color, tx, tileOffset, tileSize) * bf.x;
  vec4 cy = fourTapSample(Base_Color, ty, tileOffset, tileSize) * bf.y;
  vec4 cz = fourTapSample(Base_Color, tz, tileOffset, tileSize) * bf.z;
  
  vec4 color = cx + cy + cz;
  return color;
}
vec4 triplanarNormal(sampler2D Normal, vec3 position, vec3 normal) {
  // Tangent Reconstruction
  // Triplanar uvs
  vec2 uvX = position.zy;
  vec2 uvY = position.xz;
  vec2 uvZ = position.xy;

  vec2 tileOffset = texture2D(biomeUvDataTexture, vec2((float(vBiomes.x) + 0.5) / 256., 0.5)).rg;
  const vec2 tileSize = vec2(1. / ${texturesPerRow.toFixed(8)}) * 0.5;
  
  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));

  vec4 cx = fourTapSample(Normal, uvX, tileOffset, tileSize) * bf.x;
  vec4 cy = fourTapSample(Normal, uvY, tileOffset, tileSize) * bf.y;
  vec4 cz = fourTapSample(Normal, uvZ, tileOffset, tileSize) * bf.z;

  vec4 color = cx + cy + cz;
  return color;

  /* // Get the sign (-1 or 1) of the surface normal
  vec3 axis = sign(vNormal);

  // Construct tangent to world matrices for each axis
  vec3 tangentX = normalize(cross(vNormal, vec3(0.0, axis.x, 0.0)));
  vec3 bitangentX = normalize(cross(tangentX, vNormal)) * axis.x;
  mat3 tbnX = mat3(tangentX, bitangentX, vNormal);
  vec3 tangentY = normalize(cross(vNormal, vec3(0.0, 0.0, axis.y)));
  vec3 bitangentY = normalize(cross(tangentY, vNormal)) * axis.y;
  mat3 tbnY = mat3(tangentY, bitangentY, vNormal);
  vec3 tangentZ = normalize(cross(vNormal, vec3(0.0, -axis.z, 0.0)));
  vec3 bitangentZ = normalize(-cross(tangentZ, vNormal)) * axis.z;
  mat3 tbnZ = mat3(tangentZ, bitangentZ, vNormal);
  // Apply tangent to world matrix and triblend
  // Using clamp() because the cross products may be NANs
  vec3 worldNormal = normalize(
      clamp(tbnX * tx, -1.0, 1.0) * bf.x +
      clamp(tbnY * ty, -1.0, 1.0) * bf.y +
      clamp(tbnZ * tz, -1.0, 1.0) * bf.z
  );
  return vec4(worldNormal, 0.0); */
}
        `);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <normal_fragment_maps>`, `\
#ifdef OBJECTSPACE_NORMALMAP
	normal = triplanarNormal(Normal, vWorldPosition, vWorldNormal).xyz /*texture2D( normalMap, vUv ).xyz*/ * 2.0 - 1.0; // overrides both flatShading and attribute normals
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( TANGENTSPACE_NORMALMAP )
	vec3 mapN = triplanarNormal(Normal, vWorldPosition, vWorldNormal).xyz /*texture2D( normalMap, vUv ).xyz*/ * 2.0 - 1.0;
	mapN.xy *= normalScale;
	#ifdef USE_TANGENT
		normal = normalize( vTBN * mapN );
	#else
		normal = perturbNormal2Arb( - vViewPosition, normal, mapN, faceDirection );
	#endif
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif
        `);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <map_fragment>`, `\
#ifdef USE_MAP
  vec4 sampledDiffuseColor = triplanarMap(Base_Color, vWorldPosition, vWorldNormal);
  sampledDiffuseColor.a = 1.;
  #ifdef DECODE_VIDEO_TEXTURE
    // inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)
    sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif
        `);
        return shader;
      },
    });
    super(geometry, [material]); // array is needed for groups support
    this.frustumCulled = false;

    this.physics = physics;
    this.allocator = allocator;
    this.physicsObjects = [];

    // window.terrainMesh = this;
  }
  async addChunk(chunk, {
    signal,
  }) {
    const lodArray = [1, 1, 1, 1, 1, 1, 1, 1];
    const meshData = await dcWorkerManager.generateChunk(chunk, lodArray);
    // console.log('mesh data', meshData);
    signal.throwIfAborted();
    if (meshData) { // non-empty chunk
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
  constructor(parent, {
    physics,
    biomeDataTexture,
    biomeUvDataTexture,
    atlasTextures,
  } = {}) {
    // parameters
    this.parent = parent;
    this.physics = physics;
    this.biomeDataTexture = biomeDataTexture;
    this.biomeUvDataTexture = biomeUvDataTexture;
    this.atlasTextures = atlasTextures;

    // mesh
    this.object = new THREE.Group();
    this.object.name = 'terrain-chunk-generator';

    this.terrainMesh = new TerrainMesh({
      physics: this.physics,
      biomeDataTexture: this.biomeDataTexture,
      biomeUvDataTexture: this.biomeUvDataTexture,
      atlasTextures: this.atlasTextures,
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
  const {LodChunkTracker} = useLodder();

  app.name = 'dual-contouring-terrain';

  let live = true;
  let generator = null;
  let tracker = null;
  e.waitUntil((async () => {
    const biomeDataTexture = (() => {
      const data = new Uint8Array(256 * 4);
      for (let i = 0; i < biomeSpecs.length; i++) {
        const biomeSpec = biomeSpecs[i];
        const [name, colorHex, textureName] = biomeSpec;
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
    const biomeUvDataTexture = (() => {
      const data = new Uint8Array(256 * 4);
      for (let i = 0; i < biomeSpecs.length; i++) {
        const biomeSpec = biomeSpecs[i];
        const [name, colorHex, textureName] = biomeSpec;
        
        const biomeAtlasIndex = neededTexturePrefixes.indexOf(textureName);
        if (biomeAtlasIndex === -1) {
          throw new Error('no such biome: ' + textureName);
        }
        
        const x = biomeAtlasIndex % texturesPerRow;
        const y = Math.floor(biomeAtlasIndex / texturesPerRow);
        
        data[i * 4] = x / texturesPerRow * 255;
        data[i * 4 + 1] = y / texturesPerRow * 255;
        data[i * 4 + 2] = 0;
        data[i * 4 + 3] = 255;
      }
      // console.log('got uv data texture', data);
      const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      return texture;
    })();
    window.biomeUvDataTexture = biomeUvDataTexture;

    const {ktx2Loader} = useLoaders();
    const atlasTexturesArray = await Promise.all(mapNames.map(mapName => new Promise((accept, reject) => {
      ktx2Loader.load(`${biomesKtx2TexturePrefix}build/8k/${mapName}.ktx2`, accept, function onprogress(e) {}, reject);
    })));
    window.atlasTexturesArray = atlasTexturesArray;
    if (!live) return;
    
    const atlasTextures = {};
    for (let i = 0; i < mapNames.length; i++) {
      // atlasTexturesArray[i].needsUpdate = true;
      // atlasTexturesArray[i].wrapS = THREE.RepeatWrapping;
      // atlasTexturesArray[i].wrapT = THREE.RepeatWrapping;
      const compressedTexture = atlasTexturesArray[i];
      // compressedTexture.encoding = THREE.sRGBEncoding;
      compressedTexture.anisotropy = 16;
      atlasTextures[mapNames[i]] = compressedTexture;
    }

    generator = new TerrainChunkGenerator(this, {
      physics,
      biomeDataTexture,
      biomeUvDataTexture,
      atlasTextures,
    });
    tracker = new LodChunkTracker(generator, {
      chunkWorldSize,
      numLods,
      chunkHeight: chunkWorldSize,
    });

    app.add(generator.object);
    generator.object.updateMatrixWorld();
  })());

  app.getPhysicsObjects = () => generator ? generator.getPhysicsObjects() : [];

  // console.log('got hit tracker', app.hitTracker);
  app.addEventListener('hit', e => {
    generator && generator.hit(e);
  });

  useFrame(() => {
    if (tracker) {
      const localPlayer = useLocalPlayer();
      localMatrix.copy(localPlayer.matrixWorld)
        .premultiply(
          localMatrix2.copy(app.matrixWorld).invert()
        )
        .decompose(localVector, localQuaternion, localVector2)
      tracker.update(localVector);
    }
  });

  useCleanup(() => {
    live = false;
    tracker && tracker.destroy();
  });

  return app
}
