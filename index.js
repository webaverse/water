import metaversefile from 'metaversefile';
// import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import ParticleEffect from './particle.js';
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
  useLoaders,
  useInstancing,
  useProcGenManager,
  useInternals,
  useRenderSettings,
  useSound,
  // useLodder,
} = metaversefile;

const sounds = useSound();
const soundFiles = sounds.getSoundFiles();

const waterWorldPosition = new THREE.Vector3();

let webaWaterPass = null;
let foamPass = null;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const textureLoader = new THREE.TextureLoader();
const bubbleTexture1 = textureLoader.load(`${baseUrl}/textures/Bubble3.png`);
const bubbleTexture2 = textureLoader.load(`${baseUrl}/textures/Bubble2.png`);
const noiseCircleTexture = textureLoader.load(`${baseUrl}/textures/noiseCircle.png`);
// const noiseTexture = textureLoader.load(`${baseUrl}/textures/perlin-noise.jpg`);
// const noiseTexture2 = textureLoader.load(`${baseUrl}/textures/noise.jpg`);
const voronoiNoiseTexture = textureLoader.load(`${baseUrl}/textures/voronoiNoise.jpg`);
voronoiNoiseTexture.wrapS = voronoiNoiseTexture.wrapT = THREE.RepeatWrapping;
const noiseMap = textureLoader.load(`${baseUrl}/textures/noise.jpg`);
noiseMap.wrapS = noiseMap.wrapT = THREE.RepeatWrapping;
const dudvMap = textureLoader.load(`${baseUrl}/textures/dudvMap.png`);
dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;
const dudvMap2 = textureLoader.load(`${baseUrl}/textures/dudvMap2.png`);
dudvMap2.wrapS = dudvMap2.wrapT = THREE.RepeatWrapping;
const noiseMap3 = textureLoader.load(`${baseUrl}/textures/noise3.png`);
const maskTexture = textureLoader.load(`${baseUrl}/textures/mask.png`);
const splashTexture = textureLoader.load(`${baseUrl}/textures/splash1.png`);
const splashTexture2 = textureLoader.load(`${baseUrl}/textures/splash2.png`);
// const splashTexture4 = textureLoader.load(`${baseUrl}/textures/splash.png`);
const rippleTexture = textureLoader.load(`${baseUrl}/textures/ripple3.png`);
rippleTexture.wrapS = rippleTexture.wrapT = THREE.RepeatWrapping;
const rippleTexture2 = textureLoader.load(`${baseUrl}/textures/ripple2.png`);
rippleTexture2.wrapS = rippleTexture2.wrapT = THREE.RepeatWrapping;

const waterNormalTexture1 = textureLoader.load(`${baseUrl}/textures/waterNormal2.png`);
waterNormalTexture1.wrapS = waterNormalTexture1.wrapT = THREE.RepeatWrapping;
const waterNormalTexture2 = textureLoader.load(`${baseUrl}/textures/waterNormal3.png`);
waterNormalTexture2.wrapS = waterNormalTexture2.wrapT = THREE.RepeatWrapping;


const waterDerivativeHeightTexture = textureLoader.load(`${baseUrl}/textures/water-derivative-height.png`);
waterDerivativeHeightTexture.wrapS = waterDerivativeHeightTexture.wrapT = THREE.RepeatWrapping;
const waterNormalTexture = textureLoader.load(`${baseUrl}/textures/water-normal.png`);
waterNormalTexture.wrapS = waterNormalTexture.wrapT = THREE.RepeatWrapping;
const waterNoiseTexture = textureLoader.load(`${baseUrl}/textures/perlin-noise.jpg`);
waterNoiseTexture.wrapS = waterNoiseTexture.wrapT = THREE.RepeatWrapping;
const waterNoiseTexture2 = textureLoader.load(`${baseUrl}/textures/water.png`);
waterNoiseTexture2.wrapS = waterNoiseTexture2.wrapT = THREE.RepeatWrapping;
const flowmapTexture = textureLoader.load(`${baseUrl}/textures/flowmap.png`);
flowmapTexture.wrapS = flowmapTexture.wrapT = THREE.RepeatWrapping;
//
const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localVector3D = new THREE.Vector3();
const localVector3D2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();
const localMatrix2 = new THREE.Matrix4();
const localSphere = new THREE.Sphere();


