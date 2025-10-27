import * as THREE from 'three';

// 1. ------------------
//   기본 환경 설정
// --------------------

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222); // 배경색을 좀 더 어둡게

// (★ 변경!) PerspectiveCamera (원근 카메라)
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

// (★ 변경!) 카메라 초기 위치 및 각도
// 카메라를 더 낮고(y=3), 더 가깝게(z=5) 배치합니다.
camera.position.set(0, 3, 5);
// 플레이어의 발밑(0,0,0)이 아닌, 몸통(0,1,0) 정도를 바라보게 설정
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

// (동일) 바닥 (Ground)
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (동일) 바닥 그리드 (Grid) - 이제 원근감이 잘 보일 것입니다.
const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0x888888);
scene.add(gridHelper);

// (동일) 플레이어 (Player)
const player = {
    speed: 0.1,
    sprite: null,
    // (★ 추가!) 플레이어의 3D 위치를 담을 객체
    // Sprite는 2D 객체라 position.y를 중심으로 회전하는 등 문제가 있어
    // 눈에 보이지 않는 3D '앵커(Anchor)'를 만들고, 스프라이트는 이 앵커를 따라다니게 합니다.
    anchor: new THREE.Object3D() 
};
scene.add(player.anchor);

// (동일) 텍스처 로더
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('player.png', () => {
    animate();
});

// (동일) SpriteMaterial과 Sprite
const playerMaterial = new THREE.SpriteMaterial({ map: playerTexture, sizeAttenuation: true }); // sizeAttenuation: true (기본값)이 원근감을 만듭니다.
player.sprite = new THREE.Sprite(playerMaterial);
player.sprite.scale.set(1, 1.6, 1);
// (★ 변경!) 스프라이트의 위치는 항상 앵커의 y축 절반만큼 위 (발밑)
player.sprite.position.y = player.sprite.scale.y / 2; 

// (★ 변경!) 스프라이트를 앵커(Object3D)의 자식으로 만듭니다.
// 이제 우리는 'player.anchor'를 움직이면, 스프라이트가 알아서 따라옵니다.
player.anchor.add(player.sprite);


// 3. ------------------
//   입력 및 게임 루프
// --------------------

const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

// (★ 변경!) 카메라가 따라갈 기준점 (오프셋)
const cameraOffset = new THREE.Vector3(0, 3, 5); // x: 0, y: 3, z: 5

function update() {
    let dx = 0; // x축 (좌/우)
    let dz = 0; // z축 (앞/뒤)

    // (동일) W/S -> z축(앞/뒤), A/D -> x축(좌/우)
    if (keysPressed['w']) dz -= 1; // 전진 (z축 음의 방향)
    if (keysPressed['s']) dz += 1; // 후진 (z축 양의 방향)
    if (keysPressed['a']) dx -= 1; // 좌로 이동
    if (keysPressed['d']) dx += 1; // 우로 이동

    // (동일) 대각선 속도 보정
    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;

        // (★ 변경!) player.sprite가 아닌 player.anchor를 움직입니다.
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
    }
    
    // (★ 변경!) 카메라가 'player.anchor'를 따라다니도록 수정
    // (요청한 3번 '데드존'은 심도와 충돌하므로, 여기서는 100% 따라다니게 합니다.)
    
    // 1. 카메라의 새 위치 계산: 플레이어 위치 + 카메라 오프셋
    const cameraTargetPosition = player.anchor.position.clone().add(cameraOffset);
    
    // 2. (부드러운 이동) 카메라 위치를 목표 위치로 부드럽게 이동 (선택 사항)
    // camera.position.lerp(cameraTargetPosition, 0.1); // 0.1의 속도로 따라감
    
    // 2. (즉각 이동) 카메라 위치를 즉시 이동
    camera.position.copy(cameraTargetPosition);
    
    // 3. 카메라는 항상 플레이어의 몸통(y=1)을 바라봅니다.
    const lookAtTarget = player.anchor.position.clone();
    lookAtTarget.y += 1.0; // 발밑이 아닌 몸통을 보도록
    camera.lookAt(lookAtTarget);
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
