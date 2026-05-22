'use client';

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { Stars } from '@react-three/drei';

interface DetailedPropertyMeshProps {
  property: any;
  isNeuralMode?: boolean;
}

const DetailedPropertyMesh: React.FC<DetailedPropertyMeshProps> = ({ property, isNeuralMode = false }) => {
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  
  useEffect(() => {
    const loadModel = async () => {
      const loader = new OBJLoader();
      let group;
      
      try {
        if (property.objUrl) {
          group = await new Promise((resolve, reject) => {
            loader.load(property.objUrl, resolve, undefined, reject);
          });
        } else {
          const rawObj = generatePropertyModel(property);
          group = loader.parse(rawObj);
        }
      } catch (e) {
        const rawObj = generatePropertyModel(property);
        group = loader.parse(rawObj);
      }
      
      const extractedMeshes: THREE.Mesh[] = [];
      (group as THREE.Group).traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          extractedMeshes.push(child as THREE.Mesh);
        }
      });
      setMeshes(extractedMeshes);
    };

    loadModel();
  }, [property]);

  if (meshes.length === 0) return null;

  return (
    <group>
      <Stars radius={50} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      {meshes.map((mesh, i) => (
        <mesh key={i} geometry={mesh.geometry}>
          {isNeuralMode ? (
            <meshBasicMaterial 
              color="#3b82f6" 
              wireframe={true} 
              transparent={true} 
              opacity={0.8}
            />
          ) : (
            <meshStandardMaterial 
              color="#94a3b8" 
              roughness={0.7}
              metalness={0.2}
              emissive="#3b82f6"
              emissiveIntensity={0.05}
            />
          )}
        </mesh>
      ))}
    </group>
  );
};

export default DetailedPropertyMesh;
