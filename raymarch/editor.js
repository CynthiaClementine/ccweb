//all the things that have to do with the JS-facing part of the editor

var editor_selected = undefined;
var editor_initBuffer = null;
var editor_isStable = true;


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
	if (theta == `R`) {
		[theta, phi, rot] = [`0`, `90`, `0`];
	}
	[theta, phi, rot] = [+theta, +phi, +rot];
	var posRotObj = {
		pos: Pos(...pos),
		theta: theta * degToRad,
		phi: (phi - 90) * degToRad,
		rot: rot * degToRad
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
	var offset = polToCart(camera.theta, camera.phi, editor_placeOffset);
	var r = Math.round;
	var base = Pos(camera.pos[0] + offset[0], camera.pos[1] + offset[1], camera.pos[2] + offset[2]);
	const sd = editor_flags.snapDist;

	if (editor_flags.snapToGrid) {
		for (var d=0; d<3; d++) {
			base[d] = r(base[d] / editor_flags.gridDist) * editor_flags.gridDist;
		}
	}

	const trueObj = (obj) => {
		while (obj.parent) {
			obj = obj.parent;
		}
		return obj;
	}

	//snap to objects pos if necessary
	var exclude = trueObj(editor_selected);
	var pos = null;
	var dist = 1e101;
	var snapSet = loading_world.bvh.objectsInBox(...bounds_expand([[...base], [...base]], 4*editor_flags.snapDist));
	snapSet = snapSet.filter(o => trueObj(o) != exclude);
	if (editor_flags.snapToPos) {
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
		} else {
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
	// if (editor_flags.snapToSurface) {
	// 	var countingObjs = loading_world.bvh.objectsInBox(...augmentBounds(
	// 		bounds, editor_flags.snapDist));

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
	var mat = createDefaultMaterial(val, editor_selected.material.color);
	editor_selected.material = mat;
	loading_world.shouldRegen = true;
	editor_updatePanelsFor(editor_selected);
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
	const ea = editor_axis;
	if (ea == ``) {
		return;
	}
	if (Math.hypot(...dragVec) < 0.01) {
		return;
	}
	loading_world.shouldRegen = true;
	const [max, round] = [Math.max, Math.round];
	const es = editor_selected;

	// Apply accumulated drag offset to actual position
	//sometimes there's only 1 axisVec, but that's ok. In that case one of these will be 0hat
	var aVecX = editor_getAxisVec(ea[0]);
	var aVecY = editor_getAxisVec(ea[1]);
	var aVec = [aVecX[0]+aVecY[0], aVecX[1]+aVecY[1], aVecX[2]+aVecY[2]];

	var cMat = camera.calcMatrix();
	var cVecX = cMat.slice(0, 3);
	var cVecY = cMat.slice(3, 6);
	
	var xDelta = cVecX[0]*aVec[0]*dragVec[0] + cVecY[0]*aVec[0]*dragVec[1];
	var yDelta = cVecX[1]*aVec[1]*dragVec[0] + cVecY[1]*aVec[1]*dragVec[1];
	var zDelta = cVecX[2]*aVec[2]*dragVec[0] + cVecY[2]*aVec[2]*dragVec[1];

	//logic is messy but idk how best to organize this. It doesn't feel like it's worth full OOP
	//local scale
	if (editor_local && editor_axisType == `scale`) {
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
	if (editor_axisType == `scale`) {
		return;
	}
	

	//global and local grab both work well
	if (editor_axisType == `grab`) {
		es.pos[0] += xDelta;
		es.pos[1] += yDelta;
		es.pos[2] += zDelta;
		return;
	}

	//global rotate
	if (editor_axisType == `rotate`) {
		dragVec[0] *= 0.01;
		dragVec[1] *= 0.01;
		if (editor_local) {
			es.theta += dragVec[0]*(ea[0] == `x`) + dragVec[1]*(ea[1] == `x`);
			es.phi +=   dragVec[0]*(ea[0] == `y`) + dragVec[1]*(ea[1] == `y`);
			es.rot +=   dragVec[0]*(ea[0] == `z`) + dragVec[1]*(ea[1] == `z`);
		} else {
			var res = transformTransform([0, 0, 0], es.theta, es.phi, es.rot, [0, 0, 0], 
				dragVec[0]*(ea[0] == `x`) + dragVec[1]*(ea[1] == `x`), 
				dragVec[0]*(ea[0] == `y`) + dragVec[1]*(ea[1] == `y`), 
				dragVec[0]*(ea[0] == `z`) + dragVec[1]*(ea[1] == `z`));
			[es.theta, es.phi, es.rot] = [res.theta, res.phi, res.rot];
		}
		es.theta = modulate(es.theta, Math.PI * 2);
		es.phi = clamp(es.phi, -Math.PI / 2, Math.PI / 2);
		es.rot = modulate(es.rot, Math.PI * 2);
		return;
	}
	

	

	switch (editor_axisType) {
		case `scale`:
			
			break;
		case `grab`:
			break;
		case `rotate`:
			break;
	}
}

/**
* removes an object from the loading world. Returns said object
* @param {Event} e event catcher. Ignore.
* @param {Scene3dObject} object the object to remove.
* @returns {Scene3dObject} the removed object. Returns null if unable to remove.
 */
function editor_removeObj(e, object) {
	object = object ?? editor_selected;
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
	object = object ?? editor_selected;
	editor_deselect(editor_selected);
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
		theta: 0, phi: 0, rot: 0
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
		theta: object.theta,
		phi: object.phi,
		rot: object.rot,
	};

	var list = object.objects;

	list.forEach(o => {
		var final = transformTransform(o.pos, o.theta, o.phi, o.rot, base.pos, base.theta, base.phi, base.rot);
		o.pos = final.pos;
		o.theta = final.theta;
		o.phi = final.phi;
		o.rot = final.rot;
		loading_world.objects.push(o);
	});

	loading_world.shouldRegen = true;
	return [list];
}

function editor_raycast() {
	var ray = new Ray_Tracking(loading_world, camera.pos, polToCart(camera.theta, camera.phi, 1), ray_maxDist, ray_nearDist);
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
	if (controls.alt) {
		editor_deselect(ray.object);
		return;
	}
	if (!controls.shift) {
		editor_deselect(editor_selected);
	}
	editor_select(ray.object);
	//set the placeOffset to match
	editor_placeOffset = getDistancePos(editor_selected.pos, camera.pos);
}


/**
 * removes an object from the list of selected objects. If `editor_selected` is passed in, deselects everything and selects the player.
 * Logs an error and returns if asked to deselect something not selected.
 * @param {Scene3dObject} object the object to deselect.
 */
function editor_deselect(object) {
	if (!object) {
		console.error(`cannot deselect ${object}!`);
		return;
	}

	//if the goal is to deselect everything, then select the player
	if (editor_selected == object) {
		editor_selected = undefined;
		editor_select(player);
		return;
	}

	//if there's multiple things selected, remove it from the group
	if (editor_selected.type == TYPE_CLASS_LGROUP) {
		editor_selected.removeObj(object);
		return;
	}

	//we're still here? then there's only one thing selected.. but the goal is NOT to deselect it. What?
	console.log(`deselection error: trying to deselect`, object, `but the only object selected is`, editor_selected);

}

/**
 * adds an object to the list of selected objects. Transforms editor_selected to be whatever is required for this.
 * @param {Scene3dObject} object the object to select
 */
function editor_select(object) {
	if (!object) {
		console.error(`cannot select nothing!`);
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
	if (!editor_selected || editor_selected == player) {
		editor_selected = object;
	} else {
		//player is NOT selected. We need to select multiple objects
		if (editor_selected.type != TYPE_CLASS_LGROUP) {
			editor_selected = new SceneCollectionLoose({}, editor_selected);
		}

		editor_selected.addObj(object);
	}

	editor_updatePanelsFor(editor_selected);
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
	if (editor_selected == player) {
		return;
	}
	if (!controls.shouldDrag) {
		return;
	}
	var newPos = calcPlacePos();
	if (getDistancePos(newPos, editor_selected.pos) > 0.1) {
		editor_selected.pos = newPos;
		loading_world.shouldRegen = true;
	}
}

//the editor_axis var stores which axes you're allowed to scroll along. It can store up to 2.
function editor_toggleAxis(axisID) {
	var ea = editor_axis;
	//remove case
	if (ea.includes(axisID)) {
		editor_axis = (ea[0] == axisID) ? ea.slice(1) : ea.slice(0,1);
		return;
	}
	//add case
	if (ea.length < 2) {
		editor_axis += axisID;
	}
}

function editor_toggleAxisSet(setType) {
	editor_axis = ``;
	if (editor_axisType == setType) {
		editor_axisType = null;
		return;
	}
	editor_axisType = setType;
}

// local axis vector is the axis vector of the world based on the selected objects given rotation. 
//This could maybe be a helper function, but you'd need to pass the object in
function editor_getAxisVec(axis) {
	if (!axis || !editor_axisType) {
		return [0, 0, 0];
	}
	var theta = editor_selected.theta ?? 0;
	var phi = editor_selected.phi ?? 0;
	var rot = editor_selected.rot ?? 0;
	const zeroPos = [0, 0, 0];
	
	if (editor_axisType == `grab` || editor_axisType == `scale`) {
		if (!editor_local) {
			[theta, phi, rot] = [0, 0, 0];
		}
		return transform([+(axis == `x`), +(axis == `y`), +(axis == `z`)], zeroPos, theta, phi, rot);
	}
	if (editor_axisType == `rotate`) {
		if (editor_local) {
			switch (axis) {
				case `x`:
					return transform([0, 1, 0], zeroPos, theta, 0, 0);
				case `y`:
					return transform([1, 0, 0], zeroPos, theta, phi, 0);
				case `z`:
					return transform([0, 0, 1], zeroPos, theta, phi, 0);
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