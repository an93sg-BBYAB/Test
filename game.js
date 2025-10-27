// (동일) Three.js 라이브러리에서 필요한 기능들을 'import' 합니다.
import * as THREE from 'three';

// 1. ------------------
//   기본 환경 설정
// --------------------

// (동일) 장면 (Scene)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); 

// (★ 변경!) 카메라 (Camera)
// PerspectiveCamera(시야각, 종횡비, 가까운 절단면, 먼 절단면)
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

// (★ 변경!) 카메라 초기 위치 설정
// 플레이어(0,0,0)보다 뒤(z=10)에, 그리고 위(y=5)에 배치합니다.
camera.position.set(0, 5, 10);
// 플레이어의 발밑(0,0,0)을 바라보게 하여 자연스러운 기울임을 만듭니다.
camera.lookAt(0, 0, 0); 
scene.add(camera);

// (동일) 렌더러 (Renderer)
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// (★ 변경!) 창 크기 변경 시 PerspectiveCamera 업데이트
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix(); // (중요) PerspectiveCamera는 이 함수를 호출
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 2. ------------------
//   게임 객체 생성
// --------------------

// (동일) 바닥 (Ground)
const groundGeometry = new THREE.PlaneGeometry(100, 100);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (동일) 바닥 그리드 (Grid)
const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

// (동일) 플레이어 (Player)
const player = {
    speed: 0.1, 
    sprite: null
};

// (동일) 텍스처 로더로 'player.png' 이미지 불러오기
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('player.png', () => {
    animate(); // 이미지가 로드되면 게임 루프 시작
});

// (동일) SpriteMaterial과 Sprite
const playerMaterial = new THREE.SpriteMaterial({ map: playerTexture });
player.sprite = new THREE.Sprite(playerMaterial);
player.sprite.scale.set(1, 1.6, 1); 
// (중요) 플레이어의 y 위치를 올려서 바닥(y=0) 위에 서 있도록 함
// Sprite의 중심이 발밑이 되도록 y 위치를 scale.y의 절반만큼 올립니다.
player.sprite.position.y = player.sprite.scale.y / 2; 
scene.add(player.sprite);

// 3. ------------------
//   입력 및 게임 루프
// --------------------

// (동일) 키보드 입력 상태 저장
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

// (★ 변경!) 업데이트 함수 (카메라 추적 로직 추가)
function update() {
    let dx = 0; // x축 (좌/우)
    let dz = 0; // z축 (앞/뒤)

    // (동일) 키 매핑: W/S -> z축, A/D -> x축
    if (keysPressed['w']) {
        dz -= 1; // '앞으로' (카메라에서 멀어짐: -z)
    }
    if (keysPressed['s']) {
        dz += 1; // '뒤로' (카메라로 다가옴: +z)
    }
    if (keysPressed['a']) {
        dx -= 1; // '왼쪽' (-x)
    }
    if (keysPressed['d']) {
        dx += 1; // '오른쪽' (+x)
    }

    // (동일) 대각선 속도 보정
    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;

        // (동일) 플레이어 위치 업데이트
        player.sprite.position.x += normalizedDx * player.speed;
        player.sprite.position.z += normalizedDz * player.speed;
    }
    
    // (★ 추가!) 카메라가 플레이어를 따라다니도록 설정
    // 카메라는 항상 플레이어보다 z축으로 10만큼 뒤에, y축으로 5만큼 위에 있습니다.
    camera.position.x = player.sprite.position.x;
    camera.position.y = player.sprite.position.y + 5;
    camera.position.z = player.sprite.position.z + 10;
    
    // (★ 추가!) 카메라는 항상 플레이어를 바라봅니다.
    camera.lookAt(player.sprite.position);
}

// (동일) 렌더링 루프 (Game Loop)
function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}
