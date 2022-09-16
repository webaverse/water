import metaversefile from 'metaversefile';
import * as THREE from 'three';
import loadTexture from './loadTexture.js';
import ParticleEffect from './particle.js';

const {
  useApp,
  useLocalPlayer,
  useFrame,
  useCleanup,
  usePhysics,
  useInstancing,
  useProcGenManager,
  useInternals,
  useRenderSettings,
} = metaversefile;

const waterWorldPosition = new THREE.Vector3();

let webaWaterPass = null;
let foamPass = null;

const dudvMap = loadTexture('assets/textures/dudvMap.png');
const dudvMap2 = loadTexture('assets/textures/dudvMap2.png');
const waterNormalTexture1 = loadTexture('assets/textures/waterNormal2.png');
const waterNormalTexture2 = loadTexture('assets/textures/waterNormal3.png');

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

const {BatchedMesh, GeometryAllocator} = useInstancing();
class WaterMesh extends BatchedMesh {
  constructor({procGenInstance, physics}) {
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
      uniforms: {
        uTime: {
          value: 0,
        },
        sunPosition: {
          value: new THREE.Vector3(200.0, 1.0, -600),
        },
        tDudv: {
          value: null,
        },
        tDepth: {
          value: null,
        },
        cameraNear: {
          value: 0,
        },
        cameraFar: {
          value: 0,
        },
        resolution: {
          value: new THREE.Vector2(),
        },
        waterNormalTexture1: {
          value: waterNormalTexture1,
        },
        waterNormalTexture2: {
          value: waterNormalTexture2,
        },
        waterWorldPosition: {
          value: new THREE.Vector3(),
        },
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
                vec2 uv0 = ( uv / 103.0 ) + vec2(uTime / 25.5, uTime / 43.5);
                vec2 uv1 = uv / 107.0-vec2( uTime / -28.5, uTime / 48.0 );
                vec2 uv2 = uv / vec2( 8907.0, 9803.0 ) + vec2( uTime / 151.5, uTime / 145.5 );
                vec2 uv3 = uv / vec2( 1091.0, 1027.0 ) - vec2( uTime / 163.5, uTime / -469.5 );
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
                vec4 worldPosition = modelMatrix * vec4( vPos, 1.0 ) * 2.;
                vec4 noise = getNoise( worldPosition.xz * 2.);
                vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );
                vec3 diffuseLight = vec3(1.0);
                vec3 specularLight = vec3(0.1, 0.6, 0.6);
                vec3 worldToEye = worldPosition.xyz - waterWorldPosition;
                vec3 eyeDirection = normalize( worldToEye );
                sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5, diffuseLight, specularLight );
                float distance = length(worldToEye);
                float theta = max( dot( eyeDirection, surfaceNormal ), 0.0 );
                
