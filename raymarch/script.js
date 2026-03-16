window.onload = setup;
window.onresize = resize;


window.addEventListener("keydown", handleKeyPress);
window.addEventListener("keyup", handleKeyNegate);

document.addEventListener("mousemove", handleMouseMove);
document.addEventListener('pointerlockchange', handleCursorLockChange, false);
document.addEventListener('mozpointerlockchange', handleCursorLockChange, false);

var canvas;
var gl;

var banvas;
var btx;

async function setup() {
	var vertexShaderCode = await loadCode(`shaderV.glsl`);
	var fragmentShaderCode = await loadCode(`shaderF.glsl`);
	
	banvas = document.querySelector(`#banvas`);
	btx = banvas.getContext("2d");
	canvas = document.querySelector(`#glcanvas`);
	gl = canvas.getContext("webgl2");
	if (!gl) {
		alert("WebGL2 not supported. This program will not run correctly.");
		throw new Error("WebGL2 not supported");
	}
	if (!gl.getExtension(`EXT_color_buffer_float`)) {
		alert(`Float colors not supported. This program will not run correctly.`);
		throw new Error("float colors not supported");
	}
	
	banvas.requestPointerLock = banvas.requestPointerLock || banvas.mozRequestPointerLock;
	document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
	banvas.onclick = function() {banvas.requestPointerLock({unadjustedMovement: true});}
	
	document.title = `Raymarching: ${splashes[(Math.random() * splashes.length) | 0]}`;
	
	resize();
	setupGLState(vertexShaderCode, fragmentShaderCode);
	createWorlds();
	createBVHTexture();
	createObjectsTexture();
	
	player = new Player_Debug(loading_world, Pos(...loading_world.spawn));
	camera = new Camera(loading_world, Pos(0, 0, 0));
	
	window.requestAnimationFrame(main);
}

async function loadCode(url) {
	return await (await fetch(url)).text();
}

let last = 0;
var time = 0;

function main() {
	perf_startT = performance.now();
	world_time += 1;
	//tick all world objects
	loading_world = camera.world;
	player.tick();
	camera.tick();
	
	loading_world.objects.forEach(o => {
		o.tick();
	});
	loading_world.tick();
	
	feedGPU();

	//end
	finishMain();
}

function finishMain() {
	render_linesDrawn = 0;
	
	//calculate frame time
	perf_endT = performance.now();
	var elapsedMS = (perf_endT - perf_startT);
	perf_log[perf_n] = elapsedMS;
	perf_n = (perf_n + 1) % perf_len;
	
	//log performance
	var avgElapsedMS = (perf_log.reduce((a, b) => a + b) / perf_len);
	
	//changing display size
	if (render_n != render_goalN) {
		render_n = render_goalN;
		//ough
		page_animation = window.setTimeout(main, 70);
	} else {
		//regular frame advance
		// console.log(`calculating timeout for ${frameTime} - ${elapsedMS.toFixed(2)} = ${Math.max(1, frameTime - elapsedMS).toFixed(3)}`);
		page_animation = window.setTimeout(main, Math.max(1, frameTime - elapsedMS));
	}
}




function resize() {
	var width = window.innerWidth - 10;
	var height = window.innerHeight - 10;
	var blockSize = Math.min(width, height);
	
	canvas.width = blockSize;
	banvas.width = blockSize;
	canvas.height = blockSize;
	banvas.height = blockSize;
	// editorPanelGroup.style = `margin-left: ${blockSize + 20}px`;
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
}

function handleKeyPress(a) {
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