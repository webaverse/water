import metaversefile from 'metaversefile';
// import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
// import { terrainVertex, terrainFragment } from './shaders/terrainShader.js';
// import biomeSpecs from './biomes.js';

const {
  useApp,
  useLocalPlayer,
  // useScene,
  // useRenderer,
  useFrame,
  // useMaterials,
  useCleanup,
  usePhysics,
  // useLoaders,
  useInstancing,
  useProcGenManager,
  // useLodder,
} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

//

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
// const localVector3 = new THREE.Vector3();
// const localVector4 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
// const localColor = new THREE.Color();
const localSphere = new THREE.Sphere();
// const localBox = new THREE.Box3();

// const zeroVector = new THREE.Vector3();

//

const procGenManager = useProcGenManager();
const chunkWorldSize = procGenManager.chunkSize;
const terrainSize = chunkWorldSize * 4;
const chunkRadius = Math.sqrt(chunkWorldSize * chunkWorldSize * 3);
const numLods = 1;
const bufferSize = 20 * 1024 * 1024;

// const textureLoader = new THREE.TextureLoader();
const abortError = new Error('chunk disposed');
abortError.isAbortError = true;
const fakeMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
});

class ChunkRenderData {
  constructor(meshData, geometryBuffer) {
    this.meshData = meshData;
    this.geometryBuffer = geometryBuffer;
  }
}

//

const textureUrls = {
  Base_Color: `${baseUrl}Vol_36_3_Water_Base_Color.png`,
};
const textureNames = Object.keys(textureUrls);
/* const biomesPngTexturePrefix = `/images/stylized-textures/png/`;
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
const texturesPerRow = Math.ceil(Math.sqrt(neededTexturePrefixes.length)); */

const { BatchedMesh, GeometryAllocator } = useInstancing();
class WaterMesh extends BatchedMesh {
  constructor({ procGenInstance, physics, biomeUvDataTexture, textures }) {
    const allocator = new GeometryAllocator(
      [
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
          name: 'biome',
          Type: Int32Array,
          itemSize: 1,
        },
      ],
      {
        bufferSize,
        boundingType: 'sphere',
      }
    );
    const {geometry} = allocator;

    const lightMapper = procGenInstance.getLightMapper();
    lightMapper.addEventListener('update', e => {
      const {coord} = e.data;
      material.uniforms.uLightBasePosition.value.copy(coord);
      material.uniforms.uLightBasePosition.needsUpdate = true;
    });

