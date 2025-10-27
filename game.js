// (중요!) Three.js 라이브러리에서 필요한 기능들을 'import' 합니다.
import * as THREE from 'three';

// 1. ------------------
//   기본 환경 설정
// --------------------

// 장면 (Scene): 모든 3D 객체가 담길 공간
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333); // 배경색

// 카메라 (Camera): 우리가 세상을 바라보는 눈
// (중요!) OrthographicCamera (직교 카메라)를 사용해 원근감 없는 쿼터뷰를 만듭니다.
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 20; // 화면에 보일 세상의 크기 (숫자가 작을수록 줌인)
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    frustumSize / -2,
    0.1,  // 카메라 시작면
    1000  // 카메라 끝면
);

// (중요!) 카메라 위치 및 각도 설정
// x: 10, y: 10, z: 10 위치에서
camera.position.set(10, 10, 10); 
// 0, 0, 0 (원점)을 바라보게 합니다.
camera.lookAt(0, 0, 0); 
scene.add(camera);

// 렌더러 (Renderer): 장면과 카메라를 기반으로 캔버스에 그림을 그림
const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas: canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

// 창 크기 변경 시 카메라와 렌더러 크기 조절
window.addEventListener('resize', () => {
    const aspect = window.innerWidth / window.innerHeight;
    camera.left = frustumSize * aspect / -2;
    camera.right = frustumSize * aspect / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 2. ------------------
//   게임 객체 생성
// --------------------

// 바닥 (Ground)
// PlaneGeometry: 100x100 크기의 평면
const groundGeometry = new THREE.PlaneGeometry(100, 100);
// MeshBasicMaterial: 간단한 단색 재질
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
// (중요!) 바닥을 XZ 평면에 눕히기 위해 x축으로 90도 회전
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 바닥 그리드 (Grid) - 위치 파악용
const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

// 플레이어 (Player)
const player = {
    speed: 0.1, // 3D 공간에서의 이동 속도 (조절 필요)
    sprite: null  // Three.js 객체를 담을 변수
};

// (중요!) 텍스처 로더로 'player.png' 이미지 불러오기
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('player.png', () => {
    // 이미지가 로드되면 게임 루프 시작
    animate();
});

// (중요!) SpriteMaterial과 Sprite를 사용해 2D 이미지를 3D 공간에 띄웁니다.
// Sprite는 항상 카메라를 바라보는(billboarding) 특징이 있습니다.
const playerMaterial = new THREE.SpriteMaterial({ map: playerTexture });
player.sprite = new THREE.Sprite(playerMaterial);

// 스프라이트 크기 조절 (원본 이미지 크기에 맞게)
// player.png가 32x48 픽셀이라면, 1.6 (48/30) 비율
player.sprite.scale.set(1, 1.6, 1); 
// (중요!) 플레이어의 y 위치를 올려서 바닥(y=0) 위에 서 있도록 함
player.sprite.position.y = 0.8; // (scale.y / 2)
scene.add(player.sprite);

// 3. ------------------
//   입력 및 게임 루프
// --------------------

// 키보드 입력 상태 저장 (이전과 동일)
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });

// 업데이트 함수 (로직)
function update() {
    let dx = 0; // x축 이동 방향
    let dz = 0; // z축 이동 방향 (3D에서는 Y가 '위'이므로, Z를 '앞/뒤'로 사용)

    // (중요!) 키 매핑: W/S가 Z축(앞/뒤), A/D가 X축(좌/우)을 담당
    if (keysPressed['w']) {
        dz -= 1;
    }
    if (keysPressed['s']) {
        dz += 1;
    }
    if (keysPressed['a']) {
        dx -= 1;
    }
    if (keysPressed['d']) {
        dx += 1;
    }

    // 대각선 속도 보정 (이전과 동일한 원리)
    const magnitude = Math.sqrt(dx * dx + dz * dz);

    if (magnitude > 0) {
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;

        // (중요!) player.sprite.position의 x와 z를 변경
        player.sprite.position.x += normalizedDx * player.speed;
        player.sprite.position.z += normalizedDz * player.speed;
    }
}

// 렌더링 루프 (Game Loop)
function animate() {
    // 1) 다음 프레임 요청 (반복)
    requestAnimationFrame(animate);

    // 2) 상태 업데이트 (로직)
    update();

    // 3) 화면 그리기 (렌더링)
    renderer.render(scene, camera);
}