var editor_selected = undefined;
var editor_initBuffer = null;



class Sliderify {
	constructor(destination, label, min, max, step, path) {
		var self = this;
		this.min = parseFloat(min || -10000);
		this.max = parseFloat(max || 10000);
		this.step = step || 1;
		this.get = () => {return pathGet(path);};
		this.set = (v) => {return pathSet(path, v);};
		this.scrollDelta = 0;
		this.scrollThresh = 3;
		this.rValue = this.get();
		var dummy = document.createElement(`div`);
		dummy.innerHTML = `
			<div class="range-wrap">
					<label>${label}</label>
					<input class="direct-text-input" value="0" style="display: none;">
					<span class="range-value">0</span>
			</div>`;

		var wrapper = dummy.children[0];
		var text_in = wrapper.children[1];
		var span_in = wrapper.children[2];
		this.elText = text_in;
		this.elSpan = span_in;

		destination.appendChild(wrapper);
		
		this.round = this.decimalPlaces(step);
		var step = parseFloat(step);
		// How many decimal places does the step attribute have?
	
	
		// We use the 'round' variable to make sure the number 
		// displays as a float or an integer where necessary
		var round_factor = (10 ** this.round);
		
		wrapper.onwheel = (evt) => {
			evt.preventDefault();

			//capture scroll and only let it through after the buffer overflows
			self.scrollDelta += evt.deltaY / self.scrollThresh;
			var whole = self.scrollDelta | 0;
			if (whole == 0) {
				return;
			}

			self.scrollDelta -= whole;
			
			// Add the scrolled multiplied by the step
			var calc = parseFloat(self.rValue) + (whole * step);
			calc = Math.round(calc*round_factor) / round_factor;
			self.applyInput(calc);
		}

		span_in.onclick = () => {
			span_in.style.display = `none`;
			text_in.style.display = `inline-block`;
			text_in.focus();
		}

		text_in.onblur = () => {
			text_in.style.display = `none`;
			span_in.style.display = `inline-block`;
			var calc = parseFloat(text_in.value);
			self.applyInput(calc);
		}
		
		// Call the calculate function on startup
		this.applyInput(this.rValue);
	}

	// A very scrappy function to quickly work out how many 
	// decimal places the 'step' attribute of the range is using
	decimalPlaces(number) {
		var stringNumber = String(number);
		var decimals = stringNumber.split('.')[1];
		if (decimals == undefined) {
			return 0;
		}		
		return decimals.length;
	}

	// don't input a value outside the allowed range
	applyInput(calc) {
		var oldCalc = calc;
		calc = clamp(calc, this.min, this.max);
		if (this.round > 0) {
			calc = calc.toFixed(this.round);
		} else {
			calc = parseInt(calc);
		}
		if (Number.isNaN(calc) || calc == `NaN`) {
			console.log(`NaN detected in slider!!!!`);
			return;
		}
		this.rValue = calc;
		this.elText.value = calc;
		this.elSpan.innerHTML = calc;
		this.set(parseFloat(calc));
		loading_world.shouldRegen = true;
		return calc;
	}
}











//editor functions
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

