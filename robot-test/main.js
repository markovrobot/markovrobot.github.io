import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createEnvironment } from './environment.js';
import { createRobot } from './robot.js';
import { markovChain, STATES, matrix } from './markov.js';
import { RobotUI } from './ui.js';
import { EnvironmentSensor, solveCurStateConflict } from './utils.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

camera.position.set(0, 10, 15);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

createEnvironment(scene);
const robot = createRobot();
robot.position.set(0, 1, 0);
scene.add(robot);

const environmentSensor = new EnvironmentSensor(scene, robot);
const robotMarkovChain = new markovChain(matrix);

// simulation control variables
let isPaused = false;
let simulationSpeed = 1;
let lastUpdateTime = performance.now();
const baseUpdateInterval = 100;
let currentState = STATES.awaiting;
let energy = 100;
let isMovementComplete = true;
let moveTarget = null;
let rotationTarget = null;
const tempVec = new THREE.Vector3();
let isGameOver = false;

// initialize UI
const ui = new RobotUI(
    () => {
        isPaused = !isPaused;
        if (!isPaused) {
            lastUpdateTime = performance.now();
        }
    },
    (speed) => {
        simulationSpeed = speed;
    }
);

function createEndScreen() {
    const endScreen = document.createElement('div');
    endScreen.style.position = 'fixed';
    endScreen.style.top = '50%';
    endScreen.style.left = '50%';
    endScreen.style.transform = 'translate(-50%, -50%)';
    endScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    endScreen.style.color = 'white';
    endScreen.style.padding = '20px';
    endScreen.style.borderRadius = '10px';
    endScreen.style.textAlign = 'center';
    endScreen.style.fontSize = '24px';
    endScreen.style.zIndex = '1000';

    endScreen.innerHTML = `
        <h2>Game Over!</h2>
        <p>Battery Depleted</p>
        <p>Orbs Collected: ${environmentSensor.collectedOrbs}</p>
        <button onclick="location.reload()" 
                style="padding: 10px 20px; margin-top: 10px; cursor: pointer; background: #4CAF50; 
                       border: none; color: white; border-radius: 5px;">
            Restart
        </button>
    `;

    document.body.appendChild(endScreen);
}

function checkCollectibles() {
    scene.children.forEach(obj => {
        if (obj.userData.type === 'collectible' && obj.visible) {
            const distance = robot.position.distanceTo(obj.position);
            if (distance < 1.0) {  // collection radius
                obj.visible = false;
                environmentSensor.collectedOrbs++;
                console.log('Collected orb! Total:', environmentSensor.collectedOrbs);
            }
        }
    });
}

