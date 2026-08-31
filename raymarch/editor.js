//all the things that have to do with the JS-facing part of the editor

/**
* creates a default object given a constructor type. For the list of types, see all TYPE_ declarations in config.js
* @param {Integer} objType an integer representing the type of object to create. If left undefined, defaults to 0
 */
function createDefaultObject(objType) {
	objType = objType ?? TYPE_SPHERE;
	var type = map_typeObj[objType];
	return new type({pos: Pos(0, 0, 0), theta: 0, phi: 0, rot: 0}, createDefaultMaterial(), 0, 10, 10, 10, 1, 12, 6, 10, 10, 10, 10, 10);
}

/**
 * creates a default object, then directly applies properties to it based on an input list of properties
 * @param {Integer} objType an integer representing the type of object to create. If left undefined, defaults to 0
 * @param {Object} properties an object containing properties to apply
 */
function createDescribedObject(objType, properties) {
	var obj = createDefaultObject(objType);
	Object.keys(properties).forEach(k => {
		obj[k] = properties[k];
	});
	
	return obj;
}

/**
* creates a default material given a constructor string.
* @param {String|undefined} conStr the string representation of the type. If left undefined, uses the `color` material.
 */
function createDefaultMaterial(conStr) {
	conStr = conStr ?? `color`;
	var type = map_strMat[conStr];
	switch (type) {
		case M_Portal:
			return new M_Portal(`start`, Pos(0, 0, 0));
		case undefined:
			console.error(`ough`);
		default:
			return new type(255, 0, 255, 128);
	}
}

/**
 * creates a default world given a name
 * @param {String} name 
 */
function createDefaultWorld(name) {
	new World(0, `${name}:
		E_BG [150,180,255]
		E_FADE [150,180,255] 4000
		E_SUN [230,144,126] 0.01
	sun:	0.1 1.2
	spawn:	0 0 0`,
	`BOX~[0,0,0]~0~R|color:0~0~64|100~50~100`);
	loadWorld(name);
	loading_world.shouldRegen = true;
}

/**
* attempts to transfer an object's properties from one to another. 
 */
function transferProperties(oldObj, newObj) {
	var refuseTransfer = [`pos`, `material`, `type`];
	
	if (newObj.material.type != M_GRAVITY) {
		var materialCopy = deserializeMat(oldObj.material.serialize());
		newObj.material = materialCopy;
	}
	
	//standard translation
	newObj.pos = Pos(...oldObj.pos);
	
	//try to transfer as many properties as possible
	Object.keys(oldObj).forEach(p => {
		if (oldObj[p] && newObj[p] && !refuseTransfer.includes(p)) {
			newObj[p] = oldObj[p];
		}
	});
}

/**
* transfers properties of a material.
* @param {Material} oldMat the old material object
* @param {Material} newMat the new material object
 */
function transferPropertiesMat(oldMat, newMat) {
	//basically the only thing to transfer is color. idk
	var refuseTransfer = [`bounciness`, `type`];
	Object.keys(oldMat).forEach(p => {
		if (oldMat[p] && newMat[p] && !refuseTransfer.includes(p)) {
			newMat[p] = oldMat[p];
			
		}
	});
}

function deserialize(str) {
	str = str.replaceAll(`\t`, ``);
	const groups = [`LOOP`, `GROUP-L`];
	var isGroup = groups.includes(str.split(`~`)[0]);
	var base, material, params;
	var objs;
	
	if (isGroup) {
		const lines = str.split(`\n||`);
		objs = lines.slice(1).map(o => deserialize(o));
		[base, params] = lines[0].split(`|`);
		base = base.split(`~`);
		params = params.split(`~`);
	} else {
		//initial processing
		var spl = str.split(`|`);
		[base, material, params] = [spl[0], spl[1], spl[2]];
		//???????why
		for (var y=3; y<spl.length; y++) {
			params += `|` + spl[y];
		}
		base = base.split(`~`);
		material = deserializeMat(material);
		
		//regular objects
		params = params.split(`~`);
	}

	
	//base structure is consistent across objects
	var [type, pos, nature, theta, phi, rot] = base;
	
	type = map_strObj[type];
	if (!type) {
		throw new Error(`cannot deserialize type "${type}"!`);
	}
	pos = JSON.parse(pos);
	var gloop, smooth, ex, ey, ez;
	[nature, gloop, smooth, ex, ey, ez] = deserializeNat(nature);
	[quat, theta, phi, rot] = deserializeRot(theta, phi, rot);
	
	var posRotObj = {
		pos: Pos(...pos),
		quat: quat,
		theta: theta,
		phi: phi,
		rot: rot
	};
	
	var finalArgs = [posRotObj];
	if (material) {
		finalArgs.push(material);
		if (!Number.isNaN(nature)) {
			finalArgs.push([nature, gloop, smooth, ex, ey, ez])
		}
	}
	if (params && params != ``) {
		finalArgs.push(...params.map(a => +a));
	}
	return new type(...finalArgs, objs);
}

