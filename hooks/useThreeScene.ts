import React, { useRef, useEffect, useCallback } from 'react';
import { DesignConfig, Shape } from '../types';

// Declare THREE to be available in the global scope from the CDN script
declare const THREE: any;

export const useThreeScene = (designConfig: DesignConfig) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<any>(null);
    const cameraRef = useRef<any>(null);
    const rendererRef = useRef<any>(null);
    const qrObjectRef = useRef<any>(null);
    const controlsRef = useRef<any>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const currentMount = mountRef.current;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe0e7ff);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 150);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        rendererRef.current = renderer;
        currentMount.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(50, 50, 100);
        scene.add(directionalLight);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);
            if (qrObjectRef.current) {
                qrObjectRef.current.rotation.y += 0.005;
            }
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
        };
    }, []);

    const updateModel = useCallback((qrImageUrl: string) => {
        if (!sceneRef.current || !qrImageUrl) return;

        if (qrObjectRef.current) {
            sceneRef.current.remove(qrObjectRef.current);
            qrObjectRef.current.geometry.dispose();
            qrObjectRef.current.material.dispose();
        }

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(qrImageUrl, (texture: any) => {
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearFilter;

            const { thickness, size, shape } = designConfig;

            let baseGeometry;
            const extrudeSettings = { depth: thickness, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 };

            switch (shape) {
                case Shape.Square:
                    baseGeometry = new THREE.BoxGeometry(size, size, thickness);
                    break;
                case Shape.Heart: {
                    const heartShape = new THREE.Shape();
                    const s = size / 20;
                    heartShape.moveTo(s * 5, s * 5);
                    heartShape.bezierCurveTo(s * 5, s * 5, s * 4, 0, 0, 0);
                    heartShape.bezierCurveTo(s * -6, 0, s * -6, s * 7, s * -6, s * 7);
                    heartShape.bezierCurveTo(s * -6, s * 11, s * -3, s * 15.4, s * 5, s * 19);
                    heartShape.bezierCurveTo(s * 12, s * 15.4, s * 16, s * 11, s * 16, s * 7);
                    heartShape.bezierCurveTo(s * 16, s * 7, s * 16, 0, s * 10, 0);
                    heartShape.bezierCurveTo(s * 7, 0, s * 5, s * 5, s * 5, s * 5);
                    baseGeometry = new THREE.ExtrudeGeometry(heartShape, extrudeSettings);
                    baseGeometry.center();
                    break;
                }
                case Shape.Bone: {
                     const boneShape = new THREE.Shape();
                     const r = size / 8;
                     const w = size / 2 - r;
                     boneShape.moveTo(-w, r);
                     boneShape.absarc(-w, 0, r, Math.PI * 0.5, Math.PI * 1.5, false);
                     boneShape.lineTo(w, -r);
                     boneShape.absarc(w, 0, r, Math.PI * 1.5, Math.PI * 0.5, false);
                     boneShape.lineTo(-w, r);
                     baseGeometry = new THREE.ExtrudeGeometry(boneShape, extrudeSettings);
                     baseGeometry.center();
                    break;
                }
                case Shape.Circle:
                default:
                    baseGeometry = new THREE.CylinderGeometry(size / 2, size / 2, thickness, 64);
                    break;
            }
            
            // Adjust UV mapping for cylinder
            if (shape === Shape.Circle) {
                const uvAttribute = baseGeometry.attributes.uv;
                for (let i = 0; i < uvAttribute.count; i++) {
                    const u = uvAttribute.getX(i);
                    const v = uvAttribute.getY(i);
                    uvAttribute.setXY(i, u * 2 - 1, v * 2 - 1);
                }
                baseGeometry.attributes.uv.needsUpdate = true;
            }

            const material = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                map: texture,
                roughness: 0.6,
                metalness: 0.2,
            });

            const qrObject = new THREE.Mesh(baseGeometry, material);
            qrObject.rotation.x = -Math.PI / 2;
            
            sceneRef.current.add(qrObject);
            qrObjectRef.current = qrObject;

            if (cameraRef.current) {
                const camera = cameraRef.current;
                
                // Calculate the bounding box to automatically fit the object in view
                const boundingBox = new THREE.Box3().setFromObject(qrObject);
                const objectSize = new THREE.Vector3();
                boundingBox.getSize(objectSize);
                const maxDim = Math.max(objectSize.x, objectSize.y);

                // Calculate camera distance to fit object
                const fov = camera.fov * (Math.PI / 180);
                const cameraDistance = maxDim / 2 / Math.tan(fov / 2);
                
                // Add padding and set a minimum distance
                const padding = 1.3;
                camera.position.z = Math.max(cameraDistance * padding, 75);
                camera.lookAt(0, 0, 0);
            }
        });
    }, [designConfig]);
    
    const getObjectForExport = () => qrObjectRef.current;

    return { mountRef, updateModel, getObjectForExport };
};