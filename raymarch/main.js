
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

	camera = new Camera(loading_world, ...(loading_world.spawn));
	render_cornerCoords = [0, 0, 480, 480];
	
	window.setTimeout(main, 10);
}

function initiateWorkers() {
	for (var e=0; e<worker_num; e++) {
		worker_pool[e] = new Worker("worker.js");
		worker_pool[e].onmessage = handleWorkerMsg;
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
		if (workerInd < worker_pool.length) {
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

function drawLine(x, colorArr) {
	if (Math.random() < 0.01) {
		console.log(x, colorArr);
	}
	var blockSize = Math.round(canvas.width / render_n);
	for (var y=0; y<colorArr.length; y++) {
		ctx.fillStyle = `rgb(${colorArr[y][0]}, ${colorArr[y][1]}, ${colorArr[y][2]})`;
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
		default:
			console.error(`not sure what to do with worker messageID ${data[0]}! Full message:`, data);
			break;
	}
	// console.log(e.data);
}


function handleKeyPress(a) {
	//handling controls for camera
	switch (a.keyCode) {
		case 65:
		case 37:
			camera.ax = -camera.speed;
			break;
		case 87:
		case 38:
			camera.az = camera.speed;
			break;
		case 68:
		case 39:
			camera.ax = camera.speed;
			break;
		case 83:
		case 40:
			camera.az = -camera.speed;
			break;
		case 16:
			controls_shiftPressed = true;
			break;
		case 32:
			camera.jump();
			break;
		
		//toggling editor
		case 221:
			loading_editor.toggle();
			break;
	}
}

function handleKeyNegate(a) {
	switch(a.keyCode) {
		case 65:
		case 37:
			if (camera.ax < 0) {
				camera.ax = 0;
			}
			break;
		case 87:
		case 38:
			if (camera.az > 0) {
				camera.az = 0;
			}
			break;
		case 68:
		case 39:
			if (camera.ax > 0) {
				camera.ax = 0;
			}
			break;
		case 83:
		case 40:
			if (camera.az < 0) {
				camera.az = 0;
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