function deserializeRot(theta, phi, rot) {
	if (theta == `R`) {
		return [quatIdentity(), null, null, null];
	}
	
	//figure out if it's a quaternion or not
	if (phi == undefined) {
		//quat case
		return [unpackageQrot(parseInt(theta, 32)), null, null, null];
	}

	//euler case
	return [null, theta * degToRad, (phi - 90) * degToRad, rot * degToRad];
}

function deserializeMat(str) {
	//it's possible to have no material
	if (!str || str == ``) {
		return null;
	}
	var [name, params] = str.split(`:`);
	if (params) {
		params = params.split(`~`);
	} else {
		params = [];
	}
	var obj;
	var type = map_strMat[name];
	
	switch (name) {
		case `portal`:
			obj = new type(params[0], Pos(...JSON.parse(params[1])));
			break;
		default:
			try {
				obj = new type(...params.map(a => +a));
			} catch (e) {
				console.error(`cannot parse material "${str}"!`, e);
			}
	}
	return obj;
}

function calcPlacePos() {
	var offset = polToCart(camera.theta, camera.phi, editor.placeOff);
	var base = Pos(camera.pos[0] + offset[0], camera.pos[1] + offset[1], camera.pos[2] + offset[2]);
	const sd = editor.snapDist;

	if (editor.flags.snapGrid) {
		for (var d=0; d<3; d++) {
			base[d] = snapToGrid(base[d]);
		}
	}

	const trueObj = (obj) => {
		while (obj.parent) {
			obj = obj.parent;
		}
		return obj;
	}

	//snap to objects pos if necessary
	var exclude = trueObj(editor.selected);
	var pos = null;
	var dist = 1e101;
	var snapSet = loading_world.bvh.objectsInBox(...bounds_expandU([[...base], [...base]], 4*editor.snapDist));
	snapSet = snapSet.filter(o => trueObj(o) != exclude);
	if (editor.flags.snapPos) {
		//direct pos snapping
		snapSet.forEach(o => {
			//direct pos snapping
			var d = getDistancePos(o.pos, base);
			if (d < sd && d < dist) {
				pos = o.pos;
				dist = d;
			}
		});
		if (dist < sd) {
			base[0] = pos[0];
			base[1] = pos[1];
			base[2] = pos[2];
		} else if (editor.flags.snapAxis) {
			snapSet.forEach(o => {
				//2/3 axis snapping
				var px = Pos(base[0], o.pos[1], o.pos[2]);
				var py = Pos(o.pos[0], base[1], o.pos[2]);
				var pz = Pos(o.pos[0], o.pos[1], base[2]);
				d = getDistancePos(px, base);
				if (d < sd && d < dist) {
					pos = px;
					dist = d;
				}
				d = getDistancePos(py, base);
				if (d < sd && d < dist) {
					pos = py;
					dist = d;
				}
				d = getDistancePos(pz, base);
				if (d < sd && d < dist) {
					pos = pz;
					dist = d;
				}
			});
			if (dist < sd) {
				base[0] = pos[0];
				base[1] = pos[1];
				base[2] = pos[2];
			}
		}
	}

	// //snap to surface is a bit more tricky. We have to figure out where distance=0 is, but excluding the SDF of the current held object
	// if (editor.flags.surfaceSnap) {
	// 	var countingObjs = loading_world.bvh.objectsInBox(...augmentBounds(
	// 		bounds, editor.snapDist));

	// 	countingObjs = countingObjs.filter(a => trueObj(a) != exclude);

	// 	var iters = 10;
	// 	sceneSDF()
	// }
	
	
	return base;
}

var editor_controls = {
	set: [],
	world: [],
	obj: [],
	mat: []
};
var objectEditables = {};
var materialEditables = {};

function editor_setMaterial(val) {
	var mat = createDefaultMaterial(val, editor.selected.material.color);
	editor.selected.material = mat;
	loading_world.shouldRegen = true;
	ec_updatePanelsFor(editor.selected);
}


/**
* creates an object and adds it to the loading world. Returns said object.
* @param {Integer} objType the type of the object
 */
