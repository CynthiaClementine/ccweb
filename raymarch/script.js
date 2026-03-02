window.onload = setup;
window.onresize = resize;

window.addEventListener("keydown", (e) => {
	keys[e.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (e) => {
	keys[e.key.toLowerCase()] = false;
});

document.addEventListener("mousemove", (e) => {
	if(document.pointerLockElement === canvas){
		camTheta += e.movementX * 0.002;
		camPhi -= e.movementY * 0.002;
		camPhi = Math.max(-1.5, Math.min(1.5, camPhi));
	}
});
/*
function createShader(gl, type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (success) {
		return shader;
	}
	
	console.log(gl.getShaderInfoLog(shader));
	gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
	var program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (success) {
		return program;
	}
 
	console.log(gl.getProgramInfoLog(program));
	gl.deleteProgram(program);
}
*/


async function loadCode(url) {
	return await (await fetch(url)).text();
}


const f32Size = 4;


var canvas;
var gl;

var camPos = [0, 1.5, 0];
var camTheta = 0;
var camPhi = 0;
var keys = {};

var texture_objects;
var texture_objArr;
const texture_rowsPerObj = 4;
const texture_maxObjs = 512;

var program;
var vertexBuffer;
var posLoc;
//uniforms
var uResolution, uTime, uCamPos, uCamRot, uObjectCount;

async function setup() {
	var vertexShaderCode = await loadCode(`shaderV.glsl`);
	var fragmentShaderCode = await loadCode(`shaderF.glsl`);
	
	canvas = document.querySelector(`#glcanvas`);
	gl = canvas.getContext("webgl2");
	if (!gl) {
		alert("WebGL2 not supported");
		throw new Error("WebGL2 not supported");
	}
	if (!gl.getExtension('EXT_color_buffer_float')) {
		console.log("No EXT_color_buffer_float");
	}
	
	canvas.addEventListener("click", () => {
		canvas.requestPointerLock();
	});
	resize();
	
	program = gl.createProgram();
	gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShaderCode));
	gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShaderCode));
	gl.linkProgram(program);
	gl.useProgram(program);
	
	// ---------- Fullscreen Quad ----------
	quad = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
		-1,-1,
		1,-1,
		-1, 1,
		-1, 1,
		1,-1,
		1, 1
	]), gl.STATIC_DRAW);

	posLoc = gl.getAttribLocation(program, "aPosition");
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
	
	uResolution = gl.getUniformLocation(program,"uResolution");
	uTime = gl.getUniformLocation(program,"uTime");
	uCamPos = gl.getUniformLocation(program,"uCamPos");
	uCamRot = gl.getUniformLocation(program,"uCamRot");
	uObjectCount = gl.getUniformLocation(program,"uObjectCount");
	
	createObjectsTexture();
	
	window.requestAnimationFrame(main);
}

function createObjectsTexture() {
	texture_objArr = new Float32Array(texture_maxObjs * texture_rowsPerObj * 4);
	
	texture_objects = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture_objects);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA32F,
		texture_maxObjs,
		texture_rowsPerObj,
		0,
		gl.RGBA,
		gl.FLOAT,
		texture_objArr
	);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_objects);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	
	setObject(0, 11, [4, 3, 7], 	[1/2, 1, 0], null, 3, 4, 4);
	setObject(1, 10, [-10, 3, -7], [0, 1/2, 1], 3, 4, 4);
	
	gl.uniform1i(uObjectCount, 2);
}

function setObject(index, id, pos, color, param1, param2, param3, param4, param5, param6, param7, param8, param9) {
	var base = index * 4;
	const rowOff = texture_maxObjs * 4;
	const data = texture_objArr;
	/*
	0 - type ID. See table somewhere else.
	1 |
	2 | - color for now. Will be material ID later.
	3 |
	4
	5
	6
	7
	 */
	
	// Row 0
	data[base + 0] = id; // type = sphere
	data[base + 1] = color[0]; // material id
	data[base + 2] = color[1];
	data[base + 3] = color[2];
	base += rowOff;
	data[base + 0] = pos[0];
	data[base + 1] = pos[1];
	data[base + 2] = pos[2];
	data[base + 3] = param1;
	base += rowOff;
	data[base + 0] = param2;
	data[base + 1] = param3;
	data[base + 2] = param4;
	data[base + 3] = param5;
	base += rowOff;
	data[base + 0] = 1;
	data[base + 1] = 1;
	data[base + 2] = 1;
	data[base + 3] = 1;
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_objects);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage2D(
		gl.TEXTURE_2D,
		0,
		0,
		0,
		texture_maxObjs,
		texture_rowsPerObj,
		gl.RGBA,
		gl.FLOAT,
		data
	);
}


function compile(type, source){
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
		console.error(gl.getShaderInfoLog(shader));
		throw "Shader compile failed";
	}
	return shader;
}

function getCameraMatrix(){
	cxDir = polToCart(camTheta + (Math.PI / 2), 0, 1);
	cyDir = polToCart(camTheta, camPhi + (Math.PI / 2), 1);
	czDir = polToCart(camTheta, camPhi, 1);

	// return [
	// 	cxDir[0], cyDir[0], czDir[0],
	// 	cxDir[1], cyDir[1], czDir[1],
	// 	cxDir[2], cyDir[2], czDir[2]
	// ];
	return [
		cxDir[0], cxDir[1], cxDir[2],
		cyDir[0], cyDir[1], cyDir[2],
		czDir[0], czDir[1], czDir[2]
	];
}

function update(dt){
	const speed = 0.8;
	const forward = [Math.sin(camTheta), 0, Math.cos(camTheta)];
	const right = [forward[2],0,-forward[0]];

	if(keys["w"]) {
		camPos[0]+=forward[0]*speed;
		camPos[2]+=forward[2]*speed;
	}
	if(keys["s"]) {
		camPos[0]-=forward[0]*speed;
		camPos[2]-=forward[2]*speed;
	}
	if(keys["a"]) {
		camPos[0]-=right[0]*speed;
		camPos[2]-=right[2]*speed;
	}
	if(keys["d"]) {
		camPos[0]+=right[0]*speed;
		camPos[2]+=right[2]*speed;
	}
}

let last = 0;
function main(t) {
	update();
	var time = 0;

	gl.uniform2f(uResolution, canvas.width, canvas.height);
	gl.uniform1f(uTime, time);
	gl.uniform3fv(uCamPos, camPos);
	gl.uniformMatrix3fv(uCamRot, false, getCameraMatrix());
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_objects);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	window.requestAnimationFrame(main);
}


function resize() {
	// Lookup the size the browser is displaying the canvas in CSS pixels.
	const displayWidth  = canvas.clientWidth;
	const displayHeight = canvas.clientHeight;
	
	// Check if the canvas is not the same size.
	const needResize = canvas.width  != displayWidth || canvas.height != displayHeight;
	
	if (needResize) {
		// Make the canvas the same size
		canvas.width  = displayWidth;
		canvas.height = displayHeight;
		gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
	}
}

function f() {
	const dpr = (window.devicePixelRatio || 1);
	canvas.width = innerWidth * dpr;
	canvas.height = innerHeight * dpr;
	gl.viewport(0, 0, canvas.width, canvas.height);
}



function polToCart(theta, phi, radius) {
	//theta here is horizontal angle, while phi is vertical inclination
	return [radius * Math.sin(theta) * Math.cos(phi), 
			radius * Math.sin(phi), 
			radius * Math.cos(theta) * Math.cos(phi)];
}