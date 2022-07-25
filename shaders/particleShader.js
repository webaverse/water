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
        float broken = abs( sin( 1.0 - vBroken ) ) - noise.g;
        if ( broken < 0.0001 ) discard;
        gl_FragColor.rgb *= 0.8;
    ${THREE.ShaderChunk.logdepthbuf_fragment}
    }
`

	
export {rippleVertex, rippleFragment};