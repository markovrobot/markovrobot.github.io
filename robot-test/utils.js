import * as THREE from 'three';
import { STATES } from './markov.js';

export class EnvironmentSensor {
    constructor(scene, robot) {
        this.scene = scene;
        this.robot = robot;
        this.raycaster = new THREE.Raycaster();
        this.proximityThreshold = 1.5;  // Reduced from 2
        this.collectedOrbs = 0;
        this.obstacleDetectionRange = 3;
        this.objectDetectionRange = 3;   // Reduced from 4

        this.rayLines = [];
        const angles = [-Math.PI/6, -Math.PI/12, -Math.PI/24, 0, Math.PI/24, Math.PI/12, Math.PI/6];
        angles.forEach(() => {
            const geometry = new THREE.BufferGeometry();
            const material = new THREE.LineBasicMaterial({ color: 0xffff00 });
            const line = new THREE.Line(geometry, material);
            this.rayLines.push(line);
            this.scene.add(line);
        });
    }

    detectStates() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.robot.quaternion);
        
        const angles = [-Math.PI/6, -Math.PI/12, -Math.PI/24, 0, Math.PI/24, Math.PI/12, Math.PI/6];
        const directions = angles.map(angle => {
            return direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        });
    
        let detectedStates = [];
        let nearestObjectDistance = Infinity;
        
        directions.forEach((dir, index) => {
            const rayStart = this.robot.position.clone();
            rayStart.y = 1;
            
            this.raycaster.set(rayStart, dir);
            const collectibleIntersects = this.raycaster.intersectObjects(
                this.scene.children.filter(obj => obj.userData.type === 'collectible' && obj.visible)
            );
            
            let hitPoint = this.objectDetectionRange;
            let hitType = null;

            if (collectibleIntersects.length > 0) {
                const distance = collectibleIntersects[0].distance;
                if (distance <= this.objectDetectionRange) {
                    hitPoint = distance;
                    hitType = 'collectible';
                    
                    if (distance < nearestObjectDistance) {
                        nearestObjectDistance = distance;
                        detectedStates = [];
                        if (distance < 0.8) {  // Reduced collection threshold
                            detectedStates.push(STATES.collectingObj);
                        } else if (distance < this.proximityThreshold) {
                            detectedStates.push(STATES.seeingObjProximal);
                        } else {
                            detectedStates.push(STATES.seeingObjAhead);
                        }
                    }
                }
            }

            if (detectedStates.length === 0) {
                const obstacleIntersects = this.raycaster.intersectObjects(
                    this.scene.children.filter(obj => 
                        (obj.userData.type === 'obstacle' || obj.userData.type === 'wall') && obj.visible
                    )
                );

                if (obstacleIntersects.length > 0) {
                    const distance = obstacleIntersects[0].distance;
                    if (distance <= this.obstacleDetectionRange) {
                        hitPoint = distance;
                        hitType = 'obstacle';
                        
                        if (distance < 1.0) {
                            detectedStates.push(STATES.collisionDetected);
                        } else if (distance < this.proximityThreshold) {
                            detectedStates.push(STATES.seeingObstacleProximal);
                        } else {
                            detectedStates.push(STATES.seeingObstacleAhead);
                        }
                    }
                }
            }

            const points = this.updateRayVisualization(rayStart, dir, hitPoint, hitType);
            this.rayLines[index].geometry.setFromPoints(points);
            
            if (hitType === 'collectible') {
                this.rayLines[index].material.color.setHex(0x00ff00);
            } else if (hitType === 'obstacle' && hitPoint <= this.obstacleDetectionRange) {
                this.rayLines[index].material.color.setHex(0xff0000);
            } else {
                this.rayLines[index].material.color.setHex(0xffff00);
            }
        });
    
        return detectedStates;
    }

    // Rest of the methods remain the same
    updateRayVisualization(origin, direction, distance, type) {
        let visualDistance = type === 'obstacle' ? 
            Math.min(distance, this.obstacleDetectionRange) : 
            Math.min(distance, this.objectDetectionRange);
        
        const endPoint = direction.clone().multiplyScalar(visualDistance).add(origin);
        return [origin, endPoint];
    }

    collectOrb(orb) {
        if (orb.visible) {
            orb.visible = false;
            this.collectedOrbs++;
        }
    }

    checkBoundaryCollision(nextPosition) {
        const bounds = {
            minX: -15,
            maxX: 15,
            minZ: -15,
            maxZ: 15
        };

        return nextPosition.x < bounds.minX || nextPosition.x > bounds.maxX ||
               nextPosition.z < bounds.minZ || nextPosition.z > bounds.maxZ;
    }
}

export function solveCurStateConflict(states) {
    if (states.length === 0) return null;
    
    if (states.includes(STATES.collisionDetected)) {
        return STATES.collisionDetected;
    }
    
    if (states.includes(STATES.seeingObstacleProximal)) {
        return STATES.seeingObstacleProximal;
    }
    
    if (states.includes(STATES.seeingObstacleAhead)) {
        return STATES.seeingObstacleAhead;
    }
    
    if (states.includes(STATES.collectingObj)) {
        return STATES.collectingObj;
    }
    
    if (states.includes(STATES.seeingObjProximal)) {
        return STATES.seeingObjProximal;
    }
    
    if (states.includes(STATES.seeingObjAhead)) {
        return STATES.seeingObjAhead;
    }

    return states[0];
}