// @ts-nocheck
import React, { useRef, useEffect, useState } from "react";
import * as THREE from "../utils/three.module";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Openrs2CacheSource } from "../utils/cache";
import { parseOb3Model } from "../utils/rt7model";
import { cacheMajors } from "../utils/constants";
import { createThreeMeshFromRsmvModel } from "../utils/rsmvThreeLoader";

interface ModelAsset {
  id: string;
  modelId: number;
  name: string;
  colors: { [key: string]: string };
  imageUrl?: string;
  metadata?: any;
  createdAt: number;
}

interface Model3DViewerProps {
  modelAsset: ModelAsset;
}

const Model3DViewer: React.FC<Model3DViewerProps> = ({ modelAsset }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    setLoading(true);
    setError(null);

    const currentMount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcccccc);

    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1).normalize();
    scene.add(directionalLight);

    let modelMesh: THREE.Mesh | null = null;

    const loadModel = async () => {
      try {
        // TODO: allow selecting a cache id dynamically
        const cacheId = 1665; // Example cache id, latest rs3 cache
        const cacheSource = await Openrs2CacheSource.fromId(cacheId);

        const modelBuffer = await cacheSource.getFileById(
          cacheMajors.models,
          modelAsset.modelId
        );
        const modelData = parseOb3Model(modelBuffer, cacheSource);

        modelMesh = createThreeMeshFromRsmvModel(modelData);
        scene.add(modelMesh);

        // Apply initial colors
        if (modelMesh.material instanceof THREE.MeshStandardMaterial) {
          modelMesh.material.color.set(modelAsset.colors.main || 0x00ff00);
        }

        setLoading(false);
      } catch (err) {
        console.error("Failed to load or render model:", err);
        setError("Failed to load model. Check console for details.");
        setLoading(false);
      }
    };

    loadModel();

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      currentMount.removeChild(renderer.domElement);
      // Dispose Three.js resources to prevent memory leaks
      if (modelMesh) {
        modelMesh.geometry.dispose();
        if (Array.isArray(modelMesh.material)) {
          modelMesh.material.forEach(material => material.dispose());
        } else {
          modelMesh.material.dispose();
        }
      }
      renderer.dispose();
      controls.dispose();
    };
  }, [modelAsset.modelId]); // Re-run effect if modelId changes

  useEffect(() => {
    // Update colors when modelAsset.colors changes
    if (modelMesh && modelMesh.material instanceof THREE.MeshStandardMaterial) {
      modelMesh.material.color.set(modelAsset.colors.main || 0x00ff00);
    }
  }, [modelAsset.colors]);

  if (loading) {
    return <div>Loading 3D model...</div>;
  }

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  return <div ref={mountRef} style={{ width: "100%", height: "500px" }} />;
};

export default Model3DViewer;
