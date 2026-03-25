var editor_selected = undefined;

function createHTMLSliderAt(parentName, sliderName) {
	var dummy = document.createElement(`div`);
	var parent = document.getElementById(parentName);
	dummy.innerHTML = `
	<div class="sliderGroup" id="${sliderName}">
		<span class="value">[!]</span>
		<input class="slider" type="range"/>
	</div><br id="${sliderName}_br">`;
	// console.log(dummy, dummy.children);
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
		
		var sigFigs = Math.min(-Math.log10(this.step), 0);
		try {
			var setVal = Math.round(eval(this.var) / this.step) * this.step;
			this.offsetLock = clamp(+(setVal.toFixed(sigFigs)), ...this.varRange);
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
		//tiny values take up more space too. So they're factored in
		var digitsNeeded = Math.max(Math.abs(this.varRange[0]), Math.abs(this.varRange[1]), 100 / Math.abs(this.step));
		//log offset says number of digits - 1. Negative sign gives an extra positive digit (-99 vs 999)
		digitsNeeded = 1 + (Math.log10(digitsNeeded) | 0) + (this.varRange[0] < 0);
		this.valueElem.innerHTML = this.label + (neg ? `-` : ``) + val.toString().padStart(digitsNeeded - neg, "0");
	}
	
	updateValue() {
		var val = this.value();
		try {
			// console.log(`setting ${this.var} = ${clamp(val, this.varRange[0], this.varRange[1])};`);
			eval(`${this.var} = ${clamp(val, ...this.varRange)};`);
			if (this.var.includes(`editor_selected`) && editor_selected != player) {
				syncObject_send(loading_world, editor_selected);
			}
		} catch (e) {
			console.error(`cannot send ${val} -- >${this.varRange}< -- ${this.var}`, e);
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

var slider_r, slider_g, slider_b, slider_a;
var slider_px, slider_py, slider_pz;

var textbox_world;

var dropdown_obj, dropdown_mat, dropdown_axes;

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
	
	slider_x = new Slider(`group_pos.xSlider`, `editor_selected.pos[0]`, ``, -100,100, 1, -9999,9999);
	slider_y = new Slider(`group_pos.ySlider`, `editor_selected.pos[1]`, ``, -100,100, 1, -9999,9999);
	slider_z = new Slider(`group_pos.zSlider`, `editor_selected.pos[2]`, ``, -100,100, 1, -9999,9999);
	
	slider_tht = new Slider(`group_pos.thtSlider`, `editor_selected.theta`, ``, 0, 6.283, 0.01745);
	slider_phi = new Slider(`group_pos.phiSlider`, `editor_selected.phi`, ``, -1.571, 1.571, 0.01745);
	slider_rot = new Slider(`group_pos.rotSlider`, `editor_selected.rot`, ``, 0, 6.283, 0.01745);
	
	slider_rr = new Slider(`group_radius.rrSlider`, `editor_selected.r`, `r: ${s}`, -100,100, 1, 0,1E4);
	slider_rx = new Slider(`group_radius.rxSlider`, `editor_selected.rx`, `rx: `, -100,100, 1, 0,1E4);
	slider_ry = new Slider(`group_radius.rySlider`, `editor_selected.ry`, `ry: `, -100,100, 1, 0,1E4);
	slider_rz = new Slider(`group_radius.rzSlider`, `editor_selected.rz`, `rz: `, -100,100, 1, 0,1E4);
	slider_ringR = new Slider(`group_radius.ringrSlider`, `editor_selected.ringR`, `rr: `, 0,20, 1, 0,1E4);
	
	slider_gyrA = new Slider(`group_special.gaSlider`, `editor_selected.a`, `a: `, 0,1, 0.01);
	slider_gyrB = new Slider(`group_special.gbSlider`, `editor_selected.b`, `b: `, 0,20, 0.1);
	slider_h = new Slider(`group_special.hSlider`, `editor_selected.h`, `h: `, -5,5, 0.1, -9999,9999);
	slider_e = new Slider(`group_special.eSlider`, `editor_selected.e`, `e: `, -10,10, 1, -999,999);
	slider_skew = new Slider(`group_special.skewSlider`, `editor_selected.skew`, `skew: `, -50, 50, 1, );
	
	//material sliders
	slider_r = new Slider(`group_color.rSlider`, `editor_selected.material.color[0]`, `r: `, 0,255, 1);
	slider_g = new Slider(`group_color.gSlider`, `editor_selected.material.color[1]`, `g: `, 0,255, 1);
	slider_b = new Slider(`group_color.bSlider`, `editor_selected.material.color[2]`, `b: `, 0,255, 1);
	slider_a = new Slider(`group_color.aSlider`, `editor_selected.material.color[3]`, `a: `, 0,255, 1);
	
	slider_px = new Slider(`group_matSpecial.pxSlider`, `editor_selected.material.offset[0]`, `offX: `, -100,100, 1, -9999,9999);
	slider_py = new Slider(`group_matSpecial.pySlider`, `editor_selected.material.offset[1]`, `offY: `, -100,100, 1, -9999,9999);
	slider_pz = new Slider(`group_matSpecial.pzSlider`, `editor_selected.material.offset[2]`, `offZ: `, -100,100, 1, -9999,9999);
	
	var playerConstructors = [Player, Player_Debug, Player_Noclip];
	dropdown_obj = new Dropdown(`objectDropdown`, (val) => {
		if (val) {
			if (editor_selected == player) {
				if (playerConstructors.includes(map_strObj[val])) {
					var oldPlayer = player;
					player = new map_strObj[val](player.world, player.pos);
					player.dPos = oldPlayer.dPos;
					player.theta = oldPlayer.theta;
					player.phi = oldPlayer.phi;
					editor_selected = player;
				} else {
					editor_addObj(undefined, val);
				}
			} else {
				var obj = createDefaultObject(val, editor_selected);
				var ind = loading_world.objects.indexOf(editor_selected);
				loading_world.objects[ind] = obj;
				editor_selected = obj;
			}
			
			if (editor_selected != player) {
				syncObject_send(loading_world, editor_selected);
			}
		}
		
		//idk whatever
		var type = editor_selected.constructor.name;
		return map_objStr[type];
	}, Object.keys(map_strObj));
	
	dropdown_axes = new Dropdown(`axisDropdown`, (val) => {
		var e = editor_selected;
		if (val != null) {
			e.swapXZ = +val[0];
			e.swapYZ = +val[1];
			e.swapXY = +val[2];
			syncObject_send(loading_world, editor_selected);
		}
		
		return `${e.swapXZ}${e.swapYZ}${e.swapXY}`;
	}, [`000`, `001`, `010`, `011`, `100`, `101`, `110`, `111`]);
	
	dropdown_mat = new Dropdown(`materialDropdown`, (val) => {
		if (val) {
			var mat = createDefaultMaterial(val, editor_selected.material.color);
			editor_selected.material = mat;
			syncObject_send(loading_world, editor_selected);
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
		}
		return editor_selected.nature & nat;
	}
	
	checkbox_gloop = new Checkbox(`group_nature.gloopCheckbox`, `Gloop`, (val) => {return syncNature(val, N_GLOOP);});
	checkbox_anti = new Checkbox(`group_nature.antiCheckbox`, `Anti`, (val) => {return syncNature(val, N_ANTI);});
	checkbox_fog = new Checkbox(`group_nature.fogCheckbox`, `Fog`, (val) => {return syncNature(val, N_FOG);});
	
	editor_controls = [
		slider_fov, slider_res,
		slider_x, slider_y, slider_z,
		slider_tht, slider_phi, slider_rot,
		slider_rr, slider_rx, slider_ry, slider_rz, slider_ringR,
		slider_gyrA, slider_gyrB, slider_h, slider_skew,
		slider_r, slider_g, slider_b, slider_a, slider_e,
		slider_px, slider_py, slider_pz,

		dropdown_obj, dropdown_mat, dropdown_axes,
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
		"GYROID": [...rxyz, slider_gyrA, slider_gyrB, slider_h],
		"LINE": [...rxyz, slider_rr],
		"OCTAHEDRON": [...rxyz],
		"PRISM-RHOMBUS": [...rxyz, slider_skew, dropdown_axes],
		"PRISM-OCTAGON": [...rxyz, dropdown_axes],
		"PRISM-HEXAGON": [...rxyz, dropdown_axes],
		"RING": [slider_rr, slider_ringR],
		"SPHERE": [slider_rr],
		"SHELL": [slider_rr, slider_h],
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

function editor_addObj(e, optionalConstructor) {
	console.log(e, optionalConstructor);
	var obj = createDefaultObject(optionalConstructor ?? `BOX`);
	syncObject_send(loading_world, obj);
}

function editor_removeObj() {
	if (editor_selected != player) {
		syncObject_remove(loading_world, editor_selected);
	}
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
	var shouldSee = [
		slider_fov, slider_res, 
		dropdown_obj,
		slider_x, slider_y, slider_z,
		slider_tht, slider_phi, slider_rot
	];
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