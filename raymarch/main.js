
window.onload = setup;
window.onresize = typeIt;
window.addEventListener("keydown", handleKeyPress, false);
window.addEventListener("keyup", handleKeyNegate, false);
document.addEventListener('pointerlockchange', handleCursorLockChange, false);
document.addEventListener('mozpointerlockchange', handleCursorLockChange, false);

var canvas;
var ctx;

var banvas;
var btx;

//setup
function setup() {
	tree_sets = 7;
	initiateWorkers();
	createWorlds();
	canvas = document.getElementById("artbox");
	ctx = canvas.getContext("2d");
	banvas = document.getElementById("uibox");
	btx = banvas.getContext("2d");
	
	
	typeIt();
	updateFOV(camera_FOV, false);

	banvas.requestPointerLock = banvas.requestPointerLock || banvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
	banvas.onclick = function() {banvas.requestPointerLock({unadjustedMovement: true});}

	player = new Player(loading_world, Pos(...loading_world.spawn));
	camera = new Camera(loading_world, Pos(...loading_world.spawn));
	
	
	editor_initialize();
	editor_select();
	
	//serializing / editor error checking
	if (!keysMatch(map_strObj, objectEditables)) {
		throw new Error(`Mismatch between editor objects and defined objects!`);
	}
	if (!keysMatch(map_strMat, materialEditables)) {
		throw new Error(`Mismatch between editor objects and defined objects!`);
	}
	
	
	window.setTimeout(main, 10);
}

function initiateWorkers() {
	//if there are workers already, kill them
	if (worker_pool[0]) {
		for (var e=0; e<worker_pool.length; e++) {
			worker_pool[e].terminate();
		}
	}
	
	
	for (var e=0; e<worker_num; e++) {
		worker_pool[e] = new Worker("worker.js");
		worker_pool[e].onmessage = handleWorkerMsg;
		worker_pool[e].postMessage(["ID", e]);
		worker_ready[e] = false;
	}
}

function typeIt() {
	var width = window.innerWidth - 10;
	var height = window.innerHeight - 10;
	var blockSize = Math.min(width, height);
	
	canvas.width = blockSize;
	banvas.width = blockSize;
	editorPanelGroup.style = `margin-left: ${blockSize + 20}px`;
	canvas.height = blockSize;
	banvas.height = blockSize;
	
	// page_animation = window.setTimeout(main, 10);
}

