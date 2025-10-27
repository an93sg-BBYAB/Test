import * as THREE from 'three';

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


// (동일) 스프라이트 스케일
const playerScale = new THREE.Vector3(1, 1.6, 1);

// (★ 변경!) 플레이어 객체에 쿨타임 및 방향 변수 추가
const player = {
    speed: 0.1,
    anchor: new THREE.Object3D(),
    sprite: null,
    
    // (동일) 점프 변수
    isJumping: false,
    jumpStartTime: 0,
    jumpHeight: playerScale.y / 3.0,
    timeToPeak: 0.25,
    jumpDuration: 0.5,
    baseY: 0,
    
    // (★ 추가!) 점프 쿨타임 변수
    isJumpCoolingDown: false,      // 현재 쿨타임 중인가?
    jumpCooldown: 0.3,           // 쿨타임 시간 (0.3초)
    jumpCooldownStartTime: 0,    // 쿨타임 시작 시간
    
    // (★ 추가!) 8방향 스프라이트 변수
    currentDirection: 's'        // 현재 바라보는 방향 (s: South, 남쪽/앞)
};
scene.add(player.anchor);
player.anchor.position.y = player.baseY;

// (★ 변경!) 8방향 텍스처 로딩
const textures = {}; // 8방향 텍스처를 저장할 객체

// (★ 추가!) 로딩 매니저: 모든 텍스처가 로드되면 게임 루프 시작
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    clock.start();
    animate(); // 모든 로딩이 끝나면 게임 시작
};
const textureLoader = new THREE.TextureLoader(loadingManager);

// (★ 중요!) 8방향 이미지를 로드합니다.
// 지금은 'player.png'만 사용하지만, 나중에 8개의 실제 파일로 교체해야 합니다.
const tempTexture = 'player.png'; // 임시 파일
textures.s  = textureLoader.load(tempTexture); // S (앞)
textures.n  = textureLoader.load(tempTexture); // N (뒤)
textures.w  = textureLoader.load(tempTexture); // W (좌)
textures.e  = textureLoader.load(tempTexture); // E (우)
textures.sw = textureLoader.load(tempTexture); // SW (앞-좌)
textures.se = textureLoader.load(tempTexture); // SE (앞-우)
textures.nw = textureLoader.load(tempTexture); // NW (뒤-좌)
textures.ne = textureLoader.load(tempTexture); // NE (뒤-우)
/* // (나중에 이렇게 바꿔야 합니다)
textures.s  = textureLoader.load('player_front.png');
textures.n  = textureLoader.load('player_back.png');
textures.w  = textureLoader.load('player_left.png');
textures.e  = textureLoader.load('player_right.png');
textures.sw = textureLoader.load('player_front_left.png');
// ... 
*/

// (★ 변경!) 초기 텍스처(앞모습)로 재질 생성
const playerMaterial = new THREE.SpriteMaterial({ map: textures.s, sizeAttenuation: true });
player.sprite = new THREE.Sprite(playerMaterial);
player.sprite.scale.copy(playerScale);
player.sprite.position.y = playerScale.y / 2; 
player.anchor.add(player.sprite);


// 3. ------------------
//   입력 및 게임 루프
// --------------------
// (동일) 키보드 입력 상태 저장
const keysPressed = {};
window.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    // (★ 삭제!) 스페이스바 점프 로직은 update() 함수로 이동
});
window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// (동일) 카메라 오프셋
const cameraOffset = new THREE.Vector3(0, 3, 5);

// (★ 변경!) update 함수에 쿨타임 및 방향 전환 로직 추가
function update() {
    
    // --- 1. 점프 쿨타임 확인 ---
    if (player.isJumpCoolingDown) {
        const cooldownTime = clock.getElapsedTime() - player.jumpCooldownStartTime;
        if (cooldownTime >= player.jumpCooldown) {
            player.isJumpCoolingDown = false; // 쿨타임 종료
        }
    }

    // --- 2. 점프 입력 (스페이스바를 누르고 있을 때) ---
    // (★ 추가!) 쿨타임이 아니고, 점프 중이 아닐 때만 점프 가능
    if (keysPressed[' '] && !player.isJumping && !player.isJumpCoolingDown) {
        player.isJumping = true;
        player.jumpStartTime = clock.getElapsedTime();
    }

    // --- 3. 수평 이동 및 방향 결정 ---
    let dx = 0; 
    let dz = 0; 
    let newDirection = player.currentDirection; // 일단 현재 방향 유지

    if (keysPressed['w']) dz -= 1;
    if (keysPressed['s']) dz += 1;
    if (keysPressed['a']) dx -= 1;
    if (keysPressed['d']) dx += 1;

    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) { // (이동 중일 때)
        // 3-1. 방향 결정
        if (dz < 0) { // W (북쪽)
            if (dx < 0) newDirection = 'nw';
            else if (dx > 0) newDirection = 'ne';
            else newDirection = 'n';
        } else if (dz > 0) { // S (남쪽)
            if (dx < 0) newDirection = 'sw';
            else if (dx > 0) newDirection = 'se';
            else newDirection = 's';
        } else { // W/S 안 누름
            if (dx < 0) newDirection = 'w';
            else if (dx > 0) newDirection = 'e';
        }

        // 3-2. 방향이 바뀌었다면 스프라이트 교체
        if (newDirection !== player.currentDirection) {
            player.sprite.material.map = textures[newDirection];
            player.currentDirection = newDirection;
        }

        // 3-3. 실제 위치 이동 (공중이든 땅이든 동일하게 적용)
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
    }

    // --- 4. 수직 이동 (점프) ---
    if (player.isJumping) {
        const jumpTime = clock.getElapsedTime() - player.jumpStartTime;

        if (jumpTime >= player.jumpDuration) {
            // (★ 변경!) 착지 시 쿨타임 시작
            player.isJumping = false;
            player.anchor.position.y = player.baseY; 
            player.isJumpCoolingDown = true; // 쿨타임 시작
            player.jumpCooldownStartTime = clock.getElapsedTime(); // 쿨타임 시작 시간 기록
        } else {
            // (동일) 포물선 계산
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



