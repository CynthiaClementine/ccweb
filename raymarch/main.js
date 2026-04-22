window.onload = setup;
window.onresize = resize;
window.addEventListener("keydown", handleKeyPress, false);
window.addEventListener("keyup", handleKeyNegate, false);
document.addEventListener('pointerlockchange', handleCursorLockChange, false);
document.addEventListener('mozpointerlockchange', handleCursorLockChange, false);
window.addEventListener("wheel", handleWheel, {passive: false});

var canvas;
var gl;

var banvas;
var btx;

var useCPU = false;

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
	
	updateFOV(camera_FOV, false);

	banvas.requestPointerLock = banvas.requestPointerLock || banvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
	banvas.onclick = function() {banvas.requestPointerLock({unadjustedMovement: true});}

	player = new Player_Debug(loading_world, Pos(...loading_world.spawn));
	if (loading_world.spawn[3]) {
		player.theta = loading_world.spawn[3];
		player.phi = loading_world.spawn[4];
	}
	camera = new Camera(loading_world, Pos(...loading_world.spawn));
	
	
	editor_initialize();
	editor_select();
	document.title = `Raymarching: ${splashes[(Math.random() * splashes.length) | 0]}`;
	
	//serializing / editor error checking
	if (!keysMatch(map_strObj, objectEditables)) {
		throw new Error(`Mismatch between editor objects and defined objects!`);
	}
	if (!keysMatch(map_strMat, materialEditables)) {
		throw new Error(`Mismatch between editor materials and defined materials!`);
	}

	setupGLState(vertexShaderCode, fragmentShaderCode);
	createBVHTexture();
	createObjectsTexture();
	
	resize();
	window.setTimeout(main, 10);
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
	perf_startT = performance.now();
	world_time += 1;
	//tick all world objects
	loading_world = camera.world;
	player.tick();
	camera.tick();
	
	//editor syncing
	if (debug_listening && controls_cursorLock) {
		if (editor_selected != player && controls_altPressed) {
			//held object?????
			var newPos = calcPlacePos();
			if (getDistancePos(newPos, editor_selected.pos) > 0.1) {
				editor_selected.pos = newPos;
				loading_world.shouldRegen = true;
			}
		}
	
		editor_controls.forEach(c => {
			try {
				c.synchronize();
			} catch (e) {}
		});
	}
	
	loading_world.objects.forEach(o => {
		o.tick();
	});
	loading_world.tick();
	
	draw();

	//end
	finishMain();
}

function finishMain() {
	drawUI();
	
	//calculate frame time
	perf_endT = performance.now();
	var elapsedMS = (perf_endT - perf_startT);
	perf_log[perf_n] = elapsedMS;
	perf_n = (perf_n + 1) % perf_len;
	
	//log performance
	var avgElapsedMS = 0;
	perf_log.forEach(p => {
		avgElapsedMS += p * p;
	});
	//weighted average towards higher values
	avgElapsedMS = Math.sqrt(avgElapsedMS) / Math.sqrt(perf_len);
	debugMSPF.innerHTML = avgElapsedMS.toFixed(2);
	debugMSPF.style = `color: ${(elapsedMS > frameTime * 0.9) ? "#F97" : "#444"}`;
	
	if (debug_flags.autoScale && world_time - render_lastScaleTime > perf_len) {
		render_lastScaleTime = world_time;
		if (avgElapsedMS > frameTime * 0.6) {
			render_goalN = clamp(Math.floor(render_n * 0.95), render_nAutoRange[0], render_nAutoRange[1]);
		}
		if (avgElapsedMS < frameTime * 0.1) {
			render_goalN = clamp(Math.ceil(render_n * 1.02), render_nAutoRange[0], render_nAutoRange[1]);
		}
	}
	
	//changing display size
	if (render_n != render_goalN) {
		render_n = render_goalN;
		resizeCanvas();
		updateFOV(camera_FOV);
		//ough
		page_animation = window.setTimeout(main, 70);
	} else {
		//regular frame advance
		// console.log(`calculating timeout for ${frameTime} - ${elapsedMS.toFixed(2)} = ${Math.max(1, frameTime - elapsedMS).toFixed(3)}`);
		page_animation = window.setTimeout(main, Math.max(1, frameTime - elapsedMS));
	}
}

