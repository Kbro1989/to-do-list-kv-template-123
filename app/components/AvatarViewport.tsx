// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { WebGLRenderer, Scene, PerspectiveCamera, Group, Color, AmbientLight, DirectionalLight, Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { ComposedAvatarResult } from '../../../src/engines/AvatarCompositionEngine';
import { RSModel } from '../../../src/rsmv/3d/modelnodes';
import { ThreejsSceneCache } from '../../../src/rsmv/3d/modeltothree';

interface AvatarViewportProps {
    composition: ComposedAvatarResult | null;
    sceneCache: ThreejsSceneCache | null;
    width?: number;
    height?: number;
}

export function AvatarViewport({ composition, sceneCache, width = 400, height = 600 }: AvatarViewportProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<WebGLRenderer | null>(null);
    const sceneRef = useRef<Scene | null>(null);
    const cameraRef = useRef<PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const modelGroupRef = useRef<Group | null>(null);

    // Initialize Three.js Scene
    useEffect(() => {
        if (!containerRef.current) return;

        const scene = new Scene();
        scene.background = new Color(0x2a2a2a);

        // Lighting for HSL skin/clothing materials
        const ambientLight = new AmbientLight(0xffffff, 0.7);
        scene.add(ambientLight);
        
        const dirLight = new DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
        camera.position.set(0, 1.5, 3); // Positioned for a character

        const renderer = new WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 1, 0); // Focus on chest/head area
        controls.update();

        sceneRef.current = scene;
        cameraRef.current = camera;
        rendererRef.current = renderer;
        controlsRef.current = controls;

        const animate = () => {
            requestAnimationFrame(animate);
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                controlsRef.current?.update();
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        animate();

        return () => {
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [width, height]);

    // Handle incoming compositions
    useEffect(() => {
        if (!sceneRef.current || !composition) return;

        // Clean up previous model
        if (modelGroupRef.current) {
            sceneRef.current.remove(modelGroupRef.current);
        }

        // The underlying RSMV engine generates Three.js groups
        // We assume composition.models has a Three.js hierarchy or we parse it
        // Note: You'll need to adapt this depending on the exact return shape of `avatarToModel`
        const modelGroup = new Group();
        sceneRef.current.add(modelGroup);
        modelGroupRef.current = modelGroup;

        if (Array.isArray(composition.models) && sceneCache) {
            // Bridge the SimpleModelDef array to a Three.js hierarchy using RSModel
            const rsModel = new RSModel(sceneCache, composition.models, "AvatarComposition", {
                noSkin: false // We want skinning enabled for characters
            });

            // RSModel asynchronously loads the meshes
            rsModel.model.then(loaded => {
                if (loaded && loaded.mesh) {
                    modelGroup.add(loaded.mesh);
                    // Center the model in viewport
                    loaded.mesh.position.set(0, 0, 0);
                }
            }).catch(err => {
                console.error("Failed to bridge RSModel in viewport:", err);
            });
        } else if ((composition.models as any) instanceof Object3D) {
            modelGroup.add((composition.models as any));
            modelGroup.position.set(0, 0, 0);
        }

    }, [composition]);

    return (
        <div 
            ref={containerRef} 
            style={{ 
                width, 
                height, 
                borderRadius: '8px', 
                overflow: 'hidden', 
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)' 
            }} 
        />
    );
}