                vec3 scatter = max( 0.0, dot( surfaceNormal, eyeDirection ) * 0.5 ) * vec3(0.5, 0.5, 0.5);
                vec3 albedo = ( vec3(0.3, 0.3, 0.3) * diffuseLight * 0.025 + scatter );
                vec3 outgoingLight = albedo;
                gl_FragColor = (vec4( outgoingLight, 0.95 )) + vec4(0.0282, 0.470, 0.431, 0.);
                gl_FragColor.rgb /= 1.2;
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
      transparent: true,
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
    const meshData = await this.procGenInstance.dcWorkerManager.generateLiquidChunk(
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
        geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
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
      const {meshData, geometryBuffer} = renderData;
      const _mapOffsettedIndices = (srcIndices, dstIndices, dstOffset, positionOffset) => {
        const positionIndex = positionOffset / 3;
        for (let i = 0; i < srcIndices.length; i++) {
          dstIndices[dstOffset + i] = srcIndices[i] + positionIndex;
        }
      };
      const _renderMeshDataToGeometry = (meshData, geometry, geometryBinding) => {
        let positionOffset = geometryBinding.getAttributeOffset('position');
        let normalOffset = geometryBinding.getAttributeOffset('normal');
        let biomeOffset = geometryBinding.getAttributeOffset('biome');
        let indexOffset = geometryBinding.getIndexOffset();

        _mapOffsettedIndices(meshData.indices, geometry.index.array, indexOffset, positionOffset);

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
        geometry.attributes.biome.update(biomeOffset, meshData.biomes.length, meshData.biomes, 0);
        geometry.index.update(indexOffset, meshData.indices.length);
      };
      const _handleMesh = () => {
        const chunkSize = chunkWorldSize * chunk.lod;
        localSphere.center
          .set(
            (chunk.min.x + 0.5) * chunkSize,
            (chunk.min.y + 0.5) * chunkSize,
            (chunk.min.z + 0.5) * chunkSize
          )
          .applyMatrix4(this.matrixWorld);
        localSphere.radius = chunkRadius;

        localVector3D.set(chunk.min.x, chunk.min.y, chunk.min.z).multiplyScalar(chunkSize); // min
        localVector3D2
          .set(chunk.min.x, chunk.min.y, chunk.min.z)
          .addScalar(chunk.lod)
          .multiplyScalar(chunkSize); // max

        const geometryBinding = this.allocator.alloc(
          meshData.positions.length,
          meshData.indices.length,
          localSphere,
          localVector3D,
          localVector3D2,
          this.appMatrix,
          meshData.peeks
        );

        _renderMeshDataToGeometry(meshData, this.allocator.geometry, geometryBinding);

        const onchunkremove = (e) => {
          this.allocator.free(geometryBinding);

          tracker.offChunkRemove(chunk, onchunkremove);
        };
        tracker.onChunkRemove(chunk, onchunkremove);
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

        physicsObject.positions = meshData.positions;

        const onchunkremove = (e) => {
          this.physics.removeGeometry(physicsObject);

          const index = this.physicsObjects.indexOf(physicsObject);
          this.physicsObjects.splice(index, 1);
          this.physicsObjectToChunkMap.delete(physicsObject);

          tracker.offChunkRemove(chunk, onchunkremove);
        };
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
  constructor({procGenInstance, physics} = {}) {
    this.procGenInstance = procGenInstance;
    this.physics = physics;

    // mesh
    this.object = new THREE.Group();
    this.object.name = 'water';

    this.waterMesh = new WaterMesh({
      procGenInstance: this.procGenInstance,
      physics: this.physics,
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
    try {
      let {maxLodNode, newNodes, oldNodes, signal} = task;

      const renderDatas = await Promise.all(
        newNodes.map((newNode) => this.waterMesh.getChunkRenderData(newNode, signal))
      );
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
    const {signal} = abortController;

    chunk.binding = {
      abortController,
    };

    return signal;
  }

  update(timestamp, timeDiff) {}

  destroy() {
    // nothing; the owning lod tracker disposes of our contents
  }
}

export default (e) => {
  const app = useApp();
  const {renderer, camera, scene} = useInternals();
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
  const componentupdate = (e) => {
    const {key, value} = e;
    if (key === 'renderPosition') {
      tracker.update(localVector.fromArray(value));
    }
  };
  const lods = app.getComponent('lods') ?? defaultNumNods;
  const minLodRange = app.getComponent('minLodRange') ?? defaultMinLodRange;
  const debug = app.getComponent('debug') ?? false;

  const particleEffect = new ParticleEffect(app, localPlayer, camera);

  const waterSurfacePos = new THREE.Vector3(0, 0, 0);
  let contactWater = false;

  {
    let live = true;
    let generator = null;
    let tracker = null;
    e.waitUntil(
      (async () => {
        if (!live) {
          return;
        }

        const procGenInstance = procGenManager.getInstance(seed, range);

        generator = new WaterChunkGenerator({
          procGenInstance,
          physics,
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
        
        tracker.onChunkDataRequest(chunkdatarequest);
        tracker.onChunkAdd(chunkadd);
        
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

    app.getPhysicsObjects = () => (generator ? generator.getPhysicsObjects() : []);
    app.getChunkForPhysicsObject = (physicsObject) =>
      generator ? generator.getChunkForPhysicsObject(physicsObject) : null;

    const chunkdatarequest = (e) => {
      const {chunk, waitUntil, signal} = e;

      // console.log('lod tracker chunkdatarequest', chunk);

      const loadPromise = (async () => {
        const renderData = await generator.getMeshes()[0].getChunkRenderData(chunk, signal);

        signal.throwIfAborted();
        return renderData;
      })();
      waitUntil(loadPromise);
    };
    const chunkadd = (e) => {
      const {renderData, chunk} = e;
      generator.getMeshes()[0].drawChunk(chunk, renderData, tracker);
    };

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

    const updateParticle = (timestamp) => {
      particleEffect.update(timestamp);
      particleEffect.particlePosition.set(
        localPlayer.position.x - waterWorldPosition.x,
        waterSurfacePos.y - waterWorldPosition.y,
        localPlayer.position.z - waterWorldPosition.z
      );
      particleEffect.contactWater = contactWater;
      particleEffect.waterSurfacePos.copy(waterSurfacePos);
      particleEffect.waterWorldPosition.copy(waterWorldPosition);
    };

    let playerHighestWaterSurface = null;

    const downVector = new THREE.Quaternion();
    downVector.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);

    let lastSwimmingHand = null;
    let alreadySetComposer = false;

    useFrame(({timestamp, timeDiff}) => {
      updateParticle(timestamp);
      if (!!tracker && !app.getComponent('renderPosition')) {
        localMatrix
          .copy(localPlayer.matrixWorld)
          .premultiply(localMatrix2.copy(app.matrixWorld).invert())
          .decompose(localVector, localQuaternion, localVector2);
        tracker.update(localVector);
        if (generator && localPlayer.avatar) {
          // set post processing and handle material uniforms
          {
            if (!alreadySetComposer) {
              if (renderSettings.findRenderSettings(scene)) {
                for (const pass of renderSettings.findRenderSettings(scene).passes) {
                  if (pass.constructor.name === 'WebaWaterPass') {
                    pass._selects.push(generator.getMeshes()[0]);
                    pass.opacity = 0.12;
                    webaWaterPass = pass;
                    particleEffect.webaWaterPass = webaWaterPass;
                  }
                  if (pass.constructor.name === 'WebaverseRenderPass') {
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
                    generator
                      .getMeshes()[0]
                      .material.uniforms.resolution.value.set(
                        window.innerWidth * window.devicePixelRatio,
                        window.innerHeight * window.devicePixelRatio
                      );
                    generator.getMeshes()[0].material.uniforms.tDudv.value = dudvMap2;
                    generator.getMeshes()[0].material.uniforms.tDepth.value = renderTarget.texture;
                    particleEffect.foamPass = foamPass;
                  }
                }
                alreadySetComposer = true;
              }
            }
            if (webaWaterPass) {
              webaWaterPass.ssrMaterial.uniforms.uTime.value = timestamp / 1000;
              webaWaterPass.ssrMaterial.uniforms.distortionTexture.value = dudvMap;
            }
            generator.getMeshes()[0].material.uniforms.uTime.value = timestamp / 1000;
            generator
              .getMeshes()[0]
              .material.uniforms.waterWorldPosition.value.copy(waterWorldPosition);
          }

          if (!contactWater) {
            if (localPlayer.hasAction('swim')) {
              localPlayer.removeAction('swim');
            }
          } else {
            if (playerHighestWaterSurface) {
              if (
                waterSurfacePos.y >=
                localPlayer.position.y - localPlayer.avatar.height + localPlayer.avatar.height * 0.8
              ) {
                if (!localPlayer.hasAction('swim')) {
                  const swimAction = {
                    type: 'swim',
                    onSurface: false,
                    swimDamping: 1,
                    animationType: 'breaststroke',
                  };
                  localPlayer.setControlAction(swimAction);
                }

                if (
                  waterSurfacePos.y <
                  localPlayer.position.y -
                    localPlayer.avatar.height +
                    localPlayer.avatar.height * 0.85
                ) {
                  if (localPlayer.hasAction('swim')) localPlayer.getAction('swim').onSurface = true;
                } else {
                  if (localPlayer.hasAction('swim'))
                    localPlayer.getAction('swim').onSurface = false;
                }
              } else {
                if (localPlayer.hasAction('swim')) {
                  //console.log('remove');
                  localPlayer.removeAction('swim');
                }
              }
            }
          }
          // handel swimming damping. Should not be here. Maybe should place in io-manager
          if (localPlayer.hasAction('swim')) {
            if (localPlayer.getAction('swim').animationType === 'breaststroke') {
              if (lastSwimmingHand !== localPlayer.avatarCharacterSfx.currentSwimmingHand) {
                if (localPlayer.avatarCharacterSfx.currentSwimmingHand !== null) {
                  localPlayer.getAction('swim').swimDamping = 1;
                }
                lastSwimmingHand = localPlayer.avatarCharacterSfx.currentSwimmingHand;
              }
              if (localPlayer.getAction('swim').swimDamping < 4) {
                localPlayer.getAction('swim').swimDamping *= 1.05;
              } else {
                localPlayer.getAction('swim').swimDamping = 4;
              }
            } else if (localPlayer.getAction('swim').animationType === 'freestyle') {
              localPlayer.getAction('swim').swimDamping = 0;
            } else {
              localPlayer.getAction('swim').swimDamping = 4;
            }
          }
        }
      }
    });

    useCleanup(() => {
      live = false;
      if (tracker) {
        tracker.destroy();
      }

      app.removeEventListener('componentupdate', componentupdate);
    });
  }
  //#################################################################### underwater mask ###################################################################
  {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: {
          value: 0,
        },
        cameraWaterSurfacePos: {
          value: new THREE.Vector3(),
        },
        contactWater: {
          value: false,
        },
      },
      vertexShader: `\
            ${THREE.ShaderChunk.common}
            ${THREE.ShaderChunk.logdepthbuf_pars_vertex}
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vPos;
            
            void main() {
                vUv = uv;

                vec3 pos = position;
                vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                vec4 projectionPosition = projectionMatrix * viewPosition;
        
                gl_Position = projectionPosition;
                vPos = modelPosition.xyz;
                ${THREE.ShaderChunk.logdepthbuf_vertex}
            }
        `,
      fragmentShader: `\
            ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
            uniform float uTime;
            uniform bool contactWater;
            uniform vec3 cameraWaterSurfacePos;
            
            varying vec2 vUv;
            varying vec3 vPos;
            
            void main() {
                gl_FragColor = vec4(0.0141, 0.235, 0.25, 0.7);
                if(!contactWater || vPos.y > cameraWaterSurfacePos.y)
                    discard;
            ${THREE.ShaderChunk.logdepthbuf_fragment}
            }
        `,
      side: THREE.DoubleSide,
      transparent: true,
      //blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mask = new THREE.Mesh(geometry, material);
    //app.add( mask );
    // camera.add(mask);
    let cameraHasMask = false;
    let alreadySetComposer = false;
    useFrame(({timestamp}) => {
      if (!alreadySetComposer && foamPass && renderSettings.findRenderSettings(scene)) {
        renderSettings.findRenderSettings(scene).fog.color.r = 4 / 255;
        renderSettings.findRenderSettings(scene).fog.color.g = 41.5 / 255;
        renderSettings.findRenderSettings(scene).fog.color.b = 44.5 / 255;
        foamPass.foamInvisibleList.push(mask);
        alreadySetComposer = true;
      }
      mask.position.set(0, 0, -0.2);
      mask.material.uniforms.uTime.value = timestamp / 1000;
      mask.material.uniforms.cameraWaterSurfacePos.value.copy(waterSurfacePos);
      mask.material.uniforms.contactWater.value = contactWater;
      if (camera.position.y + 0.03 < waterSurfacePos.y && contactWater) {
        if (renderSettings.findRenderSettings(scene)) {
          renderSettings.findRenderSettings(scene).fog.density = 0.05;
        }
      } else {
        if (renderSettings.findRenderSettings(scene)) {
          renderSettings.findRenderSettings(scene).fog.density = 0;
        }
      }
      if (camera.position.y - 0.03 < waterSurfacePos.y && contactWater) {
        if (!cameraHasMask) {
          camera.add(mask);
          cameraHasMask = true;
        }
      } else {
        if (cameraHasMask) {
          camera.remove(mask);
          cameraHasMask = false;
        }
      }
    });
  }

  return app;
};
