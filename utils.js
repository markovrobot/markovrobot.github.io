import * as THREE from './node_modules/three/build/three.module.js';
import { STATES } from './markov.js';

export function checkStateTransitions(state, matrix) {
    if (!matrix[state]) {
        console.error(`Invalid state: ${state}. No corresponding transition row in the matrix.`);
        return;
    }

    console.log(`Current State: ${Object.keys(STATES)[state]}`);
    console.log('Possible transitions:');
    matrix[state].forEach((probability, toState) => {
        if (probability > 0) {
            console.log(`  To ${Object.keys(STATES)[toState]}: ${(probability * 100).toFixed(1)}%`);
        }
    });
}


export class RobotController {
    constructor(scene, robot) {
        this.scene = scene;
        this.robot = robot;
        this.raycaster = new THREE.Raycaster();
        this.proximityThreshold = 1.5;
        this.collectedOrbs = 0;
        this.detectionRange = 4;
        this.lastStateCheck = 0;
        this.stateCheckInterval = 100;
        this.stateTimeoutDuration = 2000;
        this.lastStateChangeTime = performance.now();
        this.baseRotationSpeed = (Math.PI / 4.5);
        this.avoidanceRotationSpeed = (Math.PI / 4.5);
        
        // Create visualization rays with narrower angles
        this.rayLines = [];
        const angles = [-Math.PI/10, -Math.PI/20, 0, Math.PI/20, Math.PI/10];
        angles.forEach(() => {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ 
                color: 0xffff00,
                linewidth: 2,
                transparent: true,
                opacity: 0.7
            });
            const line = new THREE.Line(geometry, material);
            this.rayLines.push(line);
            scene.add(line);
        });

        // proximity field visualization
        const proximityGeometry = new THREE.RingGeometry(0, this.proximityThreshold, 32);
        const proximityMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.1,
            side: THREE.DoubleSide
        });
        this.proximityField = new THREE.Mesh(proximityGeometry, proximityMaterial);
        this.proximityField.rotation.x = -Math.PI / 2;
        this.proximityField.position.y = 0.1;
        this.robot.add(this.proximityField);

        // detection range visualization
        const detectionGeometry = new THREE.RingGeometry(0, this.detectionRange, 32);
        const detectionMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.05,
            side: THREE.DoubleSide
        });
        this.detectionField = new THREE.Mesh(detectionGeometry, detectionMaterial);
        this.detectionField.rotation.x = -Math.PI / 2;
        this.detectionField.position.y = 0.1;
        this.robot.add(this.detectionField);
    }

    detectStates(currentTime) {
        if (currentTime - this.lastStateCheck < this.stateCheckInterval) {
            return null;
        }
        
        this.lastStateCheck = currentTime;
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.robot.quaternion);
        
        const angles = [-Math.PI / 10, -Math.PI / 20, 0, Math.PI / 20, Math.PI / 10];
        const detectedStates = new Set();
        let nearestCollectibleDistance = Infinity;
        let nearestObstacleDistance = Infinity;
    
        angles.forEach((angle, index) => {
            const rayDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            const rayStart = this.robot.position.clone();
            rayStart.y = 1;
    
            this.raycaster.set(rayStart, rayDirection);
    
            //  collectibles first
            const collectibles = this.scene.children.filter(obj => 
                obj.userData.type === 'collectible' && obj.visible
            );
            const collectibleHits = this.raycaster.intersectObjects(collectibles);
    
            // obstacles
            const obstacles = this.scene.children.filter(obj => 
                obj.userData.type === 'obstacle' || obj.userData.type === 'wall'
            );
            const obstacleHits = this.raycaster.intersectObjects(obstacles);
    
            // Process collectible hits with prioritization for proximal
            if (collectibleHits.length > 0) {
                const distance = collectibleHits[0].distance;
                nearestCollectibleDistance = Math.min(nearestCollectibleDistance, distance);
    
                if (distance < this.proximityThreshold) {
                    detectedStates.add(STATES.seeingObjProximal); // Prioritize proximal
                    this.proximityField.material.color.setHex(0x00ff88); // Greenish
                } else if (distance <= this.detectionRange) {
                    if (!detectedStates.has(STATES.seeingObjProximal)) { // Only add if not proximal
                        detectedStates.add(STATES.seeingObjAhead);
                        this.proximityField.material.color.setHex(0x00ff00); // Green
                    }
                }
            }
    
            // Process obstacle hits with prioritization for proximal
            if (obstacleHits.length > 0) {
                const distance = obstacleHits[0].distance;
                nearestObstacleDistance = Math.min(nearestObstacleDistance, distance);
    
                if (distance < this.proximityThreshold) {
                    detectedStates.add(STATES.seeingObstacleProximal); // Prioritize proximal
                    this.proximityField.material.color.setHex(0xff8800); // Orange
                } else if (distance <= this.detectionRange) {
                    if (!detectedStates.has(STATES.seeingObstacleProximal)) { // Only add if not proximal
                        detectedStates.add(STATES.seeingObstacleAhead);
                        this.proximityField.material.color.setHex(0xffff00); // Yellow
                    }
                }
            }
    
            // Update ray visualization with better object differentiation
            this.updateRayVisualization(
                index, 
                rayStart, 
                rayDirection, 
                collectibleHits[0] || obstacleHits[0], 
                collectibleHits[0] ? 'collectible' : (obstacleHits[0] ? 'obstacle' : null)
            );
        });
    
        // Update detection field opacity based on state
        this.detectionField.material.opacity = detectedStates.size > 0 ? 0.1 : 0.05;
    
        return Array.from(detectedStates);
    }
    

    moveRobot(state, deltaTime) {
        const currentTime = performance.now();
        const speed = 2.0 * deltaTime;
        const rotationSpeed = this.baseRotationSpeed * deltaTime;
        const fastRotationSpeed = this.avoidanceRotationSpeed * deltaTime;

        // Check for state timeout
        if (currentTime - this.lastStateChangeTime > this.stateTimeoutDuration) {
            this.lastStateChangeTime = currentTime;
            return STATES.awaiting;
        }

        switch(state) {
            case STATES.movingFwd:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed, false);
                } else {
                    return STATES.collisionDetected;
                }
                break;

            case STATES.movingFwdDecelerate:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.5, false);
                }
                break;

            case STATES.movingBack:
                this.moveInDirection(speed, true);
                break;

            case STATES.rotatingLeft:
                this.rotate(rotationSpeed);
                break;

            case STATES.rotatingRight:
                this.rotate(-rotationSpeed);
                break;

            case STATES.awaiting:
                break;

            case STATES.seeingObjAhead:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.7, false);
                }
                break;

            case STATES.seeingObjProximal:
                const nearestOrb = this.findNearestCollectible();
                if (nearestOrb) {
                    const orbDirection = new THREE.Vector3()
                        .subVectors(nearestOrb.position, this.robot.position)
                        .normalize();
                    
                    const nextPosition = this.robot.position.clone()
                        .add(orbDirection.multiplyScalar(speed * 0.5));
                    
                    if (!this.checkBoundaryCollision(nextPosition)) {
                        this.robot.position.copy(nextPosition);
                    }
                }
                break;

            case STATES.collectingObj:
                const targetOrb = this.findNearestCollectible();
                if (targetOrb) {
                    const orbDirection = new THREE.Vector3()
                        .subVectors(targetOrb.position, this.robot.position)
                        .normalize();
                    
                    const nextPosition = this.robot.position.clone()
                        .add(orbDirection.multiplyScalar(speed * 0.3));
                    
                    if (!this.checkBoundaryCollision(nextPosition)) {
                        this.robot.position.copy(nextPosition);
                        
                        const distance = this.robot.position.distanceTo(targetOrb.position);
                        if (distance < 0.5) {
                            targetOrb.visible = false;
                            this.collectedOrbs++;
                            return STATES.collectingObjFinished;
                        }
                    }
                } else {
                    return STATES.awaiting;
                }
                break;

            case STATES.collectingObjFinished:
                if (currentTime - this.lastStateChangeTime > 200) {
                    return STATES.awaiting;
                }
                break;

            case STATES.collisionDetected:
                this.moveInDirection(speed, true);
                return STATES.movingBack;

            case STATES.seeingObstacleAhead:
                this.moveInDirection(speed * 0.5, false);
                break;

            case STATES.seeingObstacleProximal:
                this.moveInDirection(speed * 0.5, true);
                const [leftDistance, rightDistance] = this.checkSideDistances();
                if (leftDistance > rightDistance) {
                    this.rotate(fastRotationSpeed);
                } else {
                    this.rotate(-fastRotationSpeed);
                }
                break;

            case STATES.chargingNeeded:
                const station = this.findNearestChargingStation();
                if (station) {
                    const stationDirection = new THREE.Vector3()
                        .subVectors(station.position, this.robot.position)
                        .normalize();
                    const nextPosition = this.robot.position.clone()
                        .add(stationDirection.multiplyScalar(speed));
                    if (!this.checkBoundaryCollision(nextPosition)) {
                        this.robot.position.copy(nextPosition);
                    }
                }
                break;

            case STATES.charging:
                break;

            case STATES.chargingFinished:
                return STATES.awaiting;

            case STATES.seeingChgStationAhead:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.7, false);
                }
                break;

            case STATES.seeingChgStationProximal:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.3, false);
                }
                break;
        }

        return state;
    }

    findNearestChargingStation() {
        let nearestStation = null;
        let minDistance = Infinity;
        
        this.scene.children.forEach(obj => {
            if (obj.userData.type === 'chargingStation') {
                const distance = this.robot.position.distanceTo(obj.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestStation = obj;
                }
            }
        });
        
        return nearestStation;
    }

    checkSideDistances() {
        const leftDirection = new THREE.Vector3(0, 0, -1);
        const rightDirection = new THREE.Vector3(0, 0, -1);
        const leftRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
        const rightRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
        
        leftDirection.applyQuaternion(this.robot.quaternion).applyQuaternion(leftRotation);
        rightDirection.applyQuaternion(this.robot.quaternion).applyQuaternion(rightRotation);
        
        const rayStart = this.robot.position.clone();
        rayStart.y = 1;
        
        this.raycaster.set(rayStart, leftDirection);
        const leftHits = this.raycaster.intersectObjects(
            this.scene.children.filter(obj => 
                obj.userData.type === 'obstacle' || obj.userData.type === 'wall'
            )
        );
        
        this.raycaster.set(rayStart, rightDirection);
        const rightHits = this.raycaster.intersectObjects(
            this.scene.children.filter(obj => 
                obj.userData.type === 'obstacle' || obj.userData.type === 'wall'
            )
        );
        
        const leftDistance = leftHits.length > 0 ? leftHits[0].distance : Infinity;
        const rightDistance = rightHits.length > 0 ? rightHits[0].distance : Infinity;
        
        return [leftDistance, rightDistance];
    }

    findNearestCollectible() {
        let nearestOrb = null;
        let minDistance = Infinity;
        
        this.scene.children.forEach(obj => {
            if (obj.userData.type === 'collectible' && obj.visible) {
                const distance = this.robot.position.distanceTo(obj.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestOrb = obj;
                }
            }
        });
        
        return nearestOrb;
    }

    checkForwardCollision() {
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.robot.quaternion);
        const rayStart = this.robot.position.clone();
        rayStart.y = 1;
        
        this.raycaster.set(rayStart, forward);
        const obstacles = this.scene.children.filter(obj => 
            (obj.userData.type === 'obstacle' || obj.userData.type === 'wall')
        );
        const hits = this.raycaster.intersectObjects(obstacles);
        
        return hits.length > 0 && hits[0].distance < 1.0;
    }

    moveInDirection(speed, backwards) {
        const direction = new THREE.Vector3(0, 0, backwards ? 1 : -1);
        direction.applyQuaternion(this.robot.quaternion);
        const nextPosition = this.robot.position.clone().add(
            direction.multiplyScalar(speed)
        );

        if (!this.checkBoundaryCollision(nextPosition)) {
            this.robot.position.copy(nextPosition);
        }
    }

    rotate(angle) {
        const rotation = new THREE.Quaternion();
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        this.robot.quaternion.multiply(rotation);
        this.robot.quaternion.normalize();
    }

    checkBoundaryCollision(position) {
        const bounds = {
            minX: -14,
            maxX: 14,
            minZ: -14,
            maxZ: 14
        };
        return position.x < bounds.minX || position.x > bounds.maxX ||
               position.z < bounds.minZ || position.z > bounds.maxZ;
    }

    updateRayVisualization(index, start, direction, hit) {
        let endPoint;
        let rayColor;
        
        if (hit) {
            endPoint = start.clone().add(direction.clone().multiplyScalar(hit.distance));
            
            if (hit.object.userData.type === 'collectible') {
                rayColor = 0x00ff00; // Green for collectibles
                this.rayLines[index].material.opacity = 0.9;
            } else if (hit.object.userData.type === 'chargingStation') {
                rayColor = 0x0000ff; // Blue for charging station
                this.rayLines[index].material.opacity = 0.9;
            } else {
                rayColor = 0xff0000; // Red for obstacles/walls
                this.rayLines[index].material.opacity = hit.distance < this.proximityThreshold ? 0.9 : 0.7;
            }
        } else {
            endPoint = start.clone().add(direction.clone().multiplyScalar(this.detectionRange));
            rayColor = 0xffff00; // Yellow for no collision
            this.rayLines[index].material.opacity = 0.5;
        }

        const points = [start, endPoint];
        this.rayLines[index].geometry.setFromPoints(points);
        this.rayLines[index].material.color.setHex(rayColor);
    }
}