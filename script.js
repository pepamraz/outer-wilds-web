import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, stars, controls;
let planets = [];
let sun;
let spaceship;
let explosionParticles = [];
let isExploding = false;
let explosionTime = 0;
let ambientSound, explosionSound;
let isUserControlling = false;
let autoOrbitSpeed = 0.2;
let orbitRadius = 30;
let orbitHeight = 20;

function createSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    // Create gradient
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, '#ff6600');
    gradient.addColorStop(0.2, '#ff3300');
    gradient.addColorStop(0.4, '#ff0000');
    gradient.addColorStop(0.6, '#ff6600');
    gradient.addColorStop(0.8, '#ffcc00');
    gradient.addColorStop(1, '#ffff00');

    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add some noise
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 50;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
    }
    context.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
}

function createPlanetTexture(baseColor, noiseColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    // Base color
    context.fillStyle = baseColor;
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 30;
        data[i] += noise;
        data[i + 1] += noise;
        data[i + 2] += noise;
    }
    context.putImageData(imageData, 0, 0);

    return new THREE.CanvasTexture(canvas);
}

function createSpaceship() {
    // Create a group to hold all spaceship parts
    const spaceship = new THREE.Group();

    // Main body (elongated capsule shape)
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x444444,
        shininess: 30,
        specular: 0x111111
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    spaceship.add(body);

    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const cockpitMaterial = new THREE.MeshPhongMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0.8,
        shininess: 100,
        specular: 0xffffff
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 0.8, 0);
    spaceship.add(cockpit);

    // Wings (more detailed)
    const wingGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.6);
    const wingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        shininess: 20
    });

    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.4, 0, 0);
    leftWing.rotation.z = -0.2; // Slight angle for better look
    spaceship.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.4, 0, 0);
    rightWing.rotation.z = 0.2; // Slight angle for better look
    spaceship.add(rightWing);

    // Wing details (smaller wings on top)
    const detailWingGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.4);
    const detailWingMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 10
    });

    const leftDetailWing = new THREE.Mesh(detailWingGeometry, detailWingMaterial);
    leftDetailWing.position.set(-0.3, 0.3, 0);
    leftDetailWing.rotation.z = -0.1;
    spaceship.add(leftDetailWing);

    const rightDetailWing = new THREE.Mesh(detailWingGeometry, detailWingMaterial);
    rightDetailWing.position.set(0.3, 0.3, 0);
    rightDetailWing.rotation.z = 0.1;
    spaceship.add(rightDetailWing);

    // Engine section
    const engineGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.8, 8);
    const engineMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        shininess: 50
    });
    const engine = new THREE.Mesh(engineGeometry, engineMaterial);
    engine.position.set(0, -1.2, 0);
    engine.rotation.x = Math.PI / 2;
    spaceship.add(engine);

    // Engine glow (with multiple layers for better effect)
    const outerGlowGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff7d25,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.set(0, -1.6, 0);
    spaceship.add(outerGlow);

    const innerGlowGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    innerGlow.position.set(0, -1.6, 0);
    spaceship.add(innerGlow);

    // Antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const antennaMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x666666,
        shininess: 80
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 1.2, 0);
    spaceship.add(antenna);

    // Antenna tip
    const antennaTipGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const antennaTipMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff7d25,
        emissive: 0xff7d25,
        emissiveIntensity: 0.5
    });
    const antennaTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial);
    antennaTip.position.set(0, 1.4, 0);
    spaceship.add(antennaTip);

    return spaceship;
}

function createExplosion(position) {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
        // Random position around explosion center
        positions[i * 3] = position.x;
        positions[i * 3 + 1] = position.y;
        positions[i * 3 + 2] = position.z;

        // Random velocity
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize().multiplyScalar(Math.random() * 2 + 1);
        velocities.push(velocity);

        // Random color between orange and yellow
        colors[i * 3] = 1; // R
        colors[i * 3 + 1] = Math.random() * 0.5 + 0.5; // G
        colors[i * 3 + 2] = 0; // B
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    return { particles, velocities, startTime: Date.now() };
}

function checkCollision(spaceship, planets) {
    const spaceshipRadius = 1; // Approximate radius of the spaceship
    for (const planet of planets) {
        const distance = spaceship.position.distanceTo(planet.mesh.position);
        if (distance < (planet.mesh.geometry.parameters.radius + spaceshipRadius)) {
            return true;
        }
    }
    return false;
}

