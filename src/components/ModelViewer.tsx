import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

interface ModelViewerProps {
  onFileUpload: (file: File) => void;
  uploadedTexture: string | null;
}

// Shaders are unchanged...
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: 0.3 }, darkness: { value: 0.8 }, },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv; void main() { vec4 texel = texture2D(tDiffuse, vUv); vec2 uv = (vUv - vec2(0.5)) * vec2(offset); gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a); }`,
};
const ColorGradingShader = {
  uniforms: { tDiffuse: { value: null }, contrast: { value: 1.15 }, brightness: { value: 0.1 }, saturation: { value: 1 }, },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast; uniform float brightness; uniform float saturation; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); color.rgb += brightness; color.rgb = (color.rgb - 0.5) * contrast + 0.5; float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114)); color.rgb = mix(vec3(gray), color.rgb, saturation); gl_FragColor = color; }`,
};

const ModelViewer: React.FC<ModelViewerProps> = ({
  onFileUpload,
  uploadedTexture,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const composerRef = useRef<EffectComposer>();
  const golfBallRef = useRef<THREE.Object3D>();
  const keyLightRef = useRef<THREE.DirectionalLight>();
  const rimLightRef = useRef<THREE.DirectionalLight>();
  const textureLoaderRef = useRef<THREE.TextureLoader>();
  const equatorMaterialRef = useRef<THREE.MeshStandardMaterial>();
  const textureUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene, Camera, Renderer, Post-processing, Lighting setup... (unchanged)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333);
    scene.fog = new THREE.Fog(0x000000, 8, 15);
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
    const ambientLight = new THREE.AmbientLight(0x202020, 0.08);
    scene.add(ambientLight);
    const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainDirectionalLight.position.set(0, 3, 3);
    mainDirectionalLight.rotation.set((-45 * Math.PI) / 180, (-45 * Math.PI) / 180, 0);
    mainDirectionalLight.target.position.set(0, 0, 0);
    mainDirectionalLight.castShadow = true;
    mainDirectionalLight.shadow.mapSize.width = 2048;
    mainDirectionalLight.shadow.mapSize.height = 2048;
    mainDirectionalLight.shadow.bias = -0.0001;
    mainDirectionalLight.shadow.radius = 8;
    scene.add(mainDirectionalLight);
    scene.add(mainDirectionalLight.target);
    const keyLight = new THREE.DirectionalLight(0xff7f3f, 1.2);
    keyLight.position.set(3, 2, 3);
    keyLight.target.position.set(0, 0, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLightRef.current = keyLight;
    const fillLight = new THREE.DirectionalLight(0x3f9fff, 1.2);
    fillLight.position.set(-3, 0, 2);
    fillLight.target.position.set(0, 0, 0);
    scene.add(fillLight);
    scene.add(fillLight.target);
    const rimLight = new THREE.DirectionalLight(0x1fa3d4, 0.9);
    rimLight.position.set(-2, 1, -3);
    rimLight.target.position.set(0, 0, 0);
    scene.add(rimLight);
    scene.add(rimLight.target);
    rimLightRef.current = rimLight;
    const rimLight2 = new THREE.DirectionalLight(0xff9966, 0.7);
    rimLight2.position.set(2, -1, -3);
    rimLight2.target.position.set(0, 0, 0);
    scene.add(rimLight2);
    scene.add(rimLight2.target);
    const bottomLight = new THREE.DirectionalLight(0x4d6680, 0.4);
    bottomLight.position.set(0, -2, 1);
    bottomLight.target.position.set(0, 0, 0);
    scene.add(bottomLight);
    scene.add(bottomLight.target);

    // Load golf ball GLTF model
    const textureLoader = new THREE.TextureLoader();
    textureLoaderRef.current = textureLoader;

    // Mouse controls for orbiting
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    // let targetRotationY = 0; // We will change this
    let currentRotationX = 0;
    // let currentRotationY = 0; // We will change this

    // <<< MODIFICATION: Initialize Y-rotation for the 45-degree offset >>>
    const initialSpinOffset = Math.PI / 2; // 45 degrees

    let targetRotationY = initialSpinOffset;
    let currentRotationY = initialSpinOffset;

    // <<< MODIFICATION 1: CREATE A PIVOT GROUP >>>
    const golfBallPivot = new THREE.Group();
    
    // Apply the initial rotation to the pivot immediately
    golfBallPivot.rotation.y = initialSpinOffset; 

    scene.add(golfBallPivot);
    // We'll store a reference to the pivot for the animation loop.
    const pivotRef = { current: golfBallPivot };

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/golf-ball-v001.gltf',
      (gltf) => {
        // ... gltf loading and mesh merging logic is correct and unchanged ...
        const findGolfBallMeshes = (scene: THREE.Group): { equatorMesh: THREE.Mesh | null, polesMesh: THREE.Mesh | null } => {
          let equatorMesh: THREE.Mesh | null = null; let polesMesh: THREE.Mesh | null = null;
          scene.traverse((child) => { if (child instanceof THREE.Mesh) { if (child.name === 'equator') equatorMesh = child; else if (child.name === 'poles') polesMesh = child; } });
          return { equatorMesh, polesMesh };
        };
        const { equatorMesh, polesMesh } = findGolfBallMeshes(gltf.scene);
        if (!equatorMesh || !polesMesh) { console.error("Could not find 'equator' and/or 'poles' meshes in the GLTF file."); return; }
        equatorMesh.updateWorldMatrix(true, false);
        polesMesh.updateWorldMatrix(true, false);
        const equatorGeom = equatorMesh.geometry.clone().applyMatrix4(equatorMesh.matrixWorld);
        const polesGeom = polesMesh.geometry.clone().applyMatrix4(polesMesh.matrixWorld);
        let mergedGeometry = BufferGeometryUtils.mergeGeometries([equatorGeom, polesGeom], true);
        if (mergedGeometry) { mergedGeometry = BufferGeometryUtils.mergeVertices(mergedGeometry, 1e-4); }
        else { console.error('Merging resulted in an empty geometry!'); return; }
        const equatorOriginalMaterial = equatorMesh.material as THREE.MeshStandardMaterial;
        const equatorMaterial = new THREE.MeshStandardMaterial({ name: 'EquatorMaterial', map: equatorOriginalMaterial.map || null, roughness: 0.2, metalness: 0.02, envMapIntensity: 0.2, });
        const polesMaterial = new THREE.MeshStandardMaterial({ name: 'PolesMaterial', map: null, color: new THREE.Color(0xffffff), roughness: 0.2, metalness: 0.02, envMapIntensity: 0.2, });
        if (equatorMaterial.map) {
          const map = equatorMaterial.map;
          map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.ClampToEdgeWrapping; map.generateMipmaps = false; map.minFilter = THREE.LinearFilter; map.magFilter = THREE.LinearFilter; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
        }
        equatorMaterialRef.current = equatorMaterial;
        const mergedGolfBall = new THREE.Mesh(mergedGeometry, [equatorMaterial, polesMaterial]);
        
        mergedGolfBall.castShadow = true;
        mergedGolfBall.position.set(0, 0, 0);
        mergedGolfBall.scale.set(1, 1, 1);
        
        // <<< MODIFICATION 2: SET INITIAL ROTATION ON THE MESH ITSELF >>>
        // This is the model's "base" orientation. It will not be touched by the animation logic.
        // You can now freely change this value without side effects.
        const initialRotationX = Math.PI * 2 // Or Math.PI/2, or any value you desire.
        mergedGolfBall.rotation.set(initialRotationX, 0, 0);
        
        // <<< MODIFICATION 3: ADD THE MESH TO THE PIVOT >>>
        // Note we are adding the ball to the pivot, not the scene directly.
        golfBallPivot.add(mergedGolfBall);
        golfBallRef.current = mergedGolfBall; // You can keep this ref if you need to access the mesh directly for other reasons
      },
      (progress) => console.log('GLTF Loading progress:', (progress.loaded / progress.total) * 100 + '%'),
      (error) => console.error('Error loading golf ball GLTF model:', error)
    );

    const onMouseDown = (event: MouseEvent) => { isMouseDown = true; mouseX = event.clientX; mouseY = event.clientY; };
    const onMouseUp = () => { isMouseDown = false; };
    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;
      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;
      targetRotationY += deltaX * 0.008;
      targetRotationX += deltaY * 0.008;
      // This clamping now works correctly because targetRotationX starts at 0 and only represents the mouse input.
      targetRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetRotationX));
      mouseX = event.clientX;
      mouseY = event.clientY;
    };
    const onWheel = (event: WheelEvent) => { camera.position.z += event.deltaY * 0.008; camera.position.z = Math.max(2, Math.min(8, camera.position.z)); };
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    const IDLE_ROTATION_SPEED = 0.002;

    const animate = () => {
      requestAnimationFrame(animate);

      // If user is not interacting, apply a slow rotation
      if (!isMouseDown) {
        targetRotationY += IDLE_ROTATION_SPEED;
      }

      // Smooth rotation interpolation
      currentRotationX += (targetRotationX - currentRotationX) * 0.08;
      currentRotationY += (targetRotationY - currentRotationY) * 0.08;

      // <<< MODIFICATION 4: ROTATE THE PIVOT, NOT THE BALL DIRECTLY >>>
      // The pivot's rotation is now controlled by our variables.
      if (pivotRef.current) {
        pivotRef.current.rotation.x = currentRotationX;
        pivotRef.current.rotation.y = currentRotationY;
      }

      composer.render();
    };

    animate();

    const handleResize = () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight); };
    window.addEventListener('resize', handleResize);

    // Cleanup logic (unchanged)
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      if (textureUrlRef.current) { URL.revokeObjectURL(textureUrlRef.current); }
      if (mountRef.current && renderer.domElement) { mountRef.current.removeChild(renderer.domElement); }
      renderer.dispose();
    };
  }, []);

  // Texture update hook (unchanged and correct from last time)
  useEffect(() => {
    if (uploadedTexture && equatorMaterialRef.current && textureLoaderRef.current) {
      const textureLoader = textureLoaderRef.current;
      const equatorMaterial = equatorMaterialRef.current;
      if (textureUrlRef.current) { URL.revokeObjectURL(textureUrlRef.current); }
      textureUrlRef.current = uploadedTexture;
      if (equatorMaterial.map) { equatorMaterial.map.dispose(); }
      textureLoader.load(uploadedTexture, (texture) => {
        texture.flipY = false; 
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() || 1;
        equatorMaterial.map = texture;
        equatorMaterial.needsUpdate = true;
      });
    }
  }, [uploadedTexture]);

  return (
    <div ref={mountRef} className="w-full h-screen relative">
      <div className="absolute top-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded-lg max-w-xs border border-gray-700">
        <h3 className="font-bold mb-2 text-sm">Controls:</h3>
        <ul className="text-xs space-y-1 opacity-80">
          <li>• Drag to orbit</li>
          <li>• Scroll to zoom</li>
        </ul>
      </div>
    </div>
  );
};

export default ModelViewer;