const procGenManager = useProcGenManager();
const chunkWorldSize = procGenManager.chunkSize;
const chunkRadius = Math.sqrt(chunkWorldSize * chunkWorldSize * 3);
const bufferSize = 20 * 1024 * 1024;
const defaultNumNods = 3;
const defaultMinLodRange = 2;

const abortError = new Error('chunk disposed');
abortError.isAbortError = true;
const fakeMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
});

class ChunkRenderData {
  constructor(meshData, geometryBuffer) {
    this.meshData = meshData;
    this.geometryBuffer = geometryBuffer;
  }
}


const textureUrls = {
  Base_Color: `${baseUrl}Vol_36_3_Water_Base_Color.png`,
};
const textureNames = Object.keys(textureUrls);


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

    const material = new THREE.ShaderMaterial({
        defines: {
          DEPTH_PACKING: 1,
          ORTHOGRAPHIC_CAMERA: 0
        },
        uniforms: {
          uTime: {
            value: 0
          },
          sunPosition: {
            value: new THREE.Vector3(200.0, 1.0, -600.)
          },
          tDudv: {
            value: null
          },
          tDepth: {
            value: null
          },
          cameraNear: {
            value: 0
          },
          cameraFar: {
            value: 0
          },
          resolution: {
            value: new THREE.Vector2()
          },
          waterNormalTexture1:{
            value:waterNormalTexture1
          },
          waterNormalTexture2:{
            value:waterNormalTexture2
          },
          waterWorldPosition:{
            value: new THREE.Vector3()
          }
        },
        vertexShader: `\
            
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
  
            varying vec2 vUv;
            varying vec3 vPos;
            
            void main() {
                vUv = uv;
  
                vPos = position;
                vec3 pos = position;
                vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectionPosition = projectionMatrix * viewPosition;
        
                gl_Position = projectionPosition;
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }
        `,
        fragmentShader: `\
          
          
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            #include <common>
            #include <packing>
            varying vec3 vPos;
            varying vec2 vUv;
            uniform mat4 modelMatrix;
            uniform float uTime;
            uniform vec3 sunPosition;
            uniform vec3 sunDirection;
            uniform vec3 waterWorldPosition;
            

            uniform sampler2D tDepth;
            uniform sampler2D tDudv;
            uniform float cameraNear;
            uniform float cameraFar;
            uniform vec2 resolution;
          
            uniform sampler2D waterNormalTexture1;
            uniform sampler2D waterNormalTexture2;

            float getDepth( const in vec2 screenPosition ) {
                return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
            }

            float getViewZ( const in float depth ) {
                return perspectiveDepthToViewZ( depth, cameraNear, cameraFar );
            }  
            vec4 getNoise( vec2 uv ) {
                vec2 uv0 = ( uv / 103.0 ) + vec2(uTime / 34.0, uTime / 58.0);
                vec2 uv1 = uv / 107.0-vec2( uTime / -38.0, uTime / 64.0 );
                vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( uTime / 202.0, uTime / 194.0 );
                vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( uTime / 218.0, uTime / -226.0 );
                vec4 noise = texture2D( waterNormalTexture1, uv0 ) +
                    texture2D( waterNormalTexture1, uv1 ) +
                    texture2D( waterNormalTexture2, uv2 ) +
                    texture2D( waterNormalTexture2, uv3 );
                return noise * 0.5 - 1.0;
            }
            void sunLight( const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor ) {
                vec3 reflection = normalize( reflect( -sunDirection, surfaceNormal ) );
                float direction = max( 0.0, dot( eyeDirection, reflection ) );
                specularColor += pow( direction, shiny ) * vec3(0.3, 0.3, 0.3) * spec;
                diffuseColor += max( dot( sunDirection, surfaceNormal ), 0.0 ) * vec3(0.3, 0.3, 0.3) * diffuse;
            }
            void main() {
                vec4 worldPosition = modelMatrix * vec4( vPos, 1.0 );
                vec4 noise = getNoise( worldPosition.xz * 2.);
                vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );
                vec3 diffuseLight = vec3(1.0);
                vec3 specularLight = vec3(0.1, 0.6, 0.6);
                vec3 worldToEye = worldPosition.xyz - waterWorldPosition;
                vec3 eyeDirection = normalize( worldToEye );
                sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );
                float distance = length(worldToEye);
                float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
                
                vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) * 0.2 ) * vec3(0.5, 0.5, 0.5);
                vec3 albedo = ( vec3(0.3, 0.3, 0.3) * diffuseLight * 0.025 + scatter );
                vec3 outgoingLight = albedo;
                gl_FragColor = (vec4( outgoingLight, 0.95 )) + + vec4(0.0282, 0.470, 0.431, 0.);

                // foam
                vec2 screenUV = gl_FragCoord.xy / resolution;
    
                float fragmentLinearEyeDepth = getViewZ( gl_FragCoord.z );
                float linearEyeDepth = getViewZ( getDepth( screenUV ) );
        
                float diff = saturate( fragmentLinearEyeDepth - linearEyeDepth );
                if(diff > 0.){
                    vec2 channelA = texture2D( tDudv, vec2(0.25 * worldPosition.x + uTime * 0.04, 0.5 * worldPosition.z - uTime * 0.03) ).rg;
                    vec2 channelB = texture2D( tDudv, vec2(0.5 * worldPosition.x - uTime * 0.05, 0.35 * worldPosition.z + uTime * 0.04) ).rg;
                    vec2 displacement = (channelA + channelB) * 0.5;
                    displacement = ( ( displacement * 2.0 ) - 1.0 ) * 1.0;
                    diff += displacement.x;


                    // vec2 displacement = texture2D( tDudv, ( worldPosition.xz * 1.0 ) - uTime * 0.05 ).rg;
                    // displacement = ( ( displacement * 2.0 ) - 1.0 ) * 1.0;
                    // diff += displacement.x;
            
                    gl_FragColor = mix( vec4(1.0, 1.0, 1.0, gl_FragColor.a), gl_FragColor, step( 0.05, diff ) );
                }
                
    
                ${THREE.ShaderChunk.logdepthbuf_fragment}
            }
        `,
        side: THREE.DoubleSide,
        transparent: true
      });
    
    super(geometry, material, allocator);
    this.frustumCulled = false;

    this.procGenInstance = procGenInstance;
    this.physics = physics;
    this.allocator = allocator;
    this.physicsObjects = [];

    this.localVector5 = new THREE.Vector3();
    this.physicsObjectToChunkMap = new Map();
  }

  async getChunkRenderData(chunk, signal) {
    const meshData =
      await this.procGenInstance.dcWorkerManager.generateLiquidChunk(
        chunk.min,
        chunk.lodArray,
        {
          signal,
        }
      );
      
    if (meshData) {
      let geometryBuffer = null;
      if (this.physics) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(meshData.positions, 3)
        );
        geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));
        const physicsMesh = new THREE.Mesh(geometry, fakeMaterial);

        geometryBuffer = await this.physics.cookGeometryAsync(physicsMesh, {
          signal,
        });
      }
      return new ChunkRenderData(meshData, geometryBuffer);
    } else {
      return null;
    }
  }
  drawChunk(chunk, renderData, tracker) {
    if (renderData) {
      // non-empty chunk
      const { meshData, geometryBuffer } = renderData;
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
        const chunkSize = chunkWorldSize * chunk.lod;
        localSphere.center.set(
            (chunk.min.x + 0.5) * chunkSize,
            (chunk.min.y + 0.5) * chunkSize,
            (chunk.min.z + 0.5) * chunkSize
          )
          .applyMatrix4(this.matrixWorld);
        localSphere.radius = chunkRadius;

        localVector3D.set(chunk.min.x, chunk.min.y, chunk.min.z).multiplyScalar(chunkSize); // min
        localVector3D2.set(chunk.min.x, chunk.min.y, chunk.min.z).addScalar(chunk.lod).multiplyScalar(chunkSize); // max

        const geometryBinding = this.allocator.alloc(
          meshData.positions.length,
          meshData.indices.length,
          localSphere,
          localVector3D,
          localVector3D2,
          this.appMatrix,
          meshData.peeks
        );
        // const geometryBinding = this.allocator.alloc(
        //   meshData.positions.length,
        //   meshData.indices.length,
        //   localSphere
        // );
        _renderMeshDataToGeometry(
          meshData,
          this.allocator.geometry,
          geometryBinding
        );

        let called = false;
        const onchunkremove = e => {
          this.allocator.free(geometryBinding);
          
          tracker.offChunkRemove(chunk, onchunkremove);
          // const {chunk: removeChunk} = e.data;
          // if (chunk.equalsNodeLod(removeChunk)) {
          //   if (!called) {
          //     called = true;
          //   } else {
          //     console.warn('double destroy');
          //     debugger;
          //   }

          //   this.allocator.free(geometryBinding);
          
          //   tracker.removeEventListener('chunkremove', onchunkremove);
          // }
        };
        tracker.onChunkRemove(chunk, onchunkremove);
        // tracker.addEventListener('chunkremove', onchunkremove);
      };
      _handleMesh();

      const _handlePhysics = async () => {

        this.matrixWorld.decompose(localVector, localQuaternion, localVector2);
        waterWorldPosition.copy(localVector);
        const physicsObject = this.physics.addCookedGeometry(
          geometryBuffer,
          localVector,
          localQuaternion,
          localVector2
        );
        this.physicsObjects.push(physicsObject);
        this.physicsObjectToChunkMap.set(physicsObject, chunk);
        


        // this.physics.disableGeometryQueries(physicsObject);
        physicsObject.positions = meshData.positions;
        

        
        const onchunkremove = e => {
          this.physics.removeGeometry(physicsObject);

          const index = this.physicsObjects.indexOf(physicsObject);
          this.physicsObjects.splice(index, 1);
          this.physicsObjectToChunkMap.delete(physicsObject);

          tracker.offChunkRemove(chunk, onchunkremove);
          // const {chunk: removeChunk} = e.data;
          // if (chunk.equalsNodeLod(removeChunk)) {
          //   if (!called) {
          //     called = true;
          //   } else {
          //     console.warn('double destroy');
          //     debugger;
          //   }

          //   this.physics.removeGeometry(physicsObject);
          //   this.physicsObjects.splice(
          //     this.physicsObjects.indexOf(physicsObject),
          //     1
          //   );
          //   this.physicsObjectToChunkMap.delete(physicsObject);

          //   tracker.removeEventListener('chunkremove', onchunkremove);
          // }
        }
        // tracker.addEventListener('chunkremove', onchunkremove);
        tracker.onChunkRemove(chunk, onchunkremove);

      };
      _handlePhysics();
    }
  }
  updateCoord(min2xCoord) {
    // XXX only do this on light mapper update
    // XXX needs to apply to the terrain mesh too, though the terrain mesh is driving the lighting (maybe rethink this)
    // XXX create a new lighting app which tracks the lighting only
    // XXX maybe do the same for hte heightfield?
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
  getChunkForPhysicsObject(physicsObject) {
    return this.waterMesh.physicsObjectToChunkMap.get(physicsObject);
  }
  getPhysicsObjects() {
    return this.waterMesh.physicsObjects;
  }

  async generateChunk(chunk, {signal = null} = {}) {
    // const signal = this.bindChunk(chunk);

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

  async relodChunksTask(task, tracker) {
    // console.log('got task', task);
    // const {oldChunks, newChunk, signal} = task;
    // console.log('relod chunk', task);

    try {
      let {maxLodNode, newNodes, oldNodes, signal} = task;

      const renderDatas = await Promise.all(newNodes.map(newNode => this.waterMesh.getChunkRenderData(
        newNode,
        signal
      )));
      signal.throwIfAborted();

      for (const oldNode of oldNodes) {
        console.log('destroy old node', oldNode);
        tracker.emitChunkDestroy(oldNode);
      }
      for (let i = 0; i < newNodes.length; i++) {
        const newNode = newNodes[i];
        const renderData = renderDatas[i];
        this.waterMesh.drawChunk(newNode, renderData, signal, task, tracker);
      }

      task.commit();
    } catch (err) {
      if (err?.isAbortError) {
        // console.log('chunk render abort', new Error().stack);
        // nothing
      } else {
        throw err;
        // console.warn(err);
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

  }

  destroy() {
    // nothing; the owning lod tracker disposes of our contents
  }
}

export default (e) => {
  const app = useApp();
  const {renderer, camera, scene, rootScene} = useInternals();
  const localPlayer = useLocalPlayer();
  const renderSettings = useRenderSettings();
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
  const componentupdate = e => {
    const {key, value} = e;
    if (key === 'renderPosition') {
      tracker.update(localVector.fromArray(value));
    }
  };
  const lods = app.getComponent('lods') ?? defaultNumNods;
  const minLodRange = app.getComponent('minLodRange') ?? defaultMinLodRange;
  const debug = app.getComponent('debug') ?? false;

  const particleEffect = new ParticleEffect(app, localPlayer);

  const waterSurfacePos = new THREE.Vector3(0, 0, 0);
  const particleWaterSurfacePos = new THREE.Vector3(0, 0, 0);
  const cameraWaterSurfacePos = new THREE.Vector3(0, 0, 0);
  let contactWater = false;
 
  let cameraDir = new THREE.Vector3();
  let playerDir = new THREE.Vector3();
  const playerHeadPos = new THREE.Vector3();
  let currentSpeed = 0;
  let fallindSpeed = 0;

  //############################################################# trace camera player direction and speed ########################################################################
  {
    const localVector = new THREE.Vector3();
    const localVector2 = new THREE.Vector3();
    useFrame(() => {
        localVector.set(0, 0, -1);
        cameraDir = localVector.applyQuaternion( camera.quaternion );
        cameraDir.normalize();

        localVector2.set(0, 0, -1);
        playerDir = localVector2.applyQuaternion( localPlayer.quaternion );
        playerDir.normalize();
        
        fallindSpeed = 0 - localPlayer.characterPhysics.velocity.y;
        if(localPlayer.avatar){
            currentSpeed = localVector.set(localPlayer.avatar.velocity.x, 0, localPlayer.avatar.velocity.z).length();
            playerHeadPos.setFromMatrixPosition(localPlayer.avatar.modelBoneOutputs.Head.matrixWorld);
        }
       
        
        
    });
  }

  {
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
        const procGenInstance = procGenManager.getInstance(seed, range);
  
        generator = new WaterChunkGenerator({
          procGenInstance,
          physics,
          textures,
        });
        
        tracker = procGenInstance.getChunkTracker({
            lods,
            minLodRange,
            trackY: true,
            debug,
        });
        if (debug) {
            app.add(tracker.debugMesh);
            tracker.debugMesh.updateMatrixWorld();
        }
        // tracker.addEventListener('coordupdate', coordupdate);
        // tracker.addEventListener('chunkdatarequest', chunkdatarequest);
        // tracker.addEventListener('chunkadd', chunkadd);
        tracker.onChunkDataRequest(chunkdatarequest);
        tracker.onChunkAdd(chunkadd);
        // tracker.addEventListener('chunkremove', chunkremove);
        // tracker.addEventListener('chunkrelod', chunkrelod);
        
        const renderPosition = app.getComponent('renderPosition');
        if (renderPosition) {
            tracker.update(localVector.fromArray(renderPosition));
        }
        app.addEventListener('componentupdate', componentupdate);
  
        if (wait) {
            await tracker.waitForLoad();
        }
        app.add(generator.object);
        generator.object.updateMatrixWorld();
      })()
    );
  
    app.getPhysicsObjects = () => generator ? generator.getPhysicsObjects() : [];
    app.getChunkForPhysicsObject = (physicsObject) => generator ? generator.getChunkForPhysicsObject(physicsObject) : null;
  
    const coordupdate = (e) => {
      const {coord} = e.data;
      generator.getMeshes()[0].updateCoord(coord);
    };
    const chunkdatarequest = (e) => {
       
        const {chunk, waitUntil, signal} = e;
    
        // console.log('lod tracker chunkdatarequest', chunk);
    
        const loadPromise = (async () => {
          const renderData = await generator.getMeshes()[0].getChunkRenderData(
            chunk,
            signal
          ); 
          
          signal.throwIfAborted();
          return renderData;
        })();
        waitUntil(loadPromise);
    };
    const chunkadd = (e) => {
        const {renderData, chunk} = e;
        generator.getMeshes()[0].drawChunk(chunk, renderData, tracker);
    };
   
    const localVector01 = new THREE.Vector3();
    const localVector02 = new THREE.Vector3();
    const localVector03 = new THREE.Vector3();
    const localVector04 = new THREE.Vector3();
    const localVector05 = new THREE.Vector3();
    const localVector06 = new THREE.Vector3();
    const localVector07 = new THREE.Vector3();
    const qt01 = new THREE.Quaternion();
    
    
  
    let qt = new THREE.Quaternion();
    let mx = new THREE.Matrix4();
    let qt2 = new THREE.Quaternion();
    let mx2 = new THREE.Matrix4();
    let upVector = new THREE.Vector3(0, 1, 0);
    let upVector2 = new THREE.Vector3(0, 1, 0);
    let tempPos = new THREE.Vector3();
    let tempPhysicsPos = new THREE.Vector3();
    let tempPhysics = null;

    let playerHighestWaterSurface = null;
    let cameraHighestWaterSurface = null;
  
    let tempDir = new THREE.Vector3();
    const downVector = new THREE.Quaternion();
    downVector.setFromAxisAngle( new THREE.Vector3( 1, 0, 0 ), -Math.PI / 2 );
    let lastContactWater;
    let count = 0;
    let testContact1;
    let testContact2;
    let lastSwimmingHand = null;

    let alreadySetComposer = false;

    
    
    const pixelRatio = renderer.getPixelRatio();
  
    const renderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * pixelRatio,
      window.innerHeight * pixelRatio
    );
    renderTarget.texture.minFilter = THREE.NearestFilter;
    renderTarget.texture.magFilter = THREE.NearestFilter;
    renderTarget.texture.generateMipmaps = false;
    renderTarget.stencilBuffer = false;
  
    const depthMaterial = new THREE.MeshDepthMaterial();
    depthMaterial.depthPacking = THREE.RGBADepthPacking;
    depthMaterial.blending = THREE.NoBlending;


    const geometry = new THREE.SphereGeometry( 0.5, 32, 16 );
    const material = new THREE.MeshBasicMaterial( { color: 0xffff00 , transparent:true, opacity:0.3} );
    const sphere = new THREE.Mesh( geometry, material );
    app.add( sphere );
    const material2 = new THREE.MeshBasicMaterial( { color: 0xff0000, transparent:true, opacity:0.3} );
    const sphere2 = new THREE.Mesh( geometry, material2 );
    app.add( sphere2 );
    const testHDir = new THREE.Vector3();

    useFrame(({timestamp, timeDiff}) => {
      particleEffect.update(waterWorldPosition);
      if (!!tracker && !app.getComponent('renderPosition')) {
        const localPlayer = useLocalPlayer();
        localMatrix
            .copy(localPlayer.matrixWorld)
            .premultiply(localMatrix2.copy(app.matrixWorld).invert())
            .decompose(localVector, localQuaternion, localVector2);
        tracker.update(localVector);
        if(generator && localPlayer.avatar){
            // set post processing and handle material uniforms
            {
                if(!alreadySetComposer){
                    if(renderSettings.findRenderSettings(scene)){
                        for(const pass of renderSettings.findRenderSettings(scene).passes){
                            if(pass.constructor.name === 'WebaWaterPass'){
                                pass._selects.push(generator.getMeshes()[0]);
                                pass.opacity = 0.12;
                                webaWaterPass = pass;
                            }
                            if(pass.constructor.name === 'WebaverseRenderPass'){
                                pass.foamDepthMaterial = depthMaterial;
                                pass.foamRenderTarget = renderTarget;
                                pass.water = generator.getMeshes()[0];
                                pass.scene = scene;
                                pass.camera = camera;
                                pass.foamInvisibleList.push(localPlayer.avatar.app);
                                pass.foamInvisibleList.push(generator.getMeshes()[0]);
                                foamPass = pass;
                                generator.getMeshes()[0].material.uniforms.cameraNear.value = camera.near;
                                generator.getMeshes()[0].material.uniforms.cameraFar.value = camera.far;
                                generator.getMeshes()[0].material.uniforms.resolution.value.set(
                                    window.innerWidth * window.devicePixelRatio,
                                    window.innerHeight * window.devicePixelRatio
                                );
                                generator.getMeshes()[0].material.uniforms.tDudv.value = dudvMap2;
                                generator.getMeshes()[0].material.uniforms.tDepth.value = renderTarget.texture;
                            }
                        }
                        alreadySetComposer = true;
                    }
                }
                if(webaWaterPass){
                    webaWaterPass.ssrMaterial.uniforms.uTime.value = timestamp / 1000;
                    webaWaterPass.ssrMaterial.uniforms.distortionTexture.value = dudvMap;
                }
                generator.getMeshes()[0].material.uniforms.uTime.value = timestamp / 1000;
                generator.getMeshes()[0].material.uniforms.waterWorldPosition.value.copy(waterWorldPosition);
            }
            // {
            //   for(const physicsObject of generator.getPhysicsObjects()){
            //       generator.physics.enableGeometryQueries(physicsObject);
            //   }
            //   localVector03.set(localPlayer.position.x, localPlayer.position.y, localPlayer.position.z);
            //   const result3 = physics.raycast(localVector03, downVector);
            //   for(const physicsObject of generator.getPhysicsObjects()){
            //     if(result3.objectId === physicsObject.physicsId){
            //       waterSurfacePos.set(result3.point[0], result3.point[1], result3.point[2]);
            //       particleWaterSurfacePos.set(result3.point[0], result3.point[1], result3.point[2]).sub(waterWorldPosition);
            //     }
            //     generator.physics.disableGeometryQueries(physicsObject)
            //   }
            // }


            // check whether player is in the water
            let min = null;
            tempPhysics = null;
            localVector02.set(localPlayer.position.x, localPlayer.position.y - localPlayer.avatar.height, localPlayer.position.z);
            for(const physicsObject of generator.getPhysicsObjects()){ 
              
                for(let i = 0; i < physicsObject.positions.length / 3; i++){
                    tempPos.set(physicsObject.positions[i * 3 + 0], physicsObject.positions[i * 3 + 1], physicsObject.positions[i * 3 + 2]).add(waterWorldPosition);
                    if(!min || tempPos.distanceTo(localVector02) < min){
                        min = tempPos.distanceTo(localVector02);
                        tempPhysicsPos.set(tempPos.x, tempPos.y, tempPos.z);
                        tempPhysics = physicsObject;
                    }
                }
                generator.physics.enableGeometryQueries(physicsObject);
            }
            if(tempPhysics){
                tempDir.set(tempPhysicsPos.x - localPlayer.position.x, tempPhysicsPos.y - (localPlayer.position.y - localPlayer.avatar.height), tempPhysicsPos.z - localPlayer.position.z);
                tempDir.normalize();
                const detectDistance = 0.3;
                if(count % 2 === 0){
                    localVector01.set(tempPhysicsPos.x + tempDir.x * detectDistance, tempPhysicsPos.y + tempDir.y * detectDistance, tempPhysicsPos.z + tempDir.z * detectDistance);
                    localVector05.set(tempPhysicsPos.x, tempPhysicsPos.y, tempPhysicsPos.z);
                    localVector06.copy(localVector01).sub(localVector05);
                    const ds = Math.sqrt(localVector06.x * localVector06.x + localVector06.y * localVector06.y + localVector06.z * localVector06.z) * 2.5;
                    upVector.crossVectors(localVector01, localVector05);
                    mx.lookAt(localVector01, localVector05, upVector);
                    qt.setFromRotationMatrix(mx);
                    let result = generator.physics.raycast(localVector01, qt);
                    testContact1 = false;
                    for(const physicsObject of generator.getPhysicsObjects()){
                      if(result.objectId === physicsObject.physicsId && result.distance <= ds){
                        testContact1 = true;
                        localVector07.set(result.point[0], result.point[1], result.point[2]);
                      }
                      generator.physics.disableGeometryQueries(physicsObject)
                    }
                    if(testContact1){
                      testHDir.copy(localVector01).sub(localVector05).normalize();
                      if(testHDir.y > 0.85 && localVector07.y > localPlayer.position.y){
                        // console.log('h', testHDir.y);
                        waterSurfacePos.copy(localVector07);
                        particleWaterSurfacePos.copy(localVector07).sub(waterWorldPosition);
                        if(!playerHighestWaterSurface)
                            playerHighestWaterSurface = result.point[1];
                        else
                            playerHighestWaterSurface = playerHighestWaterSurface < waterSurfacePos.y ? waterSurfacePos.y : playerHighestWaterSurface;
                        
                      }
                      else{
                        waterSurfacePos.y = playerHighestWaterSurface;
                        particleWaterSurfacePos.y = playerHighestWaterSurface - waterWorldPosition.y;
                      }
                      
                      
                    }
                  
                }
                else{
                    localVector01.set(tempPhysicsPos.x - tempDir.x * detectDistance, tempPhysicsPos.y - tempDir.y * detectDistance, tempPhysicsPos.z - tempDir.z * detectDistance);
                    localVector05.set(tempPhysicsPos.x, tempPhysicsPos.y, tempPhysicsPos.z);
                    localVector06.copy(localVector01).sub(localVector05);
                    const ds = Math.sqrt(localVector06.x * localVector06.x + localVector06.y * localVector06.y + localVector06.z * localVector06.z) * 2.5;
                    upVector.crossVectors(localVector01, localVector05);
                    mx.lookAt(localVector01, localVector05, upVector);
                    qt.setFromRotationMatrix(mx);
                    let result = generator.physics.raycast(localVector01, qt);
                    testContact2 = true;
                    for(const physicsObject of generator.getPhysicsObjects()){
                      if(result.objectId === physicsObject.physicsId && result.distance <= ds){
                        testContact2 = false;
                        localVector07.set(result.point[0], result.point[1], result.point[2]);
                      }
                      generator.physics.disableGeometryQueries(physicsObject)
                    }
                    if(testContact2){
                      testHDir.copy(localVector01).sub(localVector05).normalize();
                      if(testHDir.y < -0.85 && localVector07.y > localPlayer.position.y - localPlayer.avatar.height * 0.5){
                        // console.log('h2', testHDir.y);
                        waterSurfacePos.copy(localVector07);
                        particleWaterSurfacePos.copy(localVector07).sub(waterWorldPosition);
                        if(!playerHighestWaterSurface)
                            playerHighestWaterSurface = result.point[1];
                        else
                            playerHighestWaterSurface = playerHighestWaterSurface < waterSurfacePos.y ? waterSurfacePos.y : playerHighestWaterSurface;
                        
                      }
                      else{
                        waterSurfacePos.y = playerHighestWaterSurface;
                        particleWaterSurfacePos.y = playerHighestWaterSurface - waterWorldPosition.y;
                      }
                      
                      
                    }
                }
            }
            if(testContact1 === testContact2){
              contactWater = testContact1;
              lastContactWater = contactWater;
            }
            else{
              console.log('inconsist')
              contactWater = lastContactWater;
            }


            
            
            // sphere2.position.copy(particleWaterSurfacePos);
            // app.updateMatrixWorld();
            // handle swim action
            if(!contactWater){
                if(localPlayer.hasAction('swim')){
                    //console.log('remove');
                    localPlayer.removeAction('swim');
                }
            }
            else{
              if(playerHighestWaterSurface){
                if(waterSurfacePos.y >= localPlayer.position.y - localPlayer.avatar.height + localPlayer.avatar.height * 0.8){
                    if(!localPlayer.hasAction('swim')){
                        //console.log('add');
                        const swimAction = {
                            type: 'swim',
                            onSurface: false,
                            swimDamping: 1,
                            animationType: 'breaststroke'
                        };
                        localPlayer.setControlAction(swimAction);
                    }
    
                    if(waterSurfacePos.y < localPlayer.position.y - localPlayer.avatar.height + localPlayer.avatar.height * 0.85){
                        if(localPlayer.hasAction('swim'))
                            localPlayer.getAction('swim').onSurface = true;
                        
                    }
                    else{
                        if(localPlayer.hasAction('swim'))
                            localPlayer.getAction('swim').onSurface = false;
                    }
                }
                else{
                    if(localPlayer.hasAction('swim')){
                        //console.log('remove');
                        localPlayer.removeAction('swim');
                    }
                }
              }
                
            }         
        }
      }
      count++;
    });
  
    useCleanup(() => {
      live = false;
      if (tracker) {
        tracker.destroy();
      }

      app.removeEventListener('componentupdate', componentupdate);
    });
  }
 
  return app;
};