import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createNoise2D } from 'simplex-noise';

// (이전과 동일: clock, raycaster...)
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const rayOriginOffset = new THREE.Vector3(0, 10, 0); 
const rayDirection = new THREE.Vector3(0, -1, 0);   

// 1. ------------------
//   기본 환경 설정
// --------------------

const scene = new THREE.Scene();
// (★ 변경!) 배경색: 하얀색
scene.background = new THREE.Color(0xFFFFFF); 

// (이전과 동일: camera, renderer, resize 리스너...)
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(0, 3, 5);
camera.lookAt(0, 1, 0);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


// 2. ------------------
//   게임 객체 생성
// --------------------

// (동일) 바닥 지오메트리 (50x50 격자)
const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

// (★ 변경!) 바닥 재질: 조금 어두운 회색
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x666666, // 어두운 회색
    wireframe: false // 면을 채움
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (★ 추가!) 바닥 격자 테두리 (노란색 와이어프레임)
// 1. 노란색 와이어프레임 재질 생성
const wireframeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFF00, // 노란색
    wireframe: true 
});
// 2. 바닥과 *같은* 지오메트리를 사용하는 새 메쉬 생성
const groundWireframe = new THREE.Mesh(groundGeometry, wireframeMaterial);
// 3. 바닥과 *같은* 회전값 적용
groundWireframe.rotation.x = -Math.PI / 2;
// 4. 장면에 추가 (회색 바닥 위에 겹쳐짐)
scene.add(groundWireframe);


// (이전과 동일: 노이즈 생성 및 지형 변형 로직...)
const noise2D = createNoise2D();
const vertices = ground.geometry.attributes.position;
for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    const y = noise2D(x * 0.05, z * 0.05) * 2; 
    vertices.setY(i, y); 
}
vertices.needsUpdate = true;
ground.geometry.computeVertexNormals(); 

// (이전과 동일: 조
