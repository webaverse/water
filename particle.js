import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { rippleVertex, rippleFragment } from './shaders/particleShader.js';

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

	constructor(app, player) {
        this.app = app;
        this.player = player;

        this.particlePosition = new THREE.Vector3();

        this.contactWater = false;
        this.lastContactWater = false;

        this.fallindSpeed = 0;

        this.alreadySetComposer = false;

        

        
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
                this.lastContactWater = this.contactWater;
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

        
        this.app.updateMatrixWorld();
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
    


}



export default  ParticleEffect;