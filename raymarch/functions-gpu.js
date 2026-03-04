function compile(type, source) {
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

function createObjectsTexture() {
	texture_universeArr = new Float32Array(texture_maxObjs * (texture_rowsPerObj + texture_rowsPerMat) * 4);
	
	texture_universe = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture_universe);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texImage2D(
		gl.TEXTURE_2D,
		0,
		gl.RGBA32F,
		texture_maxObjs,
		texture_rowsPerObj + texture_rowsPerMat,
		0,
		gl.RGBA,
		gl.FLOAT,
		texture_universeArr
	);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_universe);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	
	createGPUWorld(loading_world);
}

function createGPUWorld(worldObj) {
	console.log(`putting world ${worldObj.name} on the GPU:.`);
	const objs = worldObj.objects;
	for (var o=0; o<objs.length; o++) {
		setObject(o, ...objs[o].serializeGPU());
		setMaterial(o, ...objs[o].material.serializeGPU());
	}
	
	gl.uniform1i(uObjectCount, objs.length);
}

function createTestGPUWorld() {
	setObject(0, 10, [0, 30, -8], [1, 1, 0], null, 4, 4, 3);
	setObject(1, 2, [-500, 300, 0], [128 / 255, 128 / 255, 1], 100, 200)
	
	gl.uniform1i(uObjectCount, 2);
}

function setObject(index, id, pos, materialRef, param0, param1_1, param1_2, param1_3, param1_4, param2_1, param2_2, param2_3, param2_4) {
	var base = index * 4;
	const rowOff = texture_maxObjs * 4;
	const data = texture_universeArr;
	const materialID = materialRef.type;
	// var data = new Float32Array(8192);
	
	const xOffset = 0;
	const yOffset = 0;
	
	console.log(index, id, pos, materialRef, param0, param1_1, param1_2, param1_3, param1_4, param2_1, param2_2, param2_3, param2_4);
	
	// Row 0
	data[base + 0] = id; // type
	data[base + 1] = materialID; // material id
	data[base + 2] = 0xff0110ff; //these two are unused for now
	data[base + 3] = 0xff0110ff;
	base += rowOff;
	data[base + 0] = pos[0];  //pos
	data[base + 1] = pos[1];
	data[base + 2] = pos[2];
	data[base + 3] = param0;
	base += rowOff;
	data[base + 0] = param1_1; //rx, ry, rz
	data[base + 1] = param1_2;
	data[base + 2] = param1_3;
	data[base + 3] = param1_4;
	base += rowOff;
	data[base + 0] = param2_1;
	data[base + 1] = param2_2;
	data[base + 2] = param2_3;
	data[base + 3] = param2_4;
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_universe);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage2D(
		gl.TEXTURE_2D,
		0,
		xOffset,
		yOffset,
		texture_maxObjs,
		texture_rowsPerObj,
		gl.RGBA,
		gl.FLOAT,
		data
	);
}

function setMaterial(index, id, color4, param1_1, param1_2, param1_3, param1_4, param2_1, param2_2, param2_3, param2_4) {
	const rowOff = texture_maxObjs * 4;
	var base = (index * 4) + (rowOff * 4);
	const data = texture_universeArr;
	
	const xOffset = 0;
	const yOffset = 0;
	
	// Row 0
	data[base + 0] = color4[0];  //color
	data[base + 1] = color4[1];
	data[base + 2] = color4[2];
	data[base + 3] = color4[3];
	base += rowOff;
	data[base + 0] = param1_1; // param space 1
	data[base + 1] = param1_2; 
	data[base + 2] = param1_3;
	data[base + 3] = param1_4;
	base += rowOff;
	data[base + 0] = param2_1; //param space 2
	data[base + 1] = param2_2;
	data[base + 2] = param2_3;
	data[base + 3] = param2_4;
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture_universe);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage2D(
		gl.TEXTURE_2D,
		0,
		xOffset,
		yOffset,
		texture_maxObjs,
		texture_rowsPerObj + texture_rowsPerMat,
		gl.RGBA,
		gl.FLOAT,
		data
	);
}

function setupGLState(vertexShaderCode, fragmentShaderCode) {
	program = gl.createProgram();
	gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexShaderCode));
	gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentShaderCode));
	gl.linkProgram(program);
	
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		console.log(gl.getProgramInfoLog(program));
		gl.deleteProgram(program);
		return;
	}
	
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
	uCamWorld = gl.getUniformLocation(program,"uCamWorld");
	uObjectCount = gl.getUniformLocation(program,"uObjectCount");
}