function moveRobot(state, deltaTime, baseAngularSpeed = Math.PI / 2) {
    const baseSpeed = 2.0;
    const speed = baseSpeed * simulationSpeed;
    const angularSpeed = baseAngularSpeed * simulationSpeed; // Scale angular speed with simulation speed
    const movementDistance = 2;

    // handle basic movement states
    if (state === STATES.movingFwd || state === STATES.movingBack || 
        state === STATES.rotatingLeft || state === STATES.rotatingRight ||
        state === STATES.movingFwdDecelerate) {
        
        if (isMovementComplete) {
            isMovementComplete = false;
            
            switch (state) {
                case STATES.movingFwd:
                case STATES.movingFwdDecelerate:
                case STATES.movingBack:
                    moveTarget = robot.position.clone();
                    const direction = new THREE.Vector3(0, 0, state === STATES.movingBack ? 1 : -1);
                    direction.applyQuaternion(robot.quaternion);
                    const dist = state === STATES.movingFwdDecelerate ? movementDistance / 2 : movementDistance;
                    moveTarget.add(direction.multiplyScalar(dist));
                    break;

                case STATES.rotatingLeft:
                case STATES.rotatingRight:
                    rotationTarget = robot.quaternion.clone();
                    const rotation = new THREE.Quaternion();
                    rotation.setFromAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        (state === STATES.rotatingLeft ? 1 : -1) * Math.PI / 2
                    );
                    rotationTarget.multiply(rotation);
                    break;
            }
        }

        if (!isMovementComplete) {
            switch (state) {
                case STATES.movingFwd:
                case STATES.movingFwdDecelerate:
                case STATES.movingBack:
                    if (moveTarget) {
                        const toTarget = moveTarget.clone().sub(robot.position);
                        const distance = toTarget.length();

                        if (distance > speed * deltaTime) {
                            const moveDirection = toTarget.normalize();
                            const nextPosition = robot.position.clone().add(
                                moveDirection.multiplyScalar(speed * deltaTime)
                            );

                            if (!environmentSensor.checkBoundaryCollision(nextPosition)) {
                                robot.position.copy(nextPosition);
                                checkCollectibles();
                            } else {
                                isMovementComplete = true;
                                moveTarget = null;
                            }
                        } else {
                            if (!environmentSensor.checkBoundaryCollision(moveTarget)) {
                                robot.position.copy(moveTarget);
                                checkCollectibles();
                            }
                            isMovementComplete = true;
                            moveTarget = null;
                        }
                    }
                    break;

                case STATES.rotatingLeft:
                case STATES.rotatingRight:
                    if (rotationTarget) {
                        const currentAngle = robot.quaternion.angleTo(rotationTarget);
                        if (currentAngle > angularSpeed * deltaTime) {
                            robot.quaternion.slerp(rotationTarget, angularSpeed * deltaTime);
                        } else {
                            robot.quaternion.copy(rotationTarget);
                            isMovementComplete = true;
                            rotationTarget = null;
                        }
                    }
                    break;
            }
        }
    }
    
    // obstacle states
    else if (state === STATES.seeingObstacleAhead || 
            state === STATES.seeingObstacleProximal || 
            state === STATES.collisionDetected) {
        
        if (state === STATES.collisionDetected) {
            const backwardDirection = new THREE.Vector3(0, 0, 1);
            backwardDirection.applyQuaternion(robot.quaternion);
            const nextPosition = robot.position.clone().add(
                backwardDirection.multiplyScalar(speed * deltaTime)
            );
            
            if (!environmentSensor.checkBoundaryCollision(nextPosition)) {
                robot.position.copy(nextPosition);
            }
            isMovementComplete = true;
        } else {
            if (isMovementComplete) {
                isMovementComplete = false;
                // set rotation target only once when starting the movement
                let nearestObstacle = null;
                let minDistance = Infinity;
                
                scene.children.forEach(obj => {
                    if ((obj.userData.type === 'obstacle' || obj.userData.type === 'wall') && obj.visible) {
                        const distance = robot.position.distanceTo(obj.position);
                        if (distance < minDistance) {
                            minDistance = distance;
                            nearestObstacle = obj;
                        }
                    }
                });
                
                if (nearestObstacle) {
                    const toObstacle = nearestObstacle.position.clone().sub(robot.position);
                    const robotForward = new THREE.Vector3(0, 0, -1).applyQuaternion(robot.quaternion);
                    const rotationDirection = Math.sign(robotForward.cross(toObstacle).y);
                    
                    rotationTarget = robot.quaternion.clone();
                    const rotation = new THREE.Quaternion();
                    rotation.setFromAxisAngle(
                        new THREE.Vector3(0, 1, 0),
                        rotationDirection * Math.PI/2
                    );
                    rotationTarget.multiply(rotation);
                }
            }
            
            // rotation if we have a target
            if (rotationTarget) {
                const currentAngle = robot.quaternion.angleTo(rotationTarget);
                if (currentAngle > angularSpeed * deltaTime) {
                    robot.quaternion.slerp(rotationTarget, angularSpeed * deltaTime);
                } else {
                    robot.quaternion.copy(rotationTarget);
                    isMovementComplete = true;
                    rotationTarget = null;
                }
            } else {
                isMovementComplete = true;
            }
        }
    }
    
    // Handle orb collection states
    else if (state === STATES.seeingObjAhead || 
             state === STATES.seeingObjProximal || 
             state === STATES.collectingObj) {
        let nearestOrb = null;
        let minDistance = Infinity;
        
        scene.children.forEach(obj => {
            if (obj.userData.type === 'collectible' && obj.visible) {
                const distance = robot.position.distanceTo(obj.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestOrb = obj;
                }
            }
        });
        
        if (nearestOrb) {
            const direction = nearestOrb.position.clone().sub(robot.position).normalize();
            const nextPosition = robot.position.clone().add(
                direction.multiplyScalar(speed * deltaTime)
            );
        
            if (!environmentSensor.checkBoundaryCollision(nextPosition)) {
                robot.position.copy(nextPosition);
        
                if (robot.position.distanceTo(nearestOrb.position) < 1.0) {
                    nearestOrb.visible = false;
                    environmentSensor.collectedOrbs++;
                    currentState = STATES.collectingObjFinished;
                    isMovementComplete = true;
                }
            }
        }
    }
    
    // charging state
    else if (state === STATES.charging) {
        const chargingStation = scene.children.find(obj => obj.userData.type === 'chargingStation');
        if (chargingStation && robot.position.distanceTo(chargingStation.position) < 2.0) {
            energy = Math.min(100, energy + 0.2 * simulationSpeed);
        }
        isMovementComplete = true;
    }
    
    // energy drain
    if (state !== STATES.charging) {
        const energyDrain = {
            [STATES.movingFwd]: 0.05,
            [STATES.movingBack]: 0.05,
            [STATES.rotatingLeft]: 0.03,
            [STATES.rotatingRight]: 0.03,
            default: 0.02
        };
        energy = Math.max(0, energy - (energyDrain[state] || energyDrain.default) * simulationSpeed);
    }
    
    return isMovementComplete;
}

