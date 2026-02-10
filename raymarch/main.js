
window.onload = setup;
window.onresize = () => {
	window.clearTimeout(render_sizeTimeout);
	render_sizeTimeout = window.setTimeout(typeIt, 60);
};
window.addEventListener("keydown", handleKeyPress, false);
window.addEventListener("keyup", handleKeyNegate, false);
document.addEventListener('pointerlockchange', handleCursorLockChange, false);
document.addEventListener('mozpointerlockchange', handleCursorLockChange, false);



//setup
function setup() {

	initiateWorkers();
	createWorlds();
	canvas = document.getElementById("artbox");
	ctx = canvas.getContext("2d");
	typeIt();

	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
	canvas.onclick = function() {canvas.requestPointerLock();}

	camera = new Camera(loading_world, new Float32Array(loading_world.spawn));
	render_cornerCoords = [0, 0, 480, 480];
	
	window.setTimeout(main, 10);
}

function initiateWorkers() {
	for (var e=0; e<worker_num; e++) {
		worker_pool[e] = new Worker("worker.js");
		worker_pool[e].onmessage = handleWorkerMsg;
		worker_pool[e].postMessage(["ID", e]);
	}
}

function typeIt(renderN) {
	// window.clearTimeout(page_animation);
	if (renderN) {
		render_n = renderN;
	}
	var width = window.innerWidth;
	var height = window.innerHeight - 60;
	var blockSize = Math.min(width / render_n, height / render_n);
	
	canvas.width = render_n * blockSize;
	canvas.height = render_n * blockSize;
	
	// page_animation = window.setTimeout(main, 10);
}

//loop loop loop loop
function main() {
	perf_startT = performance.now();
	
	
	
	world_time += 1;
	//tick all world objects
	loading_world = camera.world;
	camera.tick();
	loading_world.objects.forEach(o => {
		o.tick();
	});
	loading_world.tree.update();
	
	worker_pool.forEach(w => {
		w.postMessage(["updateCamera", camera.world.name, camera.x, camera.y, camera.z, camera.theta, camera.phi]);
	});
	
	draw();

	//editor stuff
	if (editor_active) {
		loading_editor.beDrawn();
	}

	//end
	finishMain();
}

function finishMain() {
	//first figure out if we can actually finish
	if (render_linesDrawn < render_n) {
		return;
	}
	
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
		typeIt(render_goalN);
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
	var pixelWidth = render_n;
	var pixelHeight = render_n;
	
	render_linesDrawn = 0;

	var multiple = camera_FOV / pixelWidth;

	var xDir = polToCart(camera.theta + (Math.PI / 2), 0, 1);
	var yDir = polToCart(camera.theta, camera.phi - (Math.PI / 2), 1);
	var zDir = polToCart(camera.theta, camera.phi, camera_planeOffset);
	var trueDir;
	var magnitude;
	
	var workerInd = -1;

	for (var x=0; x<pixelWidth; x++) {
		workerInd = (workerInd + 1) % (worker_pool.length);
		// workerInd = 10;
		if (workerInd < worker_pool.length && worker_pool[workerInd].ready) {
			// if (x % 2 == 1) {
			worker_pool[workerInd].postMessage(["calcLine", multiple, x, pixelWidth, pixelHeight]);
			// } else {
			// 	render_linesDrawn += 1;
			// }
		} else {
			//compute in the main thread
			drawLine(x, calcLine(xDir, yDir, zDir, multiple, x, pixelWidth, pixelHeight));
			
		}
	}
}

