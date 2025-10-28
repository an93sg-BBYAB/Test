import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// (★ 추가!) 노이즈 라이브러리 import
import { createNoise2D } from 'simplex-noise';

const clock = new THREE.Clock();

// (★ 추가!) 캐릭터 발밑을 감지할 Raycaster
const raycaster = new THREE.Raycaster();
const rayOriginOffset = new THREE.Vector3(0, 10, 0); // 캐릭터 머리 위 10칸
const rayDirection = new THREE.Vector3(0, -1, 0);   // 아래 방향

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

// (★ 변경!) 바닥 (Ground)
// (100x100 크기, 50x50 격자로 잘게 나눔)
const groundGeometry = new THREE.PlaneGeometry(100, 100, 50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x444444,
    wireframe: false // true로 바꾸면 지형의 격자(요철)를 볼 수 있습니다.
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (★ 추가!) 노이즈 생성기
const noise2D = createNoise2D();

// (★ 추가!) 지형 울퉁불퉁하게 만들기
const vertices = ground.geometry.attributes.position;
for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i);
    const z = vertices.getZ(i);
    
    // (중요!) 노이즈 값 계산
    // 0.05: 지형의 '규모' (숫자가 작을수록 언덕이 큼)
    // 2: 지형의 '높이' (숫자가 클수록 높낮이 차가 큼)
    const y = noise2D(x * 0.05, z * 0.05) * 2; 
    
    vertices.setY(i, y); // 꼭짓점의 Y값 변경
}
// (중요!) 지오메트리 업데이트
vertices.needsUpdate = true;
ground.geometry.computeVertexNormals(); // 조명을 올바르게 받기 위해 법선 재계산

// (★ 삭제!) GridHelper는 평면(y=0)이라 요철과 겹쳐서 지저분해 보임
// scene.remove(gridHelper); // 이전 코드에 있다면 삭제
// 대신 groundMaterial의 wireframe: true로 지형을 보세요.

// (★ 추가!) 간단한 조명 (요철이 잘 보이도록)
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 10, 5);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// (이전과 동일: Player 객체 정의)
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    model: null,
    isJumping: false,
    jumpStartTime: 0,
    jumpHeight: 1.6 / 3.0,
    timeToPeak: 0.25,
    jumpDuration: 0.5,
    baseY: 0, // (중요!) 이 값을 Raycaster가 매 프레임 덮어쓸 예정
    isJumpCoolingDown: false,
    jumpCooldown: 0.2,
    jumpCooldownStartTime: 0,
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


// (★ 변경!) update 함수 순서 및 Raycaster 로직 추가
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

    // --- 3. 수평 이동 및 모델 회전 ---
    // (이전과 동일: dx, dz, magnitude, targetRotation, lerp...)
    let dx = 0; 
    let dz = 0; 
    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;
    const magnitude = Math.sqrt(dx * dx + dz * dz);
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
    
    // (★ 추가!) --- 4. 지형 높이 감지 (Raycasting) ---
    // (중요!) 점프 로직 *전에* 실행되어야 함
    
    // 1. Raycaster 위치 설정 (캐릭터의 현재 x, z, 그리고 머리 위)
    const rayOrigin = player.anchor.position.clone().add(rayOriginOffset);
    raycaster.set(rayOrigin, rayDirection);
    
    // 2. 광선 발사 및 충돌 감지 (바닥만 감지)
    const intersects = raycaster.intersectObject(ground);
    
    // 3. 충돌 지점의 y값을 player.baseY에 저장
    if (intersects.length > 0) {
        player.baseY = intersects[0].point.y;
    }

    // --- 5. 수직 이동 (점프) ---
    // (이전과 동일, 하지만 player.baseY가 매번 바뀜)
    if (player.isJumping) {
        const jumpTime = clock.getElapsedTime() - player.jumpStartTime;
        if (jumpTime >= player.jumpDuration) {
            player.isJumping = false;
            player.anchor.position.y = player.baseY; // (중요!) 착지 지점이 지형 높이
            player.isJumpCoolingDown = true;
            player.jumpCooldownStartTime = clock.getElapsedTime();
        } else {
            const a = player.jumpHeight / (player.timeToPeak * player.timeToPeak);
            const t = jumpTime - player.timeToPeak;
            const newY = -a * (t * t) + player.jumpHeight;
            player.anchor.position.y = player.baseY + newY; // (중요!) 지형 높이 + 점프 높이
        }
    } else {
        // (★ 추가!) 점프 중이 아닐 때는, 캐릭터를 지형 높이에 붙임
        player.anchor.position.y = player.baseY;
    }
    
    // --- 6. 카메라 추적 ---
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
