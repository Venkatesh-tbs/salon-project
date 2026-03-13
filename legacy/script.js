// Firebase Configuration (Replace with actual config later)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded");
}

// Intersection Observer for scroll animations
const observerOptions = {
    root: null,
    rootMargin: "0px",
    threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Select all elements to animate
window.addEventListener('load', () => {
    document.querySelectorAll('.section-title, .service-card, .gallery-item, .glass-form').forEach(el => {
        observer.observe(el);
    });
});

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Three.js Barber Pole Animation
const setupThreeJS = () => {
    const canvas = document.querySelector('#hero-canvas');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera setup
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;
    camera.position.x = 2.5; // Offset to the right slightly so it doesn't block text

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create striped texture procedurally using HTML5 Canvas
    const createStripedTexture = () => {
        const ctxCanvas = document.createElement('canvas');
        ctxCanvas.width = 512;
        ctxCanvas.height = 512;
        const ctx = ctxCanvas.getContext('2d');

        // Fill background white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);

        // Draw diagonal stripes (Premium Gold, Dark, White stripe pattern)
        const stripeWidth = 60;
        
        ctx.save();
        ctx.translate(256, 256);
        ctx.rotate(Math.PI / 4); // 45 degrees
        ctx.translate(-500, -500);

        for (let i = 0; i < 20; i++) {
            const x = i * stripeWidth * 3;
            
            // Gold stripe
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(x, 0, stripeWidth, 1000);
            
            // Dark stripe
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x + stripeWidth, 0, stripeWidth, 1000);
            
            // White/Silver stripe
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(x + stripeWidth * 2, 0, stripeWidth, 1000);
        }
        ctx.restore();

        const texture = new THREE.CanvasTexture(ctxCanvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 4); // Repeat to make stripes look better defined
        return texture;
    };

    const texture = createStripedTexture();
    
    // Material
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.2,
        metalness: 0.5
    });

    // Geometry: A tall cylinder representing a barber pole
    const geometry = new THREE.CylinderGeometry(0.8, 0.8, 6.5, 32);
    const barberPole = new THREE.Mesh(geometry, material);
    
    // Tilt the pole slightly for dynamic look
    barberPole.rotation.z = 0.15;
    scene.add(barberPole);

    // Add premium glowing metallic caps
    const capGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({ 
        color: 0xd4af37, 
        roughness: 0.1, 
        metalness: 1.0 
    });
    
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.position.y = 3.25;
    barberPole.add(topCap);

    const bottomCap = new THREE.Mesh(capGeo, capMat);
    bottomCap.position.y = -3.25;
    bottomCap.rotation.x = Math.PI;
    barberPole.add(bottomCap);

    // Lighting to make it look highly premium
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight1.position.set(5, 5, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-5, 5, 5);
    scene.add(directionalLight2);

    const goldBackLight = new THREE.DirectionalLight(0xd4af37, 1.5);
    goldBackLight.position.set(0, -5, -5);
    scene.add(goldBackLight);

    // Dynamic mouse interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        // Scroll texture on Y axis to simulate the rotating barber pole effect
        texture.offset.y -= 0.6 * delta;

        // Smoothly rotate the whole pole based on mouse position
        targetRotationY = mouseX * 0.3;
        const targetRotationX = mouseY * 0.15;
        
        barberPole.rotation.x += (targetRotationX - barberPole.rotation.x) * 3 * delta;
        barberPole.rotation.y += (targetRotationY - barberPole.rotation.y) * 3 * delta;

        // Add subtle floating effect
        const time = clock.getElapsedTime();
        barberPole.position.y = Math.sin(time * 1.5) * 0.15;

        renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Adjust position based on screen width
        if (window.innerWidth < 1024) {
            camera.position.x = 1.5;
        }
        if (window.innerWidth < 768) {
            camera.position.x = 0;
            camera.position.z = 13;
            // Slightly push it up on mobile so it doesn't block the CTA entirely
            barberPole.position.y = 1.5; 
        } else {
            camera.position.z = 10;
        }
    });

    // Trigger initial resize to set proper positioning
    window.dispatchEvent(new Event('resize'));
};

// Initialize after DOM load
document.addEventListener('DOMContentLoaded', () => {
    setupThreeJS();
    
    // Booking Form Submission Handler
    const bookingForm = document.getElementById('booking-form');
    const successMessage = document.getElementById('booking-success');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = bookingForm.querySelector('button');
            const originalText = btn.innerText;
            
            // Gather form data
            const name = document.getElementById('name').value;
            const phone = document.getElementById('phone').value;
            const service = document.getElementById('service').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;

            btn.innerText = 'Booking...';
            btn.disabled = true;

            try {
                if (db) {
                    // Save to Firestore
                    await db.collection("appointments").add({
                        name: name,
                        phone: phone,
                        service: service,
                        date: date,
                        time: time,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    console.warn("Firebase not initialized. Simulating save.");
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                // Success UI changes
                btn.innerText = 'Booking Confirmed!';
                btn.style.backgroundColor = '#d4af37';
                btn.style.color = '#000';
                btn.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.6)';
                
                if (successMessage) {
                    successMessage.style.display = 'block';
                }
                
                setTimeout(() => {
                    bookingForm.reset();
                    btn.innerText = originalText;
                    btn.disabled = false;
                    btn.style.backgroundColor = '';
                    btn.style.color = '';
                    btn.style.boxShadow = '';
                    if (successMessage) {
                        successMessage.style.display = 'none';
                    }
                }, 4000);

            } catch (error) {
                console.error("Error adding appointment: ", error);
                btn.innerText = 'Error! Try Again.';
                btn.disabled = false;
                setTimeout(() => {
                    btn.innerText = originalText;
                }, 3000);
            }
        });
    }
});
