import * as THREE from './node_modules/three/build/three.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';
import { createEnvironment } from './environment.js';
import { createRobot } from './robot.js';
import { MarkovChain, STATES, matrix } from './markov.js';
import { RobotUI } from './ui.js';
import { RobotController, checkStateTransitions } from './utils.js';

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

// Lighting setup
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Environment and robot
createEnvironment(scene);
const robot = createRobot();
robot.position.set(0, 1, 0);
scene.add(robot);

const robotController = new RobotController(scene, robot);
const robotMarkovChain = new MarkovChain(matrix);

// Simulation control variables
let isPaused = false;
let simulationSpeed = 1;
let lastUpdateTime = performance.now();
let lastStateUpdateTime = performance.now();
let currentState = STATES.awaiting;
let energy = 100;
let isGameOver = false;

// State priority definition
const statePriority = [
    STATES.collisionDetected,
    STATES.collectingObj,
    STATES.seeingObjProximal,
    STATES.seeingObstacleProximal,
    STATES.seeingObjAhead,
    STATES.seeingObstacleAhead,
];

// Initialize UI
const ui = new RobotUI(
    () => {
        isPaused = !isPaused;
        if (!isPaused) lastUpdateTime = performance.now();
    },
    (speed) => (simulationSpeed = speed)
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
        <p>Orbs Collected: ${robotController.collectedOrbs}</p>
        <button onclick="location.reload()" 
                style="padding: 10px 20px; margin-top: 10px; cursor: pointer; 
                       background: #4CAF50; border: none; color: white; border-radius: 5px;">
            Restart
        </button>
    `;

    document.body.appendChild(endScreen);
}

function animate(currentTime) {
    requestAnimationFrame(animate);
    controls.update();

    if (!isPaused && !isGameOver) {
        const deltaTime = Math.min((currentTime - lastUpdateTime) / 1000, 0.1);
        const stateUpdateDelta = currentTime - lastStateUpdateTime;

        const detectedStates = robotController.detectStates(currentTime);
        let environmentOverride = false;

        // Handle state priorities when states are detected
        if (detectedStates && detectedStates.length > 0) {
            for (const state of statePriority) {
                if (detectedStates.includes(state)) {
                    currentState = state;
                    environmentOverride = true;
                    break;
                }
            }
        }

        // If no environment override, use Markov chain after interval
        if (!environmentOverride && stateUpdateDelta >= 100) {
            const nextStateData = robotMarkovChain.newState(currentState);
            currentState = nextStateData.state;
            lastStateUpdateTime = currentTime;
            checkStateTransitions(currentState, matrix);
        }

        // Execute movement and get resulting state
        const resultState = robotController.moveRobot(currentState, deltaTime * simulationSpeed);
        if (resultState !== currentState) {
            currentState = resultState;
            if (!statePriority.includes(currentState)) {
                const nextStateData = robotMarkovChain.newState(currentState);
                currentState = nextStateData.state;
            }
        }

        // Energy management
        if (currentState !== STATES.charging) {
            energy = Math.max(0, energy - 0.5 * deltaTime * simulationSpeed);
            if (energy <= 0 && !isGameOver) {
                isGameOver = true;
                createEndScreen();
            }
        }

        // Update UI
        ui.updateState(Object.keys(STATES)[currentState]);
        ui.updateEnergy(Math.round(energy));
        ui.updateProbabilities(matrix[currentState]);
        ui.updateOrbCount(robotController.collectedOrbs);

        lastUpdateTime = currentTime;
    }

    renderer.render(scene, camera);
}

// Initialize animation
lastUpdateTime = performance.now();
lastStateUpdateTime = performance.now();
animate(lastUpdateTime);

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Pause functionality on spacebar
window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        isPaused = !isPaused;
        if (!isPaused) lastUpdateTime = performance.now();
        const isPausedState = document.querySelector('button').innerHTML.includes('Play');
        if (isPausedState !== isPaused) {
            document.querySelector('button').click();
        }
    }
});