function createHTMLCheckboxAt(parentName, checkboxName, label) {
	var dummy = document.createElement(`div`);
	var parent = document.getElementById(parentName);
	dummy.innerHTML = `
	<label class="checkboxGroup" id=${checkboxName}>${label}
		<input type="checkbox">
		<span class="checkmark"></span>
	</label>`;
	parent.appendChild(dummy.children[0]);
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
	const groups = [`LOOP`, `GROUP-L`];
	var isGroup = groups.includes(str.split(`~`)[0]);
	var base, material, params;
	var objs;
	
	if (isGroup) {
		str = str.replaceAll(`\t`, ``);
		const lines = str.split(`\n||`);
		objs = lines.slice(1).map(o => deserialize(o));
		[base, params] = lines[0].split(`|`);
		base = base.split(`~`);
		params = params.split(`~`);
	} else {
		//initial processing
		var spl = str.split(`|`);
		[base, material, params] = [spl[0], spl[1], spl[2]];
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
	[nature, theta, phi, rot] = [+nature, +theta, +phi, +rot];
	var posRotObj = {
		pos: Pos(...pos),
		theta: theta * degToRad,
		phi: (phi - 90) * degToRad,
		rot: rot * degToRad
	};
	
	var finalArgs = [posRotObj];
	if (material) {
		finalArgs.push(material, nature);
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
	return Pos(r(camera.pos[0] + offset[0]), r(camera.pos[1] + offset[1]), r(camera.pos[2] + offset[2]));
}


class SliderCustom {
	/**
	* @param {HTMLElement} elemGroup the div containing the label and slider
	* @param {String} label a label string to put before the numerical label
	* @param {Function} updateFunc how to reference the variable to write to. Will be `eval`ed later.
	* @param {Number[]} valuesList array of possible slider values, from least to greatest
	 */
	constructor(elemGroup, label, updateFunc, valuesList) {
		// super(elemGroup, ``, label, 0, valuesList.length - 1, 1);
		this.validVals = valuesList;
		this.updateFunc = updateFunc;
	}
	
	synchronize() {
		if (!this.validVals) {
			return;
		}
		//TODO: fix -1 propagating
		var ind;
		var res = this.updateFunc();
		for (var i=0; i<this.validVals.length; i++) {
			if (this.validVals[i] == res) {
				ind = i;
				i = this.validVals.length;
			}
			//passed it, linearly interpolate between the last two values
			else if (this.validVals[i] > res) {
				ind = getPercentage(this.validVals[i - 1], this.validVals[i], res);
				if (ind < 0 || ind > 1) {
					console.log(`oops. ${ind}`);
				}
				ind += i - 1;
				i = this.validVals.length;
			}
		}
		this.offsetLock = ind;
		this.sliderElem.value = this.offsetLock;
		this.updateDisplay();
	}
	
	updateDisplay(e) {
		if (this.validVals.indexOf(this.updateFunc()) < 0) {
			this.valueElem.innerHTML = this.label + (this.updateFunc()+``).padStart(3, "0");
		} else {
			this.valueElem.innerHTML = this.label + (this.validVals[+this.sliderElem.value]+``).padStart(3, "0");
		}
	}
	
	updateValue(e) {
		this.offsetLock = this.value();
		this.updateFunc(this.validVals[this.offsetLock]);
		this.updateDisplay();
	}
}

class Dropdown {
	constructor(dropdownElem, valueFunc, valueOptionsArr) {
		this.elem = document.getElementById(dropdownElem);
		this.valFunc = valueFunc;
		this.options = valueOptionsArr;
		this.init();
	}
	
	updateValue() {
		this.valFunc(this.elem.value);
	}
	
	synchronize() {
		var val = this.valFunc();
		this.elem.value = val;
	}
	
	setVisibility(visible) {
		this.elem.style = `display: ${visible ? "inline-block" : "none"}`;
	}
	
	init() {
		this.options.forEach(o => {
			var optElem = document.createElement(`option`);
			optElem.value = o;
			optElem.text = o;
			this.elem.appendChild(optElem);
		});
		this.elem.onchange = this.updateValue.bind(this);
	}
}

class Textbox {
	constructor(element, valueFunc) {
		this.elem = document.getElementById(element);
		this.valFunc = valueFunc;
		this.init();
	}
	
	setVisibility(visible) {
		this.elem.style = `display: ${visible ? "inline-block" : "none"}`;
	}
	
	updateValue() {
		this.valFunc(this.elem.value);
	}
	
	synchronize() {
		var val = this.valFunc();
		this.elem.value = val;
	}
	
	init() {
		this.elem.onchange = this.updateValue.bind(this);
	}
}

class Checkbox {
	constructor(destination, label, get, set) {
		this.get = get;
		this.set = set;

		var dummy = document.createElement(`div`);
		dummy.innerHTML = `
		<label class="checkboxGroup">${label}
			<input type="checkbox">
			<span class="checkmark"></span>
		</label>`;
		this.elem = dummy.children[0];
		destination.appendChild(this.elem);

		this.checkElem = this.elem.children[0];
		
		this.checkElem.checked = this.get();
		this.elem.onchange = this.updateValue.bind(this);
	}
	
	updateValue() {
		this.set(this.checkElem.checked);
	}
	
	synchronize() {
		this.checkElem.checked = this.get();
	}
}

var editor_controls = {
	set: [],
	world: [],
	obj: [],
	mat: []
};
var objectEditables = {};
var materialEditables = {};

function editor_initialize() {
	function syncC(val, id) {
		if (val != null) {
			editor_selected.c[id] = -((val * 2) - 1);
			loading_world.shouldRegen = true;
		}
		return (-editor_selected.c[id] + 1) / 2;
	}
	
	//settings

	/**
		sliders start with the name of the variable they're editing. The syntax is

		VARNAME (DISPLAY [±][###.##]) rNUM [vNUM [NUM] [NUM]] MIN—MAX uNUM 
			VARNAME is the full name of the variable. If it starts with a dot, editor_selected is automatically prepended
			± indicates to display a sign before the number readout
			# indicates number of places to 
			rNUM indicates relative range for sliders if necessary
			uNUM indicates how fine-grained the value can be
			vNUM...NUM indicate specific values the variable is allowed to take

			ex: v40 50 60—70 u2 indicates only the values [40,50,60,62,64,66,68,70]


		C [NAME] [CODE] indicates a checkbox

		|NAME| [CODE] indicates a button

		___ VARNAME indicates a text input
	 */
	
	//an assumption is made that every editable object uses the pos sliders + nature checkboxes, so they're omitted.
	var xyz = [
		`.rx (<br>rx: ####) r100 u1`,
		`.ry (ry: ####) r100 u1`,
		`.rz (rz: ####) r100 u1`,
	];
	var sl_r = `.r (<br>r:_ ####) 0—1e101 r100 u1`;
	var sl_rr = `.ringR (rr: ####) r100 u1`;
	var sl_h = `.h (h: ±##) r100 u0.1`;

	objectEditables = {
		"PLAYER":			[],
		"PLAYER-DEBUG":		[],
		"PLAYER-NOCLIP":	[],
		
		"BOX": 			[...xyz],
		"BOX-FRAME": 	[...xyz, `.e (e: ±###) r10 u0.25`],
		"BOX-MOVING":	[...xyz],
		"CAPSULE":		[sl_r, sl_h],
		"CUBE":			[sl_r],
		"CYLINDER":		[sl_r, sl_h],
		"DISH":			[...xyz, sl_r, sl_rr],
		"ELLIPSE":		[...xyz],
		"FRACTAL": [
			sl_r, 
			`.b (b: ##.##) 0—20 u0.05`, 
			`.shift.0 (sx: ±#.###) -6—6 u0.005`,
			`.shift.1 (sy: ±#.###) -6—6 u0.005`,
			`.shift.2 (sz: ±#.###) -6—6 u0.005`
		],
		"GYROID": [
			...xyz, 
			`.a (a: #.##) 0.01—2 u0.01`, 
			`.b (b: ##.##) 0—20 u0.05`, 
			sl_h
		],
		"LINE":				[sl_r],
		"LOOP":				[...xyz, `.d (d:_ ####) r100 u1`],
		"OCTAHEDRON":		[...xyz],
		"POINT":			[],
		"PRISM-RHOMBUS":	[...xyz, `.skew (skew: ±##) r50 -500—500 u1`],
		"PRISM-OCTAGON":	[...xyz],
		"PRISM-HEXAGON":	[...xyz],
		"RING":				[sl_r, sl_rr],
		"SPHERE":			[sl_r],
		"SINGULARITY":		[sl_r, `.mass (m: ±##.##) -10—10 u0.01`],
		"SHELL":			[sl_r, sl_h],
		"TERRAIN": [
			...xyz, 
			`.n (n: #) 1—7 u1`, 
			`.ampl (ampl: ###.##) 0.01—40 u0.01`, 
			`.a (a: #.##) 0.01—2 u0.01`, 
			`.freq (freq: #.##) 0.01—40 u0.01`, 
			`.b (b: ##.##) 0—20 u0.05`,
		],
		"TRI": [sl_r],
		"VOXEL": [
			sl_r, 
			`C`, (val) => {return syncC(val, 0);}, 
			`C`, (val) => {return syncC(val, 1);}, 
			`C`, (val) => {return syncC(val, 2);}, 
			`C`, (val) => {return syncC(val, 3);}, 
			`C`, (val) => {return syncC(val, 4);}, 
			`C`, (val) => {return syncC(val, 5);}, 
			`C`, (val) => {return syncC(val, 6);}, 
			`C`, (val) => {return syncC(val, 7);}
		],
		
		"GROUP-L": [],
		"DOTDOTDOT": [],
		"SKYBUNNY": [],
		"LAMPPOST": [],
	};
	
	var rgb = [
		`.material.color.0 (r: ###) 0—255 u1`,
		`.material.color.1 (g: ###) 0—255 u1`,
		`.material.color.2 (b: ###) 0—255 u1`
	];
	var rgba = [...rgb, `.material.color.3 (a: ###) 0—255 u1`];
	materialEditables = {
		"color":	[...rgb],
		"concrete": [],
		"ghost":	[...rgba],
		"glass":	[...rgba, `.material.density (d: #.##) 0.05—10 u0.05`],
		"light":	[...rgb, `.material.lumi (l: ###) 0—255 u1`],
		"mirror":	[...rgba],
		"normal":	[],
		"portal": [
			`___ .material.str`, 
			`.material.offset.0 (offX: ±###) r100 u1`,
			`.material.offset.1 (offY: ±###) r100 u1`,
			`.material.offset.2 (offZ: ±###) r100 u1`
		],
		"gravity":	[],
		"rubber":	[],
		"texture":	[
			`.material.mat (<br>t: ##) 0—20 u1`,
			`.material.scale (s: #.##) 0.05—10 u0.05`,
			`.material.blend (b: #.##) 0.25—9.5 u0.25`,
			`C relative`, (val) => {
				if (val != null) {
					editor_selected.material.rel = val;
					loading_world.shouldRegen = true;
				}
				return editor_selected.material.rel;
			},
		],
	}

	editor_controls.set = ec_compile([
		`camera_FOV (fov: ###) v20 40 60 80—120 u2`,
		`render_goalN (px:_ ##) 40—1440 v40 60 80 100 120 150 180 240 300 360 512 720 1080 1440`
	], group_settings);

	editor_controls.world = ec_compile([
		`loading_world.svSet.0 (sθ: #.###) -9999—9999 u0.01745`,
		`loading_world.svSet.1 (sφ: #.###) -9999—9999 u0.01745`,
		`loading_world.ambientLight (amb: #.##) 0—1 u0.01`,
	
		`loading_world.postEffects.0.1.0 (<br>r: ###) 0—255 u1`,
		`loading_world.postEffects.0.1.1 (g: ###) 0—255 u1`,
		`loading_world.postEffects.0.1.2 (b: ###) 0—255 u1`
	], group_world);

	editor_select(player);
}

function editor_preAdd() {
	overlay.style.display = `flex`;
	overlay.onclick = () => {
		overlay.style.display = `none`;
	};
	//set up object addition grid

	const pullFrom = Object.keys(map_strObj);
	const rows = Math.sqrt(pullFrom.length) | 0;

	grid.innerHTML = ``;
	grid.style[`grid-template-columns`] = `repeat(${rows}, 160px)`;

	for (var i=0; i<pullFrom.length; i++) {
		const val = pullFrom[i];
		if (!map_strObj[val].canCreate) {
			continue;
		}
		const btn = document.createElement(`button`);
		btn.className = `grid-button-${+map_strObj[val].canCreate}`;
		btn.innerHTML = val;
		btn.onclick = () => {
			editor_addObj(map_strObj[val].type);
			overlay.style.display = `none`;
		};
		grid.appendChild(btn);
	}
}

function editor_preMat() {
	overlay.style.display = `flex`;
	overlay.onclick = () => {
		overlay.style.display = `none`;
	};
	//set up object addition grid

	const pullFrom = Object.keys(map_strMat);
	const rows = Math.sqrt(pullFrom.length) | 0;

	grid.innerHTML = ``;
	grid.style[`grid-template-columns`] = `repeat(${rows}, 160px)`;

	for (var i=0; i<pullFrom.length; i++) {
		const val = pullFrom[i];
		const btn = document.createElement(`button`);
		btn.className = `grid-button`;
		btn.innerHTML = val;
		btn.onclick = () => {
			editor_addObj(map_strObj[val].type);
			overlay.style.display = `none`;
		};
		grid.appendChild(btn);
	}
}

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

function editor_applyDrag(dragOffset) {
	const [max, round] = [Math.max, Math.round];
	const es = editor_selected;

	// Apply accumulated drag offset to actual position
	var axisVec = editor_getAxisVec(editor_axis);
	var xDelta = axisVec[0] * dragOffset;
	var yDelta = axisVec[1] * dragOffset;
	var zDelta = axisVec[2] * dragOffset;

	switch (editor_axisType) {
		case `scale`:
			console.log(xDelta, yDelta, zDelta);
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
				break;
			}
			if (es.rr != undefined) {
				es.r = max(es.r + xDelta, 1);
				es.rr = max(es.rr + zDelta, 1);
				break;
			}
			if (es.h != undefined) {
				es.r = max(es.r + xDelta, 1);
				es.h = max(es.h + zDelta, 1);
				break;
			}
			break;
		case `grab`:
			es.pos[0] += xDelta;
			es.pos[1] += yDelta;
			es.pos[2] += zDelta;
			break;
		case `rotate`:
			dragOffset *= 0.01;
			
			if (editor_local) {
				es.theta += dragOffset * (editor_axis == `x`);
				es.phi += dragOffset * (editor_axis == `y`);
				es.rot += dragOffset * (editor_axis == `z`);
			} else {
				var res = transformTransform([0, 0, 0], es.theta, es.phi, es.rot, [0, 0, 0], 
							dragOffset * (editor_axis == `y`), dragOffset * (editor_axis == `x`), dragOffset * (editor_axis == `z`));
				[es.theta, es.phi, es.rot] = [res.theta, res.phi, res.rot];
			}
			es.theta = modulate(es.theta, Math.PI * 2);
			es.phi = clamp(es.phi, -Math.PI / 2, Math.PI / 2);
			es.rot = modulate(es.rot, Math.PI * 2);
			break;
	}
}

/**
* removes an object from the loading world. Returns said object
 */
function editor_removeObj(e, object) {
	object = object ?? editor_selected;
	if (object == player) {
		return null;
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
	if (object == player) {
		return null;
	}
	if (object.constructor.type == TYPE_CLASS_LOOP) {
		//unloop instead
		return editor_unloopify(e, object);
	}

	editor_removeObj(null, object);

	var b = object.bounds();
	var targetSize = Math.max(b[1][0] - b[0][0], b[1][1] - b[0][1], b[1][2] - b[0][2]);
	var loopObj = new Scene3dLoop({
		pos: Pos(object.pos[0], object.pos[1], object.pos[2]),
		theta: 0, phi: 0, rot: 0
	}, 1, 1, 1, targetSize, [object]);

	object.pos = Pos(0, 0, 0);
	
	loading_world.objects.push(loopObj);
	loading_world.shouldRegen = true;
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

function editor_updatePanelsFor(obj) {
	const cons = obj.constructor;
	const consName = cons.name;
	var matName;
	if (obj.material) {
		matName = obj.material.constructor.name;
	}

	label_world.innerHTML = loading_world.name ?? `[!]`;
	label_obj.innerHTML = map_objStr[editor_selected.constructor.name] ?? `[!]`;
	
	//show the appropriate editor panel and appropriate material panel
	
	//default sliders everything should see

	
	var shouldSee = [
		`.pos.0 (x: ±####) r100 u1`,
		`.pos.1 (y: ±####) r100 u1`,
		`.pos.2 (z: ±####) r100 u1`,
	];
	
	var thetaless = [Sphere, Shell, Point];
	var philess = [Sphere, Shell, Point];
	var rotless = [Sphere, Shell, Capsule, Cylinder, Ring, Fractal, 
		Player, Player_Debug, Player_Noclip, Point,
		Lamppost
	];
	
	if (!thetaless.includes(cons)) {
		shouldSee.push(`.theta (<br>θ: #.###) 0—6.283 u0.01745`);
	}
	if (!philess.includes(cons)) {
		shouldSee.push(`.phi (φ: ±#.###) -1.571—1.571 u0.01745`);
	}
	if (!rotless.includes(cons)) {
		shouldSee.push(`.rot (ρ: #.###) 0—6.283 u0.01745`);
	}

	function syncNature(val, nat) {
		if (val != null) {
			if (val) {
				editor_selected.nature = editor_selected.nature | nat;
			} else {
				editor_selected.nature = editor_selected.nature & ~nat;
			}
			loading_world.shouldRegen = true;
		}
		return editor_selected.nature & nat;
	}
	
	if (obj != player && obj.type != TYPE_CLASS_LGROUP) {
		shouldSee = shouldSee.concat(
			`C Gloop`,		(val) => {return syncNature(val, N_GLOOP);},
			`C Anti`,		(val) => {return syncNature(val, N_ANTI);},
			`C Fog`,		(val) => {return syncNature(val, N_FOG);},
			`C Gravity`,	(val) => {return syncNature(val, N_GRAVITY);},
			`C Field`,		(val) => {return syncNature(val, N_FIELD);},
		);
	}
	
	shouldSee = shouldSee.concat(objectEditables[map_objStr[consName]]);
	editor_controls.obj = ec_compile(shouldSee, group_nature);

	shouldSee = [];
	label_material.innerHTML = `[!]`;
	if (matName) {
		label_material.innerHTML = matName;
	
		shouldSee.push(`|Change Material| editor_preMat()`);
		shouldSee = shouldSee.concat(materialEditables[map_matStr[matName]]);
	}

	editor_controls.mat = ec_compile(shouldSee, group_matSpecial);
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

/**
 * compiles an array of custom elements into real interactable HTML/JS elements that edit properties.
 * makes the HTML elements children of the destination node, and returns an array of all the JS objects.
 * @param {String[]} arr the array of elements. For syntax, see my brain.
 * @param {HTMLElement} destination the place to put completed objects
 */
function ec_compile(arr, destination) {
	var elements = [];
	destination.innerHTML = ``;
	for (var e=0; e<arr.length; e++) {
		//figure out what type it is
		if (arr[e] == undefined || arr[e].constructor.name != `String`) {
			//console.log(arr, e);
			//throw new Error(`should not be able to parse a function on its own!`);
			continue;
		}

		var tok = arr[e].split(` `);

		var label = (tok[1] ?? `(`).replaceAll(`_`, `&nbsp;`);
		/* 
			examples
			.phi (θ: ±#.###) -1.571—1.571 u0.01745
			.rx (rx: ####) r100 u1
			`C Gloop`,		(val) => {return syncNature(val, N_GLOOP);},
			`|Object.keys(map_strObj)|`, (val) => {...
			___ .material.str
		 */

		//text boxes
		if (tok[0] == `___`) {

			continue;
		}

		//checkboxes
		if (tok[0] == `C`) {
			elements.push(new Checkbox(destination, label, arr[e+1], arr[e+1]));
			e += 1;
			continue;
		}

		//dropdowns
		if (tok[0][0] == `|`) {
			get = arr[e+1];
			set = arr[e+1];
			e += 1;
			continue;
		}

		//sliders:
		if (tok[0][0] == `.`) {
			tok[0] = `editor_selected` + tok[0];
		}
		
		var sigfigs = [1, 1, false];
		var min = -1e101;
		var max = 1e101;
		var unit = 1;
		var path = `` + tok[0];
		label = label.slice(1);

		//token 2 is sigfigs
		//TODO: this

		//tokens 3 and onwards are more freeform
		var quanta = [];
		for (var a=3; a<tok.length; a++) {
			//don't care + didn't ask
			if (tok[a][0] == `r`) {
				continue;
			}

			if (tok[a][0] == `v`) {
				//specific values: consume as long as we have pure numbers
				quanta.push(+(tok[a].slice(1)));
				while (!Number.isNaN(+tok[a+1])) {
					tok.splice(a, 1);
					quanta.push(+(tok[a].slice(1)));
				}
			}

			if (tok[a][0] == `u`) {
				unit = tok[a].slice(1);

				//if there are previous quanta, this indicates a portion of said quanta
				if (quanta.length > 0) {
					unit = parseFloat(unit);
					for (var k=min; k<=max; k+=unit) {
						quanta.push(k);
					}
				}
				continue;
			}
			
			//it's a range, set min + max
			if (tok[a].includes(`—`)) {
				[min, max] = tok[a].split(`—`);
				max = +max;
			}
		}

		elements.push(new Sliderify(destination, label, min, max, unit, path));
	}

	return elements;
}

function ec_compileSlider() {

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

function editor_toggleAxis(axisID) {
	if (editor_axis == axisID) {
		editor_axis = null;
		return;
	}
	editor_axis = axisID;
}

function editor_toggleAxisSet(setType) {
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
		return null;
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
		} else {
			switch (axis) {
				case `x`:
					return [1, 0, 0];
				case `y`:
					return [0, 1, 0];
				case `z`:
					return [0, 0, 1];
			}
		}
	}
}
