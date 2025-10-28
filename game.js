import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createNoise2D } from 'simplex-noise';

// (동일) clock, raycaster
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const rayOriginOffset = new THREE.Vector3(0, 10, 0); 
const rayDirection = new THREE.Vector3(0, -1, 0);   

// (★ 추가!) 좌표 표시 엘리먼트
const coordsElement = document.getElementById('coords');

// 1. ------------------
//   기본 환경 설정
// --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF); // (동일) 하얀색 배경

// (동일) camera, renderer
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

// (★ 변경!) 바닥 재질: 짙은 회색
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x444444, // 짙은 회색
    wireframe: false
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (★ 변경!) 바닥 격자 테두리 (Z-fighting 해결)
const wireframeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFF00, // 노란색
    wireframe: true,
    
    // (★ 추가!) Z-fighting 해결을 위한 옵션
    polygonOffset: true,
    polygonOffsetFactor: -1.0,
    polygonOffsetUnits: -0.1
});
const groundWireframe = new THREE.Mesh(groundGeometry, wireframeMaterial);
groundWireframe.rotation.x = -Math.PI / 2;
scene.add(groundWireframe);


// (동일) 노이즈 지형 생성
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

// (동일) 조명
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(5, 10, 5);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x888888);
scene.add(ambientLight);

// (동일) Player 객체 정의
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    model: null,
    isJumping: false,
    jumpStartTime: 0,
    jumpHeight: 1.6 / 3.0, 
    timeToPeak: 0.25,
    jumpDuration: 0.5,
    baseY: 0, 
    isJumpCoolingDown: false,
    jumpCooldown: 0.2,
    jumpCooldownStartTime: 0,
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY;

// (동일) 로딩 매니저
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    clock.start();
    animate();
};

// (★ 변경!) GLTFLoader 로직 (모델 발밑 맞추기)
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
    'player.glb', 
    (gltf) => {
        player.model = gltf.scene;
        // (★ FIX!) 모델 로드 성공 시, 발밑 위치 조절
        player.model.position.y = 1.6 / 2; // (가정) 모델 키의 절반
        player.anchor.add(player.model);
    }, 
    undefined, 
    (error) => {
        // (동일) 로드 실패 시 빨간 큐브
        console.error('모델 로드 실패:', error);
        const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        player.model = new THREE.Mesh(geometry, material);
        player.model.position.y = 1.6 / 2;
        player.anchor.add(player.model);
    }
);

// (동일) 입력 리스너
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });
const cameraOffset = new THREE.Vector3(0, 3, 5);

// (동일) update 함수
function update() {
    
    // (쿨타임)
    if (player.isJumpCoolingDown) {
        if (clock.getElapsedTime() - player.jumpCooldownStartTime >= player.jumpCooldown) {
            player.isJumpCoolingDown = false;
        }
    }

    // (점프 입력)
    if (keysPressed[' '] && !player.isJumping && !player.isJumpCoolingDown) {
        player.isJumping = true;
        player.jumpStartTime = clock.getElapsedTime();
    }

    // (이동 및 회전)
    let dx = 0; 
    let dz = 0; 
    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;
    const magnitude = Math.sqrt(dx * dz + dx * dx); // (오타 수정: dz*dz)
    if (magnitude > 0) {
        const targetRotation = Math.atan2(dx, dz);
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
        
        const currentRotation = player.anchor.rotation.y;
        let delta = targetRotation - currentRotation;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        else if (delta < -Math.PI) delta += 2 * Math.PI;
        const newTargetRotation = currentRotation + delta;
        player.anchor.rotation.y = THREE.MathUtils.lerp(currentRotation, newTargetRotation, 0.1);
    }
    
    // (지형 감지)
    // (★ 변경!) Raycaster가 Z-fighting과 상관없이 회색 바닥(ground)만 감지하도록 수정
    const rayOrigin = player.anchor.position.clone().add(rayOriginOffset);
    raycaster.set(rayOrigin, rayDirection);
    const intersects = raycaster.intersectObject(ground); // groundWireframe 제거
    
    if (intersects.length > 0) {
        player.baseY = intersects[0].point.y;
    }

    // (점프)
    if (player.isJumping) {
        const jumpTime = clock.getElapsedTime() - player.jumpStartTime;
        if (jumpTime >= player.jumpDuration) {
            player.isJumping = false;
            player.anchor.position.y = player.baseY;
            player.isJumpCoolingDown = true;
            player.jumpCooldownStartTime = clock.getElapsedTime();
        } else {
            const a = player.jumpHeight / (player.timeToPeak * player.timeToPeak);
            const t = jumpTime - player.timeToPeak;
            const newY = -a * (t * t) + player.jumpHeight;
            player.anchor.position.y = player.baseY + newY;
        }
    } else {
        // (★ 중요!) 점프 중이 아닐 때, 캐릭터 Y위치를 지형 높이로 설정
        player.anchor.position.y = player.baseY;
    }
    
    // (카메라)
    const cameraTargetPosition = player.anchor.position.clone().add(cameraOffset);
    camera.position.copy(cameraTargetPosition);
    
    const lookAtTarget = player.anchor.position.clone();
    lookAtTarget.y += 1.0;
    camera.lookAt(lookAtTarget);
}

// (★ 변경!) 렌더링 루프 (좌표 업데이트 추가)
function animate() {
    requestAnimationFrame(animate);
    
    // (동일) 로직 업데이트
    update();
    
    // (★ 추가!) 좌표 UI 업데이트
    const pos = player.anchor.position;
    coordsElement.innerText = `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
    
    // (동일) 렌더링
    renderer.render(scene, camera);
}
