import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// ... (Interface and Shaders are unchanged) ...
interface ModelViewerProps {
  onFileUpload: (file: File) => void;
  uploadedTexture: string | null;
}
const VignetteShader = { uniforms: { tDiffuse: { value: null }, offset: { value: 0.3 }, darkness: { value: 0.8 }, }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv; void main() { vec4 texel = texture2D(tDiffuse, vUv); vec2 uv = (vUv - vec2(0.5)) * vec2(offset); gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a); }`, };
const ColorGradingShader = { uniforms: { tDiffuse: { value: null }, contrast: { value: 1.15 }, brightness: { value: 0.1 }, saturation: { value: 1 }, }, vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`, fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast; uniform float brightness; uniform float saturation; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); color.rgb += brightness; color.rgb = (color.rgb - 0.5) * contrast + 0.5; float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114)); color.rgb = mix(vec3(gray), color.rgb, saturation); gl_FragColor = color; }`, };


const ModelViewer: React.FC<ModelViewerProps> = ({
  onFileUpload,
  uploadedTexture,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const composerRef = useRef<EffectComposer>();
  const controlsRef = useRef<OrbitControls>();
  const golfBallRef = useRef<THREE.Object3D>();
  const textureLoaderRef = useRef<THREE.TextureLoader>();
  const equatorMaterialRef = useRef<THREE.MeshStandardMaterial>();
  const textureUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 6);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
    composer.addPass(bloomPass);
    const colorGradingPass = new ShaderPass(ColorGradingShader);
    composer.addPass(colorGradingPass);
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.renderToScreen = true;
    composer.addPass(vignettePass);

    // --- Lighting (unchanged) ---
    const creamyWhite = new THREE.Color(0xFFF8E7);
    const ambientLight = new THREE.AmbientLight(0x202020, 0.08); scene.add(ambientLight);
    const mainDirectionalLight = new THREE.DirectionalLight(creamyWhite, 0.4); mainDirectionalLight.position.set(0, 3, 3); mainDirectionalLight.target.position.set(0, 0, 0); mainDirectionalLight.castShadow = true; mainDirectionalLight.shadow.mapSize.width = 2048; mainDirectionalLight.shadow.mapSize.height = 2048; mainDirectionalLight.shadow.bias = -0.0001; mainDirectionalLight.shadow.radius = 8; scene.add(mainDirectionalLight); scene.add(mainDirectionalLight.target);
    const keyLight = new THREE.DirectionalLight(creamyWhite, 0.3); keyLight.position.set(3, 2, 3); keyLight.target.position.set(0, 0, 0); keyLight.castShadow = true; keyLight.shadow.mapSize.width = 2048; keyLight.shadow.mapSize.height = 2048; keyLight.shadow.bias = -0.0001; keyLight.shadow.radius = 4; scene.add(keyLight); scene.add(keyLight.target);
    const fillLight = new THREE.DirectionalLight(creamyWhite, 0.3); fillLight.position.set(-3, 0, 2); fillLight.target.position.set(0, 0, 0); scene.add(fillLight); scene.add(fillLight.target);
    const rimLight = new THREE.DirectionalLight(creamyWhite, 0.25); rimLight.position.set(-2, 1, -3); rimLight.target.position.set(0, 0, 0); scene.add(rimLight); scene.add(rimLight.target);
    const rimLight2 = new THREE.DirectionalLight(creamyWhite, 0.2); rimLight2.position.set(2, -1, -3); rimLight2.target.position.set(0, 0, 0); scene.add(rimLight2); scene.add(rimLight2.target);
    const bottomLight = new THREE.DirectionalLight(creamyWhite, 0.1); bottomLight.position.set(0, -2, 1); bottomLight.target.position.set(0, 0, 0); scene.add(bottomLight); scene.add(bottomLight.target);

    // --- Environment & Controls Setup ---
    const textureLoader = new THREE.TextureLoader();
    textureLoaderRef.current = textureLoader;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const setupEnvironment = async () => {
      try {
        const equiTexture = await textureLoader.loadAsync('/env-02.jpg');
        equiTexture.mapping = THREE.EquirectangularReflectionMapping;
        equiTexture.colorSpace = THREE.SRGBColorSpace;

        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(equiTexture.image.height, {
          format: THREE.RGBFormat, // FIX IS HERE
          generateMipmaps: true,
          minFilter: THREE.LinearMipmapLinearFilter,
          magFilter: THREE.LinearFilter,
          colorSpace: THREE.SRGBColorSpace
        });

        const cubemap = cubeRenderTarget.fromEquirectangularTexture(renderer, equiTexture);
        scene.background = cubemap.texture;
        scene.environment = pmremGenerator.fromCubemap(cubemap.texture).texture;

        equiTexture.dispose();
        pmremGenerator.dispose();
      } catch (error) {
        console.error('Error setting up environment:', error);
      }
    };
    setupEnvironment();

    // --- Controls Setup (unchanged) ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.05; controls.screenSpacePanning = false; controls.minDistance = 3; controls.maxDistance = 8; controls.minPolarAngle = Math.PI / 4; controls.maxPolarAngle = (3 * Math.PI) / 4; controls.autoRotate = true; controls.autoRotateSpeed = 0.5; controls.target.set(0, 0, 0);
    controlsRef.current = controls;
    const onStart = () => { controls.autoRotate = false; };
    const onEnd = () => { controls.autoRotate = true; };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    // --- GLTF Model Loading (unchanged) ---
    const gltfLoader = new GLTFLoader();
    gltfLoader.load( '/golf-ball-v001.gltf', (gltf) => {
        const findGolfBallMeshes = (scene: THREE.Group): { equatorMesh: THREE.Mesh | null, polesMesh: THREE.Mesh | null } => { let equatorMesh: THREE.Mesh | null = null; let polesMesh: THREE.Mesh | null = null; scene.traverse((child) => { if (child instanceof THREE.Mesh) { if (child.name === 'equator') equatorMesh = child; else if (child.name === 'poles') polesMesh = child; } }); return { equatorMesh, polesMesh }; }; const { equatorMesh, polesMesh } = findGolfBallMeshes(gltf.scene); if (!equatorMesh || !polesMesh) { console.error("Could not find 'equator' and/or 'poles' meshes in the GLTF file."); return; } equatorMesh.updateWorldMatrix(true, false); polesMesh.updateWorldMatrix(true, false); const equatorGeom = equatorMesh.geometry.clone().applyMatrix4(equatorMesh.matrixWorld); const polesGeom = polesMesh.geometry.clone().applyMatrix4(polesMesh.matrixWorld); let mergedGeometry = BufferGeometryUtils.mergeGeometries([equatorGeom, polesGeom], true); if (mergedGeometry) { mergedGeometry = BufferGeometryUtils.mergeVertices(mergedGeometry, 1e-4); } else { console.error('Merging resulted in an empty geometry!'); return; } const equatorOriginalMaterial = equatorMesh.material as THREE.MeshStandardMaterial; const equatorMaterial = new THREE.MeshStandardMaterial({ name: 'EquatorMaterial', map: equatorOriginalMaterial.map || null, roughness: 0.2, metalness: 0.02, envMapIntensity: 0.8 }); const polesMaterial = new THREE.MeshStandardMaterial({ name: 'PolesMaterial', map: null, color: new THREE.Color(0xffffff), roughness: 0.2, metalness: 0.02, envMapIntensity: 0.8 }); if (equatorMaterial.map) { const map = equatorMaterial.map; map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.ClampToEdgeWrapping; map.generateMipmaps = false; map.minFilter = THREE.LinearFilter; map.magFilter = THREE.LinearFilter; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true; } equatorMaterialRef.current = equatorMaterial; const mergedGolfBall = new THREE.Mesh(mergedGeometry, [equatorMaterial, polesMaterial]); mergedGolfBall.castShadow = true; mergedGolfBall.position.set(0, 0, 0); mergedGolfBall.scale.set(1, 1, 1); mergedGolfBall.rotation.x = 0; mergedGolfBall.rotation.y = 55; scene.add(mergedGolfBall); golfBallRef.current = mergedGolfBall;
      },
      (progress) => console.log('GLTF Loading progress:', (progress.loaded / progress.total) * 100 + '%'),
      (error) => console.error('Error loading golf ball GLTF model:', error)
    );

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      composer.render();
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (controlsRef.current) { controlsRef.current.removeEventListener('start', onStart); controlsRef.current.removeEventListener('end', onEnd); controlsRef.current.dispose(); }
      if (textureUrlRef.current) URL.revokeObjectURL(textureUrlRef.current);
      if (sceneRef.current) {
        const scene = sceneRef.current;
        scene.traverse(object => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (Array.isArray(object.material)) { object.material.forEach(material => { if (material.map) material.map.dispose(); material.dispose(); });
            } else if (object.material) { if (object.material.map) object.material.map.dispose(); object.material.dispose(); }
          }
        });
        if (scene.background instanceof THREE.Texture) { scene.background.dispose(); }
        if (scene.environment instanceof THREE.Texture) { scene.environment.dispose(); }
      }
      if (mountRef.current && rendererRef.current?.domElement) { mountRef.current.removeChild(rendererRef.current.domElement); }
      if (rendererRef.current) { rendererRef.current.dispose(); }
    };
  }, []);

  // Texture update hook (unchanged)
  useEffect(() => {
    if (uploadedTexture && equatorMaterialRef.current && textureLoaderRef.current) {
        const textureLoader = textureLoaderRef.current; const equatorMaterial = equatorMaterialRef.current;
        if (textureUrlRef.current) URL.revokeObjectURL(textureUrlRef.current);
        textureUrlRef.current = uploadedTexture;
        if (equatorMaterial.map) equatorMaterial.map.dispose();
        textureLoader.load(uploadedTexture, (texture) => {
            texture.flipY = false; texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() || 1;
            equatorMaterial.map = texture; equatorMaterial.needsUpdate = true;
        });
    }
  }, [uploadedTexture]);

  return (
    <div ref={mountRef} className="w-full h-screen relative">
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg max-w-xs border border-gray-700">
        <h3 className="font-bold mb-2 text-sm">Controls:</h3>
        <ul className="text-xs space-y-1 opacity-80"> <li>• Drag to orbit</li> <li>• Scroll to zoom</li> </ul>
      </div>
    </div>
  );
};

export default ModelViewer;