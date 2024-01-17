const color_UI_text = "#F8F";
const color_UI_selection = "#0AF";

var UI_properties = {
	lineW: 1 / 96,
	font: `Comic Sans MS`,
	cornerR: 1 / 48,
	colorLine: "#888",
	colorFill: "#CCC",
	colorFill2: "#888",
	colorText: "#F8F",
	hoverTol: 1 / 100,
}

class UI_Parent {
	constructor(x, y, width) {
		this.x = x;
		this.y = y;
		this.width = width;
	}

	//each UI class has 3 functions

	//draw - draws the UI element

	//interact - for handling when the mouse is pressed

	//tick - for handling when the mouse has moved

}



class UI_Button extends UI_Parent {
	/**
	 * X, Y, width, and height values are in screen percentages, so they scale with screen resolution.
	 * @param {Number} x the center x position of the button
	 * @param {Number} y the center y position of the button
	 * @param {Number} width the width of the entire button
	 * @param {Number} height the height of the entire button
	 * @param {String} label text to display on the button
	 * @param {Function} codeOnClick code to execute when the button is clicked
	 */
	constructor(x, y, width, height, label, codeOnClick) {
		super(x, y, width);
		this.height = height;
		this.label = label;
		this.func = codeOnClick;
		this.mouseOver = false;
	}

	beDrawn() {
		ctx.lineWidth = canvas.height * UI_properties.lineW;
		ctx.strokeStyle = UI_properties.colorLine;
		ctx.fillStyle = this.mouseOver ? UI_properties.colorFill2 : UI_properties.colorFill;
		ctx.beginPath();
		ctx.roundRect(canvas.width * (this.x - this.width / 2), canvas.height * (this.y - this.height / 2), canvas.width * this.width, canvas.height * this.height, canvas.height * UI_properties.cornerR);
		ctx.fill();
		ctx.stroke();

		ctx.font = `${canvas.height * this.height * 0.625}px ${UI_properties.font}`;
		ctx.textAlign = "center";
		ctx.fillStyle = UI_properties.colorText;
		ctx.fillText(this.label, canvas.width * this.x, canvas.height * this.y);
	}

	tick() {
		//mouseover check
		this.mouseOver = (Math.abs((cursor.x / canvas.width) - this.x) < this.width * 0.5 && Math.abs((cursor.y / canvas.height) - this.y) < this.height * 0.5);
	}

	interact() {
		if (this.mouseOver) {
			this.func();
			return 31;
		}
	}
}

//slider

class UI_Slider extends UI_Parent {
	/**
	 * Draws text and a slider that slides between values. Can snap to values along the way.
	 * X, Y, width, and sliderWidth values are in screen percentages, so they scale with screen resolution.
	 * ex: [text -----•--]
	 * @param {Number} x The x coordinate for the leftmost part of the text to be located at
	 * @param {Number} y The y coordinate for the slider to be located at
	 * @param {Number} width The width of the entire object
	 * @param {Number} sliderWidth The width of the slider
	 * @param {String} label The text to display to the left of the slider portion
	 * @param {Function} executeOnChange The function that will be executed when 
	 */
	constructor(x, y, width, sliderWidth, label, executeOnChange, displayProperty, minValue, maxValue, snapAmount) {
		super(x, y, width);
		this.textSpace = this.width - sliderWidth;

		this.property = displayProperty;
		this.func = executeOnChange;
		this.label = label;
		this.min = minValue;
		this.max = maxValue;
		this.snapTo = snapAmount;

		this.changing = false;
	}

	beDrawn() {
		var propertyValue = eval(this.property);
		var displayValue = propertyValue;
		if (this.snapTo % 1 != 0) {
			displayValue = displayValue.toFixed(2);
		} else {
			displayValue = Math.round(displayValue);
		}
		//text
		if (this.label != null && this.label != "") {
			ctx.fillStyle = UI_properties.colorText;
			ctx.font = `${canvas.height / 40}px Comfortaa`;
			ctx.textAlign = "left";
			ctx.fillText(`${this.label} (${displayValue})`, canvas.width * this.x, (canvas.height * this.y) + (canvas.height / 108));
		}



		//slider
		ctx.strokeStyle = color_grey_dark;
		ctx.beginPath();

		ctx.moveTo(canvas.width * (this.x + this.textSpace), canvas.height * this.y);
		ctx.lineTo(canvas.width * (this.x + this.width), canvas.height * this.y);
		ctx.stroke();
		drawCircle(color_grey_light, canvas.width * (this.x + this.textSpace + (getPercentage(this.min, this.max, propertyValue) * (this.width - this.textSpace))), canvas.height * this.y, 4);
		//drawCircle(color_grey_light, canvas.width * (this.x + this.textSpace), canvas.height * this.y, 4);
		ctx.stroke();
	}

