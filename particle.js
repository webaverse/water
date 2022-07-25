import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { rippleVertex, rippleFragment } from './shaders/particleShader.js';
import { lowerSplashVertex, lowerSplashFragment } from './shaders/particleShader.js';
import { higherSplashVertex, higherSplashFragment } from './shaders/particleShader.js';

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const {
    useLoaders,
    useSound
} = metaversefile;
const sounds = useSound();
const soundFiles = sounds.getSoundFiles();

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
class ParticleEffect{

	constructor(app, player, camera) {
        this.app = app;
        this.player = player;
        this.camera = camera;

        this.particlePosition = new THREE.Vector3();
        this.waterSurfacePos = new THREE.Vector3();

        this.contactWater = false;
        this.lastContactWater = false;

        this.higherSplashSw = 2; 
        this.higherSplashPos = new THREE.Vector3();

        this.fallindSpeed = 0;

        this.alreadySetComposer = false;

        this.lowerSplash = null;
        this.initLowerSplash();

        this.higherSplash = null;
        this.initHigherSplash();

        
        this.rippleMesh = null;
        this.initRipple();

		

	}
    update(timestamp){
        if(!this.alreadySetComposer){
            if(this.foamPass && this.webaWaterPass && this.rippleMesh){
                this.webaWaterPass._selects.push(this.rippleMesh);
                this.foamPass.foamInvisibleList.push(this.rippleMesh);
                this.alreadySetComposer = true;
            }
        }
       
        const _handleRipple = () =>{
            if(this.rippleMesh){ 
                if(this.contactWater && this.lastContactWater !== this.contactWater){
                    if(this.fallindSpeed > 1){
                        let regex = new RegExp('^water/jump_water[0-9]*.wav$');
                        const candidateAudios = soundFiles.water.filter(f => regex.test(f.name));
                        const audioSpec = candidateAudios[Math.floor(Math.random() * candidateAudios.length)];
                        sounds.playSound(audioSpec);
                    }
                    if(this.fallindSpeed > 6){
                        this.rippleGroup.position.copy(this.particlePosition);
                        this.rippleMesh.material.uniforms.vBroken.value = 0.1;
                        this.rippleMesh.scale.set(0.2, 1, 0.2);
                        this.rippleMesh.material.uniforms.uTime.value = 120;
                    }
                    
                }
                let falling = this.fallindSpeed > 10 ? 10 : this.fallindSpeed;
                if(this.rippleMesh.material.uniforms.vBroken.value < 1){
                    if(this.rippleMesh.scale.x > 0.15 * (1 + falling * 0.1))
                        this.rippleMesh.material.uniforms.vBroken.value = this.rippleMesh.material.uniforms.vBroken.value * 1.025;
                    this.rippleMesh.scale.x += 0.007 * (1 + falling * 0.1);
                    this.rippleMesh.scale.z += 0.007 * (1 + falling * 0.1);
                    this.rippleMesh.material.uniforms.uTime.value += 0.015;
                }
            }
        }
        _handleRipple();

        const _handleLowerSplash = () =>{
            if(this.lowerSplash){ 
                const brokenAttribute = this.lowerSplash.geometry.getAttribute('broken');
                const positionsAttribute = this.lowerSplash.geometry.getAttribute('positions');
                const scalesAttribute = this.lowerSplash.geometry.getAttribute('scales');
                const textureRotationAttribute = this.lowerSplash.geometry.getAttribute('textureRotation');
                const particleCount = this.lowerSplash.info.particleCount;
                for (let i = 0; i < particleCount; i++){
                    if(this.contactWater && this.lastContactWater !== this.contactWater){
                        if(this.fallindSpeed > 6){
                            this.lowerSplash.info.velocity[i].x = Math.sin(i) * .1 + (Math.random() - 0.5) * 0.01;
                            this.lowerSplash.info.velocity[i].y = 0.15 * Math.random();
                            this.lowerSplash.info.velocity[i].z = Math.cos(i) * .1 + (Math.random() - 0.5) * 0.01;
                            positionsAttribute.setXYZ(  i, 
                                                        this.particlePosition.x + this.lowerSplash.info.velocity[i].x,
                                                        this.particlePosition.y + 0.1 * Math.random(),
                                                        this.particlePosition.z + this.lowerSplash.info.velocity[i].z
                            );
                            this.lowerSplash.info.velocity[i].divideScalar(5);
                            scalesAttribute.setX(i, 0.8);
                            textureRotationAttribute.setX(i, Math.random() * 2);
                            brokenAttribute.setX(i, 0.2 + Math.random() * 0.25); 
                            if(this.higherSplashSw === 2){
                                this.higherSplashSw = 0;
                                this.higherSplashPos.copy(this.particlePosition);
                            }
                        }
                        
                    }
                    if(scalesAttribute.getX(i) >= 0.8 && scalesAttribute.getX(i) < 2.5){
                        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.2);
                    }
                    if(scalesAttribute.getX(i) >= 2.5){
                        if(brokenAttribute.getX(i) < 1){
                            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.03);
                            positionsAttribute.setXYZ(  i, 
                                                        positionsAttribute.getX(i) + this.lowerSplash.info.velocity[i].x,
                                                        positionsAttribute.getY(i) + this.lowerSplash.info.velocity[i].y,
                                                        positionsAttribute.getZ(i) + this.lowerSplash.info.velocity[i].z
                            );
                            this.lowerSplash.info.velocity[i].add(this.lowerSplash.info.acc);
                            if(this.higherSplashSw === 0){
                                this.higherSplashSw = 1;
                            }
                        }
                    }
                }
                brokenAttribute.needsUpdate = true;
                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                textureRotationAttribute.needsUpdate = true;
                this.lowerSplash.material.uniforms.uTime.value = timestamp / 1000;
                this.lowerSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
                this.lowerSplash.material.uniforms.waterSurfacePos.value.copy(this.waterSurfacePos);
            }
        }
        _handleLowerSplash();

        const _handleHigherSplash = () =>{
            if(this.higherSplash){ 
                const brokenAttribute = this.higherSplash.geometry.getAttribute('broken');
                const positionsAttribute = this.higherSplash.geometry.getAttribute('positions');
                const scalesAttribute = this.higherSplash.geometry.getAttribute('scales');
                const textureRotationAttribute = this.higherSplash.geometry.getAttribute('textureRotation');
                const particleCount = this.higherSplash.info.particleCount;
                for (let i = 0; i < particleCount; i++){
                    if(this.higherSplashSw === 1){
                        this.higherSplash.info.velocity[i].x = 0;
                        this.higherSplash.info.velocity[i].y = 0.13;
                        this.higherSplash.info.velocity[i].z = 0;
                        this.higherSplash.info.velocity[i].divideScalar(5);
  
                        positionsAttribute.setXYZ(  i, 
                                                    this.higherSplashPos.x + (Math.random() - 0.5) * 0.1,
                                                    this.higherSplashPos.y + (i * 0.18) / 7,
                                                    this.higherSplashPos.z + (Math.random() - 0.5) * 0.1
                        );
                        
                        scalesAttribute.setX(i, (0.8 +  (2 - i * 0.18)) / 7);
                        textureRotationAttribute.setX(i, Math.random() * 2);
                        brokenAttribute.setX(i, Math.random() * 0.5 );
                    }
                    if(scalesAttribute.getX(i) < 0.8 +  (2 - i * 0.18)){
                        scalesAttribute.setX(i, scalesAttribute.getX(i) * 1.05);
                        positionsAttribute.setXYZ(  i, 
                                                    positionsAttribute.getX(i),
                                                    this.higherSplashPos.y + (positionsAttribute.getY(i) - this.higherSplashPos.y) * 1.05,
                                                    positionsAttribute.getZ(i)
                        );
                        
                    }
                    if(scalesAttribute.getX(i) > (0.8 +  (2 - i * 0.18)) / 3){
                        if(brokenAttribute.getX(i) < 1)
                            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.03 * (2 - i * 0.1));
                        
                    }
                    positionsAttribute.setXYZ(  i, 
                                            positionsAttribute.getX(i) + this.higherSplash.info.velocity[i].x,
                                            positionsAttribute.getY(i) + this.higherSplash.info.velocity[i].y,
                                            positionsAttribute.getZ(i) + this.higherSplash.info.velocity[i].z
                    );
                    this.higherSplash.info.velocity[i].add(this.higherSplash.info.acc);
                }
                brokenAttribute.needsUpdate = true;
                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                textureRotationAttribute.needsUpdate = true;
                this.higherSplash.material.uniforms.uTime.value = timestamp / 1000;
                this.higherSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
                this.higherSplash.material.uniforms.waterSurfacePos.value.copy(this.waterSurfacePos);
                if(this.higherSplashSw === 1){
                    this.higherSplashSw = 2;
                }
            }
        }
        _handleHigherSplash();

        
        this.app.updateMatrixWorld();
        this.lastContactWater = this.contactWater;
    }
    initRipple(){
        this.rippleGroup = new THREE.Group();
        (async () => {
            const u = `${baseUrl}/assets/ripple.glb`;
            const splashMeshApp = await new Promise((accept, reject) => {
                const {gltfLoader} = useLoaders();
                gltfLoader.load(u, accept, function onprogress() {}, reject);
                
            });
            this.rippleGroup.add(splashMeshApp.scene)
            this.rippleMesh = splashMeshApp.scene.children[0];
            this.rippleMesh.scale.set(0, 0, 0);
            this.app.add(this.rippleGroup);
            
            this.rippleMesh.material = new THREE.ShaderMaterial({
                uniforms: {
                    uTime: {
                        value: 0,
                    },
                    vBroken: {
                        value: 0,
                    },
                    vTextureRotation:{
                        value:0
                    },
                    rippleTexture:{
                        value: rippleTexture2
                    },
                    maskTexture:{
                        value: maskTexture
                    },
                    voronoiNoiseTexture:{
                        value:voronoiNoiseTexture
                    },
                    waterSurfacePos:{
                        value: new THREE.Vector3()
                    },
                    playerPos:{
                        value: new THREE.Vector3()
                    },
                    noiseMap:{
                        value: noiseMap
                    },
                },
                vertexShader: rippleVertex,
                fragmentShader: rippleFragment,
                side: THREE.DoubleSide,
                transparent: true,
                // depthWrite: false,
                blending: THREE.AdditiveBlending,
            });
        })();
    }
    initLowerSplash(){
        const particleCount = 12;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'broken', itemSize: 1});
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'textureRotation', itemSize: 1});
        const geometry2 = new THREE.PlaneGeometry(0.3, 0.3);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);
        const material= new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                cameraBillboardQuaternion: {
                    value: new THREE.Quaternion(),
                },
                splashTexture: {
                    value: splashTexture2,
                },
                waterSurfacePos: {
                    value: new THREE.Vector3(),
                },
                noiseMap:{
                    value: noiseMap
                },
            },
            vertexShader: lowerSplashVertex,
            fragmentShader: lowerSplashFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.lowerSplash = new THREE.InstancedMesh(geometry, material, particleCount);
        this.lowerSplash.info = {
            particleCount: particleCount,
            velocity: [particleCount],
            acc: new THREE.Vector3(0, -0.002, 0)
        }
        for(let i = 0; i < particleCount; i++){
            this.lowerSplash.info.velocity[i] = new THREE.Vector3();
        }
        this.app.add(this.lowerSplash);
        
    }
    initHigherSplash(){
        const particleCount = 10;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'broken', itemSize: 1});
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'textureRotation', itemSize: 1});
        const geometry2 = new THREE.PlaneGeometry(0.4, 0.4);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);
        const material= new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                cameraBillboardQuaternion: {
                    value: new THREE.Quaternion(),
                },
                splashTexture: {
                    value: splashTexture2,
                },
                waterSurfacePos: {
                    value: new THREE.Vector3(),
                },
                noiseMap:{
                    value: noiseMap
                },
            },
            vertexShader: higherSplashVertex,
            fragmentShader: higherSplashFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.higherSplash = new THREE.InstancedMesh(geometry, material, particleCount);
        this.higherSplash.info = {
            particleCount: particleCount,
            velocity: [particleCount],
            acc: new THREE.Vector3(0, -0.0024, 0)
        }
        for(let i = 0; i < particleCount; i++){
            this.higherSplash.info.velocity[i] = new THREE.Vector3();
        }
        this.app.add(this.higherSplash);
        
    }
    _getGeometry = (geometry, attributeSpecs, particleCount) => {
        const geometry2 = new THREE.BufferGeometry();
        ['position', 'normal', 'uv'].forEach(k => {
        geometry2.setAttribute(k, geometry.attributes[k]);
        });
        geometry2.setIndex(geometry.index);
        
        const positions = new Float32Array(particleCount * 3);
        const positionsAttribute = new THREE.InstancedBufferAttribute(positions, 3);
        geometry2.setAttribute('positions', positionsAttribute);

        for(const attributeSpec of attributeSpecs){
            const {
                name,
                itemSize,
            } = attributeSpec;
            const array = new Float32Array(particleCount * itemSize);
            geometry2.setAttribute(name, new THREE.InstancedBufferAttribute(array, itemSize));
        }

        return geometry2;
    };


}



export default  ParticleEffect;