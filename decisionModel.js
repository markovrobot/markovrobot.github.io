// decisionModel.js
const STATES = Object.freeze({
  movingFwd: 0,
  movingFwdDecelerate: 1,
  movingBack: 2,
  rotatingLeft: 3,
  rotatingRight: 4,
  awaiting: 5,
  seeingObjAhead: 6,
  seeingObjProximal: 7,
  collectingObj: 8,
  collectingObjFinished: 9,
  collisionDetected: 10,
  seeingObstacleAhead: 11,
  seeingObstacleProximal: 12,
  chargingNeeded: 13,
  charging: 14,
  chargingFinished: 15,
  seeingChgStationAhead: 16,
  seeingChgStationProximal: 17,
});

class DecisionModel {
  constructor() {
    this.currentState = STATES.awaiting;
  }

  /**
   * Resolve conflicting states based on predefined prioritie.
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
   * Decide the next state based on current state and sensory input.
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

export default DecisionModel;
