/*all the things that have to do with the HTML-facing part of the editor

class Checkbox(destination, label, get, set)
class Sliderify(destination, label, min?, max?, step?, path)
class Textbox()

activateOverlay(showEditor)
createHTMLCheckboxAt(parentName, checkboxName, label)
ec_compile(arr, destination)
editor_initialize()
editor_preAdd()
editor_preMat()
editor_updatePanelsFor(obj)
*/
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
			self.applyInput(text_in.value);
		}
		
		// Call the calculate function on startup
		this.applyInput(this.rValue);
	}

	// A very scrappy function to quickly work out how many 
	// decimal places the 'step' attribute of the range is using
	decimalPlaces(number) {
		var stringNumber = String(number);
		var decimals = stringNumber.split('.')[1] ?? ``;
		return decimals.length;
	}

	parse(calc) {
		calc = clamp(calc, this.min, this.max);
		if (this.round > 0) {
			calc = calc.toFixed(this.round);
		} else {
			calc = parseInt(calc);
		}
		return calc;
	}

	// don't input a value outside the allowed range
	applyInput(val) {
		var calc = this.parse(val);
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

	synchronize() {
		var calc = this.parse(this.get());
		this.rValue = calc;
		this.elText.value = calc;
		this.elSpan.innerHTML = calc;
	}
}

class Textbox {
	constructor(destination, label, path) {
		var self = this;
		this.get = () => {return pathGet(path);};
		this.set = (v) => {return pathSet(path, v);};
		var dummy = document.createElement(`div`);
		dummy.innerHTML = `
			<div class="range-wrap">
					<label>${label}</label>
					<input class="direct-text-input" value="0" style="display: none;">
					<span class="range-value">${this.get()}</span>
			</div>`;

		var wrapper = dummy.children[0];
		var text_in = wrapper.children[1];
		var span_in = wrapper.children[2];
		this.elText = text_in;
		this.elSpan = span_in;
		destination.appendChild(wrapper);

		span_in.onclick = () => {
			span_in.style.display = `none`;
			text_in.style.display = `inline-block`;
			text_in.focus();
		}

		text_in.onblur = () => {
			text_in.style.display = `none`;
			span_in.style.display = `inline-block`;
			self.applyInput(text_in.value);
		}
	}

	applyInput(val) {
		this.elText.value = val;
		this.elSpan.innerHTML = val;
		this.set(val);
		loading_world.shouldRegen = true;
		return val;
	}
}

