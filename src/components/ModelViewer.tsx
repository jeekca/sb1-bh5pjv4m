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

// Custom vignette shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.3 },
    darkness: { value: 0.8 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a);
    }
  `,
};

// Custom color grading shader
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    contrast: { value: 1.15 },
    brightness: { value: 0.1 },
    saturation: { value: 1 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float contrast;
    uniform float brightness;
    uniform float saturation;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Brightness
      color.rgb += brightness;
      
      // Contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      
      // Saturation
      float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(vec3(gray), color.rgb, saturation);
      
      gl_FragColor = color;
    }
  `,
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
  const currentMaterialsRef = useRef<THREE.Material[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup with deep black background
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x333333); // Even darker background (RGB: 5,5,5)
    scene.fog = new THREE.Fog(0x000000, 8, 15); // Subtle fog for depth
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      50, // Slightly narrower FOV for more dramatic perspective
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 4);
    cameraRef.current = camera;

    // Renderer setup with enhanced settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Post-processing setup
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // Bloom pass for subtle highlights
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3, // Bloom strength
      0.4, // Bloom radius
      0.85 // Bloom threshold
    );
    composer.addPass(bloomPass);

    // Color grading pass
    const colorGradingPass = new ShaderPass(ColorGradingShader);
    composer.addPass(colorGradingPass);

    // Vignette pass
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.renderToScreen = true;
    composer.addPass(vignettePass);

    // Minimal ambient lighting for subtle fill
    const ambientLight = new THREE.AmbientLight(0x202020, 0.08);
    scene.add(ambientLight);

    // Main directional light - provides primary scene illumination
    const mainDirectionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // Warm white color
    mainDirectionalLight.position.set(0, 3, 3);

    // Set rotation to (-45, -45, 0) degrees (converted to radians)
    mainDirectionalLight.rotation.set(
      (-45 * Math.PI) / 180, // -45 degrees in radians
      (-45 * Math.PI) / 180, // -45 degrees in radians
      0
    );

    // Target the golf ball position
    mainDirectionalLight.target.position.set(0, 0, 0);

    // Configure soft shadows
    mainDirectionalLight.castShadow = true;
    mainDirectionalLight.shadow.mapSize.width = 2048;
    mainDirectionalLight.shadow.mapSize.height = 2048;
    mainDirectionalLight.shadow.camera.near = 0.1;
    mainDirectionalLight.shadow.camera.far = 15;
    mainDirectionalLight.shadow.camera.left = -3;
    mainDirectionalLight.shadow.camera.right = 3;
    mainDirectionalLight.shadow.camera.top = 3;
    mainDirectionalLight.shadow.camera.bottom = -3;
    mainDirectionalLight.shadow.bias = -0.0001;
    mainDirectionalLight.shadow.radius = 8; // Soft shadow radius

    // Shadow strength is controlled by the light intensity (0.8 * 1.5 = 1.2 effective)
    scene.add(mainDirectionalLight);
    scene.add(mainDirectionalLight.target);

    // Orange key light - warm studio lighting from top-right
    const keyLight = new THREE.DirectionalLight(0xff7f3f, 1.2); // Warm orange
    keyLight.position.set(3, 2, 3);
    keyLight.target.position.set(0, 0, 0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 15;
    keyLight.shadow.camera.left = -2;
    keyLight.shadow.camera.right = 2;
    keyLight.shadow.camera.top = 2;
    keyLight.shadow.camera.bottom = -2;
    keyLight.shadow.bias = -0.0001;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);
    scene.add(keyLight.target);
    keyLightRef.current = keyLight;

    // Teal fill light - cool studio lighting from left
    const fillLight = new THREE.DirectionalLight(0x3f9fff, 1.2); // Cool teal
    fillLight.position.set(-3, 0, 2);
    fillLight.target.position.set(0, 0, 0);
    scene.add(fillLight);
    scene.add(fillLight.target);

    // Teal rim light from behind-left for edge definition
    const rimLight = new THREE.DirectionalLight(0x1fa3d4, 0.9); // Bright teal
    rimLight.position.set(-2, 1, -3);
    rimLight.target.position.set(0, 0, 0);
    scene.add(rimLight);
    scene.add(rimLight.target);
    rimLightRef.current = rimLight;

    // Orange accent light from behind-right
    const rimLight2 = new THREE.DirectionalLight(0xff9966, 0.7); // Warm orange accent
    rimLight2.position.set(2, -1, -3);
    rimLight2.target.position.set(0, 0, 0);
    scene.add(rimLight2);
    scene.add(rimLight2.target);

    // Subtle bottom light for texture detail enhancement
    const bottomLight = new THREE.DirectionalLight(0x4d6680, 0.4); // Neutral blue-gray
    bottomLight.position.set(0, -2, 1);
    bottomLight.target.position.set(0, 0, 0);
    scene.add(bottomLight);
    scene.add(bottomLight.target);

    // Load golf ball GLTF model
    const textureLoader = new THREE.TextureLoader();
    textureLoaderRef.current = textureLoader;

    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      '/golf-ball-v001.gltf',
      (gltf) => {
        let equatorMesh: THREE.Mesh | null = null;
        let polesMesh: THREE.Mesh | null = null;

        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.name === 'equator') {
              equatorMesh = child;
            } else if (child.name === 'poles') {
              polesMesh = child;
            }
          }
        });

        if (!equatorMesh || !polesMesh) {
          console.error(
            "Could not find 'equator' and/or 'poles' meshes in the GLTF file."
          );
          return;
        }

        // --- START: REVISED LOGIC FOR MULTIPLE MATERIALS ---

        // Apply world matrices to preserve transformations
        equatorMesh.updateWorldMatrix(true, false);
        polesMesh.updateWorldMatrix(true, false);

        const equatorGeom = equatorMesh.geometry.clone();
        equatorGeom.applyMatrix4(equatorMesh.matrixWorld);

        const polesGeom = polesMesh.geometry.clone();
        polesGeom.applyMatrix4(polesMesh.matrixWorld);

        // <<< KEY CHANGE #1: The order here is now very important!
        // We will create our material array in this exact order: [equator, poles].
        const geometriesToMerge = [equatorGeom, polesGeom];

        // <<< KEY CHANGE #2: Change the second argument to `true`.
        // This tells the function to create material groups.
        let mergedGeometry = BufferGeometryUtils.mergeGeometries(
          geometriesToMerge,
          true
        );

        if (mergedGeometry) {
          // <<< --- THE SEAM-FIXING STEP --- >>>
          // Merge vertices that are in the same position to average their normals.
          // The second argument is a tolerance (epsilon). Vertices closer than this
          // distance will be merged. A small value is usually sufficient.
          mergedGeometry = BufferGeometryUtils.mergeVertices(
            mergedGeometry,
            1e-4
          );
          // <<< --- END OF SEAM-FIXING STEP --- >>>
        } else {
          console.error('Merging resulted in an empty geometry!');
          return;
        }

        // <<< KEY CHANGE #3: Create two separate materials.

        // Material for the "equator" part (with the texture map)
        const equatorOriginalMaterial = equatorMesh.material;
        const equatorMaterial = new THREE.MeshStandardMaterial({
          name: 'EquatorMaterial',
          map: equatorOriginalMaterial.map || null, // This part has the texture
          roughness: 0.2,
          metalness: 0.02,
          envMapIntensity: 0.2,
        });

        // Material for the "poles" part (without the texture map)
        const polesMaterial = new THREE.MeshStandardMaterial({
          name: 'PolesMaterial',
          map: null, // Explicitly set to null for no texture
          color: new THREE.Color(0xffffff), // A base color, since there is no map
          roughness: 0.2, // Same roughness
          metalness: 0.02, // Same metalness
          envMapIntensity: 0.2,
        });

        // Apply your texture enhancements to the equator material's map
        if (equatorMaterial.map) {
          const map = equatorMaterial.map;
          map.wrapS = THREE.ClampToEdgeWrapping;
          map.wrapT = THREE.ClampToEdgeWrapping;
          map.generateMipmaps = false;
          map.minFilter = THREE.LinearFilter;
          map.magFilter = THREE.LinearFilter;
          map.anisotropy = renderer.capabilities.getMaxAnisotropy();
          map.colorSpace = THREE.SRGBColorSpace;
          map.needsUpdate = true;
        }

        // <<< KEY CHANGE #4: Pass an array of materials to the mesh constructor.
        // The order MUST match the order of geometries in `geometriesToMerge`.
        const mergedGolfBall = new THREE.Mesh(mergedGeometry, [
          equatorMaterial,
          polesMaterial,
        ]);

        // --- END: REVISED LOGIC ---

        mergedGolfBall.castShadow = true;

        // Reset transform since it's baked into the geometry
        mergedGolfBall.position.set(0, 0, 0);
        mergedGolfBall.rotation.set(0, 0, 0);
        mergedGolfBall.scale.set(1, 1, 1);

        scene.add(mergedGolfBall);
        golfBallRef.current = mergedGolfBall;

        // You might want to store references to both materials if you need to update them later
        // currentMaterialsRef.current = [equatorMaterial, polesMaterial];
      },
      (progress) => {
        console.log(
          'GLTF Loading progress:',
          (progress.loaded / progress.total) * 100 + '%'
        );
      },
      (error) => {
        console.error('Error loading golf ball GLTF model:', error);
      }
    );

    // Mouse controls for orbiting
    let isMouseDown = false;
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const onMouseDown = (event: MouseEvent) => {
      isMouseDown = true;
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onMouseUp = () => {
      isMouseDown = false;
    };

    const onMouseMove = (event: MouseEvent) => {
      if (!isMouseDown) return;

      const deltaX = event.clientX - mouseX;
      const deltaY = event.clientY - mouseY;

      targetRotationY += deltaX * 0.008; // Slightly slower rotation
      targetRotationX += deltaY * 0.008;

      // Limit vertical rotation
      targetRotationX = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, targetRotationX)
      );

      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    const onWheel = (event: WheelEvent) => {
      camera.position.z += event.deltaY * 0.008;
      camera.position.z = Math.max(2, Math.min(8, camera.position.z));
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Smooth rotation interpolation
      currentRotationX += (targetRotationX - currentRotationX) * 0.08;
      currentRotationY += (targetRotationY - currentRotationY) * 0.08;

      if (golfBallRef.current) {
        golfBallRef.current.rotation.x = currentRotationX;
        golfBallRef.current.rotation.y = currentRotationY;
      }

      // Update key light to maintain consistent illumination
      if (keyLightRef.current && cameraRef.current) {
        const cameraDirection = new THREE.Vector3();
        cameraRef.current.getWorldDirection(cameraDirection);
        // Note: Directional lights don't need to follow camera like spotlights
        // The main directional light provides consistent illumination from its fixed position
      }

      composer.render();
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);

      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      composer.dispose();
    };
  }, []);

  // Effect to handle texture updates when a new file is uploaded
  useEffect(() => {
    if (
      uploadedTexture &&
      currentMaterialsRef.current.length > 0 &&
      textureLoaderRef.current
    ) {
      const newTexture = textureLoaderRef.current.load(uploadedTexture);
      newTexture.wrapS = THREE.RepeatWrapping;
      newTexture.wrapT = THREE.RepeatWrapping;
      newTexture.colorSpace = THREE.SRGBColorSpace;
      newTexture.generateMipmaps = true;
      newTexture.minFilter = THREE.LinearMipmapLinearFilter;
      newTexture.magFilter = THREE.LinearFilter;

      // Apply the new texture to all materials
      currentMaterialsRef.current.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          // Dispose of the old texture to free memory
          if (material.map) {
            material.map.dispose();
          }

          // Apply the new texture
          material.map = newTexture;
          material.needsUpdate = true;
        }
      });
    }
  }, [uploadedTexture]);

  return (
    <div ref={mountRef} className="w-full h-screen relative">
      {/* Minimal instructions overlay with dark styling */}
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
