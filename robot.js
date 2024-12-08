import { markovChain, STATES, matrix } from "./markov.js";

class robot {
  constructor(name, speed, batterySize) { }
  batteryLevel = 100;
  currentStates = {};
  seeing = {};
  inProximity = {};
  getCurrentStates() { }
  yRotate() { }
}

try {
  const mc = new markovChain(matrix);
  let arr = Array(matrix.length).fill(0);
  for (let i = 0; i < 1000; i++) {
    let x = mc.newState(STATES.movingFwd);
    arr[x.state]++;
  }
  console.log(arr);
} catch (error) {
  console.error(error.message);
}

// --- Alternative Decision-Making Block ---

class DecisionModel {
  /**
   * Resolves conflicting states based on predefined priorities.
   * @param {number[]} states - Array of detected states.
   * @returns {number} - The resolved state.
   */
  resolveStateConflict(states) {
    const PRIORITY = {
      [STATES.chargingNeeded]: 1,
      [STATES.seeingChgStationAhead]: 2,
      [STATES.seeingObstacleAhead]: 3,
      [STATES.collectingObj]: 4,
      [STATES.movingFwd]: 5,
    };

    // Sort states by priority and return the highest priority state.
    return states.sort((a, b) => PRIORITY[a] - PRIORITY[b])[0];
  }

  /**
   * Decides the next state based on current state and sensory input.
   * @param {number} currentState - The robot's current state.
   * @param {number[]} sensoryStates - States reported by sensors.
   * @returns {{ state: number, angularSpeed: number }} - The next state and angular speed.
   */
  getNextState(currentState, sensoryStates) {
    // Resolve conflicts among sensory states.
    const resolvedState = this.resolveStateConflict(sensoryStates);

    // Decision logic for next state.
    switch (resolvedState) {
      case STATES.awaiting:
        return { state: STATES.movingFwd, angularSpeed: 0 }; // Start moving if idle.

      case STATES.movingFwd:
        if (sensoryStates.includes(STATES.seeingObjAhead)) {
          return { state: STATES.collectingObj, angularSpeed: 0 };
        }
        return { state: STATES.movingFwd, angularSpeed: 0 };

      case STATES.chargingNeeded:
        return { state: STATES.rotatingLeft, angularSpeed: Math.PI / 8 }; // Rotate to find station.

      case STATES.seeingChgStationAhead:
        return { state: STATES.movingFwdDecelerate, angularSpeed: 0 }; // Approach the station.

      default:
        return { state: resolvedState, angularSpeed: 0 }; // Default action.
    }
  }
}
