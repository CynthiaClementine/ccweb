
class ToolText {
	constructor() {
		//tspan dys should be 1.2em
		this.startHTML = /*`<text x="0" y="0">
			This is a test of the emergency alert system.
		</text>`;*/
		`<foreignobject width="120" height="120">
		<div class="textarea canvas-renderer" contenteditable="false" style="white-space: pre-line; word-break: normal; overflow-wrap: break-word; overflow: hidden; color: black;">this</div>
		</foreignobject>`;
		this.typebox = document.createElement("input");
		this.selected;
		this.first = true;

		this.elementSelected;
	}

	escape() {
		//deselect element
		if (this.elementSelected) {
			this.deselect(this.elementSelected);
			textMode = false;
		}
	}

	//selects a foreignObject element
	preselect(element) {
		console.log(`preselecting`, element);
		//deselect the previous element
		if (this.elementSelected != undefined) {
			this.deselect(this.elementSelected);
		}

		//create The Clone
		var clone = element.cloneNode(true);
		var text = clone.children[0];
		φSet(clone, {'id': "temp_text"});
		φSet(text, {'contenteditable': "true"});
		workspace_toolTemp.appendChild(clone);

		text.addEventListener("mousedown", () => {
			textMode = true;
		});
		text.addEventListener("focusout", () => {
			textMode = false;
		});

		//create vision box
		var box = element.getBBox();
		workspace_toolTemp.appendChild(φCreate("rect", {
			'x': box.x,
			'y': box.y,
			'width': box.width,
			'height': box.height,
			'class': "select",
		}));

		//update element editability
		φSet(element, {"display": "none"});
		this.elementSelected = element;
	}

	deselect(element) {
		//swap text back to real element
		φSet(element, {"innerHTML": document.getElementById("temp_text").innerHTML});
		φSet(element.children[0], {"contenteditable": "false"});
		φSet(element, {"display": "inline-block"});
		workspace_toolTemp.innerHTML = "";
		this.elementSelected = undefined;
	}

	createTextbox() {
		var outer = φCreate("g");
		var cPos = cursorWorkspacePos();
		outer.innerHTML = this.startHTML;
		var inner = outer.children[0];
		var box = inner.getBBox();
		var x = quantizeNum(cPos[0] - box.width / 2);
		φSet(inner, {
			'x': x,
			'y': quantizeNum(cPos[1] - box.height / 2),
			'color': color_fill
		});
		frame_addObject(timeline.frameAt(timeline.t, timeline.s), inner);
	}

	mouseDown(a) {
		if (textMode) {
			return;
		}

		//if it's over a text box, select it
		var elemList = φOver();
		if (elemList[elemList.length-1].constructor.name == "HTMLDivElement") {
			//select the textbox
			for (var a=elemList.length-2; a>=0; a--) {
				if (elemList[a].constructor.name == "SVGForeignObjectElement") {
					this.preselect(elemList[a]);
					return;
				}
			}
		}

		//deselect
		if (this.elementSelected) {
			this.deselect(this.elementSelected);
			return;
		}

		this.createTextbox();
	}

	mouseMove(a) {

	}

	mouseUp(a) {

	}
}