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
// (★ 변경!) 배경색을 어두운 파란색(하늘)으로 변경 (0x111122)
scene.background = new THREE.Color(0x111122); 

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

// (동일) 바닥 지오메트리
const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);

// (★ 변경!) 바닥 재질의 색을 밝은 회색(0x888888)으로 변경
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888, // 밝은 회색
    wireframe: false 
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

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

// (이전과 동일: 조명...)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// (이전과 동일: Player 객체 정의...)
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    model: null,
    isJumping: false,
