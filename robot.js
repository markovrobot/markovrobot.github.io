import * as THREE from 'three';

export function createRobot() {
    // robot Body
    const robotBodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 32);
    const robotBodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        roughness: 0.7,
        metalness: 0.3 
    });
    const robotBody = new THREE.Mesh(robotBodyGeometry, robotBodyMaterial);
    robotBody.position.y = 1;
    robotBody.castShadow = true;

    // robot head
    const robotHeadGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const robotHeadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffa500,
        roughness: 0.7,
        metalness: 0.3 
    });
    const robotHead = new THREE.Mesh(robotHeadGeometry, robotHeadMaterial);
    robotHead.position.set(0, 1.75, 0);
    robotHead.castShadow = true;
    robotBody.add(robotHead);

    // robot arms
    const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 16);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0000ff,
        roughness: 0.7,
        metalness: 0.3 
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.75, 1, 0);
    leftArm.rotation.z = Math.PI / 4;
    leftArm.castShadow = true;
    robotBody.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.75, 1, 0);
    rightArm.rotation.z = -Math.PI / 4;
    rightArm.castShadow = true;
    robotBody.add(rightArm);

    return robotBody;
}