function activateOverlay(showEditor) {
	overlay.style.display = `flex`;
	if (!showEditor) {
		overlay.onclick = () => {
			overlay.style.display = `none`;
		};
	}

	group_edit.style.display = showEditor ? `inline`: `none`;
	grid.style.display = showEditor ? `none` : ``;
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
			if (tok[2][0] == `.`) {
				tok[2] = `editor_selected` + tok[2];
			}
			elements.push(new Textbox(destination, label, tok[2]));
			continue;
		}

		//checkboxes
		if (tok[0] == `C`) {
			//simple checkbox
			if (tok.length == 3) {
				const loc = tok[2];
				const getSetSimple = (val) => {
					if (val != null) {
						pathSet(loc, val);
					}
					return pathGet(loc);
				}
				elements.push(new Checkbox(destination, label, getSetSimple, getSetSimple));
				continue;
			}
			//complex checkbox - custom getter/setter
			elements.push(new Checkbox(destination, label, arr[e+1], arr[e+1]));
			e += 1;
			continue;

		}

		//buttons
		if (tok[0][0] == `|`) {
			label = tok[0].slice(1, -1).replaceAll(`_`, ` `);
			var evt = tok[1];
			var el = document.createElement(`button`);
			el.innerHTML = label;
			el.onclick = window[evt];
			destination.appendChild(el);
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
	var pr_xy = [`.rx (rx: ####) 0–1e101 u1`, `.ry (ry: ####) 0–1e101 u1`];
	var sl_r = `.r (<br>r:_ ####) 0—1e101 r100 u1`;
	var sl_rr = `.ringR (rr: ####) r100 u1`;
	var sl_h = `.h (h: ±##) r100 u0.1`;

	objectEditables = {
		"PLAYER":			[],
		"PLAYER-DEBUG":		[],
		"PLAYER-NOCLIP":	[],

		"BLOB":			[sl_r],
		"BOX": 			[...xyz],
		"BOX-FRAME": 	[...xyz, `.e (e: ±###) r10 u0.25`],
		"CAPSULE":		[sl_r, sl_h],
		"CATENARY":		[sl_r, `.arclen (L: ###.#) 1—9999 u0.1`],
		"CUBE":			[sl_r],
		"CYLINDER":		[sl_r, sl_h],
		"DISH":			[sl_r, sl_rr],
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
		"LINE":			[sl_r],
		"LOOP":			[
			...xyz, 
			`.dx (<br>dx: ####) 1—1023 u1`,
			`.dy (dy: ####) 1—1023 u1`,
			`.dz (dz: ####) 1—1023 u1`,
		],
		"OCTAHEDRON":	[...xyz],
		"POINT":		[],
		"PRISM-RHOMBUS":[...xyz, `.skew (skew: ±##) r50 -500—500 u1`],
		"PRISM-OCTAGON":[...xyz],
		"PRISM-HEXAGON":[...xyz],
		"PRISM-TRIGON":[...xyz],
		"RING":			[sl_r, sl_rr],
		"RING-BOX":		[sl_r, ...pr_xy],
		"RING-TRI":		[sl_r, ...pr_xy],
		"SPHERE":		[sl_r],
		"SINGULARITY":	[sl_r, `.mass (m: ±##.##) -10—10 u0.01`],
		"SHELL":		[sl_r, sl_h],
		"TERRAIN": [
			...xyz, 
			`.n (n: #) 1—7 u1`, 
			`.ampl (ampl: ###.##) 0.01—400 u0.01`, 
			`.a (a: #.##) 0.01—2 u0.01`, 
			`.freq (freq: #.##) 0.001—9 u0.001`, 
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
		
		"GROUP-L":	[],
		"DOTDOTDOT":[],
		"LAMPPOST": [],
		"SKYBUNNY": [],
		"WORM": [],
		"TREE": [
			`.seed (seed: #) 0—30 u1`,
			`.ampl (ampl: ###.#) 0.1—300 u0.1`, 
			`.rr (brnc: #.##) 1.00—4.00 u0.05`, 
			`.a (wobl: #.##) 0.02—0.98 u0.01`, 
			`.b (gain: #.##) 0.05—1 u0.05`,
			`.iters (n: #) 1—4 u1`,
		]
	};
	
	var rgb = [
		`.material.color.0 (r: ###) 0—255 u1`,
		`.material.color.1 (g: ###) 0—255 u1`,
		`.material.color.2 (b: ###) 0—255 u1`
	];
	var rgba = [...rgb, `.material.color.3 (a: ###) 0—255 u1`];
	materialEditables = {
		"color":	[...rgb],
		"ghost":	[...rgba],
		"glass":	[...rgba, `.material.density (d: #.##) 0.05—10 u0.05`],
		"light":	[...rgb, `.material.lumi (l: ###) 0—255 u1`],
		"mirror":	[...rgba],
		"normal":	[],
		"plexi":	[...rgba],
		"portal": [
			`.material.offset.0 (offX: ±###) r100 u1`,
			`.material.offset.1 (offY: ±###) r100 u1`,
			`.material.offset.2 (offZ: ±###) r100 u1`,
			`___ dest: .material.str`,
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

	editor_controls.edit = ec_compile([
		`C Surface_snap editor_flags.snapToSurface`,
		`C Pos_snap editor_flags.snapToPos`,
		`editor_flags.snapDist (snapDist: ##) 1—99 u1`,
		`C Show_grid debug_flags.showGrid`,
		`C Grid_snap editor_flags.snapToGrid`,
		`editor_flags.gridDist (gridDist: ###.#) 0.1—100 u0.1`,
	], group_edit);

	editor_controls.set = ec_compile([
		`camera_FOV (fov: ###) 40—170 u2`,
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
	activateOverlay(false);
	
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
	activateOverlay(false);
	
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
			editor_setMaterial(val);
			overlay.style.display = `none`;
		};
		grid.appendChild(btn);
	}
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
	
	const thetaless = [Sphere, Shell, Point];
	const philess = [Sphere, Shell, Point];
	const rotless = [Sphere, Shell, Capsule, Cylinder, Ring, Fractal, 
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
	
	if (obj != player && obj.type != TYPE_CLASS_LGROUP && obj.type != TYPE_CLASS_LOOP) {
		shouldSee.push(
			`C Gloop`,		(val) => {return syncNature(val, N_GLOOP);},
			`C Smooth`,		(val) => {return syncNature(val, N_SMOOTH);},
			`C Anti`,		(val) => {return syncNature(val, N_ANTI);},
			`C Fog`,		(val) => {return syncNature(val, N_FOG);},
			`C Grav`,		(val) => {return syncNature(val, N_GRAVITY);},
			`C Field`,		(val) => {return syncNature(val, N_FIELD);},
			`C Extrude`,	(val) => {return syncNature(val, N_EXTRUDE);},
			`.smoothness (Smooth: ##.#) 1—9999 u0.5`,
			`.gloopiness (Gloopy: ##.#) 1—9999 u0.5`,
		);
		if (obj.nature & N_EXTRUDE) {
			shouldSee.push(
				`.ex (ex: ##.#) 0—4095 u0.1`,
				`.ey (ey: ##.#) 0—4095 u0.1`,
				`.ez (ez: ##.#) 0—4095 u0.1`,
			);
		}
	}
	
	shouldSee = shouldSee.concat(objectEditables[map_objStr[consName]]);
	editor_controls.obj = ec_compile(shouldSee, group_nature);

	shouldSee = [];
	label_material.innerHTML = `[!]`;
	if (matName) {
		label_material.innerHTML = matName;
	
		shouldSee.push(`|Change_Material| editor_preMat`);
		shouldSee = shouldSee.concat(materialEditables[map_matStr[matName]]);
	}

	editor_controls.mat = ec_compile(shouldSee, group_matSpecial);
}