	interact() {
		//if the cursor is down over self start changing
		if (Math.abs(cursor.y - (canvas.height * this.y)) < UI_properties.hoverTol * canvas.height && Math.abs(cursor.x - (canvas.width * (this.x + this.width / 2))) < UI_properties.hoverTol * canvas.height) {
			this.changing = true;
			//modify value so it doesn't have to wait until the user moves
			return this.tick();
		}
	}

	tick() {
		if (!cursor.down) {
			this.changing = false;
			return;
		}
		if (this.changing) {
			var percentage = clamp(getPercentage(this.x + this.textSpace, this.x + this.width, cursor.x / canvas.width), 0, 1);
				var value = linterp(this.min, this.max, percentage);
				value = Math.round(value / this.snapTo) * this.snapTo;
				this.func(value);
				return 31;
		}
	}
}

//text boxes you can click on and change in the editor
class UI_TextBox extends UI_Parent {
	constructor(xPERCENTAGE, yPERCENTAGE, widthPERCENTAGE, label, propertyToModifySTRING, propertyDisplay, textBoxText, textBoxPrefill) {
		super(xPERCENTAGE, yPERCENTAGE, widthPERCENTAGE);

		this.label = label;
		this.property = propertyDisplay;
		this.execution = propertyToModifySTRING;
		this.boxLabel = textBoxText;
		this.boxContent = textBoxPrefill;
		this.doReset = resetTunnel;
	}

	beDrawn() {
		drawSelectionBox(canvas.width * (this.x + (this.width * 0.5)), canvas.height * this.y, canvas.width * this.width, canvas.height / 25);

		//text
		ctx.fillStyle = UI_properties.colorText;
		ctx.font = `${canvas.height / 42}px Comfortaa`;
		ctx.textAlign = "left";
		ctx.fillText(this.label + eval(this.property), canvas.width * (this.x + 0.01), (canvas.height * this.y) + (canvas.height / 126));
	}

	interact() {
		//if in the area, modify value
		if (cursor.y > (canvas.height * this.y) - UI_properties.hoverTol && cursor.y < (canvas.height * this.y) + UI_properties.hoverTol) {
			if (cursor.x < (canvas.width * (this.x + this.width)) + UI_properties.hoverTol && cursor.x > (canvas.width * this.x) - UI_properties.hoverTol) {
				var value = prompt(this.boxLabel, eval(this.boxContent));
				//sanitize input because users are evil gremlins (sorry any user that's reading this, you're not an evil gremlin, but your typing habits could cause problems)
				if (isValidString(value)) {
					value.replaceAll(`\'`, "");
					value.replaceAll(`\\`, "");

					eval(this.execution);
					//repeat pop-up prevention
					cursor.x = -1000;
					cursor.y = -1000;
				}
			}
		}
	}
	
	tick() {
	}
}

class UI_Toggle extends UI_Parent {
	/**
	 * A labelled checkbox that you can toggle
	 * @param {Number} x The screen percentage of the leftmost X position
	 * @param {Number} y The screen percentage of the middle Y position 
	 * @param {Number} width The screen percentage of the item width. The checkbox will be located at x + width
	 * @param {String} label The text to label the checkbox with
	 * @param {Function} propertyFunc A function that takes in one or no arguments (for setting new values) and returns the value of the property
	 */
	constructor(x, y, width, height, label, propertyFunc) {
		super(x, y, width);
		this.height = height / 2;
		this.text = label;
		this.func = propertyFunc;
	}

	beDrawn() {
		//selection box
		var boxL = this.height * canvas.height;
		ctx.lineWidth = canvas.height * UI_properties.lineW;
		ctx.strokeStyle = UI_properties.colorLine;
		ctx.fillStyle = this.mouseOver ? UI_properties.colorFill2 : UI_properties.colorFill;
		ctx.beginPath();
		ctx.roundRect(canvas.width * (this.x + this.width) - boxL, canvas.height * this.y - boxL, boxL * 2, boxL * 2, canvas.height * UI_properties.cornerR);
		ctx.fill();
		ctx.stroke();

		ctx.fillStyle = UI_properties.colorText;
		if (this.func()) {
			ctx.fillRect(((this.x + this.width) * canvas.width) - boxL / 2, (this.y * canvas.height) - boxL / 2, boxL, boxL);
		}

		//text
		ctx.font = `${canvas.height / 36}px Comfortaa`;
		ctx.textAlign = "left";
		ctx.fillText(this.text, canvas.width * this.x, (canvas.height * this.y) + (canvas.height / 108));
	}

	interact() {
		if (cursor.x > this.x * canvas.width && cursor.x < (this.x + this.width) * canvas.width && Math.abs(this.y - (cursor.y / canvas.height)) < this.height) {
			this.func(!this.func());
		}
	}

	tick() {
	}
}