function updateExplosion(explosion, deltaTime) {
    const positions = explosion.particles.geometry.attributes.position.array;
    const colors = explosion.particles.geometry.attributes.color.array;
    const elapsedTime = (Date.now() - explosion.startTime) / 1000;

    // Update particle positions and fade out
    for (let i = 0; i < explosion.velocities.length; i++) {
        const velocity = explosion.velocities[i];
        positions[i * 3] += velocity.x * deltaTime;
        positions[i * 3 + 1] += velocity.y * deltaTime;
        positions[i * 3 + 2] += velocity.z * deltaTime;

        // Fade out particles
        const alpha = Math.max(0, 1 - elapsedTime);
        colors[i * 3 + 1] *= alpha; // Fade green channel
    }

    explosion.particles.geometry.attributes.position.needsUpdate = true;
    explosion.particles.geometry.attributes.color.needsUpdate = true;

    // Remove explosion after 2 seconds
    if (elapsedTime > 2) {
        scene.remove(explosion.particles);
        return false;
    }
    return true;
}

function init() {
    // Get the container
    const container = document.getElementById('threejs-container');

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Add orbit controls with limits
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Set zoom limits
    controls.minDistance = 15; // Can't get closer than this to the center
    controls.maxDistance = 100; // Can't get further than this from the center
    
    // Set rotation limits (optional)
    controls.minPolarAngle = 0; // Can't look below the plane
    controls.maxPolarAngle = Math.PI; // Can't look above the plane
    
    // Make controls smoother
    controls.enableSmoothing = true;
    controls.smoothTime = 0.1;
    
    // Prevent camera from going through objects
    controls.enablePan = false; // Disable panning to keep focus on the solar system

    // Add ambient light (reduced to create more contrast)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    // Add directional light (sunlight) - main light source
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(0, 0, 0);
    scene.add(directionalLight);

    // Add subtle fill light from the opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(0, 0, -10);
    scene.add(fillLight);

    // Create Sun with dynamic texture
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunTexture = createSunTexture();
    const sunMaterial = new THREE.MeshPhongMaterial({
        map: sunTexture,
        emissive: 0xffff00,
        emissiveIntensity: 1,
        shininess: 100,
        specular: 0xffff00
    });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);

    // Add sun glow
    const sunGlowGeometry = new THREE.SphereGeometry(5.5, 32, 32);
    const sunGlowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            c: { type: "f", value: 0.1 },
            p: { type: "f", value: 3.0 },
            glowColor: { type: "c", value: new THREE.Color(0xffff00) },
            viewVector: { type: "v3", value: camera.position }
        },
        vertexShader: `
            uniform vec3 viewVector;
            varying float intensity;
            void main() {
                vec3 vNormal = normalize(normalMatrix * normal);
                vec3 vNormel = normalize(normalMatrix * viewVector);
                intensity = pow(0.7 - dot(vNormal, vNormel), 2.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
                vec3 glow = glowColor * intensity;
                gl_FragColor = vec4(glow, 1.0);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    const sunGlow = new THREE.Mesh(sunGlowGeometry, sunGlowMaterial);
    sun.add(sunGlow);

    // Create planets with textures
    const planetData = [
        { 
            name: 'Timber Hearth', 
            radius: 1.5, 
            distance: 10, 
            color: '#4a8c4a', 
            noiseColor: '#2d552d',
            speed: 0.01 
        },
        { 
            name: 'Brittle Hollow', 
            radius: 1.2, 
            distance: 15, 
            color: '#8b4513', 
            noiseColor: '#5a2d0a',
            speed: 0.008 
        },
        { 
            name: 'Giant\'s Deep', 
            radius: 2, 
            distance: 20, 
            color: '#1e90ff', 
            noiseColor: '#0d4b8a',
            speed: 0.006 
        },
        { 
            name: 'Dark Bramble', 
            radius: 1.8, 
            distance: 25, 
            color: '#2f4f4f', 
            noiseColor: '#1a2a2a',
            speed: 0.004 
        },
        { 
            name: 'The Interloper', 
            radius: 0.8, 
            distance: 30, 
            color: '#808080', 
            noiseColor: '#404040',
            speed: 0.012 
        }
    ];

    planetData.forEach(data => {
        const planetGeometry = new THREE.SphereGeometry(data.radius, 32, 32);
        const planetTexture = createPlanetTexture(data.color, data.noiseColor);
        const planetMaterial = new THREE.MeshPhongMaterial({ 
            map: planetTexture,
            shininess: 30,
            specular: 0x111111,
            side: THREE.FrontSide,
            bumpScale: 0.5
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        
        // Create orbit line
        const orbitGeometry = new THREE.RingGeometry(data.distance - 0.1, data.distance + 0.1, 64);
        const orbitMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.2
        });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        scene.add(orbit);

        planets.push({
            mesh: planet,
            distance: data.distance,
            speed: data.speed,
            angle: Math.random() * Math.PI * 2
        });
        scene.add(planet);
    });

    // Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 10000;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount * 3; i++) {
        const r = 300;
        const theta = 2 * Math.PI * Math.random();
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5,
        sizeAttenuation: true
    });

    stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Create and add spaceship
    spaceship = createSpaceship();
    scene.add(spaceship);

    // Set initial spaceship position
    spaceship.position.set(15, 0, 0);
    spaceship.lookAt(0, 0, 0); // Look at the sun

    // Initialize audio with better error handling
    try {
        ambientSound = document.getElementById('ambient-sound');
        explosionSound = document.getElementById('explosion-sound');

        if (!ambientSound || !explosionSound) {
            console.error('Audio elements not found in the DOM');
            return;
        }

        // Set initial volume explicitly
        ambientSound.volume = 0.5; // Increased from 0.3 to 0.5
        explosionSound.volume = 0.3; // Lowered from 0.7 to 0.3 to be less startling

        // Debug logging
        console.log('Audio elements found:', {
            ambientSound: ambientSound,
            explosionSound: explosionSound,
            ambientVolume: ambientSound.volume,
            explosionVolume: explosionSound.volume
        });

        // Add event listeners for audio loading
        ambientSound.addEventListener('loadeddata', () => {
            console.log('Ambient sound loaded, attempting to play...');
            ambientSound.play().then(() => {
                console.log('Ambient sound playing successfully');
            }).catch(error => {
                console.error('Ambient sound playback failed:', error);
            });
        });

        ambientSound.addEventListener('error', (e) => {
            console.error('Ambient sound loading error:', e);
        });

        explosionSound.addEventListener('loadeddata', () => {
            console.log('Explosion sound loaded successfully');
        });

        explosionSound.addEventListener('error', (e) => {
            console.error('Explosion sound loading error:', e);
        });

        // Try to play ambient sound immediately
        const playPromise = ambientSound.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('Ambient sound started playing');
            }).catch(error => {
                console.error('Initial ambient sound playback failed:', error);
                // Try to play again after user interaction
                document.addEventListener('click', () => {
                    console.log('Attempting to play audio after user interaction');
                    ambientSound.play().then(() => {
                        console.log('Audio started playing after user interaction');
                    }).catch(e => console.error('Retry playback failed:', e));
                }, { once: true });
            });
        }

    } catch (error) {
        console.error('Error initializing audio:', error);
    }

    // Initialize audio controls
    const toggleAudioButton = document.getElementById('toggle-audio');
    const audioControls = document.getElementById('audio-controls');
    const ambientVolumeSlider = document.getElementById('ambient-volume');
    const explosionVolumeSlider = document.getElementById('explosion-volume');
    let isAudioMuted = false;
    let previousAmbientVolume = 0.5; // Store previous volume levels
    let previousExplosionVolume = 0.3;

    // Handle volume sliders
    ambientVolumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        if (volume === 0) {
            ambientSound.muted = true;
            ambientSound.pause();
        } else {
            ambientSound.muted = false;
            ambientSound.volume = volume;
            previousAmbientVolume = volume; // Update previous volume
            if (ambientSound.paused) {
                ambientSound.play().catch(error => {
                    console.error('Ambient sound playback failed:', error);
                });
            }
        }
    });

    explosionVolumeSlider.addEventListener('input', (e) => {
        const volume = parseFloat(e.target.value);
        if (volume === 0) {
            explosionSound.muted = true;
            explosionSound.pause();
        } else {
            explosionSound.muted = false;
            explosionSound.volume = volume;
            previousExplosionVolume = volume; // Update previous volume
        }
    });

    // Toggle audio mute
    toggleAudioButton.addEventListener('click', () => {
        isAudioMuted = !isAudioMuted;
        if (isAudioMuted) {
            // Store current volumes before muting
            previousAmbientVolume = ambientSound.volume;
            previousExplosionVolume = explosionSound.volume;
            
            ambientSound.muted = true;
            ambientSound.pause();
            explosionSound.muted = true;
            explosionSound.pause();
            toggleAudioButton.innerHTML = '<i class="fas fa-volume-mute"></i>';
            // Update sliders to show muted state
            ambientVolumeSlider.value = 0;
            explosionVolumeSlider.value = 0;
        } else {
            ambientSound.muted = false;
            explosionSound.muted = false;
            
            // Restore previous volumes
            ambientSound.volume = previousAmbientVolume;
            explosionSound.volume = previousExplosionVolume;
            
            // Update sliders to show actual volumes
            ambientVolumeSlider.value = previousAmbientVolume;
            explosionVolumeSlider.value = previousExplosionVolume;
            
            toggleAudioButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            
            // Resume playback if volumes are not zero
            if (previousAmbientVolume > 0) {
                ambientSound.play().catch(error => {
                    console.error('Ambient sound playback failed:', error);
                });
            }
        }
    });

    // Sync audio controls with UI visibility
    const toggleButton = document.getElementById('toggle-ui');
    toggleButton.addEventListener('click', () => {
        const uiContainer = document.getElementById('ui-container');
        uiContainer.classList.toggle('hidden');
        
        // Update eye icon
        const isHidden = uiContainer.classList.contains('hidden');
        toggleButton.innerHTML = `<i class="fas fa-${isHidden ? 'eye-slash' : 'eye'}"></i>`;
        
        // Adjust camera controls when UI is hidden
        if (isHidden) {
            controls.minDistance = 10;
            controls.maxDistance = 150;
        } else {
            controls.minDistance = 15;
            controls.maxDistance = 100;
        }
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add event listeners for camera control
    controls.addEventListener('start', () => {
        isUserControlling = true;
    });

    controls.addEventListener('end', () => {
        isUserControlling = false;
    });

    // Set initial camera position for top-down view
    camera.position.set(0, orbitHeight, orbitRadius);
    camera.lookAt(0, 0, 0);

    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    // Auto-orbit camera when user is not controlling
    if (!isUserControlling) {
        const time = Date.now() * 0.001;
        const angle = time * autoOrbitSpeed;
        
        // Calculate new camera position
        const x = Math.sin(angle) * orbitRadius;
        const z = Math.cos(angle) * orbitRadius;
        
        // Smoothly move camera to new position
        camera.position.x += (x - camera.position.x) * 0.05;
        camera.position.z += (z - camera.position.z) * 0.05;
        
        // Keep camera looking at the sun
        camera.lookAt(0, 0, 0);
    }

    // Rotate sun
    sun.rotation.y += 0.001;

    // Update planet positions
    planets.forEach(planet => {
        planet.angle += planet.speed;
        planet.mesh.position.x = Math.cos(planet.angle) * planet.distance;
        planet.mesh.position.z = Math.sin(planet.angle) * planet.distance;
        planet.mesh.rotation.y += 0.01;
    });

    // Update spaceship position and rotation
    if (spaceship && !isExploding) {
        const time = Date.now() * 0.001;
        
        // Create a more complex orbit that stays away from the sun
        const baseRadius = 20;
        const orbitVariation = 5;
        const verticalVariation = 3;
        
        const x = Math.sin(time * 0.3) * (baseRadius + Math.sin(time * 0.2) * orbitVariation);
        const z = Math.cos(time * 0.3) * (baseRadius + Math.cos(time * 0.2) * orbitVariation);
        const y = Math.sin(time * 0.4) * verticalVariation;

        spaceship.position.set(x, y, z);
        
        const lookAhead = 0.2;
        const targetX = Math.sin((time + lookAhead) * 0.3) * baseRadius;
        const targetZ = Math.cos((time + lookAhead) * 0.3) * baseRadius;
        
        spaceship.lookAt(targetX, y * 0.5, targetZ);
        
        const turnDirection = Math.sin(time * 0.3);
        spaceship.rotation.z = turnDirection * 0.3;

        // Check for collision
        if (checkCollision(spaceship, planets)) {
            isExploding = true;
            explosionTime = Date.now();
            const explosion = createExplosion(spaceship.position);
            explosionParticles.push(explosion);
            scene.remove(spaceship);

            // Play explosion sound
            explosionSound.currentTime = 0; // Reset sound to start
            explosionSound.play().catch(error => {
                console.log('Explosion sound playback failed:', error);
            });
        }
    }

    // Update explosions
    explosionParticles = explosionParticles.filter(explosion => 
        updateExplosion(explosion, 0.016) // Assuming 60fps
    );

    // Reset spaceship after explosion
    if (isExploding && Date.now() - explosionTime > 2000) {
        isExploding = false;
        spaceship = createSpaceship();
        scene.add(spaceship);
        spaceship.position.set(15, 0, 0);
    }

    // Subtle rotation for the starfield
    if (stars) {
        stars.rotation.x += 0.0001;
        stars.rotation.y += 0.0002;
    }

    renderer.render(scene, camera);
}

init(); 