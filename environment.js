import * as THREE from './node_modules/three/build/three.module.js';

function getRandomPositionInCell(cell, padding = 1) {
    const { minX, maxX, minZ, maxZ } = cell;
    const x = Math.random() * (maxX - minX - 2 * padding) + minX + padding;
    const z = Math.random() * (maxZ - minZ - 2 * padding) + minZ + padding;
    return [x, 0, z];
}

function generateGrid(bounds, rows, cols) {
    const cellWidth = (bounds.maxX - bounds.minX) / cols;
    const cellHeight = (bounds.maxZ - bounds.minZ) / rows;
    const grid = [];

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            grid.push({
                minX: bounds.minX + col * cellWidth,
                maxX: bounds.minX + (col + 1) * cellWidth,
                minZ: bounds.minZ + row * cellHeight,
                maxZ: bounds.minZ + (row + 1) * cellHeight
            });
        }
    }

    return grid;
}

export function createEnvironment(scene) {
    // Floor
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

    // Walls
    const wallGeometry = new THREE.BoxGeometry(0.5, 4, 30);
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x555555,
        roughness: 0.7,
        metalness: 0.1
    });

    const bounds = {
        minX: -14,
        maxX: 14,
        minZ: -14,
        maxZ: 14
    };

    const wallPositions = [
        { pos: [15, 2, 0], rot: 0 },      // Right wall
        { pos: [-15, 2, 0], rot: 0 },     // Left wall
        { pos: [0, 2, 15], rot: Math.PI / 2 },  // Back wall
        { pos: [0, 2, -15], rot: Math.PI / 2 }  // Front wall
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

    // Grid-based distribution
    const rows = 4;
    const cols = 4;
    const grid = generateGrid(bounds, rows, cols);
    const usedCells = new Set();

    // Obstacles
    const pillarGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 16);
    const pillarMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b4513,
        roughness: 0.8,
        metalness: 0.2
    });

    const numPillars = 6;
    for (let i = 0; i < numPillars; i++) {
        let cell;
        do {
            cell = grid[Math.floor(Math.random() * grid.length)];
        } while (usedCells.has(cell));
        usedCells.add(cell);

        const pos = getRandomPositionInCell(cell);
        pos[1] = 2;
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.set(...pos);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        pillar.userData.type = 'obstacle';
        scene.add(pillar);
    }

    // Collectibles
    const collectibleGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const collectibleMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0xffd700,
        emissiveIntensity: 0.2
    });

    const numCollectibles = 8;
    for (let i = 0; i < numCollectibles; i++) {
        let cell;
        do {
            cell = grid[Math.floor(Math.random() * grid.length)];
        } while (usedCells.has(cell));
        usedCells.add(cell);

        const pos = getRandomPositionInCell(cell);
        pos[1] = 1;
        const collectible = new THREE.Mesh(collectibleGeometry, collectibleMaterial);
        collectible.position.set(...pos);
        collectible.castShadow = true;
        collectible.receiveShadow = true;
        collectible.userData.type = 'collectible';
        scene.add(collectible);
    }
}
