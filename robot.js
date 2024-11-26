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
