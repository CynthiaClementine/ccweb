window.onload = setup;
window.onresize = resize;
window.onkeydown = handleKeyPress;
window.onkeyup = handleKeyNegate;
document.onpointerlockchange = handleCursorLockChange;
window.addEventListener(`wheel`, handleWheel, {passive: false});

var canvas;
var gl;

var banvas;
var btx;

var danvas;
var dtx;

async function setup() {
	createWorlds();
	canvas = document.getElementById(`glbox`);
	banvas = document.getElementById(`viewbox`);
	btx = banvas.getContext("2d");
	btx.imageSmoothingEnabled = false;
	var vertexShaderCode = await loadCode(`shaderV.glsl`);
	var fragmentShaderCode = await loadCode(`shaderF.glsl`);

	gl = canvas.getContext("webgl2", {preserveDrawingBuffer: true});
	gl.imageSmoothingEnabled = false;
	if (!gl) {
		alert("WebGL2 not supported. This program will not run correctly.");
		throw new Error("WebGL2 not supported");
	}
	if (!gl.getExtension(`EXT_color_buffer_float`)) {
		alert(`Float colors not supported. This program will not run correctly.`);
		throw new Error("float colors not supported");
	}
	gl_numTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
	
	updateFOV(camera_FOV, false);

	banvas.requestPointerLock = banvas.requestPointerLock || banvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
	banvas.onclick = function() {banvas.requestPointerLock({unadjustedMovement: true});}

	player = new Player_Debug(loading_world, Pos(...loading_world.spawn), ...loading_world.spawn.slice(3));
	camera = new Camera(loading_world, Pos(...loading_world.spawn));
	
	editor_initialize();
	document.title = `Raymarching: ${splashes[(Math.random() * splashes.length) | 0]}`;
	
	//serializing / editor error checking
	var s1 = keyDiff(map_strObj, objectEditables);
	if (s1.size != 0) {
		console.log(s1);
		// throw new Error(`Mismatch between editor objects and defined objects!`);
	}
	var s2 = keyDiff(map_strMat, materialEditables);
	if (s2.size != 0) {
		console.log(s2);
		throw new Error(`Mismatch between editor materials and defined materials!`);
	}

	//windows safeguard
	if (navigator.userAgent.includes(`Windows`)) {
		var isAlright = confirm("Hi! It appears you are running Windows, which means that this program will likely take at least 30 seconds to load, "
		+"and may end up just breaking entirely. The tab will be frozen during this time. Why? Because: Windows.\n"
		+"For a longer explanation, see https://stackoverflow.com/questions/53541626/webgl-how-to-avoid-long-shader-compile-stalling-a-tab#53549882\n"
		+"Would you like to continue?");

		if (!isAlright) {
			return;
		}
	}

	setupGLState(vertexShaderCode, fragmentShaderCode);
	createBVHTexture(); 
	createObjectsTexture();
	createExtraTextures();
	
	resize();
	page_animation = window.requestAnimationFrame(main);
	tickHandler = window.setInterval(tick, frameTime);
}

