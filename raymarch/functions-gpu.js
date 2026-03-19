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
	
	Object.keys(worlds).forEach(k => {
		createGPUWorld(worlds[k]);
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
	const objs = worldObj.objects;
	for (var o=0; o<objs.length; o++) {
		setObject(worldOffset, rowOffset, o, objs[o]);
		setMaterial(worldOffset, rowOffset, o, ...objs[o].material.serializeGPU());
	}
	
	//attributes, pre-effects, post-effects
	setWorldAttribs(worldObj, worldOffset, rowOffset);
	setEffects(worldObj, worldOffset, rowOffset, false);
	setEffects(worldObj, worldOffset, rowOffset, true);
	setBvhArr(worldObj.bvh.root, worldObj, worldObj.id * texture_rowsPerNode * world_maxObjs * 2 * 4);
	
	updateWorldTexture();
	updateBvhTexture();
}

/**
 * sets an object and its material on the GPU, with as little information passed in as possible.
 * @param {World} world the world the object is a part of
 * @param {Scene3dObject} obj the index of the object in the world's object array
 */
function setObjectEasy(world, obj) {
	createGPUWorld(world);
	return;
	const index = world.objects.indexOf(obj);
	if (index < 0) {
		console.error(`${obj.serialize()} is not a valid object in world ${world.name}!`);
		return;
	}
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	const worldOffset = world.id * (texture_rowsPerObj + texture_rowsPerMat) * rowOffset;
	//objects
	setObject(worldOffset, rowOffset, index, obj);
	setMaterial(worldOffset, rowOffset, index, ...obj.material.serializeGPU());
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
	gl.enableVertexAttribArray(posLoc);
	gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
	
	uDebug = gl.getUniformLocation(program, `uDebug`);
	uResolution = gl.getUniformLocation(program,`uResolution`);
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

function setBvhArr(node, world, arrIndex) {
	const px = 4;
	const indicesPerRow = px * 2 * world_maxObjs;
	const indicesPerWorld = 2 * indicesPerRow;
	const worldOff = (Math.floor(arrIndex / indicesPerWorld) * indicesPerWorld);
	const data = texture_bvhArr;
	const relIndex = arrIndex - worldOff;
	
	//lowPos + index
	// console.log(node, world, relIndex, arrIndex);
	data[arrIndex + 0] = node.minPos[0] - bvhTolerance;
	data[arrIndex + 1] = node.minPos[1] - bvhTolerance;
	data[arrIndex + 2] = node.minPos[2] - bvhTolerance;
	data[arrIndex + 3] = world.objects.indexOf(node.obj);
	//highPos
	arrIndex += indicesPerRow;
	data[arrIndex + 0] = node.maxPos[0] + bvhTolerance;
	data[arrIndex + 1] = node.maxPos[1] + bvhTolerance;
	data[arrIndex + 2] = node.maxPos[2] + bvhTolerance;
	data[arrIndex + 3] = fencepost32;
	
	if (node.left) {
		setBvhArr(node.left, world, worldOff + 2 * relIndex + 1*px);
	}
	if (node.right) {
		setBvhArr(node.right, world, worldOff + 2 * relIndex + 2*px);
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
	var base = worldOff + objInd * 4;
	
	const data = texture_universeArr;
	
	const type = objRef.type;
	const pos = (objRef.constructor.name == "Scene3dLoop") ? [objRef.xRange, objRef.yRange, objRef.zRange] : objRef.pos;
	const material = objRef.material.type;
	const nature = objRef.nature;
	const args = objRef.serializeGPU();
	
	// Row 0: type, material, nature, unused
	data[base + 0] = type;
	data[base + 1] = material;
	data[base + 2] = nature;
	data[base + 3] = fencepost32;
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
	gl.uniform2f(uResolution, canvas.width, canvas.height);
	gl.uniform1f(uTime, world_time);
	
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture_universe);
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, texture_bvh);
	gl.drawArrays(gl.TRIANGLES, 0, 6);
	
	const err = gl.getError();
	if (err !== gl.NO_ERROR) {
		console.log(`GL ERROR`, err);
	}
}

function GPU_transferObj(world, object) {
	const worldOffset = world.id * (texture_rowsPerObj + texture_rowsPerMat) * (world_maxObjs + texture_worldCols) * 4;
	const rowOffset = (world_maxObjs + texture_worldCols) * 4;
	setObject(worldOffset, rowOffset, world.objects.indexOf(object), object);
	updateWorldTexture();
}

function GPU_toggleDebug() {
	var val = gl.getUniform(program, uDebug);
	console.log(val, (val + 1) % 3);
	gl.uniform1i(uDebug, (val + 1) % 3);
}