function editor_addObj(objType) {
	var obj = createDefaultObject(objType);
	obj.pos = calcPlacePos();
	loading_world.objects.push(obj);
	loading_world.shouldRegen = true;
	return obj;
}

/**
* applies a drag in screen space to the selected object
* @param {[Number,Number]} dragVec the screen-space vector to drag in
*/
function editor_applyDrag(dragVec) {
	var ea = editor.axis;
	if (!ea.size) {
		return;
	}
	if (Math.hypot(...dragVec) < 0.01) {
		return;
	}
	loading_world.shouldRegen = true;
	const [max, round] = [Math.max, Math.round];
	const es = editor.selected;

	//TODO:
	var cMat = camera.calcMatrix();
	var worldVecX = cMat.slice(0, 3);
	var worldVecY = cMat.slice(3, 6);
	// new system. Any dimensional projection can be represented as [full space] - [space not in subspace]
	// when projecting onto a plane, it's 3d - 1d. When projecting onto a line it's 3d - 2d. 
	// to have a system with 1, 2, or 3 vectors selected, just subtract out all the non-selected vectors.
	[`x`, `y`, `z`].forEach(v => {
		if (ea.has(v)) {
			return;
		}
		const vec = editor_getAxisVec(v);
		
		const XoN = proj(worldVecX, vec);
		worldVecX = [
			worldVecX[0] - XoN[0],
			worldVecX[1] - XoN[1],
			worldVecX[2] - XoN[2]
		];
		const YoN = proj(worldVecY, vec);
		worldVecY = [
			worldVecY[0] - YoN[0],
			worldVecY[1] - YoN[1],
			worldVecY[2] - YoN[2]
		];
	});

	// Apply accumulated drag offset to actual position
	const xDelta = worldVecX[0]*dragVec[0] + worldVecY[0]*dragVec[1];
	const yDelta = worldVecX[1]*dragVec[0] + worldVecY[1]*dragVec[1];
	const zDelta = worldVecX[2]*dragVec[0] + worldVecY[2]*dragVec[1];

	//logic is messy but idk how best to organize this. It doesn't feel like it's worth full OOP
	//local scale
	if (editor.local && editor.axisType == `scale`) {
		if (es.rx != undefined) {
			//loop objects should expand slower
			if (es.type == TYPE_CLASS_LOOP) {
				xDelta = (xDelta / 4);
				yDelta = (yDelta / 4);
				zDelta = (zDelta / 4);
			}
			es.rx = max(es.rx + xDelta, 0);
			es.ry = max(es.ry + yDelta, 0);
			es.rz = max(es.rz + zDelta, 0);
			return;
		}
		if (es.rr != undefined) {
			es.r = max(es.r + xDelta, 1);
			es.rr = max(es.rr + zDelta, 1);
			return;
		}
		if (es.h != undefined) {
			es.r = max(es.r + xDelta, 1);
			es.h = max(es.h + zDelta, 1);
			return;
		}
		return;
	}

	//global scale
	if (editor.axisType == `scale`) {
		return;
	}
	

	//global and local grab both work well
	if (editor.axisType == `grab`) {
		//dragging will move the HOLP, and then the HOLP controls where the object goes. 
		//This is so we can have grid snapping as well as smooth movement
		editor.holp[0] += xDelta;
		editor.holp[1] += yDelta;
		editor.holp[2] += zDelta;

		if (editor.flags.snapGrid) {
			es.pos[0] = snapToGrid(editor.holp[0]);
			es.pos[1] = snapToGrid(editor.holp[1]);
			es.pos[2] = snapToGrid(editor.holp[2]);
		} else {
			es.pos[0] = editor.holp[0];
			es.pos[1] = editor.holp[1];
			es.pos[2] = editor.holp[2];
		}
		return;
	}

	//global rotate
	if (editor.axisType == `rotate`) {
		ea = Array.from(ea).sort();
		dragVec[0] *= 0.01;
		dragVec[1] *= 0.01;

		//just give up
		if (editor.local) {
			es.quat = normalize(quatMultiply(quatFromEuler(
				dragVec[0]*(ea[0] == `x`) + dragVec[1]*(ea[1] == `x`), 
				dragVec[0]*(ea[0] == `y`) + dragVec[1]*(ea[1] == `y`),
				dragVec[0]*(ea[0] == `z`) + dragVec[1]*(ea[1] == `z`)), es.quat));
		} else {
			es.quat = normalize(quatMultiply(es.quat, quatFromEuler(
				dragVec[0]*(ea[0] == `y`) + dragVec[1]*(ea[1] == `y`),
				dragVec[0]*(ea[0] == `x`) + dragVec[1]*(ea[1] == `x`), 
				dragVec[0]*(ea[0] == `z`) + dragVec[1]*(ea[1] == `z`))));
		}
		return;
	}
}

