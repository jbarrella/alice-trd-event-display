import * as THREE from '../js/three.module.js';
import { OrbitControls } from '../js/OrbitControls.js';
import { geomLayers3D } from '../geometry/geometries3d.js';

class ThreejsComponent {
    constructor(id) {
        try {
            this.detectorMode = 1;
            this.init(id);
            this.canRender = true;
            this.render();
        }
        catch (err) {
            console.error(err);
            this.canRender = false;
        }
    }

    init(id, width, height) {

        const scene = this.scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);

        const canvas = document.getElementById(id);

        const renderer = this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: canvas
        });

        const camera = this.camera = new THREE.PerspectiveCamera(70, 2, 1, 3000);
        camera.position.set(0, 0, 1000);

        // controls

        const controls = this.controls = new OrbitControls(camera, renderer.domElement);

        //controls.addEventListener('change', this.render.bind(this)); // call this only in static scenes (i.e., if there is no animation loop)

        // controls.enableDamping = false; // an animation loop is required when either damping or auto-rotation are enabled
        // controls.dampingFactor = 0.05;

        controls.screenSpacePanning = true;
        controls.enablePan = true;

        controls.minDistance = 100;
        controls.maxDistance = 2000;

        controls.autoRotate = true;


        //controls.maxPolarAngle = Math.PI / 2;

        // world

        // Central sphere
        const sphG = new THREE.SphereBufferGeometry(10);
        const sphereObj = new THREE.LineSegments(new THREE.WireframeGeometry(sphG), new THREE.LineBasicMaterial({ color: 0x00ff00 }));
        scene.add(sphereObj);

        // White directional light at half intensity shining from the top.
        const directionalLight = this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.80);
        //directionalLight.target = camera;
        directionalLight.position.set(0, 1, 0);
        scene.add(directionalLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        scene.add(ambientLight);

        // TRD Modules
        const detectors = this.detectorGroup = new THREE.Group();

        const stackMap = this.stackMap = new Map();

        for (let sec = 0; sec < 18; sec++)
            for (let stk = 0; stk < 5; stk++) {
                const stackObj = new THREE.Group();
                stackMap.set(sec * 5 + stk, stackObj);
                detectors.add(stackObj);
            }

        const selectedMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color("white"),
            opacity: 0.75,
            transparent: true
        })

        for (const layer of geomLayers3D()) {
            const rotObj = new THREE.Object3D();
            rotObj.rotation.fromArray([0, 0, layer.rot / 180 * Math.PI]);

            const geometry = new THREE.BoxBufferGeometry(layer.w, layer.h, layer.d);
            const wireframe = new THREE.EdgesGeometry(geometry);
            const line = new THREE.Mesh(geometry, selectedMaterial); //new THREE.LineSegments(wireframe, selectedMaterial);

            line.position.x = layer.x;
            line.position.y = layer.y;
            line.position.z = layer.z;

            rotObj.add(line);

            const stackObj = stackMap.get(layer.sec * 5 + layer.stk);

            stackObj.add(rotObj);
        }

        scene.add(detectors);

        // var axesHelper = new THREE.AxesHelper( 500 );
        // scene.add( axesHelper );

        // Tracks
        this.tracks = null;
        this.tracklets = null;

        this.trackGroup = new THREE.Group();
        this.trackletGroup = new THREE.Group();

        scene.add(this.trackletGroup);
        scene.add(this.trackGroup);

        this.animate();
    }

    animate() {

        requestAnimationFrame(this.animate.bind(this));

        this.controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

        this.directionalLight.position.set(this.camera.position.x, this.camera.position.y, this.camera.position.z).normalize();

        this.render();

    }

    resizeCanvasToDisplaySize() {
        const canvas = this.renderer.domElement;
        const width = canvas.clientWidth * window.devicePixelRatio;
        const height = canvas.clientHeight * window.devicePixelRatio;

        if (canvas.width !== width || canvas.height !== height) {
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(width, height, false);

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    render() {
        if (this.canRender) {
            this.resizeCanvasToDisplaySize();
            this.renderer.render(this.scene, this.camera);
        }
    }

    toggleDetectors() {
        this.detectorMode = (this.detectorMode + 1) % 3;

        this.updateDetectors();

        this.render();

        return this.detectorMode;
    }

    updateDetectors() {
        this.stackMap.forEach((object, stack) => {
            if (this.detectorMode == 0) {
                // Hide all detectors
                object.visible = false;
            }
            else if (this.detectorMode == 1) {
                // Show selected stack and sector
                object.visible = this.selectedTrack == null || (stack % 5) == this.selectedTrack.stk || Math.floor(stack / 5) == this.selectedTrack.sec;
            }
            else if (this.detectorMode == 2) {
                // Show only selected module
                object.visible = this.selectedTrack == null || (stack == this.selectedTrack.sec * 5 + this.selectedTrack.stk);
            }
        });
    }

    toggleTracklets() {
        this.trackletGroup.visible = !this.trackletGroup.visible;
        this.render();
        return this.trackletGroup.visible;
    }

    toggleTracks() {
        this.trackGroup.visible = !this.trackGroup.visible;
        this.render();
        return this.trackGroup.visible;
    }

    toggleRotation() {
        return this.controls.autoRotate = !this.controls.autoRotate;
    }

    resetControls() {
        this.controls.reset();
    }

    draw(eventData) {
        if (!this.canRender) return;

        if (this.tracks != null) this.trackGroup.remove(this.tracks);
        if (this.tracklets != null) this.trackletGroup.remove(this.tracklets);

        if (eventData.event != null && eventData.event.tracks != null) {
            this.tracks = new THREE.Group();
            this.tracklets = new THREE.Group();

            const selectedMaterial = new THREE.LineBasicMaterial({ color: 0x3392e3 });
            const unselectedMaterial = new THREE.LineBasicMaterial({ color: 0xb37ce5, opacity: 0.5, transparent: true });
            const esdMaterial = new THREE.LineBasicMaterial({ color: 0xdbebf9, opacity: 0.5, transparent: true });

            const selectedTrackletMaterial = new THREE.LineBasicMaterial({ color: 0xf03b20 });
            const matchedTrackletMaterial = new THREE.LineBasicMaterial({ color: 0xfaa535 });
            const otherTrackletMaterial = new THREE.LineBasicMaterial({ color: 0xf5d443 });

            const selectedId = (eventData.track != null) ? eventData.track.id : null;
            const selectedStack = (eventData.track != null) ? eventData.track.stk : null;

            for (const track of eventData.event.tracks) {
                {
                    let material;
                    if (selectedId == null)
                        material = selectedMaterial;
                    else if (selectedId == track.id)
                        material = selectedMaterial;
                    else if (track.typ == "Trd")
                        material = unselectedMaterial;
                    else material = esdMaterial;

                    this.tracks.add(this.createLineObject3D(track, material));

                    if (selectedId != null) {
                        for (const tracklet of track.trklts) {
                            this.tracklets.add(this.createLineObject3D(tracklet, selectedId == track.id ? selectedTrackletMaterial : matchedTrackletMaterial));
                        }
                    }
                }
            }

            if (selectedId == null)
                for (const tracklet of eventData.event.trklts)
                    this.tracklets.add(this.createLineObject3D(tracklet, selectedTrackletMaterial));
            else for (const tracklet of eventData.event.trklts)
                if (tracklet.trk == null)
                    this.tracklets.add(this.createLineObject3D(tracklet, otherTrackletMaterial));

            this.trackletGroup.add(this.tracklets);
            this.trackGroup.add(this.tracks);
        }
        else {
            this.tracks = null;
        }

        if (eventData != null && eventData.track != null)
            this.selectedTrack = eventData.track;
        else this.selectedTrack = null;

        this.updateDetectors();

        this.render();
    }

    createLineObject3D(obj, material) {
        if (obj.line == null)
            if (obj.path3d != null) {
                const geometry = new THREE.BufferGeometry();
                const vertices = new Float32Array(obj.path3d);
                geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
                obj.line = new THREE.Line(geometry, material);
            }
            else throw "no path3d exists on object";
        else obj.line.material = material;

        return obj.line;
    }
}

export { ThreejsComponent };