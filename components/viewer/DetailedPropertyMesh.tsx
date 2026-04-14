'use client';

import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { generatePropertyModel } from '@/lib/visualization/engine/generator';
import { Stars } from '@react-three/drei';

interface DetailedPropertyMeshProps {
  property: any;
}

const DetailedPropertyMesh: React.FC<DetailedPropertyMeshProps> = ({ property }) => {
  const [meshes, setMeshes] = useState<THREE.Mesh[]>([]);
  
  useEffect(() => {
    const loadModel = async () => {
      const loader = new OBJLoader();
      let group;
      
      if (property.objUrl) {
        try {
          group = await new Promise((resolve, reject) => {
            loader.load(property.objUrl, resolve, undefined, reject);
          });
        } catch (e) {
          const rawObj = generatePropertyModel(property);
          group = loader.parse(rawObj);
        }
      } else {
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
          <meshStandardMaterial 
            color="#94a3b8" 
            roughness={0.7}
            metalness={0.2}
            emissive="#3b82f6"
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}
    </group>
  );
};

export default DetailedPropertyMesh;