    const material = new THREE.MeshStandardMaterial({
      map: new THREE.Texture(),
      // normalMap: new THREE.Texture(),
      // emissiveMap: new THREE.Texture(),
      // normalScale: new THREE.Vector2(50, 50),
      // normalMapType: THREE.ObjectSpaceNormalMap,
      // bumpMap: new THREE.Texture(),
      // bumpScale: 1,
      // roughness: 1,
      // roughnessMap: new THREE.Texture(),
      // aoMap: new THREE.Texture(),
      // transparent: true,
      onBeforeCompile: (shader) => {
        for (const k in material.uniforms) {
          shader.uniforms[k] = material.uniforms[k];
        }

      // vertex shader

      shader.vertexShader = shader.vertexShader.replace(`#include <uv_pars_vertex>`, `\
#ifdef USE_UV
  #ifdef UVS_VERTEX_ONLY
    vec2 vUv;
  #else
    varying vec2 vUv;
  #endif
  uniform mat3 uvTransform;
#endif

precision highp sampler3D;

attribute int biome;
uniform vec3 uLightBasePosition;
uniform float uTerrainSize;
uniform sampler3D uSkylightTex;
uniform sampler3D uAoTex;
flat varying int vBiome;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying float vLightValue;
        `);
        shader.vertexShader = shader.vertexShader.replace(`#include <worldpos_vertex>`, `\
// #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION )
  vPosition = transformed;
  vec4 worldPosition = vec4( transformed, 1.0 );
  #ifdef USE_INSTANCING
    worldPosition = instanceMatrix * worldPosition;
  #endif
  worldPosition = modelMatrix * worldPosition;
// #endif

// varyings
{
  vWorldNormal = (modelMatrix * vec4(normal, 0.0)).xyz;
  vBiome = biome;
}

// lighting
{
  const float numLightBands = 8.;

  vec3 uvLight = (vPosition - uLightBasePosition) / uTerrainSize; // XXX this can be interpolated in the vertex shader
  float lightValue = 1.;

  // skylight
  {
    vec4 skylightColor = texture(uSkylightTex, uvLight);
    float skylightValue = skylightColor.r * 255.;

    const float maxSkylight = 8.;
    skylightValue /= maxSkylight;

    lightValue *= skylightValue;
  }
  // ao
  {
    vec4 aoColor = texture(uAoTex, uvLight);
    float aoValue = aoColor.r * 255.;
    
    const float maxAo = 27.;
    const float baseAo = 0.3;
    aoValue /= maxAo;
    aoValue = baseAo + aoValue * (1. - baseAo);
    
    lightValue *= aoValue;
  }

  // clip lighting
  if (uvLight.x <= 0. || uvLight.x >= uTerrainSize || uvLight.z <= 0. || uvLight.z >= uTerrainSize || uvLight.y <= 0. || uvLight.y >= uTerrainSize) {
    lightValue = 0.;
  }
  // adjust lighting
  lightValue *= 2.;

  vLightValue = lightValue;
}
        `);

        // fragment shader

        shader.fragmentShader = shader.fragmentShader.replace(`#include <map_pars_fragment>`, `\
#ifdef USE_MAP
  // uniform sampler2D map;
#endif

uniform sampler2D Base_Color;
uniform sampler2D Emissive;
uniform sampler2D Normal;
uniform sampler2D Roughness;
uniform sampler2D Ambient_Occlusion;
uniform sampler2D Height;
uniform vec3 uLightBasePosition;
uniform float uTerrainSize;
flat varying int vBiome;
varying vec3 vPosition;
varying vec3 vWorldNormal;
varying float vLightValue;

vec4 triplanarMap(sampler2D Base_Color, vec3 position, vec3 normal) {
  // Triplanar mapping
  vec2 tx = position.yz;
  vec2 ty = position.zx;
  vec2 tz = position.xy;

  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));

  vec4 cx = texture2D(Base_Color, tx) * bf.x;
  vec4 cy = texture2D(Base_Color, ty) * bf.y;
  vec4 cz = texture2D(Base_Color, tz) * bf.z;
  
  vec4 color = cx + cy + cz;
  return color;
}
vec4 triplanarMapDx(sampler2D Base_Color, vec3 position, vec3 normal) {
  // Triplanar mapping
  vec2 tx = position.yz;
  vec2 ty = position.zx;
  vec2 tz = position.xy;

  vec2 txDx = dFdx(tx);
  vec2 tyDx = dFdx(ty);
  vec2 tzDx = dFdx(tz);

  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));

  vec4 cx = texture2D(Base_Color, tx + txDx) * bf.x;
  vec4 cy = texture2D(Base_Color, ty + tyDx) * bf.y;
  vec4 cz = texture2D(Base_Color, tz + tzDx) * bf.z;
  
  vec4 color = cx + cy + cz;
  return color;
}
vec4 triplanarMapDy(sampler2D Base_Color, vec3 position, vec3 normal) {
  // Triplanar mapping
  vec2 tx = position.yz;
  vec2 ty = position.zx;
  vec2 tz = position.xy;

  vec2 txDy = dFdy(tx);
  vec2 tyDy = dFdy(ty);
  vec2 tzDy = dFdy(tz);

  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));

  vec4 cx = texture2D(Base_Color, tx + txDy) * bf.x;
  vec4 cy = texture2D(Base_Color, ty + tyDy) * bf.y;
  vec4 cz = texture2D(Base_Color, tz + tzDy) * bf.z;
  
  vec4 color = cx + cy + cz;
  return color;
}
vec4 triplanarNormal(sampler2D Normal, vec3 position, vec3 normal) {
  // Tangent Reconstruction
  // Triplanar uvs
  vec2 uvX = position.zy;
  vec2 uvY = position.xz;
  vec2 uvZ = position.xy;

  vec3 bf = normalize(abs(normal));
  bf /= dot(bf, vec3(1.));
  
  vec4 cx = texture2D(Normal, uvX);
  vec4 cy = texture2D(Normal, uvY);
  vec4 cz = texture2D(Normal, uvZ);

  cx = cx * 2. - 1.;
  cy = cy * 2. - 1.;
  cz = cz * 2. - 1.;

  cx *= bf.x;
  cy *= bf.y;
  cz *= bf.z;

  cx = (cx + 1.) / 2.;
  cy = (cy + 1.) / 2.;
  cz = (cz + 1.) / 2.;

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
        shader.fragmentShader = shader.fragmentShader.replace(`#include <bumpmap_pars_fragment>`, `\
#ifdef USE_BUMPMAP
  // uniform sampler2D bumpMap;
  uniform float bumpScale;
  // Bump Mapping Unparametrized Surfaces on the GPU by Morten S. Mikkelsen
  // https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf
  // Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2)
  vec2 dHdxy_fwd() {
    // vec2 dSTdx = dFdx( vUv );
    // vec2 dSTdy = dFdy( vUv );

    float Hll = bumpScale * triplanarMap( Normal, vPosition, vWorldNormal ).x;
    float dBx = bumpScale * triplanarMapDx( Normal, vPosition, vWorldNormal ).x - Hll;
    float dBy = bumpScale * triplanarMapDy( Normal, vPosition, vWorldNormal ).x - Hll;
    return vec2( dBx, dBy );
  }
  vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
    // Workaround for Adreno 3XX dFd*( vec3 ) bug. See #9988
    vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
    vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
    vec3 vN = surf_norm;		// normalized
    vec3 R1 = cross( vSigmaY, vN );
    vec3 R2 = cross( vN, vSigmaX );
    float fDet = dot( vSigmaX, R1 ) * faceDirection;
    vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
    return normalize( abs( fDet ) * surf_norm - vGrad );
  }
#endif
        `);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <roughnessmap_fragment>`, `\
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  vec4 texelRoughness = triplanarMap( Roughness, vPosition, vWorldNormal );
  // reads channel G, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
  roughnessFactor *= texelRoughness.g;
#endif
        `);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <normal_fragment_maps>`, `\
#ifdef OBJECTSPACE_NORMALMAP
  normal = triplanarNormal(Normal, vPosition, vWorldNormal).xyz /*texture2D( normalMap, vUv ).xyz*/ * 2.0 - 1.0; // overrides both flatShading and attribute normals
  #ifdef FLIP_SIDED
    normal = - normal;
  #endif
  #ifdef DOUBLE_SIDED
    normal = normal * faceDirection;
  #endif
  normal = normalize( normalMatrix * normal ) * 10.;
#elif defined( TANGENTSPACE_NORMALMAP )
  vec3 mapN = triplanarNormal(Normal, vPosition, vWorldNormal).xyz /*texture2D( normalMap, vUv ).xyz*/ * 2.0 - 1.0;
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
  vec4 sampledDiffuseColor = triplanarMap(Base_Color, vPosition, vWorldNormal);
  // sampledDiffuseColor.a = 1.;
  #ifdef DECODE_VIDEO_TEXTURE
    // inline sRGB decode (TODO: Remove this code when https://crbug.com/1256340 is solved)
    sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
  #endif
  diffuseColor *= sampledDiffuseColor;
#endif

// lighting
{
  diffuseColor.rgb *= vLightValue;
  // diffuseColor.a = 1.;
}
        `);
        shader.fragmentShader = shader.fragmentShader.replace(`#include <aomap_fragment>`, `\
#ifdef USE_AOMAP
  // reads channel R, compatible with a combined OcclusionRoughnessMetallic (RGB) texture
  float ambientOcclusion = ( triplanarMap( Ambient_Occlusion, vPosition, vWorldNormal ).r /* * - 1.0 */ ) * aoMapIntensity /* + 1.0 */;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
  #endif
#endif
        `);
        return shader;
      },
    });
    material.uniforms = (() => {
      const uniforms = {};

      // biomes uv index texture
      uniforms.biomeUvDataTexture = {
        value: biomeUvDataTexture,
        needsUpdate: true,
      };
      // texture atlas
      for (const textureName of textureNames) {
        uniforms[textureName] = {
          value: textures[textureName],
          needsUpdate: true,
        };
      }
      // lighting
      uniforms.uSkylightTex = {
        value: lightMapper.skylightTex,
        needsUpdate: true,
      };
      uniforms.uAoTex = {
        value: lightMapper.aoTex,
        needsUpdate: true,
      };
      uniforms.uLightBasePosition = {
        value: lightMapper.lightBasePosition.clone(),
        needsUpdate: true,
      };
      uniforms.uTerrainSize = {
        value: terrainSize,
        needsUpdate: true,
      };

      return uniforms;
    })();
    super(geometry, material, allocator);
    this.frustumCulled = false;

    this.procGenInstance = procGenInstance;
    this.physics = physics;
    this.allocator = allocator;
    this.physicsObjects = [];

    this.lightMapper = lightMapper;
  }
  async addChunk(chunk, { signal }) {
    const renderData = await this.getChunkRenderData(chunk, signal);
    this.drawChunk(chunk, renderData, signal);
  }
  async getChunkRenderData(chunk, signal) {
    const meshData =
      await this.procGenInstance.dcWorkerManager.generateLiquidChunk(
        chunk,
        chunk.lodArray,
        {
          signal,
        }
      );
    if (meshData) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(meshData.positions, 3)
      );
      geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
      const physicsMesh = new THREE.Mesh(geometry, fakeMaterial);

      const geometryBuffer = await this.physics.cookGeometryAsync(physicsMesh, {
        signal,
      });
      return new ChunkRenderData(meshData, geometryBuffer);
    } else {
      return null;
    }
  }
  drawChunk(chunk, renderData, signal) {
    if (renderData) {
      // non-empty chunk
      const { meshData } = renderData;

      const _mapOffsettedIndices = (
        srcIndices,
        dstIndices,
        dstOffset,
        positionOffset
      ) => {
        const positionIndex = positionOffset / 3;
        for (let i = 0; i < srcIndices.length; i++) {
          dstIndices[dstOffset + i] = srcIndices[i] + positionIndex;
        }
      };
      const _renderMeshDataToGeometry = (
        meshData,
        geometry,
        geometryBinding
      ) => {
        let positionOffset = geometryBinding.getAttributeOffset('position');
        let normalOffset = geometryBinding.getAttributeOffset('normal');
        let biomeOffset = geometryBinding.getAttributeOffset('biome');
        let indexOffset = geometryBinding.getIndexOffset();

        _mapOffsettedIndices(
          meshData.indices,
          geometry.index.array,
          indexOffset,
          positionOffset
        );

        geometry.attributes.position.update(
          positionOffset,
          meshData.positions.length,
          meshData.positions,
          0
        );
        geometry.attributes.normal.update(
          normalOffset,
          meshData.normals.length,
          meshData.normals,
          0
        );
        geometry.attributes.biome.update(
          biomeOffset,
          meshData.biomes.length,
          meshData.biomes,
          0
        );
        geometry.index.update(indexOffset, meshData.indices.length);
      };
      const _handleMesh = () => {
        localSphere.center
          .set(
            (chunk.x + 0.5) * chunkWorldSize,
            (chunk.y + 0.5) * chunkWorldSize,
            (chunk.z + 0.5) * chunkWorldSize
          )
          .applyMatrix4(this.matrixWorld);
        localSphere.radius = chunkRadius;
        const geometryBinding = this.allocator.alloc(
          meshData.positions.length,
          meshData.indices.length,
          localSphere
        );
        _renderMeshDataToGeometry(
          meshData,
          this.allocator.geometry,
          geometryBinding
        );

        signal.addEventListener('abort', (e) => {
          this.allocator.free(geometryBinding);
        });
      };
      _handleMesh();

      /* const _handlePhysics = async () => {
        this.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        const physicsObject = this.physics.addCookedGeometry(
          geometryBuffer,
          localVector,
          localQuaternion,
          localVector2
        );
        this.physicsObjects.push(physicsObject);

        // console.log('cook 3', mesh);

        signal.addEventListener('abort', (e) => {
          this.physics.removeGeometry(physicsObject);
          this.physicsObjects.splice(
            this.physicsObjects.indexOf(physicsObject),
            1
          );
        });
      };
      _handlePhysics(); */
    }
  }
  updateCoord(min2xCoord) {
    // XXX only do this on light mapper update
    // XXX needs to apply to the terrain mesh too, though the terrain mesh is driving the lighting (maybe rethink this)
    // XXX create a new lighting app which tracks the lighting only
    // XXX maybe do the same for hte heightfield?
    if (this.lightMapper.updateCoord(min2xCoord)) {
      this.material.uniforms.uLightBasePosition.value.copy(
        this.lightMapper.lightBasePosition
      );
      this.material.uniforms.uLightBasePosition.needsUpdate = true;
    }
  }
}

class WaterChunkGenerator {
  constructor({
    procGenInstance,
    physics,
    // biomeUvDataTexture,
    textures,
  } = {}) {
    // parameters
    this.procGenInstance = procGenInstance;
    this.physics = physics;
    // this.biomeUvDataTexture = biomeUvDataTexture;
    this.textures = textures;

    // mesh
    this.object = new THREE.Group();
    this.object.name = 'water';

    this.waterMesh = new WaterMesh({
      procGenInstance: this.procGenInstance,
      physics: this.physics,
      // biomeUvDataTexture: this.biomeUvDataTexture,
      textures: this.textures,
    });
    this.object.add(this.waterMesh);
  }

  getMeshes() {
    return this.object.children;
  }
  getPhysicsObjects() {
    return this.waterMesh.physicsObjects;
  }

  async generateChunk(chunk) {
    const signal = this.bindChunk(chunk);

    try {
      await this.waterMesh.addChunk(chunk, {
        signal,
      });
    } catch (err) {
      if (!err?.isAbortError) {
        console.warn(err);
      }
    }
  }
  disposeChunk(chunk) {
    const binding = chunk.binding;
    if (binding) {
      const { abortController } = binding;
      abortController.abort(abortError);

      chunk.binding = null;
    }
  }
  async relodChunk(oldChunk, newChunk) {
    // console.log('relod chunk', oldChunk, newChunk);

    try {
      const oldAbortController = oldChunk.binding.abortController;
      const newSignal = this.bindChunk(newChunk);

      const abortOldChunk = (e) => {
        oldAbortController.abort(abortError);
      };
      newSignal.addEventListener('abort', abortOldChunk);

      const renderData = await this.waterMesh.getChunkRenderData(
        newChunk,
        newSignal
      );

      newSignal.removeEventListener('abort', abortOldChunk);

      this.disposeChunk(oldChunk);
      this.waterMesh.drawChunk(newChunk, renderData, newSignal);
    } catch (err) {
      if (err !== abortError) {
        console.warn(err);
      }
    }
  }

  bindChunk(chunk) {
    const abortController = new AbortController();
    const { signal } = abortController;

    chunk.binding = {
      abortController,
    };

    return signal;
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
  const procGenManager = useProcGenManager();

  const seed = app.getComponent('seed') ?? null;
  let range = app.getComponent('range') ?? null;
  const wait = app.getComponent('wait') ?? false;
  if (range) {
    range = new THREE.Box3(
      new THREE.Vector3(range[0][0], range[0][1], range[0][2]),
      new THREE.Vector3(range[1][0], range[1][1], range[1][2])
    );
  }

  app.name = 'water';

  let live = true;
  let generator = null;
  let tracker = null;
  e.waitUntil(
    (async () => {
      const texturesArray = await Promise.all(textureNames.map(async k => {
        const u = textureUrls[k];
        const img = new Image();
        await new Promise((accept, reject) => {
          img.onload = () => {
            accept();
          };
          img.onerror = reject;
          img.crossOrigin = 'Anonymous';
          img.src = u;
        });
        const texture = new THREE.Texture(img);
        texture.transparent = true;
        return texture;
      }));
      if (!live) return;

      const textures = {};
      for (let i = 0; i < textureNames.length; i++) {
        textures[textureNames[i]] = texturesArray[i];
      }
        
      /* // this small texture maps biome indexes in the geometry to biome uvs in the atlas texture
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

          data[i * 4] = (x / texturesPerRow) * 255;
          data[i * 4 + 1] = (y / texturesPerRow) * 255;
          data[i * 4 + 2] = 0;
          data[i * 4 + 3] = 255;
        }
        const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.needsUpdate = true;
        return texture;
      })(); */

      const procGenInstance = procGenManager.getInstance(seed, range);

      generator = new WaterChunkGenerator({
        procGenInstance,
        physics,
        // biomeUvDataTexture,
        textures,
      });
      tracker = procGenInstance.getChunkTracker({
        numLods,
        trackY: true,
        relod: true,
      });

      tracker.addEventListener('coordupdate', coordupdate);
      tracker.addEventListener('chunkadd', chunkadd);
      tracker.addEventListener('chunkremove', chunkremove);
      tracker.addEventListener('chunkrelod', chunkrelod);

      if (wait) {
        await new Promise((accept, reject) => {
          tracker.addEventListener('update', () => {
            accept();
          }, {
            once: true,
          });
        });
      }

      app.add(generator.object);
      generator.object.updateMatrixWorld();
    })()
  );

  // app.getPhysicsObjects = () => generator ? generator.getPhysicsObjects() : [];

  const coordupdate = (e) => {
    const {coord} = e.data;
    generator.waterMesh.updateCoord(coord);
  };
  const chunkadd = (e) => {
    const {chunk, waitUntil} = e.data;
    waitUntil(generator.generateChunk(chunk));
  };
  const chunkremove = (e) => {
    const {chunk} = e.data;
    generator.disposeChunk(chunk);
  };
  const chunkrelod = (e) => {
    const {oldChunk, newChunk} = e.data;
    generator.relodChunk(oldChunk, newChunk);
  };

  useFrame(() => {
    if (!!tracker && !range) {
      const localPlayer = useLocalPlayer();
      localMatrix
        .copy(localPlayer.matrixWorld)
        .premultiply(localMatrix2.copy(app.matrixWorld).invert())
        .decompose(localVector, localQuaternion, localVector2);
      tracker.update(localVector);
    }
  });

  useCleanup(() => {
    live = false;
    if (tracker) {
      tracker.destroy();
    }
  });

  return app;
};
