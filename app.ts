import * as THREE from "three";
import * as TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class ThreeJSContainer {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private orbitControls: OrbitControls;
    private particles: THREE.Points;
    private particlePositions: THREE.BufferAttribute;
    private particleVelocities: Float32Array;
    private particleOpacities: THREE.BufferAttribute;
    private particleLifetimes: number[];
    private gravity: number = -0.0003;

    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
        this.init();
    }

    private init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);

        this.camera.position.set(0, -25, 50);
        this.camera.lookAt(0, 0, 0);

        this.orbitControls.update();

        this.createParticles();
        this.animate();
    }

    private createParticles() {
        const numParticles = 6000;

        const positions = new Float32Array(numParticles * 3);
        const colors = new Float32Array(numParticles * 3);
        this.particleVelocities = new Float32Array(numParticles * 3);
        const opacities = new Float32Array(numParticles);
        this.particleLifetimes = new Array(numParticles);

        for (let i = 0; i < numParticles; i++) {
            positions[i * 3 + 0] = 0;
            positions[i * 3 + 1] = -25;
            positions[i * 3 + 2] = 0;
            
            const baseColor = new THREE.Color(Math.random(), Math.random(), Math.random());
            const colorVariance = 0.1;
            colors[i * 3 + 0] = baseColor.r + (Math.random() - 0.5) * colorVariance;
            colors[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * colorVariance;
            colors[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * colorVariance;
            
            this.particleVelocities[i * 3 + 0] = 0;
            this.particleVelocities[i * 3 + 1] = 0;
            this.particleVelocities[i * 3 + 2] = 0;
            opacities[i] = 1.0;
            this.particleLifetimes[i] = Math.random() * 2000 + 1000;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        this.particleOpacities = new THREE.BufferAttribute(opacities, 1);
        geometry.setAttribute("opacity", this.particleOpacities);

        const material = new THREE.PointsMaterial({
            size: 0.2,
            vertexColors: true,
            transparent: true,
            opacity: 1.0
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);

        this.particlePositions = geometry.getAttribute("position") as THREE.BufferAttribute;
    }

    private animate() {
        const particleNum = this.particlePositions.count;

        for (let i = 0; i < particleNum; ++i) {
            const lifetime = this.particleLifetimes[i];
            const tweenInfo = {
                index: i,
                x: 0,
                y: -25,
                z: 0,
                opacity: 1.0,
                scale: 2
            };

            const moveUpTween = new TWEEN.Tween(tweenInfo)
                .to({ y: 0 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    this.particlePositions.setXYZ(tweenInfo.index, tweenInfo.x, tweenInfo.y, tweenInfo.z);
                    this.particlePositions.needsUpdate = true;
                });

            const targetRadius = Math.random() * 12 + 5;
            const targetPosition = this.randomSpherePoint(targetRadius);
            const spreadTween = new TWEEN.Tween(tweenInfo)
                .to({ x: targetPosition.x, y: targetPosition.y, z: targetPosition.z, scale: 1 }, 2000)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    this.particlePositions.setXYZ(tweenInfo.index, tweenInfo.x, tweenInfo.y, tweenInfo.z);
                    this.particlePositions.needsUpdate = true;
                });

            const fadeOutTween = new TWEEN.Tween(tweenInfo)
                .to({ opacity: 0.0 }, 500)
                .delay(lifetime)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onUpdate(() => {
                    this.particleOpacities.setX(tweenInfo.index, tweenInfo.opacity);
                    this.particleOpacities.needsUpdate = true;
                })
                .onComplete(() => {
                    this.particleLifetimes[tweenInfo.index] = 0.0;
                });

            moveUpTween.chain(spreadTween);
            spreadTween.chain(fadeOutTween);
            moveUpTween.start();
        }

        const animate = () => {
            requestAnimationFrame(animate);
            TWEEN.update();
            this.applyGravity();
            this.removeDeadParticles();
            this.renderer.render(this.scene, this.camera);
            this.orbitControls.update();
        }

        animate();
    }

    private applyGravity() {
        const particleNum = this.particlePositions.count;
        for (let i = 0; i < particleNum; ++i) {
            const y = this.particlePositions.getY(i);
            this.particleVelocities[i * 3 + 1] += this.gravity;
            this.particlePositions.setY(i, y + this.particleVelocities[i * 3 + 1]);
            this.particlePositions.needsUpdate = true;
        }
    }

    private removeDeadParticles() {
        const particleNum = this.particlePositions.count;
        for (let i = 0; i < particleNum; ++i) {
            if (this.particleLifetimes[i] === 0.0) {
                this.particlePositions.setXYZ(i, 0, -1000, 0);
                this.particleOpacities.setX(i, 0.0);
            }
        }
        this.particlePositions.needsUpdate = true;
        this.particleOpacities.needsUpdate = true;
    }

    private randomSpherePoint(radius: number): THREE.Vector3 {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        return new THREE.Vector3(x, y, z);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const container = new ThreeJSContainer();
});
