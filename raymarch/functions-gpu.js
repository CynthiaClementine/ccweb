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
	texture_universeArr = new Float32Array(universe_maxID * (world_maxObjs + texture_worldCols) * (texture_rowsPerObj + texture_rowsPerMat) * 4);
	texture_universe = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	
	gl.texImage3D(
		gl.TEXTURE_2D_ARRAY, 0, gl.RGBA32F,
		world_maxObjs + texture_worldCols, texture_rowsPerObj + texture_rowsPerMat, universe_maxID, 
		0, gl.RGBA, gl.FLOAT, texture_universeArr
	);
	
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	
	Object.keys(worlds).forEach(k => {
		createGPUWorld(worlds[k]);
	});
}

function createGPUWorld(worldObj) {
	console.log(`putting world ${worldObj.name} on the GPU:.`);
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	const worldOffset = worldObj.id * (texture_rowsPerObj + texture_rowsPerMat) * rowOffset;
	//objects
	const objs = worldObj.objects;
	for (var o=0; o<objs.length; o++) {
		setObject(worldOffset, rowOffset, o, ...objs[o].serializeGPU());
		setMaterial(worldOffset, rowOffset, o, ...objs[o].material.serializeGPU());
	}
	
	//attributes, pre-effects, post-effects
	setWorldAttribs(worldObj, worldOffset, rowOffset);
	setEffects(worldObj, worldOffset, rowOffset, false);
	setEffects(worldObj, worldOffset, rowOffset, true);
	
	updateWorldTexture();
}

function setWorldAttribs(world, worldOff, rowOff) {
	//other world attributes: spawn, object count, sun vector, shadow%
	const data = texture_universeArr;
	var base = worldOff + world_maxObjs * 4;
	
	data[base + 0] = world.spawn[0];
	data[base + 1] = world.spawn[1];
	data[base + 2] = world.spawn[2];
	data[base + 3] = world.objects.length;
	base += rowOff;
	data[base + 0] = world.sunVector[0];
	data[base + 1] = world.sunVector[1];
	data[base + 2] = world.sunVector[2];
	data[base + 3] = world.ambientLight;
	base += rowOff;
	data[base + 0] = world.preEffects.length;
	data[base + 1] = world.postEffects.length;
	
	//5 pixels free to do ???? whatever with I guess
}

function setEffects(world, worldOff, rowOff, doPreEffects) {
	var effArr = doPreEffects ? world.preEffects : world.postEffects;
	var map = doPreEffects ? map_preId : map_postId;
	

	//loop trhough all post-effects
	for (var w=0; w<effArr.length; w++) {
		const eff = effArr[w];
		const id = map[eff[0].name];
		var base = worldOff + (world_maxObjs + 1 + w) * 4;
		base += doPreEffects * rowOff * 4;
		console.log(`processing ${id}, ${base}`);
		
		const data = texture_universeArr;
		
		//flatten out all arguments
		var args = [];
		for (var q=1; q<eff.length; q++) {
			if (eff[q].constructor.name != "Number") {
				//assume it's a color
				args = args.concat(eff[q][0] / 255, eff[q][1] / 255, eff[q][2] / 255);
			} else {
				args = args.concat(eff[q]);
			}
		}
		console.log(`args: ${args}`);
		
		//write to data array
		data[base + 0] = id;
		data[base + 1] = args[0] ?? 0;
		console.log(args[0], args[1], args[2]);
		data[base + 2] = args[1] ?? 0;
		data[base + 3] = args[2] ?? 0;
		
		for (var q=3; q<args.length; q+=4) {
			base += rowOff;
			data[base + 0] = args[q + 0] ?? 0;
			data[base + 1] = args[q + 1] ?? 0;
			data[base + 2] = args[q + 2] ?? 0;
			data[base + 3] = args[q + 3] ?? 0;
		}
	}
}

function updateWorldTexture() {
	const xOffset = 0;
	const yOffset = 0;
	const zOffset = 0;
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	//TODO: ????????
	gl.uniform1i(gl.getUniformLocation(program, "uSceneTex"), 0);
	
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage3D(
		gl.TEXTURE_2D_ARRAY, 0,
		xOffset, yOffset, zOffset,
		world_maxObjs + texture_worldCols, texture_rowsPerObj + texture_rowsPerMat, universe_maxID,
		gl.RGBA, gl.FLOAT, texture_universeArr
	);
}

function createTestGPUWorld() {
	setObject(0, 10, [0, 30, -8], [1, 1, 0], null, 4, 4, 3);
	setObject(1, 2, [-500, 300, 0], [128 / 255, 128 / 255, 1], 100, 200)
}

function setObject(worldOff, rowOff, objInd, id, pos, materialRef, pram0, pram1_1, pram1_2, pram1_3, pram1_4, pram2_1, pram2_2, pram2_3, pram2_4) {
	var base = worldOff + objInd * 4;
	
	const data = texture_universeArr;
	const materialID = materialRef.type;
	
	// Row 0
	data[base + 0] = id; // type
	data[base + 1] = materialID; // material id
	data[base + 2] = 0xff0110ff; //these two are unused for now
	data[base + 3] = 0xff0110ff;
	base += rowOff;
	data[base + 0] = pos[0];  //pos
	data[base + 1] = pos[1];
	data[base + 2] = pos[2];
	data[base + 3] = pram0;
	base += rowOff;
	data[base + 0] = pram1_1; //rx, ry, rz
	data[base + 1] = pram1_2;
	data[base + 2] = pram1_3;
	data[base + 3] = pram1_4;
	base += rowOff;
	data[base + 0] = pram2_1;
	data[base + 1] = pram2_2;
	data[base + 2] = pram2_3;
	data[base + 3] = pram2_4;
}

function setMaterial(worldOff, rowOff, objInd, matID, color4, pram1_1, pram1_2, pram1_3, pram1_4, pram2_1, pram2_2, pram2_3, pram2_4) {
	var base = worldOff + objInd * 4;
	
	const data = texture_universeArr;
	
	base += rowOff * 4;
	data[base + 0] = color4[0];  //color
	data[base + 1] = color4[1];
	data[base + 2] = color4[2];
	data[base + 3] = color4[3];
	base += rowOff;
	data[base + 0] = pram1_1; // param space 1
	data[base + 1] = pram1_2; 
	data[base + 2] = pram1_3;
	data[base + 3] = pram1_4;
	base += rowOff;
	data[base + 0] = pram2_1; //param space 2
	data[base + 1] = pram2_2;
	data[base + 2] = pram2_3;
	data[base + 3] = pram2_4;
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
	
	uDebug = gl.getUniformLocation(program, "uDebug");
	uResolution = gl.getUniformLocation(program,"uResolution");
	uTime = gl.getUniformLocation(program,"uTime");
	uCamPos = gl.getUniformLocation(program,"uCamPos");
	uCamRot = gl.getUniformLocation(program,"uCamRot");
	uCamWorld = gl.getUniformLocation(program,"uCamWorld");
}

function feedGPU() {
	gl.uniform2f(uResolution, canvas.width, canvas.height);
	gl.uniform1f(uTime, world_time);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function GPU_transferObj(world, object) {
	const worldOffset = world.id * (texture_rowsPerObj + texture_rowsPerMat) * (world_maxObjs + texture_worldCols) * 4;
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	setObject(worldOffset, rowOffset, world.objects.indexOf(object), ...object.serializeGPU());
	updateWorldTexture();
}

function GPU_toggleDebug() {
	var val = gl.getUniform(program, uDebug);
	console.log(val, !val);
	gl.uniform1i(uDebug, !val);
}
