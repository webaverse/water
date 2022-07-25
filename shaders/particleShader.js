import * as THREE from 'three'
const rippleVertex = `\             
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}


    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vPos2;

    void main() {
        vUv=uv;
        vPos2=position;
        vec4 modelPosition = modelMatrix * vec4(position, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        gl_Position = projectionPosition;
        vPos = modelPosition.xyz;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const rippleFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform float vTextureRotation;
    uniform float vBroken;
    uniform sampler2D rippleTexture;
    uniform sampler2D noiseMap;
    uniform sampler2D maskTexture;
    uniform sampler2D voronoiNoiseTexture;

    uniform vec3 waterSurfacePos;
    uniform vec3 playerPos;


    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vPos2;
    #define PI 3.1415926
    void main() {
        vec2 mainUv = vec2(
                            vUv.x , 
                            vUv.y - uTime / 1.
                        ); 
        vec4 voronoiNoise = texture2D(
                            voronoiNoiseTexture,
                            mainUv
        );
        vec2 distortionUv = mix(vUv, mainUv + voronoiNoise.rg, 0.3);
            
        
        vec4 ripple = texture2D(
                        rippleTexture,
                        (distortionUv + mainUv) / 2.
        );
        vec4 noise = texture2D(
                        noiseMap,
                        (distortionUv + mainUv) / 2.
        );
        if(ripple.a > 0.5){
            gl_FragColor = ripple;
        }
        else{
            gl_FragColor.a = 0.;
            discard;
        }
        gl_FragColor.a *= 1.5;
        float broken = abs( sin( 1.0 - vBroken ) ) - noise.g;
        if ( broken < 0.0001 ) discard;
        gl_FragColor.rgb *= 0.8;
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`

const lowerSplashVertex = `\
              
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}


    uniform float uTime;
    uniform vec4 cameraBillboardQuaternion;


    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vBroken;
    varying float vTextureRotation;

    attribute float textureRotation;
    attribute float broken;
    attribute vec3 positions;
    attribute vec3 color;
    attribute float scales;
    attribute float opacity;


    vec3 rotateVecQuat(vec3 position, vec4 q) {
        vec3 v = position.xyz;
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }
    void main() {
        vUv = uv;
        vBroken = broken;
        vTextureRotation = textureRotation;  
        // vOpacity = opacity;
        // vColor = color;
        
        vec3 pos = position;
        pos = rotateVecQuat(pos, cameraBillboardQuaternion);
        pos*=scales;
        pos+=positions;
        //pos = qtransform(pos, quaternions);
        //pos.y=cos(uTime/100.);
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;
        vPos = modelPosition.xyz;
        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const lowerSplashFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform sampler2D splashTexture;
    uniform sampler2D noiseMap;
    uniform vec3 waterSurfacePos;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vTextureRotation;
    varying float vBroken;
    #define PI 3.1415926
    void main() {
        float mid = 0.5;
        vec2 rotated = vec2(cos(vTextureRotation*PI) * (vUv.x - mid) * 1.1 - sin(vTextureRotation*PI) * (vUv.y - mid) * 1.1 + mid,
                    cos(vTextureRotation*PI) * (vUv.y - mid) * 1.1 + sin(vTextureRotation*PI) * (vUv.x - mid) * 1.1 + mid);
        vec4 splash = texture2D(
                        splashTexture,
                        rotated
        );
        if(splash.r > 0.1){
            gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
        }
        if(vPos.y < waterSurfacePos.y){
            gl_FragColor.a = 0.;
        }
        //gl_FragColor.a *= 0.5;
        float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( noiseMap, rotated * 2.5 ).g;
        if ( broken < 0.0001 ) discard;
        if(gl_FragColor.a > 0.){
            gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
        }
        else{
            discard;
        }
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`
const higherSplashVertex = `\
              
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}

    
    uniform float uTime;
    uniform vec4 cameraBillboardQuaternion;
    
    
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vBroken;
    varying float vTextureRotation;

    attribute float textureRotation;
    attribute float broken;
    attribute vec3 positions;
    attribute vec3 color;
    attribute float scales;
    attribute float opacity;
    
    
    vec3 rotateVecQuat(vec3 position, vec4 q) {
        vec3 v = position.xyz;
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }
    void main() {
        vUv = uv;
        vBroken = broken;
        vTextureRotation = textureRotation;  
        // vOpacity = opacity;
        // vColor = color;
        
        vec3 pos = position;
        pos = rotateVecQuat(pos, cameraBillboardQuaternion);
        pos*=scales;
        pos+=positions;
        //pos = qtransform(pos, quaternions);
        //pos.y=cos(uTime/100.);
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;
        vPos = modelPosition.xyz;
        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const higherSplashFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform sampler2D splashTexture;
    uniform sampler2D noiseMap;
    uniform vec3 waterSurfacePos;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying float vTextureRotation;
    varying float vBroken;
    #define PI 3.1415926
    void main() {
        float mid = 0.5;
        vec2 rotated = vec2(cos(vTextureRotation*PI) * (vUv.x - mid) * 1.1 - sin(vTextureRotation*PI) * (vUv.y - mid) * 1.1 + mid,
                    cos(vTextureRotation*PI) * (vUv.y - mid) * 1.1 + sin(vTextureRotation*PI) * (vUv.x - mid) * 1.1 + mid);
        vec4 splash = texture2D(
                        splashTexture,
                        rotated
        );
        if(splash.r > vBroken){
            gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
        }
        else{
            discard;
        }
        if(vPos.y < waterSurfacePos.y){
            gl_FragColor.a = 0.;
        }
        //gl_FragColor.a *= 0.5;
        // float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( noiseMap, rotated * 1. ).g;
        // if ( broken < 0.0001 ) discard;
        if(gl_FragColor.a > 0.){
            gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
        }
        else{
            discard;
        }
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`
const dropletVertex = `\
                
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}


    uniform float uTime;
    uniform vec4 cameraBillboardQuaternion;


    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying vec2 vOffset;

    attribute vec3 positions;
    attribute vec3 color;
    attribute float scales;
    attribute float opacity;
    attribute vec2 offset;

    vec3 rotateVecQuat(vec3 position, vec4 q) {
        vec3 v = position.xyz;
        return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
    }
    void main() {
        vUv = uv;
        vPos = position;
        // vOpacity = opacity;
        // vColor = color;
        vOffset = offset;
        vec3 pos = position;
        pos = rotateVecQuat(pos, cameraBillboardQuaternion);
        pos*=scales;
        pos+=positions;
        //pos = qtransform(pos, quaternions);
        //pos.y=cos(uTime/100.);
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const dropletFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    uniform sampler2D bubbleTexture1;
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vColor;
    varying float vOpacity;
    varying vec2 vOffset;
    void main() {
        vec4 bubble = texture2D(
                        bubbleTexture1,
                        vec2(
                            vUv.x / 6. + vOffset.x,
                            vUv.y / 5. + vOffset.y
                        )
        );
        
        gl_FragColor = bubble;
        if(gl_FragColor.a < 0.5){
            discard;
        }
        gl_FragColor.rgb *= 5.;
        ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`