function main() {
	perf_startT = performance.now();
	world_time += 1;
	//tick all world objects
	loading_world = camera.world;
	player.tick();
	//editor syncing
	var ab = Math.abs;
	var dp = player.dPos;
	if (debug_listening && Math.max(ab(dp[0]), ab(dp[1]), ab(dp[2])) > 0.1) {
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
	
	worker_pool.forEach(w => {
		w.postMessage(["updateCamera", camera.world.name, camera.pos[0], camera.pos[1], camera.pos[2], camera.theta, camera.phi]);
	});
	
	draw();

	//end
	finishMain();
}

function finishMain() {
	//first figure out if we can actually finish
	if (render_linesDrawn < render_n) {
		return;
	}
	render_linesDrawn = 0;
	
	drawUI();
	
	//calculate frame time
	perf_endT = performance.now();
	var elapsedMS = (perf_endT - perf_startT);
	perf_log[perf_n] = elapsedMS;
	perf_n = (perf_n + 1) % perf_len;
	
	//log performance
	var avgElapsedMS = (perf_log.reduce((a, b) => a + b) / perf_len);
	debugMSPF.innerHTML = avgElapsedMS.toFixed(2);
	debugMSPF.style = `color: ${(elapsedMS > frameTime * 0.9) ? "#F97" : "#444"}`;
	
	//changing display size
	if (render_n != render_goalN) {
		render_n = render_goalN;
		typeIt();
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
	//draw everything
	const pixelsInX = render_n;
	const pixelsInY = render_n;

	const xDir = polToCart(camera.theta + (Math.PI / 2), 0, 1);
	const yDir = polToCart(camera.theta, camera.phi - (Math.PI / 2), 1);
	const zDir = polToCart(camera.theta, camera.phi, camera_planeOffset);
	
	var workerInd = -1;

	for (var x=0; x<pixelsInX; x++) {
		workerInd = (workerInd + 1) % (worker_pool.length);
		// workerInd = 10;
		if (worker_num > 0) {
			worker_pool[workerInd].postMessage(["calcLine", x, pixelsInX, pixelsInY]);
		} else {
			//compute in the main thread
			drawLine(x, calcLine(xDir, yDir, zDir, x, pixelsInX, pixelsInY));
			
		}
	}
}

function drawUI() {
	var cw = canvas.width;
	var ch = canvas.height;
	var center = [canvas.width / 2, canvas.height / 2];
	
	//debug bars
	btx.clearRect(0, 0, canvas.width, canvas.height);
	btx.globalAlpha = 0.3;
	if (debug_listening) {
		btx.fillStyle = color_editor_border;
		btx.fillRect(0, 0, canvas.width, canvas.height * 0.03);
		btx.fillRect(0, canvas.height * 0.97, canvas.width, canvas.height * 0.03);
	}
	
	//crosshair
	btx.beginPath();
	btx.strokeStyle = color_editor_border;
	btx.lineWidth = Math.ceil(ch / 200);
	btx.moveTo(center[0] - ch * 0.05, center[1]);
	btx.lineTo(center[0] + ch * 0.05, center[1]);
	btx.moveTo(center[0], center[1] - ch * 0.05);
	btx.lineTo(center[0], center[1] + ch * 0.05);
	btx.stroke();
	btx.globalAlpha = 1;
}

function drawLine(x, colorArr) {
	//writing directly to imageData is theoretically faster than changing fillStyle a bunch
	var blockSize = Math.round(canvas.width / render_n);
	var imageData = ctx.createImageData(blockSize, canvas.height);
	var dataBlock = imageData.data;
	for (var y=0; y<render_n; y++) {
		var r = colorArr[3*y];
		var g = colorArr[3*y+1];
		var b = colorArr[3*y+2];
		
		for (var yOff=0; yOff<blockSize; yOff++) {
			var lineInd = 4 * blockSize * (y * blockSize + yOff);
			for (var xOff=0; xOff<blockSize; xOff++) {
				var pixelInd = lineInd + (4 * xOff);
				dataBlock[pixelInd] = r;
				dataBlock[pixelInd+1] = g;
				dataBlock[pixelInd+2] = b;
				dataBlock[pixelInd+3] = 255;
			}
		}
	}
	
	ctx.putImageData(imageData, x * blockSize, 0);
	render_linesDrawn += 1;
	
	finishMain();
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
	if (debug_listening) {
		/*
		all debug effects are activated by pressing ] and then another key.
		DEBUG EFFECTS:
			C - copy current pos to clipboard
			O - select crosshair's object
		*/
		
		switch (a.code) {
			case "KeyC":
				navigator.clipboard.writeText(`${Math.round(camera.pos[0])},${Math.round(camera.pos[1])},${Math.round(camera.pos[2])}`);
				break;
			case "KeyO":
				var ray = new Ray_Tracking(loading_world, camera.pos, polToCart(camera.theta, camera.phi, 1), ray_maxDist);
				ray.iterate();
				if (ray.world != loading_world) {
					//it's gone through a portal. It's hard to tell which one though because of the whole teleporting business
					var validPortals = [];
					loading_world.objects.forEach(o => {
						if (o.material.newWorld == ray.world) {
							validPortals.push(o);
						}
					});
					
					validPortals.sort((a, b) => a.distanceToPos(camera.pos) - b.distanceToPos(camera.pos));
					ray.object = validPortals[0];
				}
				if (ray.object) {
					console.log(`selecting`, ray.object);
				}
				
				editor_select(ray.object);
				break;
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
	player.theta += a.movementX * controls_sensitivity;
	player.phi -= (a.movementY) * controls_sensitivity;
	var phiLimit = (camera_projFunc == projectPanini) ? Math.PI * 0.2 : Math.PI * 0.49;
	player.phi = clamp(player.phi, -phiLimit, phiLimit);
}