export function getRandomPosition(boundary) {
  return {
    x: Math.random() * boundary.width - boundary.width / 2,
    y: 0, // Assuming a flat 2D plane.
    z: Math.random() * boundary.height - boundary.height / 2,
  };
}

export function randomizeObjects(objectCount, boundary) {
  const positions = [];
  for (let i = 0; i < objectCount; i++) {
    positions.push(getRandomPosition(boundary));
  }
  return positions;
}
