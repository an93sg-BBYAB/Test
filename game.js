import * as THREE from 'three';

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


// (★ 변경!) 스프라이트의 스케일을 별도 변수로 먼저 정의합니다.
const playerScale = new THREE.Vector3(1, 1.6, 1);

// (★ 변경!) 플레이어 객체
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    sprite: null,
    
    isJumping: false,
    jumpStartTime: 0,
    
    // (★ 중요!) 점프 최대 높이를 player.png 세로 길이(scale.y)의 1/3로 설정
    jumpHeight: playerScale.y / 3.0, // (예: 1.6 / 3.0 = 약 0.533)
    
    timeToPeak: 0.25,     // (동일) 0.25초
    jumpDuration: 0.5,    // (동일) 0.5초
    baseY: 0
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY;

// (동일) 텍스처 로더
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('player.png', () => {
    clock.start();
    animate();
});

// (★ 변경!) 스프라이트 설정
const playerMaterial = new THREE.SpriteMaterial({ map: playerTexture, sizeAttenuation: true });
player.sprite = new THREE.Sprite(playerMaterial);
// (★ 변경!) 위에서 정의한 playerScale을 적용
player.sprite.scale.copy(playerScale); 
// (★ 변경!) 발밑 위치도 playerScale.y를 사용
player.sprite.position.y = playerScale.y / 2; 
// (동일) 앵커에 스프라이트를 자식으로 추가
player.anchor.add(player.sprite);


// 3. ------------------
//   입력 및 게임 루프
// --------------------
// (이전과 동일: keysPressed, keydown/keyup 리스너, cameraOffset...)

const keysPressed = {};
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keysPressed[key] = true;

    // (동일) 스페이스바 점프 트리거
    if (key === ' ' && !player.isJumping) {
        player.isJumping = true;
        player.jumpStartTime = clock.getElapsedTime();
    }
});
window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

const cameraOffset = new THREE.Vector3(0, 3, 5);


// (★ 중요!) update 함수는 이전과 *동일합니다.*
// `jumpHeight` 값만 바뀌었을 뿐, 점프 계산 로직은 이미 완벽하게 작동하고 있었습니다.
function update() {
    
    // --- 1. 수평 이동 (WASD) ---
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
        const jumpTime = clock.getElapsedTime() - player.jumpStartTime;

        if (jumpTime >= player.jumpDuration) {
            player.isJumping = false;
            player.anchor.position.y = player.baseY; 
        } else {
            // (동일) 포물선 계산 (이제 jumpHeight가 0.533 정도로 계산됨)
            const a = player.jumpHeight / (player.timeToPeak * player.timeToPeak);
            const t = jumpTime - player.