const dropletRippleVertex = `\
              
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}


    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vPos;
    varying float vBroken;
    varying float vWaveFreq;

    attribute vec3 positions;
    attribute float scales;
    attribute float waveFreq;
    attribute vec4 quaternions;
    attribute float broken;

    vec3 qtransform(vec3 v, vec4 q) { 
    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
    }

    void main() {
   
        vBroken=broken;
        vWaveFreq=waveFreq;
        vUv=uv;
        vPos=position;
        vec3 pos = position;
        pos = qtransform(pos, quaternions);
        pos*=scales;
        pos+=positions;

        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const dropletRippleFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;
    varying float vWaveFreq;
    varying float vBroken;
    varying vec2 vUv;
    varying vec3 vPos;
    uniform sampler2D noiseMap;
    
    void main() {
        
        vec2 wavedUv = vec2(
            vUv.x,
            vUv.y + sin(vUv.x * (2. + vWaveFreq) * cos(uTime * 2.)) * 0.05
        );
        float strength = 1.0 - step(0.01, abs(distance(wavedUv, vec2(0.5)) - 0.25));
        gl_FragColor = vec4(vec3(strength), 1.0);
        
        if(gl_FragColor.r < 0.01){
            discard;
        }
        float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( noiseMap, vUv ).g;
        if ( broken < 0.0001 ) discard;
        if(gl_FragColor.a > 0.){
            gl_FragColor = vec4(0.9, 0.9, 0.9, 1.0);
        }
        else{
            discard;
        }
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`
const floatingSplashVertex = `\          
    ${THREE.ShaderChunk.common}
    ${THREE.ShaderChunk.logdepthbuf_pars_vertex}


    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vPos;
    varying float vBroken;
    varying float vTextureRotation;

    attribute float textureRotation;
    attribute vec3 positions;
    attribute float scales;
    attribute vec4 quaternions;
    attribute float broken;
    vec3 qtransform(vec3 v, vec4 q) { 
    return v + 2.0*cross(cross(v, q.xyz ) + q.w*v, q.xyz);
    }

    void main() {
        vTextureRotation = textureRotation;  
        vBroken=broken;
        vUv=uv;
        vPos=position;
        vec3 pos = position;
        pos = qtransform(pos, quaternions);
        pos*=scales;
        pos+=positions;
        
        
        
        vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
        vec4 viewPosition = viewMatrix * modelPosition;
        vec4 projectionPosition = projectionMatrix * viewPosition;

        gl_Position = projectionPosition;
        ${THREE.ShaderChunk.logdepthbuf_vertex}
    }
`
const floatingSplashFragment = `\
    ${THREE.ShaderChunk.logdepthbuf_pars_fragment}
    uniform float uTime;

    varying float vBroken;
    varying vec2 vUv;
    varying vec3 vPos;
    varying float vTextureRotation;

    uniform sampler2D noiseMap;
    uniform sampler2D perlinnoise;
    #define PI 3.1415926
    void main() {
        float mid = 0.5;
        vec2 rotated = vec2(cos(vTextureRotation*PI) * (vUv.x - mid) * 1. - sin(vTextureRotation*PI) * (vUv.y - mid) * 1. + mid,
                    cos(vTextureRotation*PI) * (vUv.y - mid) * 1. + sin(vTextureRotation*PI) * (vUv.x - mid) * 1. + mid);
        vec4 splash = texture2D(
            perlinnoise,
            rotated
        );
        if(splash.r > 0.1){
            gl_FragColor = vec4(1.0);
        }
        else{
            discard;
        }
        
        float broken = abs( sin( 1.0 - vBroken ) ) - texture2D( noiseMap, rotated ).g;
        if ( broken < 0.03 ) discard;
        
        if(gl_FragColor.a > 0.){
            gl_FragColor = vec4(0.7, 0.7, 0.7, 1.0);
        }
        
        
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`

	
export {
    rippleVertex, rippleFragment, 
    lowerSplashVertex, lowerSplashFragment, 
    higherSplashVertex, higherSplashFragment, 
    dropletVertex, dropletFragment, 
    dropletRippleVertex, dropletRippleFragment,
    floatingSplashVertex, floatingSplashFragment
};