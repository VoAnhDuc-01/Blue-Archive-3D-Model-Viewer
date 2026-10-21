/**
 * BLUE ARCHIVE 3D MODEL VIEWER - MAIN APPLICATION LOGIC
 * Re-architected with direct model selector, rock-solid camera controls, and robust error resilience.
 */

(function () {
    "use strict";

    // Application Configuration & State
    const CONFIG = {
        modelDirCandidates: ["BlueArchiveModel/", "./BlueArchiveModel/", "/ba-model-viewer/BlueArchiveModel/", "/BlueArchiveModel/", "../BlueArchiveModel/"],
        defaultStudent: "Yuuka",
        defaultModelFile: "Yuuka.glb"
    };

    const state = {
        studentsData: null,
        currentStudent: null,
        currentModel: null,
        partnerStudent: null,
        partnerModel: null,
        isAddPartnerMode: false,
        theme: localStorage.getItem("ba_theme") || "dark",
        stageMode: parseInt(localStorage.getItem("ba_stage") || "0", 10), // 0: Podium, 1: Studio, 2: Grid, 3: Clear
        isTurntable: false,
        isWireframe: false,
        isPlaying: false,
        isLooping: true,
        playbackSpeed: 1.0,
        activeSchoolFilter: "All",
        currentAnimGroup: null,
        isScrubbing: false,
        isTrackPanelOpen: true
    };

    // DOM Elements Cache
    const elements = {
        canvas: document.getElementById("renderCanvas"),
        app: document.getElementById("app"),
        loadingOverlay: document.getElementById("loadingOverlay"),
        loadingTitle: document.getElementById("loadingTitle"),
        loadingSubtitle: document.getElementById("loadingSubtitle"),
        loadingBarFill: document.getElementById("loadingBarFill"),
        toastContainer: document.getElementById("toastContainer"),

        // Toolbar
        btnMenu: document.getElementById("btnMenu"),
        btnTheme: document.getElementById("btnTheme"),
        imgThemeDark: document.getElementById("imgThemeDark"),
        imgThemeLight: document.getElementById("imgThemeLight"),
        btnStage: document.getElementById("btnStage"),
        btnSkin: document.getElementById("btnSkin"),
        imgSkin: document.getElementById("imgSkin"),
        skinCountBadge: document.getElementById("skinCountBadge"),
        btnMotion: document.getElementById("btnMotion"),
        imgMotion: document.getElementById("imgMotion"),
        btnAddPartner: document.getElementById("btnAddPartner"),
        imgAddPartner: document.getElementById("imgAddPartner"),
        imgRemovePartner: document.getElementById("imgRemovePartner"),
        btnTurntable: document.getElementById("btnTurntable"),
        imgTurntable: document.getElementById("imgTurntable"),
        btnResetCamera: document.getElementById("btnResetCamera"),
        btnReference: document.getElementById("btnReference"),
        imgReference: document.getElementById("imgReference"),
        btnWireframe: document.getElementById("btnWireframe"),

        // Character Name Overlay
        charNameOverlay: document.getElementById("charNameOverlay"),
        charPrimaryName: document.getElementById("charPrimaryName"),
        charPartnerName: document.getElementById("charPartnerName"),
        charSchoolTag: document.getElementById("charSchoolTag"),
        costumePills: document.getElementById("costumePills"),

        // Brand & Help
        btnBaLogo: document.getElementById("btnBaLogo"),
        btnSupport: document.getElementById("btnSupport"),

        // Animation Playbar (TrackPanel)
        trackPanel: document.getElementById("trackPanel"),
        btnPlayPause: document.getElementById("btnPlayPause"),
        iconPlay: document.getElementById("iconPlay"),
        iconPause: document.getElementById("iconPause"),
        timelineSlider: document.getElementById("timelineSlider"),
        timeCounter: document.getElementById("timeCounter"),
        animSelect: document.getElementById("animSelect"),
        bgmSelect: document.getElementById("bgmSelect"),
        btnSpeed: document.getElementById("btnSpeed"),
        btnLoop: document.getElementById("btnLoop"),
        btnTogglePlaybar: document.getElementById("btnTogglePlaybar"),

        // Character Panel (Roster Modal)
        characterPanel: document.getElementById("characterPanel"),
        modalCloseBtn: document.getElementById("modalCloseBtn"),
        modalModeSubtitle: document.getElementById("modalModeSubtitle"),
        schoolTabs: document.getElementById("schoolTabs"),
        rosterCountText: document.getElementById("rosterCountText"),
        studentGrid: document.getElementById("studentGrid"),

        // Help Modal
        helpModal: document.getElementById("helpModal"),
        helpCloseBtn: document.getElementById("helpCloseBtn"),

        // Buy Me a Coffee Modal
        coffeeModal: document.getElementById("coffeeModal"),
        coffeeCloseBtn: document.getElementById("coffeeCloseBtn"),
        btnCopyStk: document.getElementById("btnCopyStk"),
        stkNumber: document.getElementById("stkNumber")
    };

    // 3D Scene Variables
    let engine = null;
    let scene = null;
    let camera = null;
    let dirLight = null;
    let hemiLight = null;
    let fillLight = null;
    let shadowGenerator = null;

    let stageRoot = null;
    let stagePodium = null;
    let stageRing = null;
    let stageGrid = null;

    let primaryContainer = null;
    let primaryRootNode = null;
    let partnerContainer = null;
    let partnerRootNode = null;

    let resolvedModelPrefix = "../BlueArchiveModel/";

    /** Show Notification Toast */
    function showToast(text) {
        if (!elements.toastContainer) return;
        const toast = document.createElement("div");
        toast.className = "toast-msg";
        toast.textContent = text;
        elements.toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    /** Update Loading Screen */
    function updateLoading(percent, title, subtitle) {
        if (title && elements.loadingTitle) elements.loadingTitle.textContent = title;
        if (subtitle && elements.loadingSubtitle) elements.loadingSubtitle.textContent = subtitle;
        if (elements.loadingBarFill) {
            elements.loadingBarFill.style.width = Math.min(100, Math.max(0, percent)) + "%";
        }
        if (percent >= 100) {
            setTimeout(() => {
                if (elements.loadingOverlay) elements.loadingOverlay.classList.remove("visible");
            }, 250);
        } else {
            if (elements.loadingOverlay) elements.loadingOverlay.classList.add("visible");
        }
    }

    /** Probe Valid Model Directory */
    async function determineModelPrefix() {
        if (window.location.protocol === "file:") {
            resolvedModelPrefix = "BlueArchiveModel/";
            return;
        }
        for (const candidate of CONFIG.modelDirCandidates) {
            try {
                const testUrl = candidate + encodeURIComponent(CONFIG.defaultModelFile);
                const resp = await fetch(testUrl, { method: "HEAD" });
                if (resp.ok) {
                    resolvedModelPrefix = candidate;
                    return;
                }
            } catch (e) {
                // continue probing
            }
        }
        resolvedModelPrefix = "BlueArchiveModel/";
    }

    /**
     * Direct pointer controls for canvas.
     * Guarantees 100% reliable camera rotation, panning, and zooming regardless of browser nuances.
     */
    function attachDirectPointerControls(cam, canvas) {
        let isOrbiting = false;
        let isPanning = false;
        let lastX = 0;
        let lastY = 0;
        const activePointers = new Map();

        canvas.addEventListener("pointerdown", (e) => {
            canvas.focus();
            try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (activePointers.size === 1) {
                if (e.button === 0) {
                    // Left click -> Rotate Orbit
                    isOrbiting = true;
                    isPanning = false;
                } else if (e.button === 1 || e.button === 2) {
                    // Middle / Right click -> Pan
                    isPanning = true;
                    isOrbiting = false;
                }
                lastX = e.clientX;
                lastY = e.clientY;
            } else if (activePointers.size >= 2) {
                isOrbiting = false;
                isPanning = true;
            }
        });

        canvas.addEventListener("pointermove", (e) => {
            if (!activePointers.has(e.pointerId)) return;
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

            if (activePointers.size === 1) {
                const dx = e.clientX - lastX;
                const dy = e.clientY - lastY;
                lastX = e.clientX;
                lastY = e.clientY;

                if (isOrbiting) {
                    // Smooth, responsive rotation
                    cam.alpha -= dx * 0.006;
                    cam.beta -= dy * 0.006;
                    cam.beta = Math.max(0.05, Math.min(Math.PI - 0.05, cam.beta));
                } else if (isPanning) {
                    // Panning in camera coordinate space
                    const factor = (cam.radius || 2.5) * 0.0016;
                    const forward = cam.target.subtract(cam.position).normalize();
                    const right = BABYLON.Vector3.Cross(forward, cam.upVector).normalize();
                    const up = BABYLON.Vector3.Cross(right, forward).normalize();

                    cam.target.addInPlace(right.scale(-dx * factor));
                    cam.target.addInPlace(up.scale(dy * factor));
                }
            } else if (activePointers.size === 2) {
                // Two-finger touch gesture: pinch zoom & pan
                const pts = Array.from(activePointers.values());
                const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                if (canvas._lastPinchDist) {
                    const diff = curDist - canvas._lastPinchDist;
                    cam.radius = Math.max(0.3, Math.min(25, cam.radius - diff * 0.01));
                }
                canvas._lastPinchDist = curDist;
            }
        });

        const releasePointer = (e) => {
            activePointers.delete(e.pointerId);
            canvas._lastPinchDist = null;
            try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
            if (activePointers.size === 0) {
                isOrbiting = false;
                isPanning = false;
            }
        };

        canvas.addEventListener("pointerup", releasePointer);
        canvas.addEventListener("pointercancel", releasePointer);
        canvas.addEventListener("pointerleave", releasePointer);

        // Smooth Mouse Wheel Zoom
        canvas.addEventListener("wheel", (e) => {
            e.preventDefault();
            const factor = (cam.radius || 2.5) * 0.0015;
            const delta = e.deltaY * factor;
            cam.radius = Math.max(cam.lowerRadiusLimit || 0.3, Math.min(cam.upperRadiusLimit || 25, cam.radius + delta));
        }, { passive: false });

        // Prevent context menu so right drag pans effortlessly
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    }

    /** Initialize Babylon.js 3D Engine & Scene */
    function init3D() {
        if (typeof BABYLON === "undefined") {
            throw new Error("Babylon.js is not loaded. Check internet connection for CDN scripts.");
        }

        engine = new BABYLON.Engine(elements.canvas, true, {
            preserveDrawingBuffer: true,
            stencil: true,
            antialias: true,
            powerPreference: "high-performance"
        });

        scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0.025, 0.043, 0.067, 1.0); // Kivotos Night
        scene.useRightHandedSystem = false;

        // Camera Setup
        camera = new BABYLON.ArcRotateCamera(
            "mainCam",
            -Math.PI / 2,   // Alpha: facing front
            Math.PI / 2.3,  // Beta: slightly elevated
            2.6,            // Radius: comfortable framing
            new BABYLON.Vector3(0, 0.45, 0), // Target: student chest
            scene
        );

        camera.attachControl(elements.canvas, false);
        camera.wheelPrecision = 25;
        camera.wheelDeltaPercentage = 0.08;
        camera.pinchPrecision = 25;
        camera.inertia = 0.75;
        camera.panningSensibility = 600;
        camera.angularSensibilityX = 700;
        camera.angularSensibilityY = 700;
        camera.lowerRadiusLimit = 0.25;
        camera.upperRadiusLimit = 25.0;
        camera.lowerBetaLimit = 0.05;
        camera.upperBetaLimit = Math.PI - 0.05;
        camera.useCtrlForPanning = false;

        // Attach direct pointer controls for fail-safe mouse rotation
        attachDirectPointerControls(camera, elements.canvas);

        // Lighting Rig
        hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 1.15;
        hemiLight.diffuse = new BABYLON.Color3(0.96, 0.98, 1.0);
        hemiLight.groundColor = new BABYLON.Color3(0.25, 0.3, 0.4);

        dirLight = new BABYLON.DirectionalLight("dirLight", new BABYLON.Vector3(-1, -2, -1.2), scene);
        dirLight.position = new BABYLON.Vector3(2.5, 4.5, 3);
        dirLight.intensity = 1.35;
        dirLight.diffuse = new BABYLON.Color3(1.0, 0.98, 0.95);

        fillLight = new BABYLON.DirectionalLight("fillLight", new BABYLON.Vector3(1, -1, 1), scene);
        fillLight.intensity = 0.5;
        fillLight.diffuse = new BABYLON.Color3(0.65, 0.85, 1.0);

        // Shadows
        try {
            shadowGenerator = new BABYLON.ShadowGenerator(1024, dirLight);
            shadowGenerator.useBlurExponentialShadowMap = true;
            shadowGenerator.blurKernel = 16;
            shadowGenerator.darkness = 0.45;
        } catch (e) {
            console.warn("ShadowGenerator fallback:", e);
        }

        // Create Environment Stages using ONLY StandardMaterial
        createStageMeshes();

        // Render Loop
        engine.runRenderLoop(() => {
            // Auto 360° Turntable spin
            if (state.isTurntable && camera) {
                camera.alpha += 0.0075;
            }

            // Scrubber animation update
            if (state.isPlaying && state.currentAnimGroup && !state.isScrubbing) {
                const cur = state.currentAnimGroup.animatables[0]?.masterFrame ?? 0;
                const from = state.currentAnimGroup.from;
                const to = state.currentAnimGroup.to;
                if (to > from) {
                    const pct = ((cur - from) / (to - from)) * 100;
                    if (elements.timelineSlider) elements.timelineSlider.value = pct;
                    updateTimeDisplay(cur - from, to - from);
                }
            }

            scene.render();
        });

        window.addEventListener("resize", () => {
            if (engine) engine.resize();
        });
    }

    /** Create Environment & Stage Meshes (Pure StandardMaterial, zero crashes) */
    function createStageMeshes() {
        stageRoot = new BABYLON.TransformNode("stageRoot", scene);

        // 1. Circular Podium (Stage)
        stagePodium = BABYLON.MeshBuilder.CreateCylinder("stagePodium", {
            diameter: 3.2,
            height: 0.08,
            tessellation: 64
        }, scene);
        stagePodium.position.y = -0.04;
        stagePodium.parent = stageRoot;

        const podiumMat = new BABYLON.StandardMaterial("podiumMat", scene);
        podiumMat.diffuseColor = new BABYLON.Color3(0.1, 0.16, 0.24);
        podiumMat.specularColor = new BABYLON.Color3(0.2, 0.3, 0.4);
        stagePodium.material = podiumMat;
        stagePodium.receiveShadows = true;

        // 2. Glowing Halo Ring
        stageRing = BABYLON.MeshBuilder.CreateTorus("stageRing", {
            diameter: 3.1,
            thickness: 0.04,
            tessellation: 64
        }, scene);
        stageRing.position.y = 0.005;
        stageRing.parent = stageRoot;

        const ringMat = new BABYLON.StandardMaterial("ringMat", scene);
        ringMat.emissiveColor = new BABYLON.Color3(0.0, 0.68, 0.94); // Schale Cyan
        ringMat.disableLighting = true;
        stageRing.material = ringMat;

        // 3. Ground Disc / Studio Floor
        stageGrid = BABYLON.MeshBuilder.CreateDisc("stageGrid", {
            radius: 12,
            tessellation: 64
        }, scene);
        stageGrid.rotation.x = Math.PI / 2;
        stageGrid.position.y = -0.041;
        stageGrid.parent = stageRoot;

        const floorMat = new BABYLON.StandardMaterial("floorMat", scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.04, 0.07, 0.11);
        floorMat.specularColor = new BABYLON.Color3(0.1, 0.15, 0.2);
        stageGrid.material = floorMat;
        stageGrid.receiveShadows = true;

        applyStageMode(state.stageMode);
    }

    /** Apply Stage Mode */
    function applyStageMode(mode) {
        state.stageMode = mode;
        try { localStorage.setItem("ba_stage", mode); } catch (_) {}

        if (!stagePodium || !stageRing || !stageGrid) return;

        if (mode === 0) {
            // Podium Stage
            stagePodium.setEnabled(true);
            stageRing.setEnabled(true);
            stageGrid.setEnabled(true);
            if (stageGrid.material) stageGrid.material.alpha = 1.0;
        } else if (mode === 1) {
            // Studio Floor
            stagePodium.setEnabled(false);
            stageRing.setEnabled(false);
            stageGrid.setEnabled(true);
            if (stageGrid.material) stageGrid.material.alpha = 0.8;
        } else if (mode === 2) {
            // Cyber Grid
            stagePodium.setEnabled(false);
            stageRing.setEnabled(true);
            stageGrid.setEnabled(true);
            if (stageGrid.material) stageGrid.material.alpha = 1.0;
        } else {
            // Clear / Transparent
            stagePodium.setEnabled(false);
            stageRing.setEnabled(false);
            stageGrid.setEnabled(false);
        }
    }

    /** Apply Theme */
    function applyTheme(theme) {
        state.theme = theme;
        try { localStorage.setItem("ba_theme", theme); } catch (_) {}

        if (theme === "light") {
            document.body.classList.add("light-mode");
            if (elements.imgThemeDark) elements.imgThemeDark.style.display = "none";
            if (elements.imgThemeLight) elements.imgThemeLight.style.display = "block";
            if (scene) scene.clearColor = new BABYLON.Color4(0.9, 0.94, 0.97, 1.0);
            if (hemiLight) {
                hemiLight.diffuse = new BABYLON.Color3(1.0, 1.0, 1.0);
                hemiLight.groundColor = new BABYLON.Color3(0.65, 0.75, 0.85);
            }
        } else {
            document.body.classList.remove("light-mode");
            if (elements.imgThemeDark) elements.imgThemeDark.style.display = "block";
            if (elements.imgThemeLight) elements.imgThemeLight.style.display = "none";
            if (scene) scene.clearColor = new BABYLON.Color4(0.025, 0.043, 0.067, 1.0);
            if (hemiLight) {
                hemiLight.diffuse = new BABYLON.Color3(0.96, 0.98, 1.0);
                hemiLight.groundColor = new BABYLON.Color3(0.25, 0.3, 0.4);
            }
        }
        updateToolbarIcons();
        applyStageMode(state.stageMode);
    }

    let bgmAudio = null;

    /** Play or Stop Background Music */
    function playBGM(src) {
        if (bgmAudio) {
            bgmAudio.pause();
            bgmAudio = null;
        }
        if (!src) return;
        bgmAudio = new Audio(src);
        bgmAudio.loop = true;
        bgmAudio.volume = 0.45;
        bgmAudio.play().catch(e => console.warn("BGM playback notice:", e));
    }

    /** Update Toolbar Icons based on Dark/Light mode */
    function updateToolbarIcons() {
        const isDark = state.theme === "dark";
        const suffix = isDark ? "_light.png" : ".png";
        const basePath = "res/assets/";

        if (elements.imgSkin) elements.imgSkin.src = `${basePath}alter${suffix}`;
        if (elements.imgMotion) elements.imgMotion.src = `${basePath}note${suffix}`;
        if (elements.imgAddPartner) elements.imgAddPartner.src = `${basePath}add${suffix}`;
        if (elements.imgRemovePartner) elements.imgRemovePartner.src = `${basePath}delete${suffix}`;
        if (elements.imgTurntable) elements.imgTurntable.src = `${basePath}physics${suffix}`;
        if (elements.imgReference) elements.imgReference.src = `${basePath}reference${suffix}`;
    }

    /** Load a Student Model (Primary or Partner) */
    async function loadStudentModel(modelInfo, isPartner = false) {
        if (!modelInfo || !modelInfo.file) return;
        const studentName = modelInfo.studentName || state.currentStudent?.name || "Student";
        const variantName = modelInfo.variant || "Default";
        const filename = modelInfo.file;

        updateLoading(15, `DEPLOYING ${studentName.toUpperCase()}...`, `Fetching 3D asset (${modelInfo.sizeMB || 0} MB)...`);

        try {
            const rootUrl = resolvedModelPrefix;

            // Dispose previous container
            if (isPartner) {
                if (partnerContainer) { partnerContainer.dispose(); partnerContainer = null; }
                if (partnerRootNode) { partnerRootNode.dispose(); partnerRootNode = null; }
            } else {
                if (primaryContainer) { primaryContainer.dispose(); primaryContainer = null; }
                if (primaryRootNode) { primaryRootNode.dispose(); primaryRootNode = null; }
            }

            // Universal LoadAssetContainerAsync call
            const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(rootUrl, filename, scene, (event) => {
                if (event.lengthComputable && event.total > 0) {
                    const pct = Math.floor((event.loaded / event.total) * 75) + 15;
                    updateLoading(pct, `DEPLOYING ${studentName.toUpperCase()}...`, `${Math.floor(event.loaded / 1024 / 1024 * 10) / 10} MB / ${Math.floor(event.total / 1024 / 1024 * 10) / 10} MB`);
                }
            });

            // Add elements to scene
            container.addAllToScene();

            // Create root transform node for positioning
            const rootNode = new BABYLON.TransformNode(isPartner ? "partnerRoot" : "primaryRoot", scene);
            container.meshes.forEach(m => {
                if (!m.parent) m.parent = rootNode;
                if (shadowGenerator && m.getTotalVertices && m.getTotalVertices() > 0) {
                    shadowGenerator.addShadowCaster(m, true);
                    m.receiveShadows = true;
                }
            });

            // Calculate bounding box to align feet to ground (y = 0)
            const hierarchyBounds = rootNode.getHierarchyBoundingVectors(true);
            const minY = hierarchyBounds.min.y;
            const maxY = hierarchyBounds.max.y;
            const modelHeight = Math.max(0.5, maxY - minY);

            // Offset Y so feet touch ground
            rootNode.position.y = -minY;

            // Position X depending on single or dual mode
            if (isPartner) {
                partnerContainer = container;
                partnerRootNode = rootNode;
                partnerRootNode.position.x = 0.55;
                if (primaryRootNode) primaryRootNode.position.x = -0.55;
                camera.radius = 3.2;
                camera.target.set(0, 0.45, 0);
            } else {
                primaryContainer = container;
                primaryRootNode = rootNode;
                if (partnerRootNode) {
                    primaryRootNode.position.x = -0.55;
                } else {
                    primaryRootNode.position.x = 0;
                    camera.target.set(0, Math.max(0.35, modelHeight * 0.45), 0);
                    camera.radius = Math.max(1.8, modelHeight * 2.2);
                    camera.alpha = -Math.PI / 2;
                    camera.beta = Math.PI / 2.3;
                }
            }

            // Setup animations if loading primary model
            if (!isPartner) {
                setupAnimations(container.animationGroups);
            } else {
                if (container.animationGroups && container.animationGroups.length > 0) {
                    const idleAnim = container.animationGroups.find(a => /idle/i.test(a.name)) || container.animationGroups[0];
                    idleAnim.play(true);
                }
            }

            // Wireframe state
            if (state.isWireframe) applyWireframe(true);

            updateLoading(100, "DEPLOYED SUCCESSFULLY", `${studentName} is ready.`);
            showToast(`${studentName} (${variantName}) loaded.`);

            updateUIInfo();
        } catch (error) {
            console.error("Failed to load model:", error);
            updateLoading(100);
            showToast(`Error loading ${studentName}: ${error.message || "File not found"}`);
        }
    }

    /** Setup Animation Groups */
    function setupAnimations(animGroups) {
        state.currentAnimGroup = null;
        elements.animSelect.innerHTML = "";

        if (!animGroups || animGroups.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No In-Model Animations";
            elements.animSelect.appendChild(opt);
            elements.timeCounter.textContent = "00:00 / 00:00";
            elements.timelineSlider.value = 0;
            return;
        }

        // Categorize animations
        const categories = {
            "Idle & Poses": [],
            "Combat & Skills": [],
            "Cafe Interactions": [],
            "Movement": [],
            "Victory & Reactions": [],
            "Other": []
        };

        animGroups.forEach((ag, idx) => {
            const name = ag.name;
            if (/cafe/i.test(name)) {
                categories["Cafe Interactions"].push({ ag, idx });
            } else if (/formation|idle|public/i.test(name)) {
                categories["Idle & Poses"].push({ ag, idx });
            } else if (/attack|exs|callsign|reload|kneel|stand|vital/i.test(name)) {
                categories["Combat & Skills"].push({ ag, idx });
            } else if (/walk|run|move|jump/i.test(name)) {
                categories["Movement"].push({ ag, idx });
            } else if (/victory|reaction|rearrange/i.test(name)) {
                categories["Victory & Reactions"].push({ ag, idx });
            } else {
                categories["Other"].push({ ag, idx });
            }
        });

        // Populate Select with Optgroups
        for (const [catName, list] of Object.entries(categories)) {
            if (list.length === 0) continue;
            const optGroup = document.createElement("optgroup");
            optGroup.label = `${catName} (${list.length})`;
            list.forEach(({ ag, idx }) => {
                const opt = document.createElement("option");
                opt.value = idx;
                opt.textContent = ag.name.replace(/_/g, " ");
                optGroup.appendChild(opt);
            });
            elements.animSelect.appendChild(optGroup);
        }

        // Preferred default animation
        const preferred = animGroups.find(a => /formation_idle/i.test(a.name))
            || animGroups.find(a => /cafe_idle/i.test(a.name))
            || animGroups.find(a => /normal_idle/i.test(a.name))
            || animGroups.find(a => /idle/i.test(a.name))
            || animGroups[0];

        const defaultIdx = animGroups.indexOf(preferred);
        elements.animSelect.value = defaultIdx >= 0 ? defaultIdx : 0;
        playAnimation(animGroups[defaultIdx >= 0 ? defaultIdx : 0]);
    }

    /** Play Specific Animation Group */
    function playAnimation(animGroup) {
        if (!animGroup) return;

        if (primaryContainer && primaryContainer.animationGroups) {
            primaryContainer.animationGroups.forEach(ag => ag.stop());
        }

        state.currentAnimGroup = animGroup;
        animGroup.speedRatio = state.playbackSpeed;
        animGroup.play(state.isLooping);

        state.isPlaying = true;
        updatePlayPauseButton(true);
        if (elements.app) elements.app.classList.add("is-playing");
    }

    /** Pause Animation */
    function pauseAnimation() {
        if (state.currentAnimGroup) {
            state.currentAnimGroup.pause();
        }
        state.isPlaying = false;
        updatePlayPauseButton(false);
        if (elements.app) elements.app.classList.remove("is-playing");
    }

    /** Update Play/Pause Button Visuals */
    function updatePlayPauseButton(isPlaying) {
        if (elements.iconPlay && elements.iconPause) {
            elements.iconPlay.style.display = isPlaying ? "none" : "block";
            elements.iconPause.style.display = isPlaying ? "block" : "none";
        }
    }

    /** Update Time Display */
    function updateTimeDisplay(currentFrame, totalFrames) {
        if (!elements.timeCounter) return;
        const curSec = Math.floor(currentFrame / 30);
        const totSec = Math.floor(totalFrames / 30);
        const fmt = s => {
            const m = Math.floor(s / 60).toString().padStart(2, "0");
            const sec = (s % 60).toString().padStart(2, "0");
            return `${m}:${sec}`;
        };
        elements.timeCounter.textContent = `${fmt(curSec)} / ${fmt(totSec)}`;
    }

    /** Apply Wireframe Mode */
    function applyWireframe(enabled) {
        state.isWireframe = enabled;
        const containers = [primaryContainer, partnerContainer];
        containers.forEach(cont => {
            if (!cont) return;
            cont.materials.forEach(mat => {
                mat.wireframe = enabled;
            });
        });
        if (elements.btnWireframe) {
            if (enabled) elements.btnWireframe.classList.add("is-active");
            else elements.btnWireframe.classList.remove("is-active");
        }
    }

    /** Cycle Costume (Alter Button) */
    function cycleCostume() {
        if (!state.currentStudent || !state.currentStudent.models || state.currentStudent.models.length <= 1) {
            showToast(`${state.currentStudent?.name || "Student"} has only 1 model.`);
            return;
        }
        const currentIdx = state.currentStudent.models.findIndex(m => m.file === state.currentModel.file);
        const nextIdx = (currentIdx + 1) % state.currentStudent.models.length;
        state.currentModel = state.currentStudent.models[nextIdx];
        loadStudentModel(state.currentModel, false);
    }

    /** Change Selected Student / Model */
    function changeStudent(student, modelIndex = 0) {
        const targetModel = student.models[modelIndex] || student.models[0];
        if (state.isAddPartnerMode) {
            state.partnerStudent = student;
            state.partnerModel = targetModel;
            state.isAddPartnerMode = false;
            closeRosterModal();
            loadStudentModel(state.partnerModel, true);
            return;
        }
        state.currentStudent = student;
        state.currentModel = targetModel;
        closeRosterModal();
        loadStudentModel(state.currentModel, false);
    }

    /** Remove Partner Student */
    function removePartnerStudent() {
        if (partnerContainer) {
            partnerContainer.dispose();
            partnerContainer = null;
        }
        if (partnerRootNode) {
            partnerRootNode.dispose();
            partnerRootNode = null;
        }
        state.partnerStudent = null;
        state.partnerModel = null;
        if (primaryRootNode) primaryRootNode.position.x = 0;
        updateUIInfo();
        showToast("Partner student removed.");
    }

    /** Update UI Info Overlay & Controls */
    function updateUIInfo() {
        if (!state.currentStudent || !state.currentModel) return;

        // Student Primary Name
        if (elements.charPrimaryName) {
            elements.charPrimaryName.textContent = state.currentStudent.name;
        }

        // Partner Student Name
        if (elements.charPartnerName) {
            if (state.partnerStudent) {
                elements.charPartnerName.textContent = `+ ${state.partnerStudent.name}`;
                elements.charPartnerName.style.display = "inline";
                if (elements.imgAddPartner) elements.imgAddPartner.style.display = "none";
                if (elements.imgRemovePartner) elements.imgRemovePartner.style.display = "block";
            } else {
                elements.charPartnerName.style.display = "none";
                if (elements.imgAddPartner) elements.imgAddPartner.style.display = "block";
                if (elements.imgRemovePartner) elements.imgRemovePartner.style.display = "none";
            }
        }

        // School Tag
        if (elements.charSchoolTag) {
            elements.charSchoolTag.textContent = state.currentStudent.school || "Kivotos";
            const schoolClean = (state.currentStudent.school || "Millennium").replace(/[^a-zA-Z]/g, "");
            elements.charSchoolTag.className = `school-pill school-${schoolClean}`;
        }

        // Costume Badge on Toolbar Alter Button
        if (elements.skinCountBadge) {
            const count = state.currentStudent.models.length;
            if (count > 1) {
                elements.skinCountBadge.textContent = count;
                elements.skinCountBadge.style.display = "block";
            } else {
                elements.skinCountBadge.style.display = "none";
            }
        }

        // Direct Quick Costume Buttons beside student name
        if (elements.costumePills) {
            elements.costumePills.innerHTML = "";
            state.currentStudent.models.forEach((m, idx) => {
                const btn = document.createElement("button");
                btn.className = `costume-quick-btn ${m.file === state.currentModel.file ? "active" : ""}`;
                btn.textContent = m.variant;
                btn.title = `Switch to ${m.variant}`;
                btn.onclick = () => {
                    if (m.file !== state.currentModel.file) {
                        state.currentModel = m;
                        loadStudentModel(m, false);
                    }
                };
                elements.costumePills.appendChild(btn);
            });
        }
    }

    /** Open Roster Modal (3 horizontal bars click) */
    function openRosterModal(isPartnerMode = false) {
        state.isAddPartnerMode = isPartnerMode;
        if (elements.modalModeSubtitle) {
            elements.modalModeSubtitle.textContent = isPartnerMode 
                ? "CHỌN HỌC SINH THỨ 2 (GHÉP ĐÔI BÊN CẠNH)" 
                : "BẤM VÀO MODEL ĐỂ HIỂN THỊ NGAY";
        }
        renderRosterGrid();
        if (elements.characterPanel) {
            elements.characterPanel.classList.add("open");
        }
    }

    /** Close Roster Modal */
    function closeRosterModal() {
        if (elements.characterPanel) {
            elements.characterPanel.classList.remove("open");
        }
    }

    /** Render Student Roster Grid (Direct cards with instant model buttons) */
    function renderRosterGrid() {
        if (!elements.studentGrid) return;
        elements.studentGrid.innerHTML = "";

        if (!state.studentsData || !state.studentsData.students) {
            elements.studentGrid.innerHTML = "<div style='padding:30px;color:#8da4be;'>Đang tải dữ liệu học sinh...</div>";
            return;
        }

        let students = state.studentsData.students;

        // Filter by school tab
        if (state.activeSchoolFilter !== "All") {
            students = students.filter(s => s.school === state.activeSchoolFilter);
        }

        if (elements.rosterCountText) {
            const totalModels = students.reduce((sum, s) => sum + s.models.length, 0);
            elements.rosterCountText.textContent = `${students.length} học sinh (${totalModels} models 3D)`;
        }

        students.forEach(student => {
            const card = document.createElement("div");
            const isCurrent = state.currentStudent && state.currentStudent.name === student.name;
            card.className = `student-card ${isCurrent ? "is-active" : ""}`;

            const initials = student.name.slice(0, 2).toUpperCase();

            // Header (Avatar initials + Student Name + School)
            const header = document.createElement("div");
            header.className = "student-card-header";
            header.innerHTML = `
                <div class="student-avatar-thumb">${initials}</div>
                <div class="student-card-details">
                    <div class="student-card-name">${student.name}</div>
                    <div class="student-card-school">${student.school}</div>
                </div>
            `;
            // Clicking header loads default model
            header.onclick = () => changeStudent(student, 0);
            card.appendChild(header);

            // Models / Costumes List inside the card
            const modelsGroup = document.createElement("div");
            modelsGroup.className = "models-list-group";

            student.models.forEach((m, idx) => {
                const btn = document.createElement("button");
                const isSelected = isCurrent && state.currentModel && state.currentModel.file === m.file;
                btn.className = `model-pick-btn ${isSelected ? "active" : ""}`;
                btn.innerHTML = `
                    <span>${m.variant}</span>
                    <span class="model-pick-size">${m.sizeMB ? m.sizeMB + " MB" : ""}</span>
                `;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    changeStudent(student, idx);
                };
                modelsGroup.appendChild(btn);
            });

            card.appendChild(modelsGroup);
            elements.studentGrid.appendChild(card);
        });
    }

    /** Generate Character Dossier (Turnaround Reference Sheet) */
    async function generateReferenceSheet() {
        if (!state.currentStudent || !state.currentModel || !camera) return;

        showToast("Generating Turnaround Dossier (Reference Sheet)...");
        updateLoading(30, "GENERATING DOSSIER...", "Capturing 4 turnaround angles...");

        const origAlpha = camera.alpha;
        const origBeta = camera.beta;
        const origRadius = camera.radius;
        const origTarget = camera.target.clone();

        camera.beta = Math.PI / 2.3;

        const poses = [
            { label: "FRONT VIEW", alpha: -Math.PI / 2 },
            { label: "LEFT 3/4 VIEW", alpha: -Math.PI / 4 },
            { label: "SIDE VIEW", alpha: 0 },
            { label: "BACK VIEW", alpha: Math.PI / 2 }
        ];

        const captures = [];

        for (let i = 0; i < poses.length; i++) {
            const p = poses[i];
            camera.alpha = p.alpha;
            scene.render();
            await new Promise(r => setTimeout(r, 60));
            const shot = await BABYLON.Tools.CreateScreenshotAsync(engine, camera, { width: 512, height: 720 });
            captures.push({ label: p.label, dataUrl: shot });
            updateLoading(30 + Math.floor(((i + 1) / poses.length) * 50));
        }

        // Restore camera
        camera.alpha = origAlpha;
        camera.beta = origBeta;
        camera.radius = origRadius;
        camera.target.copyFrom(origTarget);

        // Compose final 1920x1080 canvas
        updateLoading(90, "COMPOSING DOSSIER...", "Rendering turnaround layout...");
        const canvas = document.createElement("canvas");
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext("2d");

        // Background
        ctx.fillStyle = "#0c141f";
        ctx.fillRect(0, 0, 1920, 1080);

        // Grid lines
        ctx.strokeStyle = "rgba(0, 173, 239, 0.1)";
        ctx.lineWidth = 1;
        for (let x = 0; x < 1920; x += 60) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1080); ctx.stroke();
        }
        for (let y = 0; y < 1080; y += 60) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1920, y); ctx.stroke();
        }

        // Header Title
        ctx.fillStyle = "#00adef";
        ctx.font = "bold 44px -apple-system, sans-serif";
        ctx.fillText("KIVOTOS STUDENT ARCHIVE // CHARACTER DOSSIER", 70, 90);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px -apple-system, sans-serif";
        ctx.fillText(state.currentStudent.name.toUpperCase(), 70, 138);

        ctx.fillStyle = "#8da4be";
        ctx.font = "20px -apple-system, sans-serif";
        ctx.fillText(`School: ${state.currentStudent.school}    Variant: ${state.currentModel.variant}    File: ${state.currentModel.file}`, 70, 172);

        // Load & draw shots
        const loadImg = src => new Promise(res => {
            const img = new Image();
            img.onload = () => res(img);
            img.src = src;
        });

        const startX = 70;
        const startY = 220;
        const frameW = 415;
        const frameH = 750;
        const gap = 38;

        for (let i = 0; i < captures.length; i++) {
            const img = await loadImg(captures[i].dataUrl);
            const x = startX + i * (frameW + gap);

            ctx.fillStyle = "#121e2c";
            ctx.fillRect(x, startY, frameW, frameH);
            ctx.strokeStyle = "rgba(0, 173, 239, 0.4)";
            ctx.strokeRect(x, startY, frameW, frameH);

            ctx.drawImage(img, x, startY, frameW, frameH);

            // Label
            ctx.fillStyle = "rgba(10, 16, 24, 0.85)";
            ctx.fillRect(x, startY + frameH - 45, frameW, 45);
            ctx.fillStyle = "#00adef";
            ctx.font = "bold 16px monospace";
            ctx.textAlign = "center";
            ctx.fillText(poses[i].label, x + frameW / 2, startY + frameH - 16);
            ctx.textAlign = "left";
        }

        // Watermark Footer
        ctx.fillStyle = "#576d85";
        ctx.font = "14px monospace";
        ctx.fillText(`Blue Archive 3D Asset Dossier • Generated ${new Date().toLocaleDateString()}`, 70, 1030);

        const dl = document.createElement("a");
        dl.download = `${state.currentStudent.name}_${state.currentModel.variant}_Turnaround.png`;
        dl.href = canvas.toDataURL("image/png");
        dl.click();

        updateLoading(100);
        showToast("Turnaround Dossier downloaded successfully!");
    }

    /** Bind Event Listeners - CALLED FIRST SO BUTTONS ALWAYS WORK */
    function bindEvents() {
        // Menu button (3 horizontal bars) -> opens character panel immediately!
        if (elements.btnMenu) {
            elements.btnMenu.onclick = (e) => {
                e.stopPropagation();
                openRosterModal(false);
            };
        }

        // Theme toggle
        if (elements.btnTheme) {
            elements.btnTheme.onclick = (e) => {
                e.stopPropagation();
                applyTheme(state.theme === "dark" ? "light" : "dark");
            };
        }

        // Stage backdrop toggle
        if (elements.btnStage) {
            elements.btnStage.onclick = (e) => {
                e.stopPropagation();
                const nextMode = (state.stageMode + 1) % 4;
                applyStageMode(nextMode);
                const names = ["Podium Stage", "Studio Floor", "Cyber Grid", "Clear Transparent"];
                showToast("Backdrop: " + names[nextMode]);
            };
        }

        // Alter / Costume cycle
        if (elements.btnSkin) {
            elements.btnSkin.onclick = (e) => {
                e.stopPropagation();
                cycleCostume();
            };
        }

        // Motion panel toggle
        if (elements.btnMotion) {
            elements.btnMotion.onclick = (e) => {
                e.stopPropagation();
                state.isTrackPanelOpen = !state.isTrackPanelOpen;
                if (elements.trackPanel) {
                    if (state.isTrackPanelOpen) elements.trackPanel.classList.remove("is-collapsed");
                    else elements.trackPanel.classList.add("is-collapsed");
                }
            };
        }

        // Dual Partner Student button
        if (elements.btnAddPartner) {
            elements.btnAddPartner.onclick = (e) => {
                e.stopPropagation();
                if (state.partnerStudent) {
                    removePartnerStudent();
                } else {
                    openRosterModal(true);
                }
            };
        }

        // Turntable toggle
        if (elements.btnTurntable) {
            elements.btnTurntable.onclick = (e) => {
                e.stopPropagation();
                state.isTurntable = !state.isTurntable;
                if (elements.btnTurntable) {
                    if (state.isTurntable) elements.btnTurntable.classList.add("is-active");
                    else elements.btnTurntable.classList.remove("is-active");
                }
                showToast(state.isTurntable ? "Turntable Spin: ON" : "Turntable Spin: OFF");
            };
        }

        // Reset camera view
        if (elements.btnResetCamera) {
            elements.btnResetCamera.onclick = (e) => {
                e.stopPropagation();
                if (!camera) return;
                camera.alpha = -Math.PI / 2;
                camera.beta = Math.PI / 2.3;
                camera.radius = 2.6;
                camera.target.set(0, 0.45, 0);
                showToast("Camera View Reset");
            };
        }

        // Wireframe toggle
        if (elements.btnWireframe) {
            elements.btnWireframe.onclick = (e) => {
                e.stopPropagation();
                applyWireframe(!state.isWireframe);
            };
        }

        // Reference Sheet Turnaround
        if (elements.btnReference) {
            elements.btnReference.onclick = (e) => {
                e.stopPropagation();
                generateReferenceSheet();
            };
        }

        // Playbar Play/Pause
        if (elements.btnPlayPause) {
            elements.btnPlayPause.onclick = (e) => {
                e.stopPropagation();
                if (state.isPlaying) pauseAnimation();
                else if (state.currentAnimGroup) playAnimation(state.currentAnimGroup);
            };
        }

        // Playbar Animation select
        if (elements.animSelect) {
            elements.animSelect.onchange = (e) => {
                const idx = parseInt(e.target.value, 10);
                if (primaryContainer && primaryContainer.animationGroups && primaryContainer.animationGroups[idx]) {
                    playAnimation(primaryContainer.animationGroups[idx]);
                }
            };
        }

        // BGM Music select
        if (elements.bgmSelect) {
            elements.bgmSelect.onchange = (e) => {
                playBGM(e.target.value);
                if (e.target.value) {
                    const trackName = e.target.options[e.target.selectedIndex].text;
                    showToast(`BGM: ${trackName}`);
                } else {
                    showToast("BGM: Tắt");
                }
            };
        }

        // Playbar Scrubber
        if (elements.timelineSlider) {
            elements.timelineSlider.oninput = (e) => {
                state.isScrubbing = true;
                if (state.currentAnimGroup) {
                    const pct = parseFloat(e.target.value) / 100;
                    const from = state.currentAnimGroup.from;
                    const to = state.currentAnimGroup.to;
                    const targetFrame = from + (to - from) * pct;
                    state.currentAnimGroup.goToFrame(targetFrame);
                    updateTimeDisplay(targetFrame - from, to - from);
                }
            };
            elements.timelineSlider.onchange = () => {
                state.isScrubbing = false;
            };
        }

        // Playbar Speed
        if (elements.btnSpeed) {
            elements.btnSpeed.onclick = (e) => {
                e.stopPropagation();
                const speeds = [0.5, 1.0, 1.5, 2.0];
                const curIdx = speeds.indexOf(state.playbackSpeed);
                const nextSpeed = speeds[(curIdx + 1) % speeds.length];
                state.playbackSpeed = nextSpeed;
                elements.btnSpeed.textContent = nextSpeed.toFixed(1) + "x";
                if (state.currentAnimGroup) {
                    state.currentAnimGroup.speedRatio = nextSpeed;
                }
                showToast(`Playback Speed: ${nextSpeed}x`);
            };
        }

        // Playbar Loop toggle
        if (elements.btnLoop) {
            elements.btnLoop.onclick = (e) => {
                e.stopPropagation();
                state.isLooping = !state.isLooping;
                if (state.isLooping) elements.btnLoop.classList.add("active");
                else elements.btnLoop.classList.remove("active");
                if (state.currentAnimGroup) {
                    state.currentAnimGroup.loopAnimation = state.isLooping;
                }
            };
        }

        // Playbar hide
        if (elements.btnTogglePlaybar) {
            elements.btnTogglePlaybar.onclick = (e) => {
                e.stopPropagation();
                state.isTrackPanelOpen = false;
                if (elements.trackPanel) elements.trackPanel.classList.add("is-collapsed");
            };
        }

        // Modal close button
        if (elements.modalCloseBtn) {
            elements.modalCloseBtn.onclick = (e) => {
                e.stopPropagation();
                closeRosterModal();
            };
        }

        // School Tabs
        if (elements.schoolTabs) {
            elements.schoolTabs.onclick = (e) => {
                const btn = e.target.closest(".school-tab-btn");
                if (!btn) return;
                elements.schoolTabs.querySelectorAll(".school-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                state.activeSchoolFilter = btn.dataset.school;
                renderRosterGrid();
            };
        }

        // Help Modal
        if (elements.btnBaLogo) {
            elements.btnBaLogo.onclick = (e) => {
                e.stopPropagation();
                if (elements.helpModal) elements.helpModal.classList.add("open");
            };
        }
        if (elements.helpCloseBtn) {
            elements.helpCloseBtn.onclick = (e) => {
                e.stopPropagation();
                if (elements.helpModal) elements.helpModal.classList.remove("open");
            };
        }

        // Buy Me a Coffee Modal (btnSupport)
        if (elements.btnSupport) {
            elements.btnSupport.onclick = (e) => {
                e.stopPropagation();
                if (elements.coffeeModal) elements.coffeeModal.classList.add("open");
            };
        }
        if (elements.coffeeCloseBtn) {
            elements.coffeeCloseBtn.onclick = (e) => {
                e.stopPropagation();
                if (elements.coffeeModal) elements.coffeeModal.classList.remove("open");
            };
        }
        if (elements.btnCopyStk) {
            elements.btnCopyStk.onclick = (e) => {
                e.stopPropagation();
                const stkText = "1828517809";
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(stkText).then(() => {
                        showToast("Đã sao chép STK: 1828517809 (Vietcombank)");
                    }).catch(() => {
                        showToast("STK: 1828517809 - VO ANH DUC (Vietcombank)");
                    });
                } else {
                    showToast("STK: 1828517809 - VO ANH DUC (Vietcombank)");
                }
            };
        }

        // Backdrop click to close modals
        window.addEventListener("click", (e) => {
            if (e.target === elements.characterPanel) closeRosterModal();
            if (e.target === elements.helpModal && elements.helpModal) elements.helpModal.classList.remove("open");
            if (e.target === elements.coffeeModal && elements.coffeeModal) elements.coffeeModal.classList.remove("open");
        });

        // Keyboard Shortcuts
        window.addEventListener("keydown", (e) => {
            const isTyping = document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "SELECT");
            if (isTyping) return;

            const key = e.key.toLowerCase();
            if (key === "m") {
                if (elements.characterPanel && elements.characterPanel.classList.contains("open")) {
                    closeRosterModal();
                } else {
                    openRosterModal(false);
                }
            } else if (key === "c" || key === "a") {
                cycleCostume();
            } else if (e.code === "Space") {
                e.preventDefault();
                if (state.isPlaying) pauseAnimation();
                else if (state.currentAnimGroup) playAnimation(state.currentAnimGroup);
            } else if (key === "t") {
                if (elements.btnTurntable) elements.btnTurntable.click();
            } else if (key === "r") {
                if (elements.btnResetCamera) elements.btnResetCamera.click();
            } else if (key === "d") {
                if (elements.btnTheme) elements.btnTheme.click();
            } else if (key === "1") {
                applyStageMode(0); showToast("Backdrop: Podium Stage");
            } else if (key === "2") {
                applyStageMode(1); showToast("Backdrop: Studio Floor");
            } else if (key === "3") {
                applyStageMode(2); showToast("Backdrop: Cyber Grid");
            } else if (key === "4") {
                applyStageMode(3); showToast("Backdrop: Clear Transparent");
            } else if (e.key === "Escape") {
                closeRosterModal();
                if (elements.helpModal) elements.helpModal.classList.remove("open");
                if (elements.coffeeModal) elements.coffeeModal.classList.remove("open");
            }
        });
    }

    /** Application Entry Point */
    async function boot() {
        try {
            // 1. BIND UI EVENTS FIRST - This guarantees every button works immediately!
            bindEvents();

            updateLoading(10, "INITIALIZING KIVOTOS ARCHIVE...", "Setting up 3D engine...");

            // 2. Load students roster
            if (window.STUDENTS_DATA && window.STUDENTS_DATA.students) {
                state.studentsData = window.STUDENTS_DATA;
            } else {
                const resp = await fetch("students.json");
                if (!resp.ok) throw new Error("HTTP error " + resp.status + " while loading students.json");
                state.studentsData = await resp.json();
            }

            // 3. Find default student (Yuuka)
            state.currentStudent = state.studentsData.students.find(s => s.name === CONFIG.defaultStudent) 
                || state.studentsData.students[0];
            state.currentModel = state.currentStudent.models.find(m => m.variant === "Default") 
                || state.currentStudent.models[0];

            updateUIInfo();

            // 4. Initialize Babylon.js 3D Engine
            init3D();

            // 5. Apply Theme
            applyTheme(state.theme);

            // 6. Determine model prefix
            await determineModelPrefix();

            // 7. Load Default Model
            updateLoading(35, "LOADING DEFAULT MODEL...", `Loading ${state.currentStudent.name}...`);
            await loadStudentModel(state.currentModel, false);

            updateLoading(100);
        } catch (err) {
            console.error("Boot error:", err);
            updateLoading(100);
            showToast("Initialization notice: " + (err.message || String(err)));
        }
    }

    // Launch when DOM is ready
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
