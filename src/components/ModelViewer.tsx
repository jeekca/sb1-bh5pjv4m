import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Props interface for the ModelViewer component.
interface ModelViewerProps {
  onFileUpload: (file: File) => void;
  uploadedTexture: string | null;
}

// A simple GLSL shader to apply a vignette effect, darkening the corners of the screen.
const VignetteShader = {
  uniforms: { tDiffuse: { value: null }, offset: { value: 0.3 }, darkness: { value: 0.8 }, },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float offset; uniform float darkness; varying vec2 vUv; void main() { vec4 texel = texture2D(tDiffuse, vUv); vec2 uv = (vUv - vec2(0.5)) * vec2(offset); gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a); }`,
};

// A simple GLSL shader for basic color grading adjustments.
const ColorGradingShader = {
  uniforms: { tDiffuse: { value: null }, contrast: { value: 1.15 }, brightness: { value: 0.13 }, saturation: { value: 1 }, },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float contrast; uniform float brightness; uniform float saturation; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); color.rgb += brightness; color.rgb = (color.rgb - 0.5) * contrast + 0.5; float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114)); color.rgb = mix(vec3(gray), color.rgb, saturation); gl_FragColor = color; }`,
};

/**
 * A React component that renders a sophisticated 3D golf ball viewer using Three.js.
 * It handles model loading, studio lighting, post-processing, and dynamic texture application
 * from either a URL parameter or a user file upload.
 */
