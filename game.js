import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const clock = new THREE.Clock();

// 1. ------------------
//   기본 환경 설정
// --------------------
// (이전과 동일: scene, camera, renderer, resize 리스너...)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);
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
// (이전과 동일: ground, gridHelper...)
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x888888);
scene.add(gridHelper);

// (★ 변경!) 플레이어 객체에서 회전 관련 변수 제거
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    model: null,
    
    // (동일) 점프 변수
    isJumping: false,
    jumpStartTime: 0,
    jumpHeight: 1.6 / 3.0,
    timeToPeak: 0.25,
    jumpDuration: 0.5,
    baseY: 0,
    
    // (동일) 쿨타임 변수
    isJumpCoolingDown: false,
    jumpCooldown: 0.2,
    jumpCooldownStartTime: 0,
    
    // (★ 삭제!) targetRotationY, currentRotationY 제거
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY;

// (이전과 동일: GLTFLoader 로직...)
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    clock.start();
    animate();
};
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load('player.glb', (gltf) => {
    player.model = gltf.scene;
    player.anchor.add(player.model);
}, undefined, (error) => {
    console.error('모델 로드 실패:', error);
    const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    player.model = new THREE.Mesh(geometry, material);
    player.model.position.y = 1.6 / 2;
    player.anchor.add(player.model);
});


// 3. ------------------
//   입력 및 게임 루프
// --------------------
// (이전과 동일: keysPressed, keydown/keyup 리스너, cameraOffset...)
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });
const cameraOffset = new THREE.Vector3(0, 3, 5);

// (★ 변경!) update 함수 내의 회전 로직 수정
function update() {
    
    // (동일) 쿨타임 확인
    if (player.isJumpCoolingDown) {
        if (clock.getElapsedTime() - player.jumpCooldownStartTime >= player.jumpCooldown) {
            player.isJumpCoolingDown = false;
        }
    }

    // (동일) 점프 입력
    if (keysPressed[' '] && !player.isJumping && !player.isJumpCoolingDown) {
        player.isJumping = true;
        player.jumpStartTime = clock.getElapsedTime();
    }

    // --- 3. 수평 이동 및 (★)모델 회전 ---
    let dx = 0; 
    let dz = 0; 
    let isMoving = false; // (★ 추가!) 이동 중인지 확인

    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;

    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) { // (이동 중일 때)
        isMoving = true;
        
        // 3-1. (동일) 목표 회전값(각도) 계산
        const targetRotation = Math.atan2(dx, dz);

        // 3-2. (동일) 실제 위치 이동
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;

        // 3-3. (★ 변경!) 최단 경로 회전 로직
        const currentRotation = player.anchor.rotation.y;
        
        // 현재 각도와 목표 각도의 차이를 계산
        let delta = targetRotation - currentRotation;

        // (★ 중요!) 차이가 180도(PI)보다 크면, 반대 방향(360도/2*PI 빼기)으로 감
        if (delta > Math.PI) {
            delta -= 2 * Math.PI;
        } 
        // (★ 중요!) 차이가 -180도(-PI)보다 작으면, 반대 방향(360도/2*PI 더하기)으로 감
        else if (delta < -Math.PI) {
            delta += 2 * Math.PI;
        }
        
        // '목표 각도'는 '현재 각도' + '최단 거리 차이'
        const newTargetRotation = currentRotation + delta;

        // (★ 변경!) anchor의 y축 회전값을 newTargetRotation으로 부드럽게 이동
        player.anchor.rotation.y = THREE.MathUtils.lerp(
            currentRotation,
            newTargetRotation,
            0.1 // 회전 속도
        );
    }
    
    // --- 4. 수직 이동 (점프) ---
    // (이전과 동일)
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
    }
    
    // --- 5. 카메라 추적 ---
    // (이전과 동일)
    const cameraTargetPosition = player.anchor.position.clone().add(cameraOffset);
    camera.position.copy(cameraTargetPosition);
    
    const lookAtTarget = player.anchor.position.clone();
    lookAtTarget.y += 1.0;
    camera.lookAt(lookAtTarget);
}

// (동일) 렌더링 루프
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
