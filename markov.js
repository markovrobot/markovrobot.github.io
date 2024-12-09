// markov.js implements Markov chain for a robot that collects objects

export const STATES = Object.freeze({
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

export class MarkovChain {
    constructor(transitionMatrix) {
        this.transitionMatrix = transitionMatrix;
        const compiled = this.#checkMatrixCompiles();
        if (!compiled.res) {
            throw new Error(`Matrix sum error in row: ${compiled.row}`);
        }
        this.lastStateChangeTime = performance.now();
        this.stateTimeoutDuration = 2000; // Maximum time in a state before forcing a change
    }

    newState(currentState) {
        const currentTime = performance.now();
        const probabilities = this.transitionMatrix[currentState];
        if (!probabilities) {
            throw new Error(`Invalid current state: ${currentState}. No transition probabilities found.`);
        }

        const rand = Math.random();
        let cumulativeProbability = 0;

        // If stuck too long in the same state, try to break out
        if (currentTime - this.lastStateChangeTime > this.stateTimeoutDuration) {
            this.lastStateChangeTime = currentTime;
            // If awaiting is possible, force a switch to it
            if (probabilities[STATES.awaiting] > 0) {
                console.log(`State timeout reached. Forcing 'awaiting' from ${this.getStateName(currentState)}`);
                return {
                    state: STATES.awaiting,
                    angularSpeed: Math.PI / 90, // Adjusted to larger rotation angle
                };
            }
        }

        for (let i = 0; i < probabilities.length; i++) {
            cumulativeProbability += probabilities[i];
            if (rand < cumulativeProbability) {
                if (i !== currentState) {
                    this.lastStateChangeTime = currentTime;
                }
                console.log(
                    `Markov Chain selected state: ${this.getStateName(i)} (from ${this.getStateName(currentState)})`
                );
                return { state: i, angularSpeed: Math.PI / 60 }; // Adjusted to larger rotation angle
            }
        }

        // Fallback, should never happen if rows sum to 1
        console.log(`Markov Chain fallback: staying in ${this.getStateName(currentState)}`);
        return { state: currentState, angularSpeed: Math.PI / 90 }; // Adjusted to larger rotation angle
    }

    getStateName(stateValue) {
        return Object.keys(STATES).find((key) => STATES[key] === stateValue) || "unknown";
    }

    #checkMatrixCompiles() {
        const numStates = Object.keys(STATES).length;
        if (this.transitionMatrix.length !== numStates) {
            throw new Error(`Transition matrix must have ${numStates} rows`);
        }

        for (let i = 0; i < this.transitionMatrix.length; i++) {
            const row = this.transitionMatrix[i];
            if (row.length !== numStates) {
                throw new Error(`Each row of the transition matrix must have ${numStates} columns`);
            }
            const sum = row.reduce((a, elem) => a + elem, 0);
            if (sum !== 0 && Math.abs(sum - 1) > 0.0001) {
                return { res: false, row: i };
            }
        }
        return { res: true, row: -1 };
    }
}


// Example transition matrix
export const matrix = [
    [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 0: movingFwd
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 1: movingFwdDecelerate
    [0.0, 0.0, 0.0, 0.4, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 2: movingBack
    [0.4, 0.0, 0.0, 0.4, 0.0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 3: rotatingLeft
    [0.4, 0.0, 0.0, 0.0, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 4: rotatingRight
    [0.8, 0.0, 0.0, 0.1, 0.1, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 5: awaiting
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 6: seeingObjAhead
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 7: seeingObjProximal
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 8: collectingObj
    [0.4, 0.0, 0.0, 0.2, 0.2, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 9: collectingObjFinished
    [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 10: collisionDetected
    [0.0, 0.4, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 11: seeingObstacleAhead
    [0.0, 0.0, 0.2, 0.4, 0.4, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 12: seeingObstacleProximal
    [0.4, 0.0, 0.0, 0.3, 0.3, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 13: chargingNeeded
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // 14: charging
    [0.0, 0.0, 0.0, 0.5, 0.5, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 15: chargingFinished
    [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // 16: seeingChgStationAhead
    [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], // 17: seeingChgStationProximal
];
