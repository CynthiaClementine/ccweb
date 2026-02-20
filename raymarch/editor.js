var editor_selected = undefined;



class Slider {
	/**
	* @param {HTMLElement} valueElem the slider text element
	* @param {HTMLElement} sliderElem the slider input element
	* @param {String} variable how to reference the variable to write to. Will be `eval`ed later.
	* @param {Number} min minimum slider value
	* @param {Number} max maximum slider value
	* @param {Number} stepSize step size between acceptable values
	* @param {Boolean} relative whether values should be treated as relative values (true) or absolute values (false)
	 */
	constructor(valueElem, sliderElem, variable, min, max, stepSize, relative) {
		this.rel = relative;
		this.sliderElem = sliderElem;
		this.valueElem = valueElem;
		this.min = min;
		this.max = max;
		this.step = stepSize;
		this.var = variable;
		this.offset = 0;
		this.init();
	}
	
	value() {
		return +this.sliderElem.value + (this.rel ? this.offset : 0);
	}

	init() {
		this.sliderElem.addEventListener('input', this.updateDisplay.bind(this));
		this.sliderElem.addEventListener('change', this.updateValue.bind(this));
		this.sliderElem.setAttribute(`min`, this.min);
		this.sliderElem.setAttribute(`max`, this.max);
		this.sliderElem.setAttribute(`step`, this.step);
		this.sliderElem.value = 0;
		this.synchronize();
	}
	
	synchronize() {
		try {
			this.offset = Math.round(eval(this.var) / this.step) * this.step;
		} catch (e) {
			console.error(`cannot fetch ${this.var}!`);
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
		this.valueElem.innerHTML = (neg ? `-` : ``) + val.toString().padStart(5 - neg, "0");
	}
	
	updateValue(e) {
		this.offset = this.value();
		try {
			eval(`${this.var} = ${this.offset};`);
		} catch (e) {
			console.error(`cannot send ${this.offset} -> ${this.var}!`);
		}
		this.sliderElem.value = 0;
		this.updateDisplay();
	}
}

class Dropdown {
	constructor(dropdownElem, variable) {
		this.elem = dropdownElem;
		this.var = variable;
		this.init();
	}
	
	init() {
	
	}
}

var editor_xSlider;
var editor_ySlider;
var editor_zSlider;

var editor_rSlider;
var editor_gSlider;
var editor_bSlider;

function editor_initialize() {
	editor_selected = camera;
	editor_xSlider = new Slider(document.getElementById("xSlider").children[0], document.getElementById("xSlider").children[1], 
								`editor_selected.pos[0]`, -100, 100, 1, true);
	editor_ySlider = new Slider(document.getElementById("ySlider").children[0], document.getElementById("ySlider").children[1], 
								`editor_selected.pos[1]`, -100, 100, 1, true);
	editor_zSlider = new Slider(document.getElementById("zSlider").children[0], document.getElementById("zSlider").children[1], 
								`editor_selected.pos[2]`, -100, 100, 1, true);
	editor_xSlider.init();
	editor_ySlider.init();
	editor_zSlider.init();
}

function editor_select(object) {
	editor_selected = object ?? camera;
	//show the appropriate editor panel
	
	editor_xSlider.synchronize();
	editor_ySlider.synchronize();
	editor_zSlider.synchronize();
}