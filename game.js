import * as THREE from 'three';
// (★ 추가!) 3D 모델 로더 import
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// (동일) 시계
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


// (★ 변경!) 플레이어 객체
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(), // (동일) 플레이어의 실제 위치 기준점
    model: null,                 // (★ 추가!) 3D 모델을 담을 변수
    
    // (동일) 점프 변수
    isJumping: false,
    jumpStartTime: 0,
    jumpHeight: 1.6 / 3.0, // (임시) 스케일 1.6 기준으로 계산
    timeToPeak: 0.25,
    jumpDuration: 0.5,
    baseY: 0,
    
    // (동일) 쿨타임 변수
    isJumpCoolingDown: false,
    jumpCooldown: 0.2,
    jumpCooldownStartTime: 0,
    
    // (★ 추가!) 부드러운 회전을 위한 변수
    targetRotationY: 0,          // 목표 Y축 회전값
    currentRotationY: 0          // 현재 Y축 회전값
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY;

// (★ 변경!) 3D 모델 로딩
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    clock.start();
    animate(); // 모든 로딩이 끝나면 게임 시작
};

// (★ 변경!) TextureLoader -> GLTFLoader
const gltfLoader = new GLTFLoader(loadingManager);

// (★ 중요!) 'player.glb' 파일을 로드합니다. (같은 폴더에 있어야 함)
gltfLoader.load('player.glb', (gltf) => {
    player.model = gltf.scene; // 로드된 모델의 'scene'을 player.model에 할당

    // (선택 사항) 모델 크기 및 초기 위치 조절
    // player.model.scale.set(0.5, 0.5, 0.5); // 모델이 너무 크면 조절
    
    // (중요) 모델의 발밑을 anchor(0,0,0)에 맞추기
    // 3D 모델은 보통 (0,0,0)을 중심으로 만드므로, y축으로 올려서 발밑을 맞춥니다.
    // 이는 모델마다 다를 수 있으므로 값을 조절해야 합니다.
    // player.model.position.y = 0.8; // (예시: 모델 키의 절반)
    
    player.anchor.add(player.model); // anchor에 모델을 자식으로 추가
    
    // (★ 변경!) 점프 높이를 모델 크기에 맞게 재설정 (선택 사항)
    // const box = new THREE.Box3().setFromObject(player.model);
    // const height = box.max.y - box.min.y;
    // player.jumpHeight = height / 3.0;

}, undefined, (error) => {
    console.error('An error happened while loading the model:', error);
    // (★ 에러 처리) .glb 로드 실패 시, 임시 큐브로 대체
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
window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

const cameraOffset = new THREE.Vector3(0, 3, 5);


// (★ 변경!) update 함수
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

    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;

    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) { // (이동 중일 때)
        // 3-1. (★ 변경!) 텍스처 교체 대신, 목표 회전값(각도) 계산
        // Math.atan2(dx, dz)를 사용해 x, z 방향에 맞는 Y축 각도를 구합니다.
        player.targetRotationY = Math.atan2(dx, dz);

        // 3-2. (동일) 실제 위치 이동
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
    }
    
    // (★ 추가!) 부드러운 회전 (Lerp)
    // 현재 각도에서 목표 각도로 10%씩 부드럽게 회전
    // (참고: -PI와 +PI를 넘나들 때 순간적으로 반대 방향으로 돌 수 있음)
    // (더 완벽하게 하려면 Quaternion.slerp를 써야 하지만, 지금은 lerp로 구현)
    player.currentRotationY = THREE.MathUtils.lerp(
        player.currentRotationY, 
        player.targetRotationY, 
        0.1 // 회전 속도 (0.1 = 10%)
    );
    player.anchor.rotation.y = player.currentRotationY;


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
