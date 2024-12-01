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
    constructor(transitionMatrix) {
        this.transitionMatrix = transitionMatrix;
        const compiled = this.#checkMatrixCompiles();
        if (!compiled.res) {
            throw new Error("Matrix sum error in row: " + compiled.row);
        }
    }

    newState(currentState) {
        let st = STATES.awaiting;
        console.log("Current state:", Object.keys(STATES).find(key => STATES[key] === currentState));
        const probabilities = this.transitionMatrix[currentState];
        console.log("Probabilities:", probabilities);
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

    #checkMatrixCompiles() {
        for (let i = 0; i < this.transitionMatrix.length; i++) {
            let sum = this.transitionMatrix[i].reduce((a, elem) => a + elem, 0);
            if (sum !== 1 && sum !== 0) {
                return { res: false, row: i };
            }
        }
        return { res: true, row: -1 };
    }

    angleSmall = Math.PI / 180;
    angle90 = Math.PI / 2;
    arrForAngle90 = [
        STATES.collisionDetected,
        STATES.seeingObstacleProximal,
        STATES.chargingFinished
    ];
}

const matrix = [
    [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // movingFwd
    [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // movingFwdDecelerate - MODIFIED
    [0.0, 0.0, 0.0, 0.4, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // movingBack
    [0.4, 0.0, 0.0, 0.4, 0.0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // rotatingLeft
    [0.4, 0.0, 0.0, 0.0, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // rotatingRight
    [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // awaiting
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // seeingObjAhead
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // seeingObjProximal
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // collectingObj
    [0.4, 0.0, 0.0, 0.2, 0.2, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // collectingObjFinished
    [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // collisionDetected
    [0.0, 0.4, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // seeingObstacleAhead
    [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // seeingObstacleProximal
    [0.4, 0.0, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // chargingNeeded
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],    // charging
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // chargingFinished
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],    // seeingChgStationAhead
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]     // seeingChgStationProximal
]
  

export { markovChain, STATES, matrix };