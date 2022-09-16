import * as THREE from 'three';

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');
const textureLoader = new THREE.TextureLoader();

const loadTexture = async (path) => {
  const texture = await textureLoader.loadAsync(baseUrl + path);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

export default loadTexture;
