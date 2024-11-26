// markov.js implements Markov chain for a robot that collects objects

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
  seeingChgStationProximal: 17
});

class markovChain {

  /**
  * @param {number[][]} transitionMatrix
  * @returns {void}
  */
  constructor(transitionMatrix) {
    this.transitionMatrix = transitionMatrix;
    const compiled = this.#checkMatrixCompiles();
    if (!compiled.res) {
      throw new Error("Matrix sum error in row: " + compiled.row);
    }
  }

  /**
  * @param {number} currentState
  * @returns {{state: number, angularSpeed: number}}
  */
  newState(currentState) {
    let st = STATES.awaiting;
    const probabilities = this.transitionMatrix[currentState];
    const rand = Math.random();
    let cumulativeProbability = 0;
    for (let i = 0; i < probabilities.length; i++) {
      cumulativeProbability += probabilities[i];
      if (rand < cumulativeProbability) {
        st = i;
        break;
      }
    }
    let a = 0;
    if (probabilities[STATES.rotatingLeft] > 0 || probabilities[STATES.rotatingRight] > 0) {
      a = this.angleSmall;
    }
    if (this.arrForAngle90.includes(currentState)) {
      a = this.angle90;
    }
    return { state: st, angularSpeed: a };
  }

  /**
  * @param {number[]} states
  * @returns {number}
  */
  solveCurStateConflict(states) {
    if (!states) {
      return states.awaiting;
    }

    const oneStates = [
      STATES.collisionDetected,
      STATES.seeingObjAhead,
      STATES.seeingObjProximal,
      STATES.collectingObj,
      STATES.collectingObjFinished,
      STATES.seeingObstacleAhead,
      STATES.seeingObstacleProximal,
      STATES.seeingChgStationProximal
    ]
    for (let st of oneStates) {
      if (states.includes(st)) {
        return st;
      }
    }

    const chargingNeeded = states.includes(STATES.chargingNeeded);
    if (states.includes(STATES.seeingChgStationAhead) && chargingNeeded) {
      return STATES.seeingChgStationAhead;
    } else if (!states.includes(STATES.seeingChgStationAhead) && chargingNeeded) {
      return STATES.chargingNeeded;
    } else if (states.includes(STATES.seeingChgStationAhead) && !chargingNeeded) {
      for (st of states) {
        if (st != STATES.seeingChgStationAhead) {
          return st;
        }
      }
      return STATES.chargingFinished;
    } else {
      return states[0];
    }
  }

  angleSmall = Math.PI / 180;
  angle90 = Math.PI / 2;
  arrForAngle90 = [
    STATES.collisionDetected,
    STATES.seeingObstacleProximal,
    STATES.chargingFinished];

  #checkMatrixCompiles() {
    for (let i = 0; i < this.transitionMatrix.length; i++) {
      let sum = this.transitionMatrix[i].reduce((a, elem) => a + elem, 0);
      if (sum != 1 && sum != 0) {
        return { res: false, row: i };
      }
    }
    return { res: true, row: -1 };
  }

}

const matrix = [
  [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.4, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.4, 0.0, 0.0, 0.4, 0.0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.4, 0.0, 0.0, 0.0, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.4, 0.0, 0.0, 0.2, 0.2, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.4, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.4, 0.0, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]
]

export {markovChain, STATES, matrix};