/**
* removes an object from the loading world. Returns said object
* @param {Event} e event catcher. Ignore.
* @param {Scene3dObject} object the object to remove.
* @returns {Scene3dObject} the removed object. Returns null if unable to remove.
 */
function editor_removeObj(e, object) {
	object = object ?? editor.selected;
	if (object == player) {
		return null;
	}

	//if it's a group, remove the component parts
	if (object.type == TYPE_CLASS_LGROUP) {
		object.objects.forEach(o => {
			editor_removeObj(null, o);
		});
		return object;
	}
	
	var index = loading_world.objects.indexOf(object);
	if (index < 0) {
		console.error(`cannot remove object ${object.serialize()} from loading world!`);
		return null;
	}
	loading_world.shouldRegen = true;
	var removed = loading_world.objects.splice(index, 1)[0];
	
	//make sure there's never an empty world
	if (loading_world.objects.length == 0) {
		loading_world.objects.push(createDefaultObject());
	}
	
	return removed;
}

function editor_loopify(e, object) {
	object = object ?? editor.selected;
	editor_deselect(editor.selected);
	if (object == player) {
		return null;
	}
	if (object.constructor.type == TYPE_CLASS_LOOP) {
		//unloop instead
		return editor_unloopify(e, object);
	}

	const posStore = Pos(...object.pos);
	editor_removeObj(null, object);
	object.pos = Pos(0, 0, 0);

	const b = object.bounds();
	const targetSize = [b[1][0] - b[0][0], b[1][1] - b[0][1], b[1][2] - b[0][2]];
	const loopObj = new Scene3dLoop({
		pos: posStore,
		quat: quatIdentity(),
	}, 1, 1, 1, ...targetSize, [object]);

	
	loading_world.objects.push(loopObj);
	loading_world.shouldRegen = true;
	editor_select(loopObj);
	return loopObj;
}

function editor_unloopify(e, object) {
	if (object.constructor.type != TYPE_CLASS_LOOP) {
		return null;
	}

	editor_removeObj(null, object);
	var base = {
		pos: object.pos,
		quat: object.quat,
	};

	var list = object.objects;

	list.forEach(o => {
		var final = transformTransform(o.pos, o.quat, base.pos, base.quat);
		o.pos = final.pos;
		o.quat = final.quat;
		loading_world.objects.push(o);
	});

	loading_world.shouldRegen = true;
	return [list];
}

function editor_raycastSimple(minDist) {
	var ray = new Ray_Tracking(loading_world, camera.pos, polToCart(camera.theta, camera.phi, 1), ray_maxDist, minDist);
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
	return ray;
}

function editor_raycast() {
	var obj;
	var rayL = editor_raycastSimple(ray_nearDist);
	var rayT = editor_raycastSimple(ray_minDist);

	console.log(rayL.object, rayT.object);

	//if they've selected the same object, we're good
	if (rayL.object == rayT.object) {
		obj = rayL.object;
	} else {
		//if the difference is fog, then it's important to select that
		if (rayL.object.nature & (N_FOG | N_GRAVITY)) {
			obj = rayL.object;
		} else {
			obj = rayT.object;
		}
	}

	if (controls.alt) {
		editor_deselect(obj);
		return;
	}
	if (!controls.shift) {
		editor_deselect(editor.selected);
	}
	editor_select(obj);
	//set the placeOffset to match
	editor.placeOff = getDistancePos(editor.selected.pos, camera.pos);
}


/**
 * removes an object from the list of selected objects. If `editor.selected` is passed in, deselects everything and selects the player.
 * Logs an error and returns if asked to deselect something not selected.
 * @param {Scene3dObject} object the object to deselect.
 */
function editor_deselect(object) {
	if (!object) {
		console.error(`cannot deselect ${object}!`);
		return;
	}

	//if the goal is to deselect everything, then select the player
	if (editor.selected == object) {
		editor.selected = undefined;
		editor_select(player);
		return;
	}

	//if there's multiple things selected, remove it from the group
	if (editor.selected.type == TYPE_CLASS_LGROUP) {
		editor.selected.removeObj(object);
		editor.holp = Pos(...editor.selected.pos);
		return;
	}

	//we're still here? then there's only one thing selected.. but the goal is NOT to deselect it. What?
	console.log(`deselection error: trying to deselect`, object, `but the only object selected is`, editor.selected);

}

/**
 * adds an object to the list of selected objects. Transforms editor.selected to be whatever is required for this.
 * @param {Scene3dObject} object the object to select
 */
