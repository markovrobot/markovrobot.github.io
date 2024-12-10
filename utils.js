import * as THREE from 'three';
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
        this.proximityRange = 3;
        this.collectedOrbs = 0;
        this.raycastRange = 6;
        this.lastStateCheck = 0;
        this.pickupRange = 2;
        this.stateCheckInterval = 100;
        this.stateTimeoutDuration = 2000;
        this.lastStateChangeTime = performance.now();
        this.baseRotationSpeed = (Math.PI / 4.5);
        this.avoidanceRotationSpeed = (Math.PI / 4.5);
        
        // Create visualization rays with narrower angles
        this.rayLines = [];
        const angles = [-Math.PI / 20, -Math.PI / 40, 0, Math.PI / 40, Math.PI / 20];
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

        // Proximity Rays (shorter rays for proximity visualization)
        const proximityAngles = [-Math.PI / 10, -Math.PI / 20, 0, Math.PI / 20, Math.PI / 10];
        this.proximityRayLines = [];
        proximityAngles.forEach(() => {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({
                color: 0x00ff88, // Distinct color for proximity rays
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            });
            const line = new THREE.Line(geometry, material);
            this.proximityRayLines.push(line);
            scene.add(line);
        });

        const pickupGeometry = new THREE.RingGeometry(0, this.pickupRange, 32);
        const pickupMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000, // Red for pickup
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.pickupField = new THREE.Mesh(pickupGeometry, pickupMaterial);
        this.pickupField.rotation.x = -Math.PI / 2;  // Rotate to be horizontal
        this.pickupField.position.y = 0.1;           // Slight offset from ground
        this.robot.add(this.pickupField);

    }


    //const angles = [-Math.PI / 20, -Math.PI / 40, 0, Math.PI / 40, Math.PI / 20];

    detectStates(currentTime) {
        if (currentTime - this.lastStateCheck < this.stateCheckInterval) {
            return null;
        }
    
        this.lastStateCheck = currentTime;
        const detectedStates = new Set();
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(this.robot.quaternion);
        const angles = [-Math.PI / 20, -Math.PI / 40, 0, Math.PI / 40, Math.PI / 20];
    
        let nearestCollectibleDistance = Infinity;
        let nearestObstacleDistance = Infinity;
        let nearestStationDistance = Infinity;
    
        // Check for collectibles in pickup range
        const collectiblesInRange = this.scene.children.filter(obj => {
            if (obj.userData.type === 'collectible' && obj.visible) {
                const distance = this.robot.position.distanceTo(obj.position);
                return distance < this.pickupRange;
            }
            return false;
        });
    
        if (collectiblesInRange.length > 0) {
            detectedStates.add(STATES.seeingObjProximal);
        }
    
        // Check for charging station in range when energy is low
        if (this.energy < 30) {
            const stationsInRange = this.scene.children.filter(obj => {
                if (obj.userData.type === 'chargingStation') {
                    const distance = this.robot.position.distanceTo(obj.position);
                    return distance < this.pickupRange;
                }
                return false;
            });
    
            if (stationsInRange.length > 0) {
                detectedStates.add(STATES.seeingChgStationProximal);
            }
        }
    
        // Ray detection for objects and stations
        angles.forEach((angle, index) => {
            const rayDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            this.raycaster.set(this.robot.position.clone(), rayDirection);
    
            const collectibles = this.scene.children.filter(obj => obj.userData.type === 'collectible' && obj.visible);
            const obstacles = this.scene.children.filter(obj => obj.userData.type === 'obstacle' || obj.userData.type === 'wall');
            const stations = this.scene.children.filter(obj => obj.userData.type === 'chargingStation');
    
            const collectibleHits = this.raycaster.intersectObjects(collectibles);
            const obstacleHits = this.raycaster.intersectObjects(obstacles);
            const stationHits = this.raycaster.intersectObjects(stations);
    
            // Handle collectible detections
            if (collectibleHits.length > 0) {
                const distance = collectibleHits[0].distance;
                nearestCollectibleDistance = Math.min(nearestCollectibleDistance, distance);
    
                if (distance < this.proximityRange && !detectedStates.has(STATES.seeingObjProximal)) {
                    detectedStates.add(STATES.seeingObjProximal);
                } else if (distance < this.raycastRange) {
                    detectedStates.add(STATES.seeingObjAhead);
                }
            }
    
            // Handle obstacle detections
            if (obstacleHits.length > 0) {
                const distance = obstacleHits[0].distance;
                nearestObstacleDistance = Math.min(nearestObstacleDistance, distance);
    
                if (distance < this.proximityRange) {
                    detectedStates.add(STATES.seeingObstacleProximal);
                } else if (distance < this.raycastRange) {
                    detectedStates.add(STATES.seeingObstacleAhead);
                }
            }
    
            // Handle charging station detections when energy is low
            if (this.energy < 30 && stationHits.length > 0) {
                const distance = stationHits[0].distance;
                nearestStationDistance = Math.min(nearestStationDistance, distance);
    
                if (distance < this.proximityRange && !detectedStates.has(STATES.seeingChgStationProximal)) {
                    detectedStates.add(STATES.seeingChgStationProximal);
                } else if (distance < this.raycastRange) {
                    detectedStates.add(STATES.seeingChgStationAhead);
                }
            }
    
            // Update ray visualization
            const hitToShow = collectibleHits[0] || obstacleHits[0] || (this.energy < 30 ? stationHits[0] : null);
            let hitType = 'none';
            if (hitToShow) {
                if (hitToShow.object.userData.type === 'collectible') hitType = 'collectible';
                else if (hitToShow.object.userData.type === 'chargingStation') hitType = 'charging';
                else hitType = 'obstacle';
            }
            this.updateRayVisualization(index, this.robot.position.clone(), rayDirection, hitToShow, hitType);
        });
    
        // Add chargingNeeded state if energy is low
        if (this.energy < 30) {
            detectedStates.add(STATES.chargingNeeded);
        }
    
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
                return state;

            case STATES.movingFwdDecelerate:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.5, false);
                }
                return state;

            case STATES.movingBack:
                this.moveInDirection(speed, true);
                return state;

            case STATES.rotatingLeft:
                this.rotate(rotationSpeed);
                return state;

            case STATES.rotatingRight:
                this.rotate(-rotationSpeed);
                return state;

            case STATES.awaiting:
                return state;

            case STATES.seeingObjAhead:
                if (!this.checkForwardCollision()) {
                    this.moveInDirection(speed * 0.7, false);
                }
                return state;

            case STATES.seeingObjProximal:
                // Let matrix handle transition to collectingObj
                return state;

            case STATES.collectingObj:
                // Check if any collectible is within pickup range and in front of robot
                const collectibles = this.scene.children.filter(obj => 
                    obj.userData.type === 'collectible' && obj.visible
                );
                    
                // Find closest collectible in pickup range and in front
                const nearestCollectible = collectibles.reduce((nearest, orb) => {
                    const distance = this.robot.position.distanceTo(orb.position);
                    if (distance < this.pickupRange) {
                        // Check if object is in front of robot
                        const toObject = new THREE.Vector3()
                            .subVectors(orb.position, this.robot.position)
                            .normalize();
                        const forward = new THREE.Vector3(0, 0, -1)
                            .applyQuaternion(this.robot.quaternion);
                        // Dot product will be positive if object is in front
                        const angleToObject = forward.dot(toObject);
                        
                        // Only consider objects within ~120 degree arc in front
                        if (angleToObject > 0.5 && (!nearest || distance < this.robot.position.distanceTo(nearest.position))) {
                            return orb;
                        }
                    }
                    return nearest;
                }, null);
                
                // If found, collect it and immediately transition
                if (nearestCollectible) {
                    nearestCollectible.visible = false;
                    this.collectedOrbs++;
                    this.lastStateChangeTime = currentTime;
                    return STATES.collectingObjFinished;
                }
                    
                // If no collectible in range, go back to awaiting
                return STATES.awaiting;

            case STATES.collectingObjFinished:
                if (currentTime - this.lastStateChangeTime > 200) {
                    return STATES.awaiting;
                }
                return state;

            case STATES.collisionDetected:
                this.moveInDirection(speed, true);
                return STATES.movingBack;

            case STATES.seeingObstacleAhead:
                this.moveInDirection(speed * 0.5, false);
                return state;

            case STATES.seeingObstacleProximal:
                this.moveInDirection(speed * 0.5, true);
                const [leftDistance, rightDistance] = this.checkSideDistances();
                if (leftDistance > rightDistance) {
                    this.rotate(fastRotationSpeed);
                } else {
                    this.rotate(-fastRotationSpeed);
                }
                return state;

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
                return state;

                case STATES.charging:
                    // Charge until full
                    this.energy = Math.min(100, this.energy + deltaTime * 30);
                    if (this.energy >= 100) {
                        return STATES.chargingFinished;
                    }
                    return state;
                
                case STATES.chargingFinished:
                    if (currentTime - this.lastStateChangeTime > 200) {
                        return STATES.awaiting;
                    }
                    return state;
                
                case STATES.seeingChgStationAhead:
                    if (!this.checkForwardCollision()) {
                        this.moveInDirection(speed * 0.7, false);
                    }
                    return state;
                
                case STATES.seeingChgStationProximal:
                    if (!this.checkForwardCollision()) {
                        this.moveInDirection(speed * 0.3, false);
                    }
                    return state;

            default:
                return STATES.awaiting;
        }
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

    updateRayVisualization(index, start, direction, hit, hitType) {
        let endPoint, rayColor;
    
        if (hit) {
            endPoint = start.clone().add(direction.clone().multiplyScalar(hit.distance));
            switch(hitType) {
                case 'collectible':
                    rayColor = 0x00ff00; // Green
                    break;
                case 'charging':
                    rayColor = 0x0000ff; // Blue
                    break;
                case 'obstacle':
                    rayColor = 0xff0000; // Red
                    break;
                default:
                    rayColor = 0xffff00; // Yellow
            }
        } else {
            endPoint = start.clone().add(direction.clone().multiplyScalar(this.raycastRange));
            rayColor = 0xffff00;
        }
    
        const points = [start, endPoint];
        this.rayLines[index].geometry.setFromPoints(points);
        this.rayLines[index].material.color.setHex(rayColor);
    
        // Update proximity rays
        const proximityEnd = start.clone().add(direction.clone().multiplyScalar(this.proximityRange));
        this.proximityRayLines[index].geometry.setFromPoints([start, proximityEnd]);
    }
    
    
}