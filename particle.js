import metaversefile from 'metaversefile';
import * as THREE from 'three';
import { rippleVertex, rippleFragment } from './shaders/particleShader.js';
import { lowerSplashVertex, lowerSplashFragment } from './shaders/particleShader.js';
import { higherSplashVertex, higherSplashFragment } from './shaders/particleShader.js';
import { dropletVertex, dropletFragment } from './shaders/particleShader.js';
import { dropletRippleVertex, dropletRippleFragment } from './shaders/particleShader.js';
import { floatingSplashVertex, floatingSplashFragment } from './shaders/particleShader.js';
import { swimmingSplashVertex, swimmingSplashFragment } from './shaders/particleShader.js';
import { swimmingRippleVertex, swimmingRippleFragment } from './shaders/particleShader.js';
import { bubbleVertex, bubbleFragment } from './shaders/particleShader.js';


const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const {
    useLoaders,
    useSound,
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

        this.droplet = null;
        this.dropletRipple = null;
        this.initDroplet();

        
        this.rippleMesh = null;
        this.rippleGroupInApp = false;
        this.initRipple();

        this.floatingSplash = null;
        this.initFloatingSplash();

        this.swimmingSplash = null;
        this.initSwimmingSplash();
        this.localVector2 = new THREE.Vector3();
        this.rotateY = new THREE.Quaternion();
        this.rotateY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        this.lastStroke = null;
        this.lastStep = null;

        this.swimmingRipple = null;
        this.initSwimmingRipple();

        this.bubble = null;
        this.initBubble();


        this.cameraDir = new THREE.Vector3();
        this.playerDir = new THREE.Vector3();
        this.playerHeadPos = new THREE.Vector3();
        this.waterWorldPosition = new THREE.Vector3();
        this.currentSpeed = 0;
        this.fallindSpeed = 0;

		this.localVector3 = new THREE.Vector3();
        this.localVector4 = new THREE.Vector3();
        this.localVector5 = new THREE.Vector3();
        

	}
    tracePlayerInfo(){
        //############################################################# trace camera player direction and speed ########################################################################
        this.localVector3.set(0, 0, -1);
        this.cameraDir = this.localVector3.applyQuaternion( this.camera.quaternion );
        this.cameraDir.normalize();

        this.localVector4.set(0, 0, -1);
        this.playerDir = this.localVector4.applyQuaternion( this.player.quaternion );
        this.playerDir.normalize();
        
        this.fallindSpeed = 0 - this.player.characterPhysics.velocity.y;
        if(this.player.avatar){
            this.currentSpeed = this.localVector5.set(this.player.avatar.velocity.x, 0, this.player.avatar.velocity.z).length();
            this.playerHeadPos.setFromMatrixPosition(this.player.avatar.modelBoneOutputs.Head.matrixWorld);
        }
    }
    update(timestamp){
        this.tracePlayerInfo();

        
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
                        if(!this.rippleGroupInApp){
                            this.app.add(this.rippleGroup);
                            this.rippleGroupInApp = true;
                        }
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
                        brokenAttribute.setX(i, scalesAttribute.getX(i) * 1.2);
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

        const _handleDroplet = () =>{
            if(this.droplet && this.dropletRipple){ 

               
                const rippleBrokenAttribute = this.dropletRipple.geometry.getAttribute('broken');
                const rippleWaveFreqAttribute = this.dropletRipple.geometry.getAttribute('waveFreq');
                const ripplePositionsAttribute = this.dropletRipple.geometry.getAttribute('positions');
                const rippleScalesAttribute = this.dropletRipple.geometry.getAttribute('scales');
                
                const offsetAttribute = this.droplet.geometry.getAttribute('offset');
                const positionsAttribute = this.droplet.geometry.getAttribute('positions');
                const scalesAttribute = this.droplet.geometry.getAttribute('scales');
                const particleCount = this.droplet.info.particleCount;
                let falling = this.fallindSpeed > 10 ? 10 : this.fallindSpeed;
                let dropletNum = particleCount * (falling / 10);
                dropletNum /= 3;
                falling = falling < 5 ? 7 : falling;
                for (let i = 0; i < particleCount; i++){
                    if(this.contactWater && this.lastContactWater !== this.contactWater){
                        this.dropletgroup.position.copy(this.particlePosition);
                        this.dropletRipplegroup.position.copy(this.particlePosition);
                        if(this.fallindSpeed > 0.5){
                            let rand = Math.random();
                            scalesAttribute.setX(i, rand);
                            positionsAttribute.setXYZ(i, 0, 0, 0);
                            
                            this.droplet.info.velocity[i].x = (Math.random() - 0.5) * 1 * (falling / 10);
                            this.droplet.info.velocity[i].y = Math.random() * 1.6 * (falling / 10);
                            this.droplet.info.velocity[i].z = (Math.random() - 0.5) * 1 * (falling / 10);
                        
                            this.droplet.info.velocity[i].divideScalar(20);
                            
                            this.droplet.info.alreadyHaveRipple[i] = false;
                            if(i > dropletNum){
                                scalesAttribute.setX(i, 0.001);
                            }
                            this.droplet.info.offset[i] = Math.floor(Math.random() * 29);
                            this.droplet.info.startTime[i] = 0;
                        }
                    }
                    if(positionsAttribute.getY(i) >= -100){
                        this.droplet.info.velocity[i].add(this.droplet.info.acc);
                        scalesAttribute.setX(i, scalesAttribute.getX(i) / 1.035);
                        positionsAttribute.setXYZ(
                                                    i,
                                                    positionsAttribute.getX(i) + this.droplet.info.velocity[i].x,
                                                    positionsAttribute.getY(i) + this.droplet.info.velocity[i].y,
                                                    positionsAttribute.getZ(i) + this.droplet.info.velocity[i].z
                        )
                        this.droplet.info.startTime[i] = this.droplet.info.startTime[i] + 1;
                        if(this.droplet.info.startTime[i] % 2 === 0)
                            this.droplet.info.offset[i] += 1;
                        if(this.droplet.info.offset[i] >= 30){
                            this.droplet.info.offset[i] = 0;
                        }
                        offsetAttribute.setXY(i, (5 / 6) - Math.floor(this.droplet.info.offset[i] / 6) * (1. / 6.), Math.floor(this.droplet.info.offset[i] % 5) * 0.2);
                    }
                    if(positionsAttribute.getY(i) < 0 && !this.droplet.info.alreadyHaveRipple[i] && scalesAttribute.getX(i) > 0.001){
                        scalesAttribute.setX(i, 0.0001);
                        ripplePositionsAttribute.setXYZ(i, positionsAttribute.getX(i), 0.01, positionsAttribute.getZ(i));
                        rippleScalesAttribute.setX(i, Math.random() * 0.2);
                        rippleWaveFreqAttribute.setX(i, Math.random() * (i % 10));
                        rippleBrokenAttribute.setX(i, Math.random() - 0.8);
                        this.droplet.info.alreadyHaveRipple[i] = true;
                    }
                    rippleScalesAttribute.setX(i, rippleScalesAttribute.getX(i) + 0.02);
                    if(rippleBrokenAttribute.getX(i) < 1){
                        rippleBrokenAttribute.setX(i, rippleBrokenAttribute.getX(i) + 0.02);
                    }
                }
                offsetAttribute.needsUpdate = true;
                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;

                ripplePositionsAttribute.needsUpdate = true;
                rippleScalesAttribute.needsUpdate = true;
                rippleBrokenAttribute.needsUpdate = true;
                rippleWaveFreqAttribute.needsUpdate = true;

                this.dropletRipple.material.uniforms.uTime.value=timestamp/1000;
                
                this.droplet.material.uniforms.uTime.value = timestamp / 1000;
                this.droplet.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
            }
        }
        _handleDroplet();

        const _handleFloatingSplash = () =>{
            if(this.floatingSplash){ 
                if(this.floatingSplash.info.currentIndex >= this.floatingSplash.info.particleCount){
                    this.floatingSplash.info.currentIndex = 0;
                }
                const brokenAttribute = this.floatingSplash.geometry.getAttribute('broken');
                const positionsAttribute = this.floatingSplash.geometry.getAttribute('positions');
                const scalesAttribute = this.floatingSplash.geometry.getAttribute('scales');
                const textureRotationAttribute = this.floatingSplash.geometry.getAttribute('textureRotation');
                const particleCount = this.floatingSplash.info.particleCount;
                for (let i = 0; i < particleCount; i++) {
                    scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.05 * (this.currentSpeed + 0.3));
                    if(brokenAttribute.getX(i) < 1)
                        brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.005);
                }
                const emmitDelay = this.currentSpeed > 0.3 ? 100 : 200;
                if(
                    timestamp - this.floatingSplash.info.lastEmmitTime > emmitDelay * Math.pow((1.1 - this.currentSpeed), 0.3)  
                    && (this.currentSpeed > 0.1 || this.fallindSpeed > 6)
                ){
                    if(
                        (this.player.hasAction('swim') && this.player.getAction('swim').onSurface)
                        ||(!this.player.hasAction('swim') && this.contactWater)
                        || this.contactWater && this.lastContactWater !== this.contactWater
                    ){
                        let brokenDegree = this.currentSpeed > 0.3 ? 0.23 + 0.2 * Math.random() : 0.4 + 0.3 * Math.random();
                        if(this.currentSpeed > 0.5){
                            brokenDegree *= 1.3;
                        }
                        if(this.fallindSpeed > 6){
                            brokenDegree = 0.15 + 0.2 * Math.random();
                        }
                        if(!this.player.hasAction('swim')){
                            brokenDegree *= 1.1;
                        }
                        brokenAttribute.setX(this.floatingSplash.info.currentIndex, brokenDegree);
                        scalesAttribute.setX(this.floatingSplash.info.currentIndex, 1.2 + Math.random() * 0.1);
                        positionsAttribute.setXYZ(
                            this.floatingSplash.info.currentIndex,
                            this.particlePosition.x + 0.2 * this.playerDir.x + (Math.random() - 0.5) * 0.1, 
                            this.particlePosition.y + 0.01, 
                            this.particlePosition.z + 0.2 * this.playerDir.z + (Math.random() - 0.5) * 0.1
                        );
                        textureRotationAttribute.setX(this.floatingSplash.info.currentIndex, Math.random() * 2);
                        this.floatingSplash.info.currentIndex++;
                        this.floatingSplash.info.lastEmmitTime = timestamp;
                    }

                }
                brokenAttribute.needsUpdate = true;
                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                textureRotationAttribute.needsUpdate = true;
                this.floatingSplash.material.uniforms.uTime.value = timestamp / 1000;
            }
        }
        _handleFloatingSplash();


        const _handleSwimmingSplash = () =>{
            this.localVector2.set(this.playerDir.x, this.playerDir.y, this.playerDir.z).applyQuaternion(this.rotateY);
            if(this.swimmingSplash){ 
                
                const brokenAttribute = this.swimmingSplash.geometry.getAttribute('broken');
                const positionsAttribute = this.swimmingSplash.geometry.getAttribute('positions');
                const scalesAttribute = this.swimmingSplash.geometry.getAttribute('scales');
                const textureRotationAttribute = this.swimmingSplash.geometry.getAttribute('textureRotation');
                const particleCount = this.swimmingSplash.info.particleCount;
                if(this.player.hasAction('swim')){
                    if(
                        this.player.getAction('swim').onSurface
                        && !this.player.hasAction('fly')
                    ){
                        if(
                            this.player.getAction('swim').animationType === 'freestyle'
                        ){
                            if(this.player.characterSfx.currentSwimmingHand !== this.lastStroke){
                                let currentEmmit = 0;
                                for(let i = 0; i < particleCount; i++){
                                    if(brokenAttribute.getX(i) >= 1){
                                        if(this.player.characterSfx.currentSwimmingHand === 'right'){
                                            this.swimmingSplash.info.velocity[i].x = (Math.random() - 0.5) * 0.1 + this.playerDir.x * 0.45 * (1 + this.currentSpeed) + this.localVector2.x * 0.1;
                                            this.swimmingSplash.info.velocity[i].y = 0.18 + Math.random() * 0.18;
                                            this.swimmingSplash.info.velocity[i].z = (Math.random() - 0.5) * 0.1 + this.playerDir.z * 0.45 * (1 + this.currentSpeed) + this.localVector2.z * 0.1;
                                        }
                                        else{
                                            this.swimmingSplash.info.velocity[i].x = (Math.random() - 0.5) * 0.1 + this.playerDir.x * 0.45 * (1 + this.currentSpeed) - this.localVector2.x * 0.1;
                                            this.swimmingSplash.info.velocity[i].y = 0.18 + Math.random() * 0.18;
                                            this.swimmingSplash.info.velocity[i].z = (Math.random() - 0.5) * 0.1 + this.playerDir.z * 0.45 * (1 + this.currentSpeed)  - this.localVector2.z * 0.1;
                                        }
                                        
                                        positionsAttribute.setXYZ(  i, 
                                                                    this.particlePosition.x + (Math.random() - 0.5) * 0.1 + this.swimmingSplash.info.velocity[i].x - this.playerDir.x * 0.25,
                                                                    this.particlePosition.y,
                                                                    this.particlePosition.z + (Math.random() - 0.5) * 0.1 + this.swimmingSplash.info.velocity[i].z - this.playerDir.z * 0.25
                                        );
                                        this.swimmingSplash.info.velocity[i].divideScalar(10);
                                        this.swimmingSplash.info.acc[i] = -0.001 - this.currentSpeed * 0.0015;
                                        scalesAttribute.setX(i, 1 + Math.random());
                                        brokenAttribute.setX(i, 0.25 + Math.random() * 0.2);
                                        textureRotationAttribute.setX(i, Math.random() * 2);
                                        currentEmmit++;
                                    }
                                    if(currentEmmit >= 50){
                                        break;
                                    }
                                }  
                            }
                        }
                        if(this.currentSpeed > 0.3){
                            const splashposition = this.player.getAction('swim').animationType === 'breaststroke' ? 0.32 :  0.15;
                            const splashposition2 = this.player.getAction('swim').animationType === 'breaststroke' ? 0.1 : 0.2;
                            let currentEmmit = 0;
                            for(let i = 0; i < particleCount; i++){
                                if(brokenAttribute.getX(i) >= 1){
                                    this.swimmingSplash.info.velocity[i].x = this.localVector2.x * (Math.random() - 0.5) * 0.2 + this.playerDir.x * splashposition2 * (1 + this.currentSpeed);
                                    this.swimmingSplash.info.velocity[i].y = 0.08 + Math.random() * 0.08;
                                    this.swimmingSplash.info.velocity[i].z = this.localVector2.z * (Math.random() - 0.5) * 0.2 + this.playerDir.z * splashposition2 * (1 + this.currentSpeed);
                                    positionsAttribute.setXYZ(  i, 
                                                                this.particlePosition.x + this.swimmingSplash.info.velocity[i].x * 0.5 + this.playerDir.x * splashposition,
                                                                this.particlePosition.y - 0.1 * Math.random(),
                                                                this.particlePosition.z + this.swimmingSplash.info.velocity[i].z * 0.5 + this.playerDir.z * splashposition
                                    );
                                    this.swimmingSplash.info.velocity[i].divideScalar(5);
                                    this.swimmingSplash.info.acc[i] = -0.0015 - this.currentSpeed * 0.0015;
                                    scalesAttribute.setX(i, 2 + Math.random() * 2);
                                    if(this.player.getAction('swim').animationType === 'breaststroke')
                                        brokenAttribute.setX(i, 0.2 + Math.random() * 0.2);
                                    else
                                        brokenAttribute.setX(i, 0.25 + Math.random() * 0.2);
                                    textureRotationAttribute.setX(i, Math.random() * 2);
                                    currentEmmit++;
                                }
                                if(currentEmmit >= 2){
                                    break;
                                }
                            }
                        }
                    }
                }
                else{
                    if(this.contactWater){
                        if(
                            this.player.characterSfx.currentStep !== this.lastStep 
                            && (
                                (this.currentSpeed <= 0.5 && this.waterSurfacePos.y < this.player.position.y - this.player.avatar.height * 0.7)
                                || (this.currentSpeed > 0.5 && this.waterSurfacePos.y < this.player.position.y - this.player.avatar.height * 0.6)
                            )
                        ){
                            
                            let currentEmmit = 0;
                            for(let i = 0; i < particleCount; i++){
                                if(brokenAttribute.getX(i) >= 1){
                                    this.swimmingSplash.info.velocity[i].x = (Math.random() - 0.5) * 0.1 * (1 + this.currentSpeed);
                                    this.swimmingSplash.info.velocity[i].y = 0.2 * (1 + this.currentSpeed);
                                    this.swimmingSplash.info.velocity[i].z = (Math.random() - 0.5) * 0.1 * (1 + this.currentSpeed);
                                    if(this.player.characterSfx.currentStep === 'left'){
                                        positionsAttribute.setXYZ(  i, 
                                                                    this.particlePosition.x + this.localVector2.x * 0.05 + this.swimmingSplash.info.velocity[i].x + this.playerDir.x * 0.35,
                                                                    this.particlePosition.y + 0.1 * Math.random(),
                                                                    this.particlePosition.z + this.localVector2.z * 0.05 + this.swimmingSplash.info.velocity[i].z + this.playerDir.z * 0.35
                                        );
                                    }
                                    else{
                                        positionsAttribute.setXYZ(  i, 
                                                                    this.particlePosition.x - this.localVector2.x * 0.05 + this.swimmingSplash.info.velocity[i].x + this.playerDir.x * 0.35,
                                                                    this.particlePosition.y + 0.1 * Math.random(),
                                                                    this.particlePosition.z - this.localVector2.z * 0.05 + this.swimmingSplash.info.velocity[i].z + this.playerDir.z * 0.35
                                        );
                                    }
                                    
                                    this.swimmingSplash.info.velocity[i].divideScalar(10);
                                    this.swimmingSplash.info.acc[i] = -0.001 - this.currentSpeed * 0.0015;
                                    scalesAttribute.setX(i, (1 + this.currentSpeed));
                                    brokenAttribute.setX(i, 0.25 + Math.random() * 0.2);
                                    textureRotationAttribute.setX(i, Math.random() * 2);
                                    currentEmmit++;
                                }
                                if(currentEmmit >= 50){
                                    break;
                                }
                            }
                            this.lastStep = this.player.characterSfx.currentStep;
                        }
                    }
                }

                for (let i = 0; i < particleCount; i++){
                    if(this.currentSpeed < 0.2){
                        positionsAttribute.setXYZ(  i, 
                                                positionsAttribute.getX(i),
                                                positionsAttribute.getY(i) + this.swimmingSplash.info.velocity[i].y,
                                                positionsAttribute.getZ(i) 
                        ); 
                    }
                    else{
                        positionsAttribute.setXYZ(  i, 
                                                positionsAttribute.getX(i) + this.swimmingSplash.info.velocity[i].x,
                                                positionsAttribute.getY(i) + this.swimmingSplash.info.velocity[i].y,
                                                positionsAttribute.getZ(i) + this.swimmingSplash.info.velocity[i].z
                        );
                    }
                    
                    if(brokenAttribute.getX(i) < 1){
                        if(this.player.hasAction('swim')){
                            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.016);
                            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.01);
                        }
                        else{
                            brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.01 * (1 + this.currentSpeed));
                            scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.01 * (1 + this.currentSpeed));
                        }  
                    }
                    this.swimmingSplash.info.velocity[i].y += this.swimmingSplash.info.acc[i];
                }


                brokenAttribute.needsUpdate = true;
                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                textureRotationAttribute.needsUpdate = true;
                this.swimmingSplash.material.uniforms.uTime.value = timestamp / 1000;
                this.swimmingSplash.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
                this.swimmingSplash.material.uniforms.waterSurfacePos.value.copy(this.waterSurfacePos);
                this.lastStroke = this.player.characterSfx.currentSwimmingHand;
            }
        }
        _handleSwimmingSplash();

        const _handleSwimmingRipple = () =>{
            const particleCount = this.swimmingRipple.info.particleCount;
            if(this.swimmingRipple.info.currentIndex >= particleCount){
                this.swimmingRipple.info.currentIndex = 0;
            }
            if (this.swimmingRipple) {
                const brokenAttribute = this.swimmingRipple.geometry.getAttribute('broken');
                const positionsAttribute = this.swimmingRipple.geometry.getAttribute('positions');
                const scalesAttribute = this.swimmingRipple.geometry.getAttribute('scales');
                const speedAttribute = this.swimmingRipple.geometry.getAttribute('speed');
                const playerRotationAttribute = this.swimmingRipple.geometry.getAttribute('playerRotation');
                const randAttribute = this.swimmingRipple.geometry.getAttribute('random');
                for (let i = 0; i < particleCount; i++) {
                    scalesAttribute.setX(i,scalesAttribute.getX(i) + 0.1 * (this.currentSpeed + 0.3));
                    if(brokenAttribute.getX(i) < 1)
                        brokenAttribute.setX(i, brokenAttribute.getX(i) + 0.01);
                }
                if(timestamp - this.swimmingRipple.info.lastEmmitTime > 150 * Math.pow((1.1 - this.currentSpeed), 0.3)  && this.currentSpeed > 0.005 && this.contactWater){
                    if(
                        (this.player.hasAction('swim') && this.player.getAction('swim').onSurface)
                        ||(!this.player.hasAction('swim') && this.waterSurfacePos.y >= this.player.position.y - this.player.avatar.height * 0.7)
                    ){
                        if(this.player.rotation.x !== 0){
                            playerRotationAttribute.setX(this.swimmingRipple.info.currentIndex, Math.PI + this.player.rotation.y);
                        }
                        else{
                            playerRotationAttribute.setX(this.swimmingRipple.info.currentIndex, -this.player.rotation.y);
                        }
                        speedAttribute.setX(this.swimmingRipple.info.currentIndex, this.currentSpeed);
                        brokenAttribute.setX(this.swimmingRipple.info.currentIndex, 0.1);
                        scalesAttribute.setX(this.swimmingRipple.info.currentIndex, 1.5 + Math.random() * 0.1);
                        if(this.currentSpeed > 0.1){
                            positionsAttribute.setXYZ(
                                this.swimmingRipple.info.currentIndex,
                                this.particlePosition.x + 0.25 * this.playerDir.x + (Math.random() - 0.5) * 0.1, 
                                this.particlePosition.y + 0.01, 
                                this.particlePosition.z + 0.25 * this.playerDir.z + (Math.random() - 0.5) * 0.1
                            );
                        }
                        else{
                            positionsAttribute.setXYZ(
                                this.swimmingRipple.info.currentIndex,
                                this.particlePosition.x - 0.05 * this.playerDir.x, 
                                this.particlePosition.y + 0.01, 
                                this.particlePosition.z - 0.05 * this.playerDir.z
                            );
                        }
                        
                        randAttribute.setX(this.swimmingRipple.info.currentIndex, Math.random());
                        this.swimmingRipple.info.currentIndex++;
                        this.swimmingRipple.info.lastEmmitTime=timestamp;
                    }
                    
                }
                
                positionsAttribute.needsUpdate = true;
                randAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                speedAttribute.needsUpdate = true;
                brokenAttribute.needsUpdate = true;
                playerRotationAttribute.needsUpdate = true;
                this.swimmingRipple.material.uniforms.uTime.value = timestamp / 1000;
    
            }


                
            
        }
        _handleSwimmingRipple();

        const _handleBubble = () =>{
            const particleCount = this.bubble.info.particleCount;
            if(this.bubble && this.player.avatar){
                let currentEmmit = 0;
                const offsetAttribute = this.bubble.geometry.getAttribute('offset');
                const positionsAttribute = this.bubble.geometry.getAttribute('positions');
                const scalesAttribute = this.bubble.geometry.getAttribute('scales');
                if(timestamp - this.bubble.info.lastEmmitTime > 100 && this.contactWater){
                    for (let i = 0; i < (Math.floor(this.currentSpeed * 10 + 1) * 5); i++){
                        if(scalesAttribute.getX(i) <= 0){
                            if(this.currentSpeed > 0.1){
                                this.playerHeadPos.x += (Math.random() - 0.5) * 0.5;
                                this.playerHeadPos.y += (Math.random() - 0.5) * 0.2;
                                this.playerHeadPos.z += (Math.random() - 0.5) * 0.5;
                                this.bubble.info.velocity[i].x = -this.playerDir.x * 0.005;
                                this.bubble.info.velocity[i].y = 0.0025 + Math.random() * 0.0025;
                                this.bubble.info.velocity[i].z = -this.playerDir.z * 0.005;
                            }
                            else{
                                this.playerHeadPos.x += -this.playerDir.x * 0.25;
                                this.playerHeadPos.z += -this.playerDir.z * 0.25;
                                this.playerHeadPos.x += (Math.random() - 0.5) * 0.5;
                                this.playerHeadPos.z += (Math.random() - 0.5) * 0.5;
                                this.playerHeadPos.y -= this.player.avatar.height * 0.6;
                                this.playerHeadPos.y += (Math.random()) * 0.2
                                this.bubble.info.velocity[i].x = 0;
                                this.bubble.info.velocity[i].y = 0.0025 + Math.random() * 0.0025;
                                this.bubble.info.velocity[i].z = 0;
                                
                            }
                            if(this.playerHeadPos.y > this.waterSurfacePos.y)
                                this.playerHeadPos.y = this.particlePosition.y;
                            positionsAttribute.setXYZ(i, this.playerHeadPos.x - this.waterWorldPosition.x, this.playerHeadPos.y - this.waterWorldPosition.y, this.playerHeadPos.z - this.waterWorldPosition.z);
                            
                            this.bubble.info.offset[i] = Math.floor(Math.random() * 29);
                            this.bubble.info.lastTime[i] = (50 + Math.random() * 50);
                            this.bubble.info.startTime[i] = 0;
                            scalesAttribute.setX(i, Math.random());
                            if(this.currentSpeed <= 0.1 && !this.player.hasAction('swim')){
                                scalesAttribute.setX(i, 0);
                            }
                            currentEmmit++;
                        }
                        if(currentEmmit > this.bubble.info.maxEmmit){
                            this.bubble.info.lastEmmitTime = timestamp;
                            break;
                        }
                        
                    }
                }
                for (let i = 0; i < particleCount; i++){
                    if(positionsAttribute.getY(i) >= this.particlePosition.y - 0.005){
                        this.bubble.info.velocity[i].y = 0;
                    }
                    positionsAttribute.setXYZ(  i, 
                                                positionsAttribute.getX(i) + this.bubble.info.velocity[i].x,
                                                positionsAttribute.getY(i) + this.bubble.info.velocity[i].y,
                                                positionsAttribute.getZ(i) + this.bubble.info.velocity[i].z
                    );
                    this.bubble.info.startTime[i]++;
                    if(this.bubble.info.startTime[i] % 2 === 0)
                        this.bubble.info.offset[i] += 1;
                    if(this.bubble.info.offset[i] >= 30){
                        this.bubble.info.offset[i] = 0;
                    }
                    offsetAttribute.setXY(i, (5 / 6) - Math.floor(this.bubble.info.offset[i] / 6) * (1. / 6.), Math.floor(this.bubble.info.offset[i] % 5) * 0.2);
                    if(scalesAttribute.getX(i) > 0)
                        scalesAttribute.setX(i, scalesAttribute.getX(i) + 0.01);
                    if(this.bubble.info.startTime[i] > this.bubble.info.lastTime[i] || positionsAttribute.getY(i) > this.particlePosition.y){
                        scalesAttribute.setX(i, 0);
                    }
                }


                positionsAttribute.needsUpdate = true;
                scalesAttribute.needsUpdate = true;
                offsetAttribute.needsUpdate = true;
               
                // this.bubble.material.uniforms.uTime.value = timestamp / 1000;
                this.bubble.material.uniforms.cameraBillboardQuaternion.value.copy(this.camera.quaternion);
            }
            
                
            
        }
        _handleBubble();

        
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
            // this.app.add(this.rippleGroup);
            
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
    initDroplet(){
        this.dropletgroup = new THREE.Group();
        const particleCount = 50;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'offset', itemSize: 2});
        const geometry2 = new THREE.PlaneGeometry(0.1, 0.1);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);
        const material= new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                cameraBillboardQuaternion: {
                    value: new THREE.Quaternion(),
                },
                bubbleTexture1: {
                    value: bubbleTexture2,
                },
            },
            vertexShader: dropletVertex,
            fragmentShader: dropletFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.droplet = new THREE.InstancedMesh(geometry, material, particleCount);
        
        this.droplet.info = {
            velocity: [particleCount],
            alreadyHaveRipple: [particleCount],
            offset: [particleCount],
            acc: new THREE.Vector3(0, -0.002, 0),
            startTime: [particleCount],
            particleCount: particleCount
        }
        for(let i = 0; i < particleCount; i++){
            this.droplet.info.velocity[i] = new THREE.Vector3();
            this.droplet.info.alreadyHaveRipple[i] = false;
        }
        this.dropletgroup.add(this.droplet);
        this.app.add(this.dropletgroup);


        this.dropletRipplegroup = new THREE.Group();
        const rippleAttributeSpecs = [];
        rippleAttributeSpecs.push({name: 'scales', itemSize: 1});
        rippleAttributeSpecs.push({name: 'broken', itemSize: 1});
        rippleAttributeSpecs.push({name: 'waveFreq', itemSize: 1});
        
        const geometry4 = new THREE.PlaneGeometry(0.45, 0.45);
        const geometry3 = this._getGeometry(geometry4, rippleAttributeSpecs, particleCount);

        const quaternions = new Float32Array(particleCount * 4);
        const identityQuaternion = new THREE.Quaternion();
        for (let i = 0; i < particleCount; i++) {
            identityQuaternion.toArray(quaternions, i * 4);
        }
        const quaternionsAttribute = new THREE.InstancedBufferAttribute(quaternions, 4);
        geometry3.setAttribute('quaternions', quaternionsAttribute);


        const material2 = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                noiseMap:{
                    value: noiseMap
                }
            },
            vertexShader: dropletRippleVertex,
            fragmentShader: dropletRippleFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.dropletRipple = new THREE.InstancedMesh(geometry3, material2, particleCount);
        const euler = new THREE.Euler(-Math.PI / 2, 0, 0);
        const quaternion = new THREE.Quaternion();
        const quaternionAttribute = this.dropletRipple.geometry.getAttribute('quaternions');
        for (let i = 0; i < particleCount; i++) {
            quaternion.setFromEuler(euler);
            quaternionAttribute.setXYZW(i, quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }
        quaternionAttribute.needsUpdate = true;
        
        this.dropletRipplegroup.add(this.dropletRipple);
        this.app.add(this.dropletRipplegroup);

        
        
    }
    initFloatingSplash(){
        const particleCount = 30;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'broken', itemSize: 1});
        attributeSpecs.push({name: 'textureRotation', itemSize: 1});
        const geometry2 = new THREE.PlaneGeometry(0.5, 0.5);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);

        const quaternions = new Float32Array(particleCount * 4);
        const identityQuaternion = new THREE.Quaternion();
        for (let i = 0; i < particleCount; i++) {
            identityQuaternion.toArray(quaternions, i * 4);
        }
        const quaternionsAttribute = new THREE.InstancedBufferAttribute(quaternions, 4);
        geometry.setAttribute('quaternions', quaternionsAttribute);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                noiseMap:{
                    value: noiseMap
                },
                perlinnoise:{
                    value: splashTexture
                }
            },
            vertexShader: floatingSplashVertex,
            fragmentShader: floatingSplashFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.floatingSplash = new THREE.InstancedMesh(geometry, material, particleCount);
        
        this.floatingSplash.info = {
            particleCount: particleCount,
            currentIndex: 0,
            lastEmmitTime: 0
        }
        const euler = new THREE.Euler(-Math.PI / 2, 0, 0);
        const quaternion = new THREE.Quaternion();
        const quaternionAttribute =  this.floatingSplash.geometry.getAttribute('quaternions');
        for (let i = 0; i < particleCount; i++) {
            quaternion.setFromEuler(euler);
            quaternionAttribute.setXYZW(i, quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }
        quaternionAttribute.needsUpdate = true;
        this.app.add(this.floatingSplash);
    }
    initSwimmingSplash(){
        const particleCount = 200;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'broken', itemSize: 1});
        attributeSpecs.push({name: 'textureRotation', itemSize: 1});
        const geometry2 = new THREE.PlaneGeometry(0.1, 0.1);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);

        const material = new THREE.ShaderMaterial({
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
            vertexShader: swimmingSplashVertex,
            fragmentShader: swimmingSplashFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.swimmingSplash = new THREE.InstancedMesh(geometry, material, particleCount);
        
        this.swimmingSplash.info = {
            particleCount: particleCount,
            velocity: [particleCount],
            acc: [particleCount]
        }
        
        for (let i = 0; i < particleCount; i++) {
            this.swimmingSplash.info.velocity[i] = new THREE.Vector3();
        }
        
        this.app.add(this.swimmingSplash);
    }
    initSwimmingRipple(){
        const particleCount = 30;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'broken', itemSize: 1});
        attributeSpecs.push({name: 'random', itemSize: 1});
        attributeSpecs.push({name: 'playerRotation', itemSize: 1});
        attributeSpecs.push({name: 'speed', itemSize: 1});
        const geometry2 = new THREE.PlaneGeometry(0.5, 0.5);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);

        const quaternions = new Float32Array(particleCount * 4);
        const identityQuaternion = new THREE.Quaternion();
        for (let i = 0; i < particleCount; i++) {
            identityQuaternion.toArray(quaternions, i * 4);
        }
        const quaternionsAttribute = new THREE.InstancedBufferAttribute(quaternions, 4);
        geometry.setAttribute('quaternions', quaternionsAttribute);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                noiseMap:{
                    value: noiseMap3
                },
                noiseMap2:{
                    value: noiseMap
                }
            },
            vertexShader: swimmingRippleVertex,
            fragmentShader: swimmingRippleFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.swimmingRipple = new THREE.InstancedMesh(geometry, material, particleCount);
        
        this.swimmingRipple.info = {
            particleCount: particleCount,
            currentIndex: 0,
            lastEmmitTime: 0,
        }
        const euler = new THREE.Euler(-Math.PI / 2, 0, 0);
        const quaternion = new THREE.Quaternion();
        const quaternionAttribute =  this.swimmingRipple.geometry.getAttribute('quaternions');
        for (let i = 0; i < particleCount; i++) {
            quaternion.setFromEuler(euler);
            quaternionAttribute.setXYZW(i, quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        }
        quaternionAttribute.needsUpdate = true;
        
        
        this.app.add(this.swimmingRipple);
    }
    initBubble(){
        const particleCount = 40;
        const attributeSpecs = [];
        attributeSpecs.push({name: 'scales', itemSize: 1});
        attributeSpecs.push({name: 'offset', itemSize: 2});
        const geometry2 = new THREE.PlaneGeometry(0.02, 0.02);
        const geometry = this._getGeometry(geometry2, attributeSpecs, particleCount);

        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {
                    value: 0,
                },
                cameraBillboardQuaternion: {
                    value: new THREE.Quaternion(),
                },
                bubbleTexture1: {
                    value: bubbleTexture1,
                },
            },
            vertexShader: bubbleVertex,
            fragmentShader: bubbleFragment,
            side: THREE.DoubleSide,
            transparent: true,
        });
        this.bubble = new THREE.InstancedMesh(geometry, material, particleCount);
        
        this.bubble.info = {
            particleCount: particleCount,
            maxEmmit: 5,
            lastEmmitTime: 0,
            velocity: [particleCount],
            offset: [particleCount],
            startTime:[particleCount],
            lastTime:[particleCount]
        }
        
        for (let i = 0; i < particleCount; i++) {
            this.bubble.info.velocity[i] = new THREE.Vector3();
        }
        
        this.app.add(this.bubble);
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