function drawUI() {
	var cw = canvas.width;
	var ch = canvas.height;
	var center = [canvas.width / 2, canvas.height / 2];
	
	//debug bars
	ctx.globalAlpha = 0.3;
	if (debug_listening) {
		ctx.fillStyle = color_editor_border;
		ctx.fillRect(0, 0, canvas.width, canvas.height * 0.03);
		ctx.fillRect(0, canvas.height * 0.97, canvas.width, canvas.height * 0.03);
	}
	
	//crosshair
	ctx.beginPath();
	ctx.strokeStyle = color_editor_border;
	ctx.lineWidth = Math.ceil(ch / 200);
	ctx.moveTo(center[0] - ch * 0.05, center[1]);
	ctx.lineTo(center[0] + ch * 0.05, center[1]);
	ctx.moveTo(center[0], center[1] - ch * 0.05);
	ctx.lineTo(center[0], center[1] + ch * 0.05);
	ctx.stroke();
	ctx.globalAlpha = 1;
}

function drawLine(x, colorArr) {
	var blockSize = Math.round(canvas.width / render_n);
	for (var y=0; y<render_n; y++) {
		ctx.fillStyle = `rgb(${colorArr[3*y]}, ${colorArr[3*y+1]}, ${colorArr[3*y+2]})`;
		// ctx.fillStyle = "#FFF";
		ctx.fillRect(x * blockSize, y * blockSize, blockSize + 0.1, blockSize + 0.1);
	}
	
	
	render_linesDrawn += 1;
	finishMain();
}

function handleWorkerMsg(e) {
	var data = e.data;
	switch (data[0]) {
		case "colorLine":
			drawLine(data[1], data[2]);
			break;
		case "ready":
			if (data[1] != -1) {
				worker_pool[data[1]].ready = true;
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
			O - give information about the crosshair's object
		
		*/
		console.log(a.keyCode);
		
		switch (a.code) {
			case "KeyC":
				navigator.clipboard.writeText(`${Math.round(camera.x)},${Math.round(camera.y)},${Math.round(camera.z)}`);
				break;
			case "KeyO":
				// var ray = new Ray_Tracking(loading_world, )
				// console.log(ray.object);
				break;
		}
		return;
	}

	//handling controls for camera
	switch (a.code) {
		case "KeyA":
		case "ArrowLeft":
			camera.aPos[0] = -camera.speed;
			break;
		case "KeyW":
		case "ArrowUp":
			camera.aPos[2] = camera.speed;
			break;
		case "KeyD":
		case "ArrowRight":
			camera.aPos[0] = camera.speed;
			break;
		case "KeyS":
		case "ArrowDown":
			camera.aPos[2] = -camera.speed;
			break;
		case "ShiftLeft":
		case "ShiftRight":
			controls_shiftPressed = true;
			break;
		case "Space":
			camera.jump();
			break;
		
		case "BracketRight":
			debug_listening = !debug_listening;
			break;
	}
}

function handleKeyNegate(a) {
	switch(a.keyCode) {
		case 65:
		case 37:
			if (camera.aPos[0] < 0) {
				camera.aPos[0] = 0;
			}
			break;
		case 87:
		case 38:
			if (camera.aPos[2] > 0) {
				camera.aPos[2] = 0;
			}
			break;
		case 68:
		case 39:
			if (camera.aPos[0] > 0) {
				camera.aPos[0] = 0;
			}
			break;
		case 83:
		case 40:
			if (camera.aPos[2] < 0) {
				camera.aPos[2] = 0;
			}
			break;
		case 16:
			controls_shiftPressed = false;
			break;
	}
}

function handleCursorLockChange() {
	console.log(`cursor lock is changing`);
	if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas) {
		controls_cursorLock = true;
		document.addEventListener("mousemove", handleMouseMove, false);
	} else {
		controls_cursorLock = false;
		document.removeEventListener("mousemove", handleMouseMove, false);
	}
}

function handleMouseMove(a) {
	camera.theta += a.movementX * controls_sensitivity;
	camera.phi -= (a.movementY) * controls_sensitivity;
	if (Math.abs(camera.phi) > Math.PI / 2.02) {
		if (camera.phi < 0) {
			camera.phi = Math.PI / -2.01;
		} else {
			camera.phi = Math.PI / 2.01;
		}
	}
}