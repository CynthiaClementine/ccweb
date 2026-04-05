var editor_selected = undefined;

//editor functions
/**
* creates a default object given a constructor type. For the list of types, see all TYPE_ declarations in config.js
* @param {Integer} objType an integer representing the type of object to create.
 */
function createDefaultObject(objType) {
	var type = map_typeObj[objType];
	return new type({pos: Pos(0, 0, 0), theta: 0, phi: 0, rot: 0}, new M_Color(255, 0, 255), 0, 10, 10, 10, 1, 12, 6, 10, 10, 10, 10, 10);
}

/**
* creates a default material given a constructor string.
* @param {String} conStr the string representation of the type.
 */
function createDefaultMaterial(conStr) {
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

function createHTMLSliderAt(parentName, sliderName) {
	var dummy = document.createElement(`div`);
	var parent = document.getElementById(parentName);
	dummy.innerHTML = `
	<div class="sliderGroup" id="${sliderName}">
		<span class="value">[!]</span>
		<input class="slider" type="range"/>
	</div><br id="${sliderName}_br">`;
	parent.appendChild(dummy.children[0]);
	parent.appendChild(dummy.children[0]);
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
	
	var materialCopy = deserializeMat(oldObj.material.serialize());
	newObj.material = materialCopy;
	
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
	str = str.split(`||`);
	
	if (str.length > 1) {
		//it's a scene3dLoop
		var containedObj = deserialize(str[1]);
		var base = str[0].split(`~`);
		return new Scene3dLoop(+base[1], +base[2], +base[3], +base[4], containedObj);
	}
	
	//initial processing
	var [base, material, params] = str[0].split(`|`);
	base = base.split(`~`);
	material = deserializeMat(material);
	params = params.split(`~`);
	
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
	
	return new type(posRotObj, material, nature, ...params.map(a => +a));
}

function deserializeMat(str) {
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
			obj = new M_Portal(params[0], Pos(...JSON.parse(params[1])));
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
	var offset = polToCart(camera.theta, camera.phi, 100);
	var r = Math.round;
	return Pos(r(camera.pos[0] + offset[0]), r(camera.pos[1] + offset[1]), r(camera.pos[2] + offset[2]));
}


//classes
class Slider {
	/**
	* @param {String} elemGroup string in the form `parentName.sliderName`
	* @param {String} variable how to reference the variable to write to. Will be `eval`ed later.
	* @param {String} label a string label to put before the numerical label
	* @param {Number} min minimum slider value
	* @param {Number} max maximum slider value
	* @param {Number} stepSize step size between acceptable values
	* @param {Number} numMin maximum variable value. If none is given, assumes the variable is an absolute variable.
	* @param {Number} numMax maximum variable value
	 */
	constructor(elemGroup, variable, label, min, max, stepSize, numMin, numMax) {
		var spl = elemGroup.split(`.`);
		createHTMLSliderAt(spl[0], spl[1]);
		this.label = label;
		this.rel = !(Number.isNaN(+numMin));
		
		this.groupElem = document.getElementById(spl[1]);
		this.valueElem = this.groupElem.children[0];
		this.sliderElem = this.groupElem.children[1];
		
		this.numRange = [min ?? -100, max ?? 100];
		this.varRange = this.rel ? [numMin, numMax] : [min, max];
		this.step = stepSize;
		this.sigFigs = Math.max(this.varRange[0].toString().length, this.varRange[1].toString().length);
		this.var = variable;
		
		this.locked = false;
		this.offsetLock = 0;
		this.init();
	}
	
	setVisibility(visible) {
		this.groupElem.style = `display: ${visible ? "inline-block" : "none"}`;
		var breakID = this.groupElem.id;
		var breakElem = document.getElementById(`${breakID}_br`);
		breakElem.style = `display: ${visible ? "inline-block" : "none"}`;
	}
	
	value() {
		return clamp(+this.sliderElem.value + (this.rel ? this.offsetLock : 0), ...this.varRange);
	}

	init() {
		this.sliderElem.oninput = (() => {
			this.updateValue();
			this.updateDisplay();
		}).bind(this);
		this.sliderElem.onmousedown = this.mouseDown.bind(this);
		this.sliderElem.onmouseup = this.mouseUp.bind(this);
		this.sliderElem.setAttribute(`min`, this.numRange[0]);
		this.sliderElem.setAttribute(`max`, this.numRange[1]);
		this.sliderElem.setAttribute(`step`, this.step);
		this.sliderElem.value = 0;
		this.synchronize();
	}
	
	mouseDown() {
		this.locked = true;
	}
	
	mouseUp() {
		this.locked = false;
		this.offsetLock = this.value();
		if (this.rel) {
			this.sliderElem.value = 0;
		}
	}
	
	synchronize() {
		if (this.locked) {
			return;
		}
		
		try {
			var setVal = Math.round(eval(this.var) / this.step) * this.step;
			this.offsetLock = clamp(+(setVal.toFixed(this.sigFigs)), ...this.varRange);
			if (!this.rel) {
				this.sliderElem.value = this.offsetLock;
			}
		} catch (e) {
			// console.error(e);
		}
		this.updateDisplay();
	}

	updateDisplay(e) {
		var val = this.value();
		var neg = false;
		if (val < 0) {
			neg = true;
			val = -val;
		}
		val = val.toString().slice(0, this.sigFigs - neg).padStart(this.sigFigs - neg, `0`);
		this.valueElem.innerHTML = this.label + (neg ? `-` : ``) + val;
	}
	
	updateValue() {
		var val = this.value();
		try {
			// console.log(`setting ${this.var} = ${clamp(val, this.varRange[0], this.varRange[1])};`);
			eval(`${this.var} = ${clamp(val, ...this.varRange)};`);
			if (this.var.includes(`editor_selected`) && editor_selected != player) {
				loading_world.shouldRegen = true;
			}
		} catch (e) {
			console.error(`cannot send ${val} --> [${this.varRange}] --> ${this.var}`, e);
		}
	}
}

class SliderCustom extends Slider {
	/**
	* @param {HTMLElement} elemGroup the div containing the label and slider
	* @param {String} label a label string to put before the numerical label
	* @param {Function} updateFunc how to reference the variable to write to. Will be `eval`ed later.
	* @param {Number[]} valuesList array of possible slider values, from least to greatest
	 */
	constructor(elemGroup, label, updateFunc, valuesList) {
		super(elemGroup, ``, label, 0, valuesList.length - 1, 1);
		this.validVals = valuesList;
		this.updateFunc = updateFunc;
	}
	
	synchronize() {
		if (!this.validVals) {
			return;
		}
		this.offsetLock = this.validVals.indexOf(this.updateFunc());
		this.sliderElem.value = this.offsetLock;
		this.updateDisplay();
	}
	
	updateDisplay(e) {
		this.valueElem.innerHTML = this.label + (this.validVals[+this.sliderElem.value]+``).padStart(3, "0");
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
	constructor(element, label, valueFunc) {
		var spl = element.split(`.`);
		createHTMLCheckboxAt(spl[0], spl[1], label);
		this.elem = document.getElementById(spl[1]);
		this.checkElem = this.elem.children[0];
		this.valFunc = valueFunc;
		
		this.init();
	}
	
	setVisibility(visible) {
		this.elem.style = `display: ${visible ? "inline-block" : "none"}`;
	}
	
	updateValue() {
		this.valFunc(this.checkElem.checked);
	}
	
	synchronize() {
		var val = this.valFunc();
		this.checkElem.checked = val;
	}
	
	init() {
		this.elem.onchange = this.updateValue.bind(this);
	}
}

var slider_fov, slider_res;

var slider_x, slider_y, slider_z;
var slider_tht, slider_phi, slider_rot;

var slider_rr, slider_rx, slider_ry, slider_rz, slider_ringR;
var slider_gyrA, slider_gyrB, slider_h, slider_e;
var slider_skew;
var slider_shiftX, slider_shiftY, slider_shiftZ;

var slider_r, slider_g, slider_b, slider_a;
var slider_px, slider_py, slider_pz;

var textbox_world;

var dropdown_obj, dropdown_mat;

var checkbox_gloop, checkbox_anti, checkbox_fog;

var editor_controls = [];

var objectEditables = {};
var materialEditables = {};

function editor_initialize() {
	editor_selected = player;
	var s = `&nbsp;`;
	
	//settings
	slider_fov = new SliderCustom(`group_settings.fovSlider`, `fov: `, (val) => {
		if (val) {
			updateFOV(val);
		}
		return camera_FOV;
	}, [
		20, 40, 40, 40, 60, 60, 60, 80, 80,
		80,82,84,86,88,90,92,94,96,98,100,102,104,106,108,110,112,114,116,118,120,
		120,125,125,130,130,135,135,140,140,145,145,150,150,155,155,160,160,175,175,
		180,180,180,360
	]);
	slider_res = new SliderCustom(`group_settings.resSlider`, `px: ${s}`, (val) => {
		if (val) {
			render_goalN = val;
		}
		return render_goalN;
	}, [40, 60, 80, 100, 120, 150, 180, 240, 300, 360, 512, 720, 1080, 1440]);
	
	//object sliders
	var posLim = 99999;
	
	slider_x = new Slider(`group_pos.xSlider`, `editor_selected.pos[0]`, ``, -100,100, 1, -posLim,posLim);
	slider_y = new Slider(`group_pos.ySlider`, `editor_selected.pos[1]`, ``, -100,100, 1, -posLim,posLim);
	slider_z = new Slider(`group_pos.zSlider`, `editor_selected.pos[2]`, ``, -100,100, 1, -posLim,posLim);
	
	slider_tht = new Slider(`group_pos.thtSlider`, `editor_selected.theta`, ``, 0, 6.283, 0.01745);
	slider_phi = new Slider(`group_pos.phiSlider`, `editor_selected.phi`, ``, -1.57, 1.571, 0.01745);
	slider_rot = new Slider(`group_pos.rotSlider`, `editor_selected.rot`, ``, 0, 6.283, 0.01745);
	
	slider_rr = new Slider(`group_radius.rrSlider`, `editor_selected.r`, `r: ${s}`, -100,100, 1, 0,1E4);
	slider_rx = new Slider(`group_radius.rxSlider`, `editor_selected.rx`, `rx: `, -100,100, 1, -1E3,1E4);
	slider_ry = new Slider(`group_radius.rySlider`, `editor_selected.ry`, `ry: `, -100,100, 1, -1E3,1E4);
	slider_rz = new Slider(`group_radius.rzSlider`, `editor_selected.rz`, `rz: `, -100,100, 1, -1E3,1E4);
	slider_ringR = new Slider(`group_radius.ringrSlider`, `editor_selected.ringR`, `rr: `, 0,20, 1, 0,1E4);
	
	slider_gyrA = new Slider(`group_special.gaSlider`, `editor_selected.a`, `a: `, 0,1, 0.01);
	slider_gyrB = new Slider(`group_special.gbSlider`, `editor_selected.b`, `b: `, 0,19.95, 0.05);
	slider_h = new Slider(`group_special.hSlider`, `editor_selected.h`, `h: `, -99,99, 0.1, -posLim,posLim);
	slider_e = new Slider(`group_special.eSlider`, `editor_selected.e`, `e: `, -10,10, 1, -999,999);
	slider_skew = new Slider(`group_special.skewSlider`, `editor_selected.skew`, `skew: `, -50, 50, 1, -500, 500);
	
	slider_shiftX = new Slider(`group_special.sxSlider`, `editor_selected.shift[0]`, `sx: `, -5.999, 5.999, 0.005);
	slider_shiftY = new Slider(`group_special.sySlider`, `editor_selected.shift[1]`, `sy: `, -5.999, 5.999, 0.005);
	slider_shiftZ = new Slider(`group_special.szSlider`, `editor_selected.shift[2]`, `sz: `, -5.999, 5.999, 0.005);
	
	//material sliders
	slider_r = new Slider(`group_color.rSlider`, `editor_selected.material.color[0]`, `r: `, 0,255, 1);
	slider_g = new Slider(`group_color.gSlider`, `editor_selected.material.color[1]`, `g: `, 0,255, 1);
	slider_b = new Slider(`group_color.bSlider`, `editor_selected.material.color[2]`, `b: `, 0,255, 1);
	slider_a = new Slider(`group_color.aSlider`, `editor_selected.material.color[3]`, `a: `, 0,255, 1);
	
	slider_px = new Slider(`group_matSpecial.pxSlider`, `editor_selected.material.offset[0]`, `offX: `, -100,100, 1, -posLim,posLim);
	slider_py = new Slider(`group_matSpecial.pySlider`, `editor_selected.material.offset[1]`, `offY: `, -100,100, 1, -posLim,posLim);
	slider_pz = new Slider(`group_matSpecial.pzSlider`, `editor_selected.material.offset[2]`, `offZ: `, -100,100, 1, -posLim,posLim);
	
	var playerConstructors = [Player, Player_Debug, Player_Noclip];
	dropdown_obj = new Dropdown(`objectDropdown`, (val) => {
		if (val) {
			if (playerConstructors.includes(map_strObj[val])) {
				//if it's a type of player, convert the player to that type
				const oldPlayer = player;
				player = new map_strObj[val](player.world, player.pos);
				player.dPos = oldPlayer.dPos;
				player.theta = oldPlayer.theta;
				player.phi = oldPlayer.phi;
				editor_select(player);
			} else {
				//change the constructor. If nothing's selected, act as a plus button
				var ind = loading_world.objects.indexOf(editor_selected);
				if (ind < 0) {
					ind = loading_world.objects.length;
					editor_addObj(e, TYPE_SPHERE);
				}
				
				const oldObj = loading_world.objects[ind];
				const newType = map_strObj[val].type;
				const newObj = createDefaultObject(newType);
				loading_world.objects[ind] = newObj;
				transferProperties(oldObj, newObj);
				loading_world.shouldRegen = true;
				editor_select(newObj);
			}
		}
		
		//idk whatever
		var type = editor_selected.constructor.name;
		return map_objStr[type];
	}, Object.keys(map_strObj));
	
	dropdown_mat = new Dropdown(`materialDropdown`, (val) => {
		if (val) {
			var mat = createDefaultMaterial(val, editor_selected.material.color);
			editor_selected.material = mat;
			loading_world.shouldRegen = true;
			editor_select(editor_selected);
		}
	
		var type = editor_selected.material.constructor.name;
		return map_matStr[type];
	}, Object.keys(map_strMat));
	
	textbox_world = new Textbox(`worldSelector`, (val) => {
		if (val) {
			editor_selected.material.str = val;
			editor_selected.material.sync();
		}
		return editor_selected.material.str;
	});
	
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
	
	checkbox_gloop = new Checkbox(`group_nature.gloopCheckbox`, `Gloop`, (val) => {return syncNature(val, N_GLOOP);});
	checkbox_anti = new Checkbox(`group_nature.antiCheckbox`, `Anti`, (val) => {return syncNature(val, N_ANTI);});
	checkbox_fog = new Checkbox(`group_nature.fogCheckbox`, `Fog`, (val) => {return syncNature(val, N_FOG);});
	
	editor_controls = [
		slider_fov, slider_res,
		slider_x, slider_y, slider_z,
		slider_shiftX, slider_shiftY, slider_shiftZ,
		slider_tht, slider_phi, slider_rot,
		slider_rr, slider_rx, slider_ry, slider_rz, slider_ringR,
		slider_gyrA, slider_gyrB, slider_h, slider_skew,
		slider_r, slider_g, slider_b, slider_a, slider_e,
		slider_px, slider_py, slider_pz,

		dropdown_obj, dropdown_mat,
		textbox_world,
		checkbox_gloop, checkbox_anti, checkbox_fog,
	];
	
	slider_fov.synchronize();
	slider_res.synchronize();
	
	//an assumption is made that every editable object uses the pos sliders + nature checkboxes, so they're omitted.
	var rxyz = [slider_rx, slider_ry, slider_rz];
	objectEditables = {
		"PLAYER": [],
		"PLAYER-DEBUG": [],
		"PLAYER-NOCLIP": [],
		"BOX": [...rxyz],
		"BOX-FRAME": [...rxyz, slider_e],
		"BOX-MOVING": [...rxyz],
		"CAPSULE": [slider_rr, slider_h],
		"CUBE": [slider_rr],
		"CYLINDER": [slider_rr, slider_h],
		"ELLIPSE": [...rxyz],
		"FRACTAL": [slider_rr, slider_gyrB, slider_shiftX, slider_shiftY, slider_shiftZ],
		"GYROID": [...rxyz, slider_gyrA, slider_gyrB, slider_h],
		"LINE": [...rxyz, slider_rr],
		"OCTAHEDRON": [...rxyz],
		"PRISM-RHOMBUS": [...rxyz, slider_skew],
		"PRISM-OCTAGON": [...rxyz],
		"PRISM-HEXAGON": [...rxyz],
		"RING": [slider_rr, slider_ringR],
		"SPHERE": [slider_rr],
		"SHELL": [slider_rr, slider_h],
		"VOXEL": [],
	};
	
	var rgb = [slider_r, slider_g, slider_b];
	var rgba = [slider_r, slider_g, slider_b, slider_a];
	materialEditables = {
		"color": [...rgb],
		"concrete": [],
		"ghost": [...rgba],
		"glass": [...rgba],
		"mirror": [...rgba],
		"normal": [],
		"portal": [textbox_world, slider_px, slider_py, slider_pz],
		"rubber": [],
	}
}

/**
* creates an object and adds it to the loading world. Returns said object.
* @param e an event handle. Nothing is done with this, leave as null.
* @param {Integer} objType the type of the object
 */
function editor_addObj(e, objType) {
	var obj = createDefaultObject(objType ?? TYPE_SPHERE);
	obj.pos = calcPlacePos();
	loading_world.objects.push(obj);
	loading_world.shouldRegen = true;
	return obj;
}

/**
* removes an object from the loading world. Returns said object
 */
function editor_removeObj(e, object) {
	if (object == player) {
		return null;
	}
	
	var index = loading_world.objects.indexOf(editor_selected);
	if (index < 0) {
		console.error(`cannot remove object ${object.serialize()} from loading world!`);
		return;
	}
	loading_world.shouldRegen = true;
	return loading_world.objects.splice(index, 1)[0];
}

function editor_select(object) {
	editor_selected = object ?? player;
	var consName = editor_selected.constructor.name;
	var matName;
	if (editor_selected.material) {
		matName = editor_selected.material.constructor.name;
	}
	
	//hide all panels
	editor_controls.forEach(c => {
		c.setVisibility(false);
	});
	
	//show the appropriate editor panel and appropriate material panel
	
	//default sliders everything should see
	var shouldSee = [
		slider_fov, slider_res, 
		dropdown_obj,
		slider_x, slider_y, slider_z,
	];
	
	var thetaless = [Sphere, Shell];
	var philess = [Sphere, Shell];
	var rotless = [Sphere, Shell, Capsule, Cylinder, Ring, Fractal];
	
	if (!thetaless.includes(editor_selected.constructor)) {
		shouldSee.push(slider_tht);
	}
	if (!philess.includes(editor_selected.constructor)) {
		shouldSee.push(slider_phi);
	}
	if (!rotless.includes(editor_selected.constructor)) {
		shouldSee.push(slider_rot);
	}
	
	if (editor_selected != player) {
		shouldSee = shouldSee.concat(checkbox_gloop, checkbox_anti, checkbox_fog);
	}
	
	shouldSee = shouldSee.concat(objectEditables[map_objStr[consName]]);
	if (matName) {
		shouldSee.push(dropdown_mat);
		shouldSee = shouldSee.concat(materialEditables[map_matStr[matName]]);
	}
	
	shouldSee.forEach(c => {
		c.setVisibility(true);
		c.synchronize();
	});
}