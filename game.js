import * as THREE from 'three';

// (★ 추가!) 점프 시간을 정확히 재기 위한 시계
const clock = new THREE.Clock();

// 1. ------------------
//   기본 환경 설정
// --------------------

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

// (동일) 바닥
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x888888);
scene.add(gridHelper);

// (★ 변경!) 플레이어 객체에 점프 관련 변수 추가
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    sprite: null,
    
    // --- 점프 상태 변수 ---
    isJumping: false,     // 현재 점프 중인가?
    jumpStartTime: 0,     // 점프 시작 시간
    jumpHeight: 4,        // 점프 최고 높이 (조절 가능)
    timeToPeak: 0.25,     // 최고점 도달 시간 (요청사항: 0.25초)
    jumpDuration: 0.5,    // 총 점프 시간 (요청사항: 0.25 + 0.25 = 0.5초)
    baseY: 0              // 바닥의 Y 위치
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY; // 초기 Y 위치 설정

// (동일) 텍스처 로더
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('player.png', () => {
    // (★ 변경!) 이미지가 로드되면 시계를 시작하고 루프 실행
    clock.start();
    animate();
});

// (동일) 스프라이트 설정
const playerMaterial = new THREE.SpriteMaterial({ map: playerTexture, sizeAttenuation: true });
player.sprite = new THREE.Sprite(playerMaterial);
player.sprite.scale.set(1, 1.6, 1);
player.sprite.position.y = player.sprite.scale.y / 2; // 발밑
player.anchor.add(player.sprite);


// 3. ------------------
//   입력 및 게임 루프
// --------------------

const keysPressed = {};
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = true;

    // (★ 추가!) 스페이스바 점프 트리거
    if (key === ' ' && !player.isJumping) {
        player.isJumping = true;
        // (★ 추가!) 현재 시간을 점프 시작 시간으로 기록
        player.jumpStartTime = clock.getElapsedTime();
    }
});
window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

const cameraOffset = new THREE.Vector3(0, 3, 5);

// (★ 변경!) update 함수에서 점프 로직 처리
function update() {
    // (제3서 적용: 'think about it step-by-step' - 점프/이동 로직)
    
    // --- 1. 수평 이동 (WASD) ---
    // (★ 중요!) 이 로직은 점프 여부와 관계없이 항상 실행됩니다.
    // 이것이 '공중 이동(Air Control)'을 구현하는 방법입니다.
    let dx = 0; 
    let dz = 0; 

    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;

    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;

        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
    }

    // --- 2. 수직 이동 (점프) ---
    if (player.isJumping) {
        // 2-1. 점프 시작 후 경과 시간
        const jumpTime = clock.getElapsedTime() - player.jumpStartTime;

        // 2-2. 점프 종료 (총 점프 시간 0.5초 경과)
        if (jumpTime >= player.jumpDuration) {
            player.isJumping = false;
            player.anchor.position.y = player.baseY; // 정확히 바닥에 착지
        } else {
            // 2-3. 포물선 계산 (요청사항: 0.25초에 최고점)
            // y = -a * (t - h)^2 + k
            // (h, k) = 정점 (0.25, jumpHeight)
            // t = jumpTime
            // a = jumpHeight / (timeToPeak)^2 
            //   = jumpHeight / (0.25 * 0.25) = jumpHeight / 0.0625 = 16 * jumpHeight
            
            const a = player.jumpHeight / (player.timeToPeak * player.timeToPeak);
            const t = jumpTime - player.timeToPeak;
            const newY = -a * (t * t) + player.jumpHeight;

            player.anchor.position.y = player.baseY + newY;
        }
    }
    
    // --- 3. 카메라 추적 ---
    const cameraTargetPosition = player.anchor.position.clone().add(cameraOffset);
    camera.position.copy(cameraTargetPosition);
    
    const lookAtTarget = player.anchor.position.clone();
    lookAtTarget.y += 1.0; // 플레이어 몸통 바라보기
    camera.lookAt(lookAtTarget);
}

// (동일) 렌더링 루프
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
