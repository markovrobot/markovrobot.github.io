import * as THREE from 'three';

export function createEnvironment(scene) {
    // Floor - keep large for infinite feel
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000);
    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Create play area walls
    const wallGeometry = new THREE.BoxGeometry(0.5, 4, 30); // Thinner, taller walls
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.7,
        metalness: 0.1
    });

    // Create enclosed play area with walls
    const wallPositions = [
        { pos: [15, 2, 0], rot: 0 },      // Right wall
        { pos: [-15, 2, 0], rot: 0 },     // Left wall
        { pos: [0, 2, 15], rot: Math.PI/2 },  // Back wall
        { pos: [0, 2, -15], rot: Math.PI/2 }  // Front wall
    ];

    wallPositions.forEach(({ pos, rot }) => {
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.set(...pos);
        wall.rotation.y = rot;
        wall.receiveShadow = true;
        wall.castShadow = true;
        wall.userData.type = 'wall';
        scene.add(wall);
    });

    // Charging Station
    const stationGeometry = new THREE.BoxGeometry(2, 0.5, 2);
    const stationMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        roughness: 0.3,
        metalness: 0.7
    });
    const chargingStation = new THREE.Mesh(stationGeometry, stationMaterial);
    chargingStation.position.set(-8, 0.25, -8);
    chargingStation.castShadow = true;
    chargingStation.receiveShadow = true;
    chargingStation.userData.type = 'chargingStation';
    scene.add(chargingStation);

    // Obstacles (Pillars)
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.8,
        metalness: 0.2
    });
    const pillarPositions = [
        [-5, 2, -5],
        [5, 2, 5],
        [-5, 2, 5],
        [5, 2, -5]
    ];
    pillarPositions.forEach(pos => {
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(...pos);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pillar.userData.type = 'obstacle';
        scene.add(pillar);
    });

    // Collectible Objects - Raised to robot's vision height
    const collectibleGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const collectibleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xffd700,  // Make orbs glow slightly
        emissiveIntensity: 0.2
    });
    const collectiblePositions = [
        [-5, 1, 0],    // Between front and back left pillars
        [5, 1, 0],     // Between front and back right pillars
        [0, 1, -5],    // Between front pillars
        [0, 1, 5],     // Between back pillars
        [0, 1, 0]      // Center
    ];
    collectiblePositions.forEach(pos => {
        const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
        collectible.position.set(...pos);
        collectible.castShadow = true;
        collectible.receiveShadow = true;
        collectible.userData.type = 'collectible';
        scene.add(collectible);
    });
}