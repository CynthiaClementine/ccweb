function compile(type, source) {
	var shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

	if (!success) {
		console.error(`shader creation failed.`);
		console.log(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
	}

	return shader;
}

function createObjectsTexture() {
	texture_universeArr = new Float32Array(universe_maxID * (world_maxObjs + texture_worldCols) * (texture_rowsPerObj + texture_rowsPerMat) * 4);
	texture_universe = gl.createTexture();
	gl.uniform1i(uUniverseTex, 0);
	gl.activeTexture(gl.TEXTURE0);
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
	
	worldsByID.forEach(w => {
		createGPUWorld(w);
	});
}

function createBVHTexture() {
	texture_bvhArr = new Float32Array(universe_maxID * texture_rowsPerNode * (2 * world_maxObjs) * 4);
	texture_bvh = gl.createTexture();
	gl.uniform1i(uUniverseBVH, 1);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture_bvh);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA32F,
		texture_rowsPerNode * world_maxObjs, 2 * universe_maxID,
		0, gl.RGBA, gl.FLOAT, texture_bvhArr
	);
	
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture_bvh);
}

/**
 * takes a world object and puts it on the GPU's textures.
 * @param {World} worldObj the world to put on the GPU.
 */
function createGPUWorld(worldObj) {
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	const worldOffset = worldObj.id * (texture_rowsPerObj + texture_rowsPerMat) * rowOffset;
	//objects
	const objs = worldObj.expObjs;
	for (var o=0; o<objs.length; o++) {
		try {
			setObject(worldOffset, rowOffset, o, objs[o]);
			setMaterial(worldOffset, rowOffset, o, ...objs[o].material.serializeGPU());
		} catch (error) {
			console.error(`cannot send object ${worldObj.name}:${o} to the GPU!`, error);
		}
	}
	
	//attributes, pre-effects, post-effects
	setWorldAttribs(worldObj, worldOffset, rowOffset);
	setEffects(worldObj, worldOffset, rowOffset, false);
	setEffects(worldObj, worldOffset, rowOffset, true);
	
	//bvh
	const indsPerBVHRow = 2 * world_maxObjs * 4;
	const indsPerBVHWorld = 2 * indsPerBVHRow;
	for (var a=0; a<2*world_maxObjs; a++) {
		texture_bvhArr[worldObj.id*indsPerBVHWorld + indsPerBVHRow + a*4 + 3] = fencepost32;
	}
	setBvhArr(worldObj.bvh.root, worldObj, worldObj.id * texture_rowsPerNode * world_maxObjs * 2 * 4);
	
	updateWorldTexture();
	updateBvhTexture();
}

function setupGLState(vertexShaderCode, fragmentShaderCode) {
	const shaderV = compile(gl.VERTEX_SHADER, vertexShaderCode);
	const shaderF = compile(gl.FRAGMENT_SHADER, fragmentShaderCode);

	program = gl.createProgram();
	gl.attachShader(program, shaderV);
	gl.attachShader(program, shaderF);
	gl.linkProgram(program);
	
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);

	if (!success) {
		console.error(`program creation failure: ${success}`);
		gl.deleteProgram(program);
		return;xw
	}
	
	gl.useProgram(program);
	
	//vertices
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
	
	gl.bindBuffer(gl.ARRAY_BUFFER, quad);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);
	
	uDebug = gl.getUniformLocation(program, `uDebug`);
	uResFov = gl.getUniformLocation(program,`uResFov`);
	uTime = gl.getUniformLocation(program,`uTime`);
	uCamPos = gl.getUniformLocation(program,`uCamPos`);
	uCamRot = gl.getUniformLocation(program,`uCamRot`);
	uCamWorld = gl.getUniformLocation(program,`uCamWorld`);
	uUniverseTex = gl.getUniformLocation(program, `uUniverseTex`);
	uUniverseBVH = gl.getUniformLocation(program, `uUniverseBVHs`);
	
}