const ModelViewer: React.FC<ModelViewerProps> = ({
  uploadedTexture
}) => {
  // React refs to hold references to the DOM mount point and Three.js objects.
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const composerRef = useRef<EffectComposer>();
  const controlsRef = useRef<OrbitControls>();
  const golfBallRef = useRef<THREE.Object3D>();
  const textureLoaderRef = useRef<THREE.TextureLoader>();
  const equatorMaterialRef = useRef<THREE.MeshStandardMaterial>();
  const textureUrlRef = useRef<string | null>(null); // Stores the current texture Object URL for cleanup.

  // Main setup effect, runs once on component mount.
  useEffect(() => {
    if (!mountRef.current) return;

    // --- Section: Core Three.js Scene, Camera, and Renderer Initialization ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 6);
    cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance.
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows.
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Correct color output.
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // Cinematic tone mapping.
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // --- Section: Post-processing Effects Setup ---
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;
    composer.addPass(new RenderPass(scene, camera)); // 1. Base render pass.
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.8)); // 2. Bloom for highlights.
    composer.addPass(new ShaderPass(ColorGradingShader)); // 3. Custom color grading.
    const vignettePass = new ShaderPass(VignetteShader); // 4. Custom vignette.
    vignettePass.renderToScreen = true; // Ensure this is the last pass to render to the screen.
    composer.addPass(vignettePass);

    // --- Section: Studio Lighting Setup ---
    const creamyWhite = new THREE.Color(0xFFF8E7);
    const neutralGray = new THREE.Color(0xD8DDE5);
    const greenColor = new THREE.Color(0x405620); // Simulates bounce light from a green surface.

    // Ambient light provides base illumination.
    const ambientLight = new THREE.AmbientLight(0xD5DBE3, 0.45); scene.add(ambientLight);
    
    // Main light source, casts primary shadows.
    const mainDirectionalLight = new THREE.DirectionalLight(creamyWhite, 0.4); mainDirectionalLight.position.set(0, 3, 3); mainDirectionalLight.target.position.set(0, 0, 0); mainDirectionalLight.castShadow = true; mainDirectionalLight.shadow.mapSize.width = 2048; mainDirectionalLight.shadow.mapSize.height = 2048; mainDirectionalLight.shadow.bias = -0.0001; mainDirectionalLight.shadow.radius = 8; scene.add(mainDirectionalLight); scene.add(mainDirectionalLight.target);
    
    // A multi-point lighting setup for a professional studio look.
    const keyLight = new THREE.DirectionalLight(creamyWhite, 0.2); keyLight.position.set(3, 2, 3); keyLight.target.position.set(0, 0, 0); keyLight.castShadow = true; keyLight.shadow.mapSize.width = 2048; keyLight.shadow.mapSize.height = 2048; keyLight.shadow.bias = -0.0001; keyLight.shadow.radius = 4; scene.add(keyLight); scene.add(keyLight.target);
    const fillLight = new THREE.DirectionalLight(neutralGray, 0.7); fillLight.position.set(-3, 0, 2); fillLight.target.position.set(0, 0, 0); scene.add(fillLight); scene.add(fillLight.target);
    const rimLight = new THREE.DirectionalLight(neutralGray, 0.9); rimLight.position.set(-2, 1, -3); rimLight.target.position.set(0, 0, 0); scene.add(rimLight); scene.add(rimLight.target);
    const rimLight2 = new THREE.DirectionalLight(neutralGray, 0.5); rimLight2.position.set(2, -1, -3); rimLight2.target.position.set(0, 0, 0); scene.add(rimLight2); scene.add(rimLight2.target);
    const bottomLight = new THREE.DirectionalLight(greenColor, 2.0); bottomLight.position.set(0, -2, 1); bottomLight.target.position.set(0, 0, 0); scene.add(bottomLight); scene.add(bottomLight.target);
    
    // --- Section: Environment and Image-Based Lighting (IBL) ---
    const manager = new THREE.LoadingManager();
    const textureLoader = new THREE.TextureLoader(manager);
    
    // Enable CORS for loading textures from external domains (like the one hosted on Replit).
    textureLoader.setCrossOrigin('anonymous');
    textureLoaderRef.current = textureLoader;

    // Define URLs for low-resolution (for IBL) and high-resolution (for background) environment maps.
    const lowResEnvURL = '/env-low-res-v01.jpg';
    const highResEnvURL = '/env-high-res-v01.jpg';

    let lowResEnvMap: THREE.Texture;
    let highResEnvMap: THREE.Texture;
    
    // Once all textures managed by the LoadingManager are loaded, configure the scene.
    manager.onLoad = () => {
      // Use the low-res map for Image-Based Lighting (reflections).
      lowResEnvMap.colorSpace = THREE.SRGBColorSpace;
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();
      const envMap = pmremGenerator.fromEquirectangular(lowResEnvMap).texture;
      scene.environment = envMap;
      lowResEnvMap.dispose(); // Free up memory.
      pmremGenerator.dispose();

      // Use the high-res map for the visible background.
      highResEnvMap.colorSpace = THREE.SRGBColorSpace;
      highResEnvMap.mapping = THREE.EquirectangularReflectionMapping;
      scene.background = highResEnvMap;
      scene.backgroundBlurriness = 0.07; // Apply a slight blur to the background.
    };
    
    // Initiate loading of both environment maps.
    textureLoader.load(lowResEnvURL, (texture) => { lowResEnvMap = texture; }, undefined, (error) => console.error('Error loading LOW-RES environment texture:', error));
    textureLoader.load(highResEnvURL, (texture) => { highResEnvMap = texture; }, undefined, (error) => console.error('Error loading HIGH-RES environment texture:', error));

    // --- Section: Camera Controls Setup ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Smooths out the camera movement.
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 8;
    controls.minPolarAngle = Math.PI / 4; // Restrict vertical orbiting.
    controls.maxPolarAngle = (3 * Math.PI) / 4;
    controls.autoRotate = true; // Enable turntable effect.
    controls.autoRotateSpeed = 0.5;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;
    controls.addEventListener('start', () => { controls.autoRotate = false; }); // Pause auto-rotate on user interaction.
    controls.addEventListener('end', () => { controls.autoRotate = true; }); // Resume auto-rotate after interaction.

    // --- Section: Golf Ball Model Loading and Processing ---
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/golf-ball-v03.gltf',
      (gltf) => {
        // Helper function to traverse the GLTF scene and find specific meshes by name.
        const findGolfBallMeshes = (scene: THREE.Group): { equatorMesh: THREE.Mesh | null, polesMesh: THREE.Mesh | null } => {
          let equatorMesh: THREE.Mesh | null = null; let polesMesh: THREE.Mesh | null = null;
          scene.traverse((child) => { if (child instanceof THREE.Mesh) { if (child.name === 'equator') equatorMesh = child; else if (child.name === 'poles') polesMesh = child; } });
          return { equatorMesh, polesMesh };
        };

        const { equatorMesh, polesMesh } = findGolfBallMeshes(gltf.scene);
        if (!equatorMesh || !polesMesh) { console.error("Could not find 'equator' and/or 'poles' meshes in the GLTF file."); return; }
        
        // Merge the two separate meshes ('equator' and 'poles') into a single geometry.
        // This allows using multiple materials on one mesh, which is efficient.
        equatorMesh.updateWorldMatrix(true, false);
        polesMesh.updateWorldMatrix(true, false);
        const equatorGeom = equatorMesh.geometry.clone().applyMatrix4(equatorMesh.matrixWorld);
        const polesGeom = polesMesh.geometry.clone().applyMatrix4(polesMesh.matrixWorld);
        let mergedGeometry = BufferGeometryUtils.mergeGeometries([equatorGeom, polesGeom], true);
        if (mergedGeometry) { mergedGeometry = BufferGeometryUtils.mergeVertices(mergedGeometry, 1e-4); }
        else { console.error('Merging resulted in an empty geometry!'); return; }
        
        // Create distinct materials for the textured 'equator' part and the plain 'poles' part.
        const equatorOriginalMaterial = equatorMesh.material as THREE.MeshStandardMaterial;
        const equatorMaterial = new THREE.MeshStandardMaterial({ name: 'EquatorMaterial', map: equatorOriginalMaterial.map || null, roughness: 0.2, metalness: 0.02, envMapIntensity: 0.8 });
        const polesMaterial = new THREE.MeshStandardMaterial({ name: 'PolesMaterial', map: null, color: new THREE.Color(0xffffff), roughness: 0.2, metalness: 0.02, envMapIntensity: 0.8 });
        
        // Configure default texture properties for optimal quality.
        if (equatorMaterial.map) {
            const map = equatorMaterial.map;
            map.wrapS = THREE.ClampToEdgeWrapping; map.wrapT = THREE.ClampToEdgeWrapping; map.generateMipmaps = false; map.minFilter = THREE.LinearFilter; map.magFilter = THREE.LinearFilter; map.anisotropy = renderer.capabilities.getMaxAnisotropy(); map.colorSpace = THREE.SRGBColorSpace; map.needsUpdate = true;
        }
        equatorMaterialRef.current = equatorMaterial;
        
        // --- Initial Texture Loading Logic ---
        // 1. Check the current window's URL for a parameter named 'imageUrl'.
        const urlParams = new URLSearchParams(window.location.search);
        const imageUrlFromUrl = urlParams.get('imageUrl'); // .get() automatically decodes the URI component.

        // 2. If 'imageUrl' exists, use it; otherwise, fall back to the default preview texture.
        const initialTexturePath = imageUrlFromUrl || '/tex-default-preview.png';

        // 3. Load the determined initial texture.
        const initialTextureLoader = textureLoaderRef.current;
        if (initialTextureLoader) {
          initialTextureLoader.load(
            initialTexturePath,
            (texture) => {
              const material = equatorMaterialRef.current;
              if (material) {
                // Configure and apply the loaded texture.
                texture.flipY = false;
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.generateMipmaps = true;
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() || 1;
                
                material.map = texture;
                material.needsUpdate = true;
                console.log(`Initial texture loaded from: ${initialTexturePath}`);
              }
            },
            undefined, // No progress callback needed.
            (error) => console.error(`Error loading initial texture from ${initialTexturePath}:`, error)
          );
        }

        // Create the final mesh with the merged geometry and the two materials.
        const mergedGolfBall = new THREE.Mesh(mergedGeometry, [equatorMaterial, polesMaterial]);
        mergedGolfBall.castShadow = true;
        mergedGolfBall.position.set(0, 0, 0);
        mergedGolfBall.scale.set(1, 1, 1);
        mergedGolfBall.rotation.x = 0;
        mergedGolfBall.rotation.y = 0;
        scene.add(mergedGolfBall);
        golfBallRef.current = mergedGolfBall;
      },
      (progress) => console.log('GLTF Loading progress:', (progress.loaded / progress.total) * 100 + '%'),
      (error) => console.error('Error loading golf ball GLTF model:', error)
    );

    // --- Section: Animation Loop ---
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Required for damping and auto-rotate to work.
      composer.render(); // Use composer to render instead of the renderer directly.
    };
    animate();

    // --- Section: Event Listeners and Cleanup ---
    // Handle window resizing to keep the viewport and camera aspect ratio correct.
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup function runs when the component unmounts.
    return () => {
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', () => { controls.autoRotate = false; });
      controls.removeEventListener('end', () => { controls.autoRotate = true; });
      controls.dispose();
      if (textureUrlRef.current) URL.revokeObjectURL(textureUrlRef.current);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Note: Disposing geometries, materials, and textures should be done here for a complete cleanup.
    };
  }, []); // The empty dependency array ensures this effect runs only once.

  // Effect hook to handle texture updates from the parent component (e.g., from a user file upload).
  useEffect(() => {
    if (uploadedTexture && equatorMaterialRef.current && textureLoaderRef.current) {
      const textureLoader = textureLoaderRef.current;
      const equatorMaterial = equatorMaterialRef.current;
      
      // Revoke the old object URL to prevent memory leaks.
      if (textureUrlRef.current) {
        URL.revokeObjectURL(textureUrlRef.current);
      }
      textureUrlRef.current = uploadedTexture;

      // Load the new texture from the blob URL.
      textureLoader.load(uploadedTexture, (texture) => {
        // Safety check: if another texture was uploaded before this one finished loading, ignore this one.
        if (textureUrlRef.current !== uploadedTexture) {
          texture.dispose();
          return;
        }

        // Dispose of the old texture map to free up GPU memory.
        if (equatorMaterial.map) {
          equatorMaterial.map.dispose();
        }
        
        // Configure and apply the new texture.
        texture.flipY = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = rendererRef.current?.capabilities.getMaxAnisotropy() || 1;
        
        equatorMaterial.map = texture;
        equatorMaterial.needsUpdate = true; // Tell Three.js to update the material.
      });
    }
  }, [uploadedTexture]); // This effect re-runs whenever the `uploadedTexture` prop changes.

  return (
    // The div that will contain the Three.js canvas.
    <div ref={mountRef} className="w-full h-screen relative">
      {/* A simple UI overlay to display controls information. */}
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