function draw() {
	if (!useCPU) {
		feedGPU();
		//draw GPU's result to the drawing canvas
		btx.drawImage(gl.canvas,
			0, 0, canvas.width, canvas.height,
			0, 0, banvas.width, banvas.height);
		render_linesDrawn = render_n;
		return;
	}
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

/**
* uses the pxdata to draw 16-color pixel art onto the banvas. 
* @param {Number[]} pxData an array of integers. Each integer represents one line of the art. Individual pixels are represented by a chunk of 4 bits.
* @param {Number} startX the X coordinate of the banvas to start on
* @param {Number} startY the Y coordinate of the banvas to start on
* @param {Number} pxSize how large each pixel of the pixel art should be displayed at
 */
function drawPixelArt(pxData, startX, startY, pxSize) {
	var pxWidth = pxData.w * pxSize;
	var pxHeight = pxData.h * pxSize;
	
	for (var y=0; y<pxData.h; y++) {
		const dat = pxData[y];
		for (var x=0; x<pxData.w; x++) {
			const ind = dat >> (4 * (pxData.w - x - 1)) & 0xF;
			btx.fillStyle = colors16[ind];
			btx.fillRect(startX + x * pxSize, startY + y * pxSize, pxSize + 0.5, pxSize + 0.5);
		}
	}
}

function drawUI() {
	const cvs = banvas;
	const cw = cvs.width;
	const ch = cvs.height;
	const pxW = cw / render_n;
	const pxH = ch / render_n;
	var center = [cvs.width / 2, cvs.height / 2];
	const crossLen = (render_n < 100) ? (1 / render_n) : 0.04;
	
	//crosshair
	btx.globalAlpha = 0.3;
	btx.beginPath();
	btx.strokeStyle = color_editor_border;
	btx.lineWidth = Math.ceil(ch * (1.5 / render_n));
	btx.moveTo(center[0] - ch * crossLen, center[1]);
	btx.lineTo(center[0] + ch * crossLen, center[1]);
	btx.moveTo(center[0], center[1] - ch * crossLen);
	btx.lineTo(center[0], center[1] + ch * crossLen);
	btx.stroke();
	
	//collision
	//draw everything
	if (debug_flags.collisionRaycast) {
		const pixelsInX = render_colN;
		const pixelsInY = render_colN;
	
		const xDir = polToCart(camera.theta + (Math.PI / 2), 0, 1);
		const yDir = polToCart(camera.theta, camera.phi - (Math.PI / 2), 1);
		const zDir = polToCart(camera.theta, camera.phi, camera_planeOffset);
	
		for (var x=0; x<pixelsInX; x++) {
			drawLine(x, calcLine(xDir, yDir, zDir, x, pixelsInX, pixelsInY));
		}
	}
	
	if (!debug_listening) {
		btx.globalAlpha = 1;
		return;
	}
	
	//debug bars
	btx.fillStyle = color_editor_border;
	btx.fillRect(0, 0, cvs.width, pxH * 12);
	btx.fillRect(0, ch - pxH * 12, cvs.width, pxH * 12);
	
	drawEditorGizmo();
	
	//selected object ghost
	if (editor_selected != player) {
		var ghostPos = calcScreenPos(editor_selected.pos);
		if (ghostPos) {
			btx.globalAlpha = 1;
			btx.lineWidth = 1;
			btx.strokeStyle = colors16[15];
			btx.beginPath();
			btx.arc(...ghostPos, 6, 0, Math.PI * 2);
			btx.stroke();
			btx.globalAlpha = 0.3;
		}
	}
	
	//global/local indicator
	btx.globalAlpha = 0.6;
	drawPixelArt(editor_local ? pxdata_box : pxdata_world, 4 * pxW, 16 * pxH, pxW * 4);
	btx.globalAlpha = 1;
}

function drawLine(x, colorArr) {
	//writing directly to imageData is theoretically faster than changing fillStyle a bunch
	var blockSizeTrue = (banvas.width / render_colN);
	var blockSize = Math.round(banvas.width / render_colN);
	var imageData = btx.createImageData(blockSize, banvas.height);
	var dataBlock = imageData.data;
	for (var y=0; y<render_colN; y++) {
		var r = colorArr[3*y];
		for (var yOff=0; yOff<blockSize; yOff++) {
			var lineInd = 4 * blockSize * (y * blockSize + yOff);
			for (var xOff=0; xOff<blockSize; xOff++) {
				var pixelInd = lineInd + (4 * xOff);
				dataBlock[pixelInd] = r;
				dataBlock[pixelInd+3] = r / 2;
			}
		}
	}
	
	btx.putImageData(imageData, x * blockSizeTrue, 0);
	render_linesDrawn += 1;
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


function handleKeyPress(a) {
	if (!player) {
		return;
	}
	if (debug_listening) {
		/*
		all debug effects are activated by pressing ] and then another key.
		DEBUG EFFECTS:
			C - copy selected object
			V - paste selected object
			
			B - toggle Bounding Box highlights
			N - show the Number of iterations per pixel
			
			O - select crosshair's Object
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
			case "KeyB":
				//TODO: don't do this.
				if (loading_world.preEffects.length < 1 || loading_world.preEffects[0][0] != world_brighten) {
					loading_world.preEffects.splice(0, 0, [world_brighten, [4, 4, 4, 4]]);
				} else if (loading_world.preEffects[0][0] == world_brighten) {
					loading_world.preEffects.splice(0, 1);
				}
				loading_world.shouldRegen = true;
				return;
			case "KeyN":
				if (loading_world.postEffects.length < 1 || loading_world.postEffects[0][0] != bg_iters) {
					loading_world.postEffects.splice(0, 0, [bg_iters]);
				} else if (loading_world.postEffects[0][0] == bg_iters) {
					loading_world.postEffects.splice(0, 1);
				}
				loading_world.shouldRegen = true;
				return;
			case "KeyC":
				editor_raycast();
				if (editor_selected != player) {
					clipboard = editor_selected.serialize();
				}
				return;
			case "KeyV":
				if (clipboard) {
					var newObj = deserialize(clipboard);
					newObj.pos = calcPlacePos();
					loading_world.objects.push(newObj);
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
				editor_raycast();
				return;
			case "KeyP":
				navigator.clipboard.writeText(`${Math.round(camera.pos[0])},${Math.round(camera.pos[1])},${Math.round(camera.pos[2])}`);
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
				editor_select(player);
				return;
		}
	}

	//handling controls for player
	switch (a.code) {
		case "KeyA":
		case "ArrowLeft":
			player.aPos[0] = -player.speed;
			break;
		case "KeyW":
		case "ArrowUp":
			player.aPos[2] = player.speed;
			break;
		case "KeyD":
		case "ArrowRight":
			player.aPos[0] = player.speed;
			break;
		case "KeyS":
		case "ArrowDown":
			player.aPos[2] = -player.speed;
			break;
		case "ShiftLeft":
		case "ShiftRight":
			player.dash();
			player.aPos[1] = -player.speed;
			controls_shiftPressed = true;
			break;
		case "AltLeft":
		case "AltRight":
			controls_altPressed = true;
			editor_raycast();
			break;
		case "Space":
			player.jump();
			player.aPos[1] = player.speed;
			a.preventDefault();
			break;
		
		case "BracketRight":
			debug_listening = !debug_listening;
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
			controls_shiftPressed = false;
			break;
		case "AltLeft":
		case "AltRight":
			controls_altPressed = false;
			break;
		case "Space":
			player.aPos[1] = Math.min(player.aPos[1], 0);
			controls_dashPressed = false;
			break;
	}
}

function handleCursorLockChange() {
	console.log(`cursor lock is changing`);
	if (document.pointerLockElement === banvas || document.mozPointerLockElement === banvas) {
		controls_cursorLock = true;
		document.addEventListener("mousemove", handleMouseMove, false);
	} else {
		controls_cursorLock = false;
		document.removeEventListener("mousemove", handleMouseMove, false);
	}
}

function handleMouseMove(a) {
	if (editor_axis) {
		//figure out how much to move by, which direction to move, and then move there
		var dragSpeed = 1.0;
		var dragOffset = -(a.movementX + a.movementY) * dragSpeed;
		if (Math.abs(dragOffset) < 0.01) {
			return;
		}
		
		// Apply accumulated drag offset to actual position
		var axisVec = editor_getAxisVec(editor_axis);
		switch (editor_axisType) {
			case `scale`:
				editor_selected.rx += axisVec[0] * dragOffset;
				editor_selected.ry += axisVec[1] * dragOffset;
				editor_selected.rz += axisVec[2] * dragOffset;
				break;
			case `grab`:
				editor_selected.pos[0] += axisVec[0] * dragOffset;
				editor_selected.pos[1] += axisVec[1] * dragOffset;
				editor_selected.pos[2] += axisVec[2] * dragOffset;
				break;
			case `rotate`:
				dragOffset *= 0.01;
				
				if (editor_local) {
					editor_selected.theta += dragOffset * (editor_axis == `x`);
					editor_selected.phi += dragOffset * (editor_axis == `y`);
					editor_selected.rot += dragOffset * (editor_axis == `z`);
				} else {
					var res = transformTransform([0, 0, 0], editor_selected.theta, editor_selected.phi, editor_selected.rot, [0, 0, 0], 
								dragOffset * (editor_axis == `y`), dragOffset * (editor_axis == `x`), dragOffset * (editor_axis == `z`));
					[editor_selected.theta, editor_selected.phi, editor_selected.rot] = [res.theta, res.phi, res.rot];
				}
				editor_selected.theta = modulate(editor_selected.theta, Math.PI * 2);
				editor_selected.phi = clamp(editor_selected.phi, -Math.PI / 2, Math.PI / 2);
				editor_selected.rot = modulate(editor_selected.rot, Math.PI * 2);
				break;
		}
		loading_world.shouldRegen = true;
		return;
	}
	var dTheta = a.movementX * controls_sensitivity;
	player.theta += dTheta;
	player.phi -= (a.movementY) * controls_sensitivity;
	var phiLimit = (camera_projFunc == projectPanini) ? Math.PI * 0.2 : Math.PI * 0.49;
	player.phi = clamp(player.phi, -phiLimit, phiLimit);
	
	//change velocity in the case of rotating, since dPos is based on view angle
	if (Math.abs(a.movementX) > 2) {
		[player.dPos[0], player.dPos[2]] = rotate(player.dPos[0], player.dPos[2], dTheta - (2 * controls_sensitivity));
	}
}

function handleWheel(a) {
	a.preventDefault();
	editor_placeOffset *= (1 + a.deltaY / 50);
	editor_placeOffset = clamp(editor_placeOffset, ...editor_placeRange);
}