function resizeCanvas() {
	var width = Math.round(window.innerWidth - 10);
	var height = Math.round(window.innerHeight - 10);
	var blockSize = Math.min(width, height);
	canvas.width = render_n;
	canvas.height = render_n;
	canvas.style = `width: ${blockSize}px; height: ${blockSize}px;`;
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function resize() {
	var dpr = window.devicePixelRatio;
	var width = Math.round(window.innerWidth - 10);
	var height = Math.round(window.innerHeight - 10);
	var blockSize = Math.min(width, height);
	banvas.width = blockSize;
	banvas.height = blockSize;
	btx.imageSmoothingEnabled = false;
	editorPanelGroup.style = `margin-left: ${blockSize + 20}px`;
	resizeCanvas();
}

async function loadCode(url) {
	return await (await fetch(url)).text();
}

function main() {
	perf_logStart(`intra`);
	feedGPU();
	finishDraw();
	perf_logEnd(`intra`);
	perf_logEnd(`inter`);
	calcFrameTime();
	perf_logStart(`inter`);
	//change display size, start new frame
	if (render_n != render_goalN) {
		render_n = render_goalN;
		resizeCanvas();
	}
	page_animation = window.requestAnimationFrame(main);
}

function tick() {
	perf_logStart(`tick`);
	world_time += 1;
	//tick all world objects
	loading_world = camera.world;
	player.tick();
	camera.tick();
	
	//editor syncing
	if (debug_listening && controls.cursorLock) {
		const es = editor_selected;
		const isPlayer = (es == player);

		if (getDistancePos(player.dPos, Pos(0, 2, 0)) > 0.1) {
			editor_updateHolp();
		}
		
		//idk where to put this
		if (!isPlayer && es.tick) {
			console.log(`ticking selected ${es.constructor.name}`);
			es.tick();
		}
		if (es.material) {
			es.material.syncWith(es);
		}
		var ec = editor_controls;
		[...(ec.set), ...(ec.world), ...(ec.obj), ...(ec.mat)].forEach(c => {
			try {
				c.synchronize();
			} catch (e) {}
		});
	}
	
	loading_world.objects.forEach(o => {
		o.tick();
	});
	loading_world.tick();
	perf_logEnd(`tick`);
}

function finishDraw() {
	const err = gl.getError();
	if (err !== gl.NO_ERROR) {
		console.log(`GL ERROR`, err);
	}
	//draw GPU's result to the drawing canvas
	btx.drawImage(gl.canvas,
		0, 0, canvas.width, canvas.height,
		0, 0, banvas.width, banvas.height);
	render_linesDrawn = render_n;
	drawUI();
}

function calcFrameTime() {
	const inter = perf_log[`inter`];
	const intra = perf_log[`intra`];
	const tick = perf_log[`tick`];
	const elapsedMS = intra[intra.length - 1];
	
	//figure out all averages / maxes
	var interMax = inter.reduce((a, b) => Math.max(a, b));
	var intraMax = intra.reduce((a, b) => Math.max(a, b));
	var tickMax = tick.reduce((a, b) => Math.max(a, b));
	debugCM.innerHTML = tickMax.toFixed(2);
	debugGM.innerHTML = intraMax.toFixed(2);
	debugTM.innerHTML = interMax.toFixed(2);
	
	var interSum = inter.reduce((a, b) => a + b);
	var intraAvg = intra.reduce((a, b) => a + b) / perf_len;
	var tickSum = tick.reduce((a, b) => a + b);
	debugCA.innerHTML = (tickSum / perf_len).toFixed(2);
	debugGA.innerHTML = (intraAvg).toFixed(2);
	debugTA.innerHTML = (interSum / perf_len).toFixed(2);


	//weighted average towards higher values
	// debugMSPF.style = `color: ${(elapsedMS > frameTime * 0.9) ? "#F97" : "#444"}`;
	
	if (debug_flags.autoScale && world_time - render_lastScaleTime > perf_len) {
		render_lastScaleTime = world_time;
		if (intraAvg > frameTime * 0.6) {
			render_goalN = clamp(Math.floor(render_n * 0.95), render_nAutoRange[0], render_nAutoRange[1]);
		}
		if (intraAvg < frameTime * 0.1) {
			render_goalN = clamp(Math.ceil(render_n * 1.02), render_nAutoRange[0], render_nAutoRange[1]);
		}
	}
	return elapsedMS;
}

// Mint stuff! Draws the little three arrow gizmo on selected objects
function drawEditorGizmo() {
	if (!debug_listening || editor_selected == player) {
		return;
	}
	var origin = calcScreenPos(editor_selected.pos);
	if (!origin) {
		return;  // offscreen
	}
	
	var dist = getDistancePos(camera.pos, editor_selected.pos);
	if (dist < 0.01) {
		return;
	}
	var len = dist * 0.4;
	
	var axes = [
		{axis: "x", color: "#E55", vec: editor_getAxisVec("x")},
		{axis: "y", color: "#5E5", vec: editor_getAxisVec("y")},
		{axis: "z", color: "#55E", vec: editor_getAxisVec("z")},
	];
	
	axes.forEach(def => {
		if (!def.vec) {
			return;
		}
		var endWorld = [
			editor_selected.pos[0] + def.vec[0] * len,
			editor_selected.pos[1] + def.vec[1] * len,
			editor_selected.pos[2] + def.vec[2] * len
		];
		var end = calcScreenPos(endWorld);
		if (!end) {
			return;
		}
		
		// draw line
	
		// arrowhead
		btx.strokeStyle = (editor_axis == def.axis) ? "#FFF" : def.color;
		btx.fillStyle = (editor_axis == def.axis) ? "#FFF" : def.color;
		btx.globalAlpha = 1.0;
		btx.lineWidth = banvas.height * 0.01;
		var angle = Math.atan2(end[1] - origin[1], end[0] - origin[0]);
		var headSize = 20;
		var lineEnd = [
			end[0] - Math.cos(angle) * headSize,
			end[1] - Math.sin(angle) * headSize
		];
	
		btx.beginPath();
		btx.moveTo(origin[0], origin[1]);
		btx.lineTo(lineEnd[0], lineEnd[1]);
		btx.stroke();
	
		// label - we could swap this to any font you want
		btx.fillStyle = colors16[0];
		btx.font = "bold 20px sans-serif";
		btx.fillText(def.axis.toUpperCase(), end[0] + 4, end[1] - 4);
		btx.globalAlpha = 0.3;
	});
}

function handleWorkerMsg(e) {
	var data = e.data;
	switch (data[0]) {
		case "colorLine":
			drawLine(data[1], data[2]);
			e.target.postMessage(["returnArr", data[2]], [data[2].buffer]);
			break;
		case "ready":
			if (data[1] != -1) {
				worker_ready[data[1]] = true;
			}
			break;
		default:
			console.error(`not sure what to do with worker messageID ${data[0]}! Full message:`, data);
			break;
	}
	// console.log(e.data);
}

function screenshot() {
	var url = canvas.toDataURL(`image/png`);
	var link = document.createElement("a");
	link.href = url;
	link.download = `render ${months[date.getMonth()]}-${date.getDate()}-${date.getFullYear()}.png`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}


function handleKeyPress(a) {
	if (!player) {
		return;
	}
	if (debug_listening) {
		if (Array.from(document.querySelectorAll(`:hover`)).includes(editorPanelGroup)) {
			return;
		}
		/*
		all debug effects are activated by pressing ] and then another key.
		DEBUG EFFECTS:
			SELECTION:
				Left-click or O - select object
				shift-click - select multiple objects
				alt-click - deselect object
				click + drag or E - move object around

			MODIFICATION:





			
			C - copy selected object
			V - paste selected object

			1-2-3 - switch player type (regular, debug, noclip)
			
			B - toggle Bounding Box highlights
			N - show the Number of iterations per pixel
			
			P - copy current Pos to clipboard
			
			E + drag- select object and move it around
			
			there are different editor modes too. Because the world is suffering
			these different modes require another input to select an axis, after which you can use the mouse to move along that axis.
			
			G - activate Grab mode
				X - move along X axis
				Y - move along Y axis
				Z - move along Z axis
				
			R - activate Rotation mode.
				X - theta
				Y - phi
				Z - rot
				
			F - activate Frame (scaling) mode. A bit more tricky since different objects have different parameters.
				X - x axis (rx)
				Y - y axis (ry)
				Z - z axis (rz)
		*/
		
		if (editor_axisType) {
			switch (a.code) {
				case "KeyX":
					editor_toggleAxis(`x`);
					return;
				case "KeyY":
					editor_toggleAxis(`y`);
					return;
				case "KeyZ":
					editor_toggleAxis(`z`);
					return;
			}
		}
		
		switch (a.code) {
			case "Digit1":
				var oldPlayer = player;
				player = new Player(player.world, player.pos, player.theta, player.phi);
				if (editor_selected == oldPlayer) {
					editor_deselect(editor_selected);
				}
				break;
			case "Digit2":
				var oldPlayer = player;
				player = new Player_Debug(player.world, player.pos, player.theta, player.phi);
				if (editor_selected == oldPlayer) {
					editor_deselect(editor_selected);
				}
				break;
			case "Digit3":
				var oldPlayer = player;
				player = new Player_Noclip(player.world, player.pos, player.theta, player.phi);
				if (editor_selected == oldPlayer) {
					editor_deselect(editor_selected);
				}
				break;
		
			case "KeyB":
				//TODO: don't do this.
				if (loading_world.preEffects.length < 1 || loading_world.preEffects[0][0] != E_BRIGHTEN) {
					loading_world.preEffects.splice(0, 0, [E_BRIGHTEN, [4, 4, 4, 4]]);
				} else if (loading_world.preEffects[0][0] == E_BRIGHTEN) {
					loading_world.preEffects.splice(0, 1);
				}
				loading_world.shouldRegen = true;
				return;
			case "KeyE":
				controls.shouldDrag = true;
				return;
			case "KeyN":
				if (loading_world.postEffects.length < 1 || loading_world.postEffects[0][0] != E_ITERS) {
					loading_world.postEffects.splice(0, 0, [E_ITERS]);
				} else if (loading_world.postEffects[0][0] == E_ITERS) {
					loading_world.postEffects.splice(0, 1);
				}
				loading_world.shouldRegen = true;
				return;
			case "KeyC":
				if (editor_selected != player) {
					clipboard = editor_selected.serialize();
				}
				return;
			case "KeyV":
				if (clipboard) {
					var newObj = deserialize(clipboard);
					newObj.pos = calcPlacePos();
					loading_world.objects.push(newObj);
					if (newObj.type == TYPE_CLASS_LGROUP) {
						newObj.tick();
						newObj.break();
					}
					loading_world.shouldRegen = true;
				}
				return;
			case "KeyG":
				editor_toggleAxisSet(`grab`);
				return;
			case "KeyR":
				editor_toggleAxisSet(`rotate`);
				return;
			case "KeyF":
				editor_toggleAxisSet(`scale`);
				return;
			case "KeyL":
				editor_local = !editor_local;
				return;
			case "KeyO":
				if (controls.alt) {
					editor_deselect(editor_selected);
					return;
				}
				editor_raycast();
				return;
			case "KeyP":
				var r = Math.round;
				var c = camera;
				navigator.clipboard.writeText(`${r(c.pos[0])},${r(c.pos[1])},${r(c.pos[2])}, ${c.theta.toFixed(3)},${c.phi.toFixed(3)}`);
				return;
			case "Escape":
				//escape from whatever wherever
				if (editor_axis) {
					editor_axis = null;
					return;
				}
				if (editor_axisType) {
					editor_axisType = null;
					return;
				}
				return;
		}
	}

	//handling controls for player
	switch (a.code) {
		case "KeyA":
		case "ArrowLeft":
			player.aPos[0] = -player.accel;
			break;
		case "KeyW":
		case "ArrowUp":
			player.aPos[2] = player.accel;
			break;
		case "KeyD":
		case "ArrowRight":
			player.aPos[0] = player.accel;
			break;
		case "KeyS":
		case "ArrowDown":
			player.aPos[2] = -player.accel;
			break;
		case "ShiftLeft":
		case "ShiftRight":
			player.dash();
			player.aPos[1] = -player.accel;
			controls.shift = true;
			break;
		case "AltLeft":
		case "AltRight":
			controls.alt = true;
			a.preventDefault();
			break;
		case "Space":
			player.jump();
			if (controls.shift) {
				player.aPos[1] = 0;
			} else {
				player.aPos[1] = player.accel;
			}
			a.preventDefault();
			break;
		
		case "BracketRight":
			debug_listening = !debug_listening;
			loading_world.shouldRegen = true;
			break;
	}
}

function handleKeyNegate(a) {
	if (!player) {
		return;
	}
	switch(a.code) {
		case "KeyA":
		case "ArrowLeft":
			player.aPos[0] = Math.max(player.aPos[0], 0);
			break;
		case "KeyW":
		case "ArrowUp":
			player.aPos[2] = Math.min(player.aPos[2], 0);
			break;
		case "KeyD":
		case "ArrowRight":
			player.aPos[0] = Math.min(player.aPos[0], 0);
			break;
		case "KeyS":
		case "ArrowDown":
			player.aPos[2] = Math.max(player.aPos[2], 0);
			break;
		case "ShiftLeft":
		case "ShiftRight":
			player.aPos[1] = Math.max(player.aPos[1], 0);
			controls.shift = false;
			break;
		case "AltLeft":
		case "AltRight":
			controls.alt = false;
			break;
		case "Space":
			player.aPos[1] = Math.min(player.aPos[1], 0);
			break;


		case "KeyE":
			controls.shouldDrag = false;
			break;
	}
}

function handleCursorLockChange() {
	console.log(`cursor lock is changing`);
	const isOn = (document.pointerLockElement === banvas || document.mozPointerLockElement === banvas);
	controls.cursorLock = isOn;
	document.onmousedown = isOn ? handleMouseDown : null;
	document.onmousemove = isOn ? handleMouseMove : null;
	document.onmouseup = isOn ? handleMouseUp : null;
}


function handleMouseDown(a) {
	controls.mButton = 1 + (a.button / 2);

	//left-click
	if (controls.mButton == 1) {
		if (debug_listening) {
			editor_raycast();
		}
		controls.shouldDrag = true;
		return;
	}

	//right-click
	if (controls.mButton == 2) {
		return;
	}
}

var testOut = [];
function handleMouseMove(a) {
	if (editor_axis) {
		//figure out how much to move by, which direction to move, and then move there
		var dragSpeed = 1.0;
		var dragOffset = -(a.movementX + a.movementY) * dragSpeed;
		if (Math.abs(dragOffset) < 0.01) {
			return;
		}
		editor_applyDrag(dragOffset);
		loading_world.shouldRegen = true;
		return;
	}
	var dTheta = a.movementX * controls.sensitivity;
	var phiLimit = (camera_projFunc == projectPanini) ? pi * 0.2 : pi * 0.49;
	player.theta = modulate(player.theta + dTheta, tau);
	player.phi = clamp(player.phi - a.movementY * controls.sensitivity, -phiLimit, phiLimit);

	editor_updateHolp();
	
	//change velocity in the case of rotating, since dPos is based on view angle
	if (Math.abs(a.movementX) > 2) {
		[player.dPos[0], player.dPos[2]] = rotate(player.dPos[0], player.dPos[2], dTheta - (2 * controls.sensitivity));
	}
}

function handleMouseUp(a) {
	controls.mButton = 0;
	controls.shouldDrag = false;
}

function handleWheel(a) {
	a.preventDefault();
	editor_placeOffset *= (1 + a.deltaY / 50);
	editor_placeOffset = clamp(editor_placeOffset, ...editor_placeRange);
	editor_updateHolp();
}
