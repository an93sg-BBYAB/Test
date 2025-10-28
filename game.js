import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createNoise2D } from 'simplex-noise';

// (동일) clock, raycaster
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const rayOriginOffset = new THREE.Vector3(0, 10, 0); 
const rayDirection = new THREE.Vector3(0, -1, 0);   

// (동일) 좌표 엘리먼트
const coordsElement = document.getElementById('coords');

// 1. ------------------
//   기본 환경 설정
// --------------------
// (이전과 동일: scene, camera, renderer, resize 리스너...)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xFFFFFF); 
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

// (동일) 짙은 회색 바닥
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x444444, 
    wireframe: false
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// (★ 변경!) Z-fighting 수정 (옵션 제거)
const wireframeMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xFFFF00, // 노란색
    wireframe: true 
});
const groundWireframe = new THREE.Mesh(groundGeometry, wireframeMaterial);
groundWireframe.rotation.x = -Math.PI / 2;
// (★ 변경!) Z-fighting 해결을 위해 격자를 0.01만큼 살짝 띄움
groundWireframe.position.y = 0.01; 
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
    jumpHeight: 1.6 / 3.0, // (모델 로드 후 덮어쓸 임시값)
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

// (★ 변경!) GLTFLoader 로직 (모델 발밑 수정)
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.load(
    'player.glb', 
    (gltf) => {
        player.model = gltf.scene;
        
        // (★ FIX!) 모델의 y위치를 0으로 설정 (모델 원점이 발밑이라 가정)
        player.model.position.y = 0; 
        
        player.anchor.add(player.model);

        // (★ 추가!) 실제 모델 크기 기반으로 점프 높이 재설정
        const box = new THREE.Box3().setFromObject(player.model);
        const size = box.getSize(new THREE.Vector3());
        if (size.y > 0.1) { // 0이 아닌 유효한 크기일 때
            player.jumpHeight = size.y / 3.0;
        }
    }, 
    undefined, 
    (error) => {
        // (동일) 로드 실패 시 빨간 큐브
        console.error('모델 로드 실패:', error);
        const geometry = new THREE.BoxGeometry(0.8, 1.6, 0.8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        player.model = new THREE.Mesh(geometry, material);
        player.model.position.y = 1.6 / 2; // 큐브는 중심이 원점이므로 띄움
        player.anchor.add(player.model);
    }
);

// (동일) 입력 리스너
const keysPressed = {};
window.addEventListener('keydown', (e) => { keysPressed[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; });
const cameraOffset = new THREE.Vector3(0, 3, 5);


// (★ 변경!) update 함수 (W/S 오류 수정)
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
    
    // (★ FIX!) magnitude 계산 오타 수정 (dx * dz -> dx * dx)
    const magnitude = Math.sqrt(dx * dx + dz * dz); 

    if (magnitude > 0) {
        const targetRotation = Math.atan2(dx, dz);
        const normalizedDx = dx / magnitude;
        const normalizedDz = dz / magnitude;
        
        // (★ 중요!) 이제 z축 이동이 정상적으로 계산됩니다.
        player.anchor.position.x += normalizedDx * player.speed;
        player.anchor.position.z += normalizedDz * player.speed;
        
        // (동일) 회전 로직
        const currentRotation = player.anchor.rotation.y;
        let delta = targetRotation - currentRotation;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        else if (delta < -Math.PI) delta += 2 * Math.PI;
        const newTargetRotation = currentRotation + delta;
        player.anchor.rotation.y = THREE.MathUtils.lerp(currentRotation, newTargetRotation, 0.1);
    }
    
    // (지형 감지)
    const rayOrigin = player.anchor.position.clone().add(rayOriginOffset);
    raycaster.set(rayOrigin, rayDirection);
    const intersects = raycaster.intersectObject(ground); 
    
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

// (동일) 렌더링 루프
function animate() {
    requestAnimationFrame(animate);
    update();
    
    // (동일) 좌표 UI
    const pos = player.anchor.position;
    coordsElement.innerText = `X: ${pos.x.toFixed(2)}, Y: ${pos.y.toFixed(2)}, Z: ${pos.z.toFixed(2)}`;
    
    renderer.render(scene, camera);
}