function getStateName(stateValue) {
    return Object.keys(STATES).find(key => STATES[key] === stateValue);
}

function animate(currentTime) {
    requestAnimationFrame(animate);
    controls.update();
    
    if (!isPaused && !isGameOver) {
        const deltaTime = (currentTime - lastUpdateTime) / 1000;
        const updateInterval = baseUpdateInterval / simulationSpeed;
        
        if (currentTime - lastUpdateTime >= updateInterval) {
            if (energy <= 0 && !isGameOver) {
                isGameOver = true;
                createEndScreen();
                return;
            }

            // check if the robot is in the middle of a collection
            if (currentState === STATES.collectingObj && !isMovementComplete) {
                // continue moving towards and collecting the object
                moveRobot(currentState, deltaTime, Math.PI / 2);
            } else if (isMovementComplete) {
                // detect new states only when the robot isn't collecting
                const detectedStates = environmentSensor.detectStates();
                const environmentState = solveCurStateConflict(detectedStates);
                
                // determine next state
                currentState = environmentState !== null ? environmentState : robotMarkovChain.newState(currentState).state;
            }

            if (!isGameOver) {
                moveRobot(currentState, deltaTime, Math.PI / 2);
            }

            // Update UI
            ui.updateState(getStateName(currentState));
            ui.updateEnergy(Math.round(energy));
            ui.updateProbabilities(matrix[currentState]);
            ui.updateOrbCount(environmentSensor.collectedOrbs);
            
            lastUpdateTime = currentTime;
        }
    }

    renderer.render(scene, camera);
}


lastUpdateTime = performance.now();
animate(lastUpdateTime);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        isPaused = !isPaused;
        if (!isPaused) {
            lastUpdateTime = performance.now();
        }
        const isPausedState = document.querySelector('button').innerHTML.includes('Play');
        if (isPausedState !== isPaused) {
            document.querySelector('button').click();
        }
    }
});