function editor_select(object) {
	if (!object) {
		return;
	}
	//only select top-level collections
	var initialObj = object;
	while (object && object.parent) {
		object = object.parent;
	}
	if (object.selectFrom) {
		object = object.selectFrom(initialObj);
	}

	//if the player's selected, this is the first object and therefore easy.
	if (!editor.selected || editor.selected == player) {
		editor.selected = object;
	} else {
		//player is NOT selected. We need to select multiple objects
		if (editor.selected.type != TYPE_CLASS_LGROUP) {
			editor.selected = new SceneCollectionLoose({}, editor.selected);
		}

		editor.selected.addObj(object);
	}

	editor.holp = Pos(...editor.selected.pos);
	ec_updatePanelsFor(editor.selected);
}

function pathGet(path) {
	var p = window;
	var spl = path.split(`.`);
	for (var loc of spl) {
		p = p[loc];
	}
	return p;
}

function pathSet(path, value) {
	var p = window;
	var spl = path.split(`.`);
	var last = spl.pop();
	for (var loc of spl) {
		p = p[loc];
	}
	p[last] = value;
	return pathGet(path);
}

function editor_updateHolp() {
	if (editor.selected == player) {
		return;
	}
	if (!controls.grab) {
		return;
	}
	var newPos = calcPlacePos();
	editor.holp = Pos(...newPos);
	if (getDistancePos(newPos, editor.selected.pos) > 0.05) {
		editor.selected.pos = newPos;
		loading_world.shouldRegen = true;
	}
}

//the editor.axis var stores which axes you're allowed to scroll along.
function editor_toggleAxis(axisID) {
	if (editor.axis.has(axisID)) {
		editor.axis.delete(axisID);
		return;
	}
	editor.axis.add(axisID);
}

function editor_toggleAxisSet(setType) {
	editor.axis.clear();
	if (editor.axisType == setType) {
		editor.axisType = null;
		return;
	}
	editor.axisType = setType;
}

// local axis vector is the world-space vector of the object-space axis.
//This could maybe be an honest function, but you'd need to pass the object in
function editor_getAxisVec(axis) {
	if (!axis || !editor.axisType) {
		return [0, 0, 0];
	}
	var qLocal = editor.selected.quat ?? quatIdentity();
	const zeroPos = [0, 0, 0];
	
	if (editor.axisType == `grab` || editor.axisType == `scale`) {
		if (!editor.local) {
			qLocal = quatIdentity();
		}
		return transform([+(axis == `x`), +(axis == `y`), +(axis == `z`)], zeroPos, qLocal);
	}
	if (editor.axisType == `rotate`) {
		if (editor.local) {
			switch (axis) {
				case `x`:
					return transform([0, 1, 0], zeroPos, qLocal);
				case `y`:
					return transform([1, 0, 0], zeroPos, qLocal);
				case `z`:
					return transform([0, 0, 1], zeroPos, qLocal);
			}
		}
		return [+(axis == `x`), +(axis == `y`), +(axis == `z`)];
	}
}


function saveWorldState() {
	var name = loading_world.name;
	if (!editHistory[name]) {
		editHistory[name] = [];
		editHistory[name].curr = 0;
	}
	const curr = editHistory[name].curr;
	
	var currState = loading_world.serialize();
	if (currState != editHistory[name][curr-1]) {
		console.log(`change between ${curr-1} and present, curr -> ${curr+1}!`);
		editHistory[name][curr] = currState;
		editHistory[name].curr = curr + 1;
	}
}

/**
* loads a world state in the temporal direction specified by dir
* @param {-1|1} dir the temporal direction to move in. -1 is backwards in time, while 1 is forwards in time.
 */
function loadWorldState(dir) {
	var name = loading_world.name;
	const id = loading_world.id;
	if (!editHistory[name]) {
		console.log(`nothing to load!`);
		return;
	}
	// ideally, editHistory[world][curr-1] is the current state
	//so loading should load curr, or curr-2
	var curr = editHistory[name].curr - 1 + dir;

	if (curr < 0) {
		console.log(`cannot load state: no history.`);
		return;
	}
	if (curr >= editHistory[name].length) {
		console.log(`cannot load state: no future.`);
		return;
	}

	console.log(`loading curr=${curr}/${editHistory[name].length-1}`);
	editHistory[name].curr = curr;
	
	var args = eval(`[`+editHistory[name][curr]+`]`);
	new World(loading_world.tickFunc, ...args);
	loadWorld(name);
	loading_world.shouldRegen = true;
}