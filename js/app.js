/**
 * 3D Robotic Arm Simulation — Main Application Logic
 * =====================================================
 * Consolidated from V1, V2, and V5 with all bug fixes applied.
 *
 * Bug Fixes Applied:
 *   #2  Algorithm animation now uses direct joint update (not guarded updateJointsFromUI)
 *   #3  Empty Gemini API key opens input modal instead of failing silently
 *   #4  EaseInOutQuad added to joint animation
 *   #5  Gravity uses world position to prevent objects floating after detach
 *   #7  No stray markdown artifacts
 *   #8  Safe __app_id fallback for Firebase
 *
 * Features Integrated:
 *   - V5: Challenge System, Firebase Auth/Firestore, AI Tutor, Star Rating, Raycasting, Speed Control
 *   - V1: i18n (TH/EN language toggle), Gravity Physics
 */
(function () {
    'use strict';

    window.RobotSim = window.RobotSim || {};

    /**
     * Initialize the entire application.
     * Called from the inline module script after CDN imports resolve.
     *
     * @param {object} THREE         — Three.js library
     * @param {function} OrbitControls — OrbitControls constructor
     * @param {object} Firebase       — Firebase SDK modules
     */
    window.RobotSim.init = function (THREE, OrbitControls, Firebase) {

        // ================================================================
        //  1. APPLICATION STATE
        // ================================================================
        const state = {
            lang: 'th',
            isGripperClosed: false,
            isHoldingObject: false,
            isAlgoRunning: false,
            algoBlocks: [],
            challenges: [],
            currentChallengeId: null,
            currentSimSpeed: 1.0,
            currentUser: null,
            isTeacher: false,
            geminiApiKey: localStorage.getItem('gemini_api_key') || '',
            objectVelocityY: 0, // Gravity physics (from V1)
            joints: { base: 0, shoulder: 30, elbow: -45, wrist: 15 }
        };

        // ================================================================
        //  2. I18N SYSTEM (from V1, extended)
        // ================================================================
        const i18nData = window.RobotSim.I18N;

        /** Get translated string for current language */
        function t(key) {
            return (i18nData[state.lang] && i18nData[state.lang][key]) || key;
        }

        /** Update all DOM elements bearing data-i18n attributes */
        function updateAllI18N() {
            // Text content
            document.querySelectorAll('[data-i18n]').forEach(function (el) {
                var key = el.getAttribute('data-i18n');
                if (i18nData[state.lang][key]) el.textContent = i18nData[state.lang][key];
            });
            // Placeholders
            document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-placeholder');
                if (i18nData[state.lang][key]) el.placeholder = i18nData[state.lang][key];
            });
            // <option> text
            document.querySelectorAll('[data-i18n-option]').forEach(function (el) {
                var key = el.getAttribute('data-i18n-option');
                if (i18nData[state.lang][key]) el.textContent = i18nData[state.lang][key];
            });
            // Update HTML lang attribute
            document.documentElement.lang = state.lang === 'th' ? 'th' : 'en';
            // Re-render dynamic elements with new language
            renderBlocks();
        }

        // ================================================================
        //  3. THREE.JS SCENE SETUP
        // ================================================================
        var container = document.getElementById('canvas-container');
        var scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x0f172a, 10, 60);

        var camera = new THREE.PerspectiveCamera(
            45, window.innerWidth / window.innerHeight, 0.1, 100
        );
        camera.position.set(0, 15, 18);

        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        var orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.maxPolarAngle = Math.PI / 2 - 0.1;
        orbitControls.target.set(0, 0, 0);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        var dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.camera.left = -15;
        dirLight.shadow.camera.right = 15;
        dirLight.shadow.camera.top = 15;
        dirLight.shadow.camera.bottom = -15;
        scene.add(dirLight);

        // Ground
        var gridSize = 20;
        scene.add(new THREE.GridHelper(gridSize, 20, 0x3b82f6, 0x1e293b));

        var floor = new THREE.Mesh(
            new THREE.PlaneGeometry(gridSize, gridSize),
            new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.9 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        floor.name = 'floor';
        scene.add(floor);

        // ================================================================
        //  4. ROBOT ARM CONSTRUCTION
        // ================================================================
        var matBase = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.3, roughness: 0.5 });
        var matArm  = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.2, roughness: 0.4 });
        var matJoint = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.3 });

        var robot = new THREE.Group();
        scene.add(robot);

        // 4a. Base (rotates Y)
        var baseGroup = new THREE.Group();
        robot.add(baseGroup);
        var baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 0.5, 32), matBase);
        baseMesh.position.y = 0.25; baseMesh.castShadow = true; baseMesh.receiveShadow = true;
        baseGroup.add(baseMesh);
        var basePillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), matArm);
        basePillar.position.y = 1; basePillar.castShadow = true; basePillar.name = 'robot';
        baseGroup.add(basePillar);

        // 4b. Shoulder (rotates Z)
        var shoulderGroup = new THREE.Group();
        shoulderGroup.position.set(0, 1.5, 0);
        baseGroup.add(shoulderGroup);
        var sJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 32), matJoint);
        sJoint.rotation.x = Math.PI / 2; sJoint.castShadow = true;
        shoulderGroup.add(sJoint);
        var upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 4, 0.8), matArm);
        upperArm.position.y = 2; upperArm.castShadow = true; upperArm.name = 'robot';
        shoulderGroup.add(upperArm);

        // 4c. Elbow (rotates Z)
        var elbowGroup = new THREE.Group();
        elbowGroup.position.set(0, 4, 0);
        shoulderGroup.add(elbowGroup);
        var eJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 32), matJoint);
        eJoint.rotation.x = Math.PI / 2; eJoint.castShadow = true;
        elbowGroup.add(eJoint);
        var forearm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3, 0.6), matArm);
        forearm.position.y = 1.5; forearm.castShadow = true; forearm.name = 'robot';
        elbowGroup.add(forearm);

        // 4d. Wrist & Gripper
        var wristGroup = new THREE.Group();
        wristGroup.position.set(0, 3, 0);
        elbowGroup.add(wristGroup);
        var wJoint = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), matJoint);
        wJoint.castShadow = true; wristGroup.add(wJoint);
        var wristBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.8), matBase);
        wristBase.position.y = 0.4; wristBase.castShadow = true; wristGroup.add(wristBase);

        var gripperL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.5), matBase);
        gripperL.position.set(-0.3, 0.8, 0); gripperL.castShadow = true; wristGroup.add(gripperL);
        var gripperR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1, 0.5), matBase);
        gripperR.position.set(0.3, 0.8, 0); gripperR.castShadow = true; wristGroup.add(gripperR);
        var gripperCenter = new THREE.Object3D();
        gripperCenter.position.set(0, 1.2, 0);
        wristGroup.add(gripperCenter);

        // 4e. Target Object (red box)
        var targetObject = new THREE.Mesh(
            new THREE.BoxGeometry(0.8, 0.8, 0.8),
            new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
        );
        targetObject.position.set(0, 0.4, -3);
        targetObject.castShadow = true; targetObject.receiveShadow = true;
        targetObject.name = 'target';
        scene.add(targetObject);

        // ================================================================
        //  5. RAYCASTING & TOOLTIP
        // ================================================================
        var tooltip     = document.getElementById('hover-tooltip');
        var tooltipText = document.getElementById('tooltip-text');
        var interactables = [floor, targetObject, basePillar, upperArm, forearm];
        var raycaster = new THREE.Raycaster();
        var mouse = new THREE.Vector2();

        window.addEventListener('mousemove', function (e) {
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top  = (e.clientY + 15) + 'px';
            mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(interactables);

            if (intersects.length > 0) {
                var hit  = intersects[0];
                var posX = Math.round(hit.point.x * 2) / 2;
                var posY = Math.round(-hit.point.z * 2) / 2;
                var coord = '(' + posX + ', ' + posY + ')';

                tooltip.style.display = 'block';
                if (hit.object.name === 'floor') {
                    tooltipText.innerHTML = t('tooltipFloor') + ' ' + coord;
                    tooltip.style.borderColor = 'rgba(255,255,255,0.2)';
                } else if (hit.object.name === 'target') {
                    tooltipText.innerHTML = '<span style="color:#ef4444">' + t('tooltipTarget') + ' ' + coord + '</span>';
                    tooltip.style.borderColor = '#ef4444';
                } else {
                    tooltipText.innerHTML = '<span style="color:#f97316">' + t('tooltipRobot') + '</span>';
                    tooltip.style.borderColor = '#f97316';
                }
            } else {
                tooltip.style.display = 'none';
            }
        });

        // ================================================================
        //  6. ROBOT CONTROLS & HELPERS
        // ================================================================

        /** EaseInOutQuad — Bug Fix #4: replaces linear interpolation in V5 */
        function easeInOutQuad(x) {
            return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        }

        /** Apply current joint angles and gripper state to 3D model */
        function updateRobotVisuals() {
            var d2r = Math.PI / 180;
            baseGroup.rotation.y     = state.joints.base     * d2r;
            shoulderGroup.rotation.z = state.joints.shoulder * d2r;
            elbowGroup.rotation.z    = state.joints.elbow    * d2r;
            wristGroup.rotation.z    = state.joints.wrist    * d2r;
            gripperL.position.x = state.isGripperClosed ? -0.15 : -0.3;
            gripperR.position.x = state.isGripperClosed ?  0.15 :  0.3;
        }

        /** Set gripper open/close and handle grab/release logic */
        function setGripperState(close) {
            state.isGripperClosed = close;
            updateRobotVisuals();

            if (state.isGripperClosed) {
                // Check grab distance using WORLD coordinates
                var gWorld = new THREE.Vector3();
                gripperCenter.getWorldPosition(gWorld);
                var oWorld = new THREE.Vector3();
                targetObject.getWorldPosition(oWorld);

                if (gWorld.distanceTo(oWorld) < 1.0) {
                    wristGroup.attach(targetObject);
                    state.isHoldingObject = true;
                    state.objectVelocityY = 0;
                    showStatus(t('statusGrabbed'), '#34d399');
                } else {
                    showStatus(t('statusMissed'), '#fbbf24');
                }
            } else {
                if (state.isHoldingObject) {
                    scene.attach(targetObject);
                    state.isHoldingObject = false;
                    state.objectVelocityY = 0; // Reset velocity — gravity will take over
                    showStatus(t('statusDropped'), '#60a5fa');
                }
            }
        }

        /** Reset robot to default pose and restore target object */
        function resetRobotPositions() {
            state.joints = { base: 0, shoulder: 30, elbow: -45, wrist: 15 };
            state.isGripperClosed = false;
            state.objectVelocityY = 0;

            if (state.isHoldingObject) {
                scene.attach(targetObject);
                state.isHoldingObject = false;
            }

            if (state.currentChallengeId) {
                var ch = state.challenges.find(function (c) { return c.id === state.currentChallengeId; });
                if (ch) targetObject.position.set(ch.targetX, 0.4, -ch.targetY);
            }
            targetObject.rotation.set(0, 0, 0);
            updateRobotVisuals();
            showStatus(t('statusReset'), '#60a5fa');
        }

        // ================================================================
        //  7. UI MANAGEMENT
        // ================================================================

        function showStatus(msg, color) {
            var el = document.getElementById('status-msg');
            el.innerText = msg;
            el.style.color = color || '#34d399';
        }

        function openModal(id) {
            document.getElementById('modal-overlay').classList.add('active');
            var children = document.querySelectorAll('#modal-overlay > div');
            for (var i = 0; i < children.length; i++) children[i].classList.add('hidden');
            document.getElementById(id).classList.remove('hidden');
        }

        function closeModals() {
            document.getElementById('modal-overlay').classList.remove('active');
        }

        // Wire close buttons
        var closeBtns = document.querySelectorAll('.btn-close-modal');
        for (var i = 0; i < closeBtns.length; i++) {
            closeBtns[i].addEventListener('click', closeModals);
        }

        // Speed control
        document.getElementById('sim-speed').addEventListener('input', function (e) {
            state.currentSimSpeed = parseFloat(e.target.value);
            document.getElementById('speed-display').innerText = state.currentSimSpeed + 'x';
        });

        // Language toggle (V1 feature)
        document.getElementById('btn-lang').addEventListener('click', function () {
            state.lang = state.lang === 'th' ? 'en' : 'th';
            updateAllI18N();
        });

        // Reset
        document.getElementById('btn-reset-pos').addEventListener('click', function() {
            resetRobotPositions();
            syncSliders();
        });

        // Tabs UI Logic
        document.getElementById('tab-algo').addEventListener('click', function() {
            document.getElementById('panel-algo').classList.remove('hidden');
            document.getElementById('panel-algo').classList.add('flex');
            document.getElementById('panel-manual').classList.add('hidden');
            document.getElementById('panel-manual').classList.remove('flex');
            
            this.classList.add('text-blue-400', 'border-blue-400', 'bg-slate-800/30');
            this.classList.remove('text-slate-400', 'border-transparent');
            document.getElementById('tab-manual').classList.remove('text-blue-400', 'border-blue-400', 'bg-slate-800/30');
            document.getElementById('tab-manual').classList.add('text-slate-400', 'border-transparent');
        });

        document.getElementById('tab-manual').addEventListener('click', function() {
            document.getElementById('panel-manual').classList.remove('hidden');
            document.getElementById('panel-manual').classList.add('flex');
            document.getElementById('panel-algo').classList.add('hidden');
            document.getElementById('panel-algo').classList.remove('flex');
            
            this.classList.add('text-blue-400', 'border-blue-400', 'bg-slate-800/30');
            this.classList.remove('text-slate-400', 'border-transparent');
            document.getElementById('tab-algo').classList.remove('text-blue-400', 'border-blue-400', 'bg-slate-800/30');
            document.getElementById('tab-algo').classList.add('text-slate-400', 'border-transparent');
            
            syncSliders();
        });

        function syncSliders() {
            ['base', 'shoulder', 'elbow', 'wrist'].forEach(function(j) {
                var el = document.getElementById('slider-' + j);
                if(el) {
                    el.value = state.joints[j];
                    document.getElementById('val-' + j).innerText = Math.round(state.joints[j]) + '°';
                }
            });
        }

        ['base', 'shoulder', 'elbow', 'wrist'].forEach(function(j) {
            document.getElementById('slider-' + j).addEventListener('input', function(e) {
                state.joints[j] = parseFloat(e.target.value);
                document.getElementById('val-' + j).innerText = Math.round(state.joints[j]) + '°';
                updateRobotVisuals();
            });
        });

        // Gripper toggle (manual control)
        document.getElementById('btn-gripper-manual').addEventListener('click', function () {
            setGripperState(!state.isGripperClosed);
        });

        // ================================================================
        //  8. ALGORITHM BLOCK SYSTEM
        // ================================================================

        function renderBlocks() {
            var listEl    = document.getElementById('block-list');
            var counterEl = document.getElementById('block-counter');
            listEl.innerHTML = '';
            counterEl.innerText = state.algoBlocks.length + ' ' + t('blocksUnit');

            if (state.algoBlocks.length === 0) {
                listEl.innerHTML = '<div class="text-center text-sm text-slate-500 mt-4">' + t('noBlocks') + '</div>';
                return;
            }

            state.algoBlocks.forEach(function (block, index) {
                var el = document.createElement('div');
                el.className = 'bg-slate-700/50 p-2 rounded flex justify-between items-center text-sm mb-2 border-l-4 border-blue-500 shadow-sm';
                el.id = 'block-' + index;

                var text = '';
                switch (block.action) {
                    case 'base':           text = t('blockBase') + ' ' + block.value + '°'; break;
                    case 'shoulder':       text = t('blockShoulder') + ' ' + block.value + '°'; break;
                    case 'elbow':          text = t('blockElbow') + ' ' + block.value + '°'; break;
                    case 'wrist':          text = t('blockWrist') + ' ' + block.value + '°'; break;
                    case 'gripper_close':  text = t('blockGripperClose'); break;
                    case 'gripper_open':   text = t('blockGripperOpen'); break;
                }

                el.innerHTML =
                    '<div class="flex items-center gap-2">' +
                    '  <span class="text-xs bg-slate-600 px-1.5 py-0.5 rounded font-mono">' + (index + 1) + '</span> ' + text +
                    '</div>' +
                    '<button class="text-slate-400 hover:text-red-400 p-1" onclick="removeBlock(' + index + ')">' +
                    '  <i class="ph ph-x"></i>' +
                    '</button>';
                listEl.appendChild(el);
            });
            listEl.scrollTop = listEl.scrollHeight;
        }

        // Global — required by inline onclick in rendered blocks
        window.removeBlock = function (idx) {
            if (!state.isAlgoRunning) {
                state.algoBlocks.splice(idx, 1);
                renderBlocks();
            }
        };

        document.getElementById('btn-add-block').addEventListener('click', function () {
            var action = document.getElementById('algo-action').value;
            var value  = parseFloat(document.getElementById('algo-value').value) || 0;
            state.algoBlocks.push({ action: action, value: value });
            renderBlocks();
        });

        document.getElementById('btn-clear-algo').addEventListener('click', function () {
            if (!state.isAlgoRunning) {
                state.algoBlocks = [];
                renderBlocks();
            }
        });

        // --- Run Algorithm ---
        document.getElementById('btn-run-algo').addEventListener('click', async function () {
            if (state.isAlgoRunning || state.algoBlocks.length === 0) return;
            state.isAlgoRunning = true;
            resetRobotPositions();

            var btnRun = document.getElementById('btn-run-algo');
            btnRun.innerHTML = '<i class="ph ph-spinner animate-spin"></i> ' + t('runningLabel');
            btnRun.classList.replace('bg-emerald-600', 'bg-orange-600');

            for (var i = 0; i < state.algoBlocks.length; i++) {
                var b = state.algoBlocks[i];
                var blockEl = document.getElementById('block-' + i);
                if (blockEl) blockEl.classList.add('block-running');

                showStatus(t('statusRunning') + ' ' + (i + 1) + '/' + state.algoBlocks.length, '#f59e0b');

                if (b.action.indexOf('gripper') !== -1) {
                    // Gripper action
                    setGripperState(b.action === 'gripper_close');
                    await new Promise(function (r) { setTimeout(r, 500 / state.currentSimSpeed); });
                } else {
                    // Joint animation — Bug Fix #2 & #4
                    // Directly update state.joints (not UI sliders) with easing
                    var startAngle  = state.joints[b.action];
                    var targetAngle = b.value;
                    var duration    = 800 / state.currentSimSpeed;
                    var startTime   = performance.now();

                    await new Promise(function (resolve) {
                        function anim(now) {
                            var prog = Math.min((now - startTime) / duration, 1);
                            var eased = easeInOutQuad(prog); // Bug Fix #4
                            state.joints[b.action] = startAngle + (targetAngle - startAngle) * eased;
                            updateRobotVisuals();
                            if (prog < 1) requestAnimationFrame(anim);
                            else resolve();
                        }
                        requestAnimationFrame(anim);
                    });
                }

                if (blockEl) blockEl.classList.remove('block-running');
            }

            state.isAlgoRunning = false;
            btnRun.innerHTML = '<i class="ph ph-play-circle text-xl"></i> ' + t('runAlgo');
            btnRun.classList.replace('bg-orange-600', 'bg-emerald-600');

            if (state.isHoldingObject) {
                showStatus(t('statusMission'), '#10b981');

                // Star rating
                var blocksUsed = state.algoBlocks.length;
                var stars = 1, desc = t('star1');
                if (blocksUsed <= 4) { stars = 3; desc = t('star3'); }
                else if (blocksUsed <= 6) { stars = 2; desc = t('star2'); }

                document.getElementById('success-blocks').innerText = blocksUsed;
                document.getElementById('star-desc').innerText = desc;
                var starIcons = document.querySelectorAll('#star-container i');
                for (var s = 0; s < starIcons.length; s++) {
                    if (s < stars) starIcons[s].classList.add('active');
                    else starIcons[s].classList.remove('active');
                }
                openModal('modal-success');
            } else {
                showStatus(t('statusFailed'), '#ef4444');
            }
        });

        // ================================================================
        //  9. CHALLENGE SYSTEM
        // ================================================================
        var defaultChallenges = [
            { id: 'def_1',  name: '1. เอื้อมหยิบด้านหน้า (ใกล้)',   targetX:  0,   targetY: 3 },
            { id: 'def_2',  name: '2. เอื้อมหยิบด้านหน้า (ไกล)',   targetX:  0,   targetY: 5 },
            { id: 'def_3',  name: '3. บิดซ้ายพื้นฐาน',             targetX: -4,   targetY: 3 },
            { id: 'def_4',  name: '4. บิดขวาพื้นฐาน',             targetX:  4,   targetY: 3 },
            { id: 'def_5',  name: '5. เยื้องซ้ายหลัง',             targetX: -3,   targetY: -3 },
            { id: 'def_6',  name: '6. เยื้องขวาหลัง',             targetX:  3,   targetY: -3 },
            { id: 'def_7',  name: '7. ระยะประชิด',                targetX:  2,   targetY: 2 },
            { id: 'def_8',  name: '8. เอื้อมขวาสุดแขน',           targetX:  5,   targetY: 0 },
            { id: 'def_9',  name: '9. พิกัดกึ่งกลางเฉียง',         targetX:  3,   targetY: 3.5 },
            { id: 'def_10', name: '10. ทดสอบพิกัดเชิงลบ',         targetX: -4.5, targetY: 2 }
        ];

        function selectChallenge(id) {
            state.currentChallengeId = id;
            var ch = state.challenges.find(function (c) { return c.id === id; });
            if (ch) {
                // Map user-Y → Three.js -Z
                targetObject.position.set(ch.targetX, 0.4, -ch.targetY);
                targetObject.rotation.set(0, 0, 0);
                state.objectVelocityY = 0;
                renderChallengeList();
                resetRobotPositions();
                showStatus(t('currentChallenge') + ' ' + ch.name, '#60a5fa');
            }
        }

        function renderChallengeList() {
            var listEl = document.getElementById('challenge-list');
            listEl.innerHTML = '';

            state.challenges.forEach(function (ch) {
                var el = document.createElement('div');
                el.className = 'challenge-card bg-slate-800 p-3 rounded-lg flex justify-between items-center mb-1 border border-slate-700'
                    + (ch.id === state.currentChallengeId ? ' active' : '');

                el.innerHTML =
                    '<div class="pointer-events-none">' +
                    '  <div class="text-sm font-bold text-slate-200">' + ch.name + '</div>' +
                    '  <div class="text-xs text-slate-400 mt-1 flex gap-2">' +
                    '    <span class="bg-slate-900 px-1.5 rounded">X: ' + ch.targetX + '</span>' +
                    '    <span class="bg-slate-900 px-1.5 rounded">Y: ' + ch.targetY + '</span>' +
                    '  </div>' +
                    '</div>';

                // Teacher can edit/delete non-default challenges
                if (state.isTeacher && !ch.id.toString().startsWith('def_')) {
                    var actionDiv = document.createElement('div');
                    actionDiv.className = 'flex gap-1 z-10';

                    var editBtn = document.createElement('button');
                    editBtn.innerHTML = '<i class="ph ph-pencil-simple text-blue-400"></i>';
                    editBtn.className = 'p-2 hover:bg-slate-700 rounded transition';
                    editBtn.addEventListener('click', (function (challenge) {
                        return function (e) {
                            e.stopPropagation();
                            document.getElementById('ch-name').value = challenge.name;
                            document.getElementById('ch-x').value = challenge.targetX;
                            document.getElementById('ch-y').value = challenge.targetY;
                            state.editingChallengeId = challenge.id;
                            openModal('modal-challenge');
                        };
                    })(ch));
                    actionDiv.appendChild(editBtn);

                    var delBtn = document.createElement('button');
                    delBtn.innerHTML = '<i class="ph ph-trash text-red-400"></i>';
                    delBtn.className = 'p-2 hover:bg-slate-700 rounded transition';
                    delBtn.addEventListener('click', (function (challenge) {
                        return async function (e) {
                            e.stopPropagation();
                            try {
                                await Firebase.deleteDoc(
                                    Firebase.doc(db, COLLECTION_PATH, challenge.id)
                                );
                            } catch (err) { console.warn('Delete failed:', err); }
                            state.challenges = state.challenges.filter(function (c) { return c.id !== challenge.id; });
                            renderChallengeList();
                        };
                    })(ch));
                    actionDiv.appendChild(delBtn);
                    el.appendChild(actionDiv);
                }

                el.addEventListener('click', (function (cid) {
                    return function () { selectChallenge(cid); };
                })(ch.id));

                listEl.appendChild(el);
            });

            // Auto-select first challenge if none selected
            if (!state.currentChallengeId && state.challenges.length > 0) {
                selectChallenge(state.challenges[0].id);
            }
        }

        // ================================================================
        //  10. FIREBASE SERVICE
        // ================================================================
        var firebaseConfig = {
            apiKey:            "AIzaSyD8u5E8xy6wKmyKJcGbWKNgPTe3PCAtYg8",
            authDomain:        "iot-test-a4599.firebaseapp.com",
            databaseURL:       "https://iot-test-a4599-default-rtdb.asia-southeast1.firebasedatabase.app",
            projectId:         "iot-test-a4599",
            storageBucket:     "iot-test-a4599.firebasestorage.app",
            messagingSenderId: "819566617945",
            appId:             "1:819566617945:web:dead278ccac33f9ade5848"
        };

        var firebaseApp = Firebase.initializeApp(firebaseConfig);
        var auth = Firebase.getAuth(firebaseApp);
        var db   = Firebase.getFirestore(firebaseApp);

        // Bug Fix #8: Safe __app_id fallback
        var appId = (typeof __app_id !== 'undefined' && __app_id) ? __app_id : 'robot_sim_v5';
        var COLLECTION_PATH = 'artifacts/' + appId + '/public/data/challenges';

        async function fetchChallenges() {
            try {
                if (!state.currentUser && !state.isTeacher) throw new Error('Not authenticated');
                var q = Firebase.collection(db, COLLECTION_PATH);
                var snapshot = await Firebase.getDocs(q);
                var dbChallenges = [];
                snapshot.forEach(function (d) {
                    dbChallenges.push(Object.assign({ id: d.id }, d.data()));
                });
                state.challenges = dbChallenges.length > 0 ? dbChallenges : defaultChallenges.slice();
                renderChallengeList();
            } catch (error) {
                // Fallback to defaults — don't let the app hang
                state.challenges = defaultChallenges.slice();
                renderChallengeList();
                console.warn('Using default challenges:', error.message);
            }
        }

        async function saveChallenge() {
            if (!state.isTeacher || !state.currentUser) return;
            var name = document.getElementById('ch-name').value;
            var x = parseFloat(document.getElementById('ch-x').value) || 0;
            var y = parseFloat(document.getElementById('ch-y').value) || 0;
            try {
                if (state.editingChallengeId) {
                    await Firebase.updateDoc(
                        Firebase.doc(db, COLLECTION_PATH, state.editingChallengeId),
                        { name: name, targetX: x, targetY: y }
                    );
                    var idx = state.challenges.findIndex(function(c) { return c.id === state.editingChallengeId; });
                    if (idx > -1) {
                        state.challenges[idx].name = name;
                        state.challenges[idx].targetX = x;
                        state.challenges[idx].targetY = y;
                    }
                    state.editingChallengeId = null;
                } else {
                    var docRef = await Firebase.addDoc(
                        Firebase.collection(db, COLLECTION_PATH),
                        { name: name, targetX: x, targetY: y }
                    );
                    state.challenges.push({ id: docRef.id, name: name, targetX: x, targetY: y });
                }
                renderChallengeList();
                closeModals();
            } catch (error) {
                alert(t('firebaseSaveError'));
            }
        }

        // Firebase Auth initialization
        (async function initAuth() {
            try {
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await Firebase.signInWithCustomToken(auth, __initial_auth_token);
                } else {
                    await Firebase.signInAnonymously(auth);
                }
            } catch (err) {
                console.warn('Auth init:', err);
            }
        })().then(function () {
            Firebase.onAuthStateChanged(auth, function (user) {
                state.currentUser = user;
                var loginBtn = document.getElementById('btn-login-modal');
                var addBtn   = document.getElementById('btn-add-challenge');

                if (user && !user.isAnonymous) {
                    state.isTeacher = true;
                    loginBtn.innerHTML = '<i class="ph ph-sign-out"></i> ' + t('adminLogout');
                    addBtn.classList.remove('hidden');
                } else {
                    state.isTeacher = false;
                    loginBtn.innerHTML = '<i class="ph ph-user-gear"></i> ' + t('adminBtn');
                    addBtn.classList.add('hidden');
                }
                fetchChallenges();
            });
        });

        // Auth UI handlers
        document.getElementById('btn-login-modal').addEventListener('click', function () {
            if (state.isTeacher) Firebase.signOut(auth);
            else openModal('modal-auth');
        });

        document.getElementById('btn-login-submit').addEventListener('click', async function () {
            var email = document.getElementById('auth-email').value;
            var pass  = document.getElementById('auth-pass').value;
            try {
                await Firebase.signInWithEmailAndPassword(auth, email, pass);
                closeModals();
            } catch (error) {
                document.getElementById('auth-error').innerText = t('authError');
            }
        });

        document.getElementById('btn-save-challenge').addEventListener('click', saveChallenge);
        document.getElementById('btn-add-challenge').addEventListener('click', function () {
            state.editingChallengeId = null;
            document.getElementById('ch-name').value = '';
            document.getElementById('ch-x').value = '';
            document.getElementById('ch-y').value = '';
            openModal('modal-challenge');
        });

        // ================================================================
        //  11. GEMINI AI SERVICE — Bug Fix #3
        // ================================================================

        /** Call Gemini API with retry logic. Shows API key modal if key is empty. */
        async function callGeminiAPI(prompt, systemPrompt, schema) {
            // Bug Fix #3: Prompt user to enter API key if empty
            if (!state.geminiApiKey) {
                openModal('modal-apikey');
                return null;
            }

            var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + state.geminiApiKey;
            var payload = { 
                contents: [{ role: "user", parts: [{ text: prompt }] }] 
            };
            if (systemPrompt) {
                payload.systemInstruction = { parts: [{ text: systemPrompt }] };
            }
            if (schema) {
                payload.generationConfig = { responseMimeType: 'application/json', responseSchema: schema };
            }

            var retries = 3, delay = 1000;
            while (retries > 0) {
                try {
                    var res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!res.ok) {
                        var errText = await res.text();
                        console.error('Gemini API Error:', res.status, errText);
                        
                        // Fallback: If HTTP 400, try simpler payload combining system & user prompt
                        if (res.status === 400) {
                            payload = { 
                                contents: [{ role: "user", parts: [{ text: (systemPrompt ? "System: " + systemPrompt + "\n\nUser: " : "") + prompt }] }] 
                            };
                            if (schema) {
                                payload.generationConfig = { responseMimeType: 'application/json', responseSchema: schema };
                            }
                        }
                        throw new Error('HTTP ' + res.status);
                    }
                    var data = await res.json();
                    return data.candidates && data.candidates[0] &&
                           data.candidates[0].content &&
                           data.candidates[0].content.parts &&
                           data.candidates[0].content.parts[0] &&
                           data.candidates[0].content.parts[0].text;
                } catch (error) {
                    console.error('callGeminiAPI attempt failed:', error);
                    retries--;
                    if (retries === 0) return null;
                    await new Promise(function (r) { setTimeout(r, delay); });
                    delay *= 2;
                }
            }
        }

        // API Key modal — save handler
        document.getElementById('btn-save-apikey').addEventListener('click', function () {
            var key = document.getElementById('input-apikey').value.trim();
            if (key) {
                state.geminiApiKey = key;
                localStorage.setItem('gemini_api_key', key);
                closeModals();
                showStatus(t('apiKeySaved'), '#34d399');
                // Update key icon indicator
                var keyIcon = document.querySelector('#btn-apikey-settings i');
                if (keyIcon) { keyIcon.className = 'ph ph-key api-key-active'; }
            }
        });

        // API Key settings button
        document.getElementById('btn-apikey-settings').addEventListener('click', function () {
            document.getElementById('input-apikey').value = state.geminiApiKey;
            openModal('modal-apikey');
        });

        // Update icon on load if key exists
        if (state.geminiApiKey) {
            var keyIcon = document.querySelector('#btn-apikey-settings i');
            if (keyIcon) keyIcon.className = 'ph ph-key api-key-active';
        }

        // AI Generate Challenge
        document.getElementById('btn-ai-gen-challenge').addEventListener('click', async function () {
            var btn = document.getElementById('btn-ai-gen-challenge');
            var originalText = btn.innerHTML;
            btn.innerHTML = '<i class="ph ph-spinner animate-spin"></i> ' + t('aiThinking');
            btn.disabled = true;

            var sysPrompt = 'คุณคือ AI ผู้ช่วยสร้างโจทย์การควบคุมแขนกล 3D ให้ครู ตอบเฉพาะ JSON ตามโครงสร้างที่กำหนด';
            var userPrompt = 'คิดโจทย์ภารกิจสนุกๆ 1 ข้อ (เช่น ซ่อมแซมดาวเทียม, หยิบตัวอย่างแร่บนดาวอังคาร) ความยาวชื่อไม่เกิน 30 ตัวอักษร พร้อมสุ่มพิกัดเป้าหมาย X (ระหว่าง -4 ถึง 4) และ Y (ระหว่าง 1 ถึง 4) ขอเป็นค่าทศนิยม .0 หรือ .5';
            var schema = {
                type: 'OBJECT',
                properties: { name: { type: 'STRING' }, x: { type: 'NUMBER' }, y: { type: 'NUMBER' } },
                required: ['name', 'x', 'y']
            };

            var response = await callGeminiAPI(userPrompt, sysPrompt, schema);
            if (response) {
                try {
                    var data = JSON.parse(response);
                    document.getElementById('ch-name').value = '✨ ' + data.name;
                    document.getElementById('ch-x').value = data.x;
                    document.getElementById('ch-y').value = data.y;
                } catch (e) { console.error('JSON Error', e); }
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        });

        // AI Tutor
        document.getElementById('btn-ai-tutor').addEventListener('click', async function () {
            var currentCh = state.challenges.find(function (c) { return c.id === state.currentChallengeId; });
            if (!currentCh) return alert(t('selectChallengeFirst'));

            var blockStr = state.algoBlocks.length === 0
                ? 'ยังไม่ได้เขียนโค้ด'
                : state.algoBlocks.map(function (b, i) { return (i + 1) + '. ' + b.action + ' (' + (b.value || 0) + ')'; }).join(', ');

            var userContext = 'โจทย์: ' + currentCh.name + ' (เป้าหมายพิกัด X: ' + currentCh.targetX + ', Y: ' + currentCh.targetY + ')\nโค้ดนักเรียน: [' + blockStr + ']';
            var sysPrompt = 'คุณคือครู AI ผู้ช่วยสอนหุ่นยนต์ กฎ: 1. ห้ามบอกคำตอบหรือองศาที่ถูกต้องตรงๆ 2. ให้อธิบายสั้นๆ ว่าโค้ดปัจจุบันทำอะไร 3. บอกใบ้ทิศทางว่าควรปรับแกนไหน (ฐาน, ไหล่, ศอก) หรือให้เริ่มเขียนโค้ด 4. ตอบเป็นมิตรและสั้นกระชับไม่เกิน 3 ประโยค';

            openModal('modal-ai');
            var contentDiv = document.getElementById('ai-response-content');
            contentDiv.innerHTML = '<div class="flex justify-center items-center py-4"><i class="ph ph-spinner animate-spin text-3xl text-purple-400"></i><span class="ml-2 text-purple-300">' + t('aiAnalyzing') + '</span></div>';

            var responseText = await callGeminiAPI(userContext, sysPrompt);
            if (responseText) {
                contentDiv.innerHTML = '<div class="typewriter"><p>' + responseText.replace(/\n/g, '<br>') + '</p></div>';
            } else {
                contentDiv.innerHTML = '<p class="text-red-400">' + t('aiError') + '</p>';
            }
        });

        // ================================================================
        //  12. GRAVITY PHYSICS & ANIMATION LOOP (from V1)
        // ================================================================
        var clock = new THREE.Clock();
        var worldPosTemp = new THREE.Vector3();

        function animate() {
            requestAnimationFrame(animate);
            var delta = clock.getDelta();

            // Gravity Physics — Bug Fix #5: use world position for accurate check
            if (!state.isHoldingObject) {
                targetObject.getWorldPosition(worldPosTemp);

                if (worldPosTemp.y > 0.41) {
                    state.objectVelocityY -= 9.8 * delta;
                    targetObject.position.y += state.objectVelocityY * delta;

                    // Re-check after applying velocity
                    targetObject.getWorldPosition(worldPosTemp);
                    if (worldPosTemp.y <= 0.4) {
                        targetObject.position.y += (0.4 - worldPosTemp.y);
                        state.objectVelocityY = 0;
                    }
                }
            }

            orbitControls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Resize handler
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // ================================================================
        //  13. INITIAL SETUP
        // ================================================================
        updateRobotVisuals();
        renderBlocks();
        showStatus(t('statusReady'), '#60a5fa');
    };
})();