function setWorldAttribs(world, worldOff, rowOff) {
	//other world attributes: spawn, object count, sun vector, shadow%
	const data = texture_universeArr;
	var base = worldOff + world_maxObjs * 4;
	
	data[base + 0] = world.spawn[0];
	data[base + 1] = world.spawn[1];
	data[base + 2] = world.spawn[2];
	data[base + 3] = world.expObjs.length;
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

	//loop trhough all post-effects
	for (var w=0; w<effArr.length; w++) {
		const eff = effArr[w];
		const id = eff[0];
		var base = worldOff + (world_maxObjs + 1 + w) * 4;
		base += doPreEffects * rowOff * 4;
		
		const data = texture_universeArr;
		
		//flatten out all arguments
		var args = [];
		for (var q=1; q<eff.length; q++) {
			if (eff[q].constructor.name != `Number`) {
				//assume it's a color
				args = args.concat(eff[q][0] / 255, eff[q][1] / 255, eff[q][2] / 255);
			} else {
				args = args.concat(eff[q]);
			}
		}
		
		//write to data array
		data[base + 0] = id;
		data[base + 1] = args[0] ?? 0;
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

function setBvhArr(node, world, arrIndex, skipIndex) {
	const px = 4;
	skipIndex = skipIndex ?? -px;
	const indicesPerRow = px * 2 * world_maxObjs;
	const indicesPerWorld = 2 * indicesPerRow;
	const worldOff = (Math.floor(arrIndex / indicesPerWorld) * indicesPerWorld);
	const data = texture_bvhArr;
	const relIndex = arrIndex - worldOff;
	
	//lowPos + index
	data[arrIndex + 0] = node.minPos[0] - bvhTolerance;
	data[arrIndex + 1] = node.minPos[1] - bvhTolerance;
	data[arrIndex + 2] = node.minPos[2] - bvhTolerance;
	data[arrIndex + 3] = world.expObjs.indexOf(node.obj);
	//highPos + skip pointer
	arrIndex += indicesPerRow;
	data[arrIndex + 0] = node.maxPos[0] + bvhTolerance;
	data[arrIndex + 1] = node.maxPos[1] + bvhTolerance;
	data[arrIndex + 2] = node.maxPos[2] + bvhTolerance;
	data[arrIndex + 3] = skipIndex / px;
	
	if (node.left) {
		setBvhArr(node.left, world, worldOff + 2*relIndex + 1*px, 2*relIndex + 2*px);
	}
	if (node.right) {
		setBvhArr(node.right, world, worldOff + 2*relIndex + 2*px, skipIndex);
	}
}

function updateBvhTexture() {
	const xOffset = 0;
	const yOffset = 0;
	
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture_bvh);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage2D(
		gl.TEXTURE_2D, 0,
		xOffset, yOffset,
		world_maxObjs * texture_rowsPerNode, 2 * universe_maxID,
		gl.RGBA, gl.FLOAT, texture_bvhArr
	);
}

function updateWorldTexture() {
	const xOffset = 0;
	const yOffset = 0;
	const zOffset = 0;
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texSubImage3D(
		gl.TEXTURE_2D_ARRAY, 0,
		xOffset, yOffset, zOffset,
		world_maxObjs + texture_worldCols, texture_rowsPerObj + texture_rowsPerMat, universe_maxID,
		gl.RGBA, gl.FLOAT, texture_universeArr
	);
}

function setObject(worldOff, rowOff, objInd, objRef) {
	const data = texture_universeArr;
	const type = objRef.type;
	const material = objRef.material.type;
	var [theta, phi, rot] = [0, 90, 0];
	var pos;
	var nature;
	
	
	
	if (objRef.constructor.type == TYPE_CLASS_LOOP) {
		var shadow = objRef.objects[0];
		pos = objRef.pos;
		[theta, phi, rot] = [shadow.theta, shadow.phi, shadow.rot];
		nature = shadow.nature;
	} else {
		if (objRef.constructor.type != TYPE_FRACTAL) {
			[theta, phi, rot] = [objRef.theta, objRef.phi, objRef.rot];
		}
		pos = objRef.pos;
		nature = objRef.nature;
	} 
	
	const args = objRef.serializeGPU();
	
	//bit packing to fit the common params into row 0
	buf32_int[0] = ((type & 0xFFFF) << 0) | ((material & 0xFFFF) << 16);
	const typeMat = buf32_float[0];
	const rotation = packageRot(theta, phi, rot);
	
	
	// Row 0: object type + material type, nature, unused
	var base = worldOff + objInd * 4;
	data[base + 0] = typeMat;
	data[base + 1] = nature;
	data[base + 2] = rotation;
	data[base + 3] = fencepost32;
	if (objRef.constructor.type == TYPE_CLASS_LOOP) {
		//replace fencepost with loop counts
		buf32_int[0] = ((objRef.rx & 0x3FF) << 20) | ((objRef.ry & 0x3FF) << 10) | ((objRef.rz & 0x3FF) << 0)
		data[base + 3] = buf32_float[0];
	}
	base += rowOff;
	data[base + 0] = pos[0];
	data[base + 1] = pos[1];
	data[base + 2] = pos[2];
	data[base + 3] = args[0];
	base += rowOff;
	data[base + 0] = args[1]; //rx, ry, rz
	data[base + 1] = args[2];
	data[base + 2] = args[3];
	data[base + 3] = args[4];
	base += rowOff;
	data[base + 0] = args[5];
	data[base + 1] = args[6];
	data[base + 2] = args[7];
	data[base + 3] = args[8];
	buf32_float[0] = data[worldOff + objInd * 4 + 3];
	// console.log(`packaging up:`, typeMat, `(${type} ${material})`, nature, rotation, 
		// buf32_float[0], `(${(buf32_int[0] >> 20) & 0x3FF} ${(buf32_int[0] >> 10) & 0x3FF} ${(buf32_int[0] >> 0) & 0x3FF})`, pos[0], pos[1], pos[2], 
		// args[0], args[1], args[2], args[3], args[4], args[5], args[6], args[7], args[8]);
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

function feedGPU() {
	gl.uniform3f(uResFov, canvas.width, canvas.height, camera_FOV);
	gl.uniform1f(uTime, world_time);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture_bvh);
	gl.clear(gl.COLOR_BUFFER_BIT);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

function GPU_transferObj(world, object) {
	const worldOffset = world.id * (texture_rowsPerObj + texture_rowsPerMat) * (world_maxObjs + texture_worldCols) * 4;
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	setObject(worldOffset, rowOffset, world.expObjs.indexOf(object), object);
	updateWorldTexture();
}

function GPU_toggleDebug() {
	var val = gl.getUniform(program, uDebug);
	console.log(val, (val + 1) % 3);
		gl.uniform1i(uDebug, (val + 1) % 3);
}
