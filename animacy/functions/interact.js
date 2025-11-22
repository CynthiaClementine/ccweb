/*
various functions that connect the user to the program, generally through api functions. 
This exists because often the inputs themselves need to be processed (a click could mean change color, but to what color?)


INDEX
changeOnionWingLength(wingIndex)
moveWorkspace(deltaX, deltaY)
moveTimeline(deltaX, deltaY)

setDownType(type)
startReordering(layerID)
toggleOnionSkin()
user_changeAnimLength()
user_changeFPS()
user_keyframe(n)
user_removeLayer();
changeToolTo(toolName)
*/



function changeOnionWingLength(wingIndex) {
	var tPos = cursorTimelinePos()[0];
	var dist = tPos - timeline.t - 0.5;
	if (wingIndex == 0) {
		dist *= -1;
	}
	dist = Math.max(Math.floor(dist), 0);
	timeline.onionBounds[wingIndex] = dist;
	setOnionWingLengths();
	timeline.changeFrameTo(timeline.t);
}


function moveWorkspace(deltaX, deltaY, ctrlEvent) {
	//holding control zooms instead of moving up/down
	if (button_force || ctrlEvent) {
		zoom(cursor.x, cursor.y, clamp(φGet(workspace_container, "scaling") * (1 + deltaY * 0.001), ...workspace_scaleBounds));
	} else {
		φAdd(workspace_container, {
			x: -deltaX,
			y: -deltaY,
		});
	}
	clampWorkspace();
}

function moveTimeline(deltaX, deltaY) {
	//zoom
	if (button_force) {
		var mult = (1 + deltaY * 0.001);
	} else {
		//set mins / maxs based on timeline length
		var widthAvail = φGet(base, "width") - φGet(timeline_main_container, "x") - (timeline_blockW * timeline_marginRight);
		var tmWidth = timeline_clipped.getBBox().width;

		var xBound = 0;

		if (tmWidth >= widthAvail) {
			xBound = (widthAvail * 0.5 - tmWidth);
		}
		
		//move the timeline
		φSet(timeline_clipped, {
			x: clamp(φGet(timeline_clipped, 'x') - deltaX, xBound, 0)
		});
	}
}



function setDownType(type) {
	cursor.downType = type;
}

function startReordering(layerID) {
	layer_reordering = layerID;
	cursor.downType = "layerReorder";
}

function textMode_start() {
	if (toolCurrent.constructor.name == "ToolText") {
		textMode = true;
	}
}

function textMode_end() {
	textMode = false;
}

/**
 * Toggles the onion skin on or off, and then returns whether the onion skin is newly active
 * @returns the new onion skin state
 */
function toggleOnionSkin() {
	timeline.makeInvisible();
	var state = !timeline.onionActive;
	timeline.onionActive = state;

	if (state) {
		φSet(timeline_onionhead, {"display": "inline-block"});
	} else {
		φSet(timeline_onionhead, {"display": "none"});
	}

	timeline.makeVisible();
	return timeline.onionActive;
}

//changes the type of the color picker to match the dropdown
function updatePickerType() {
	var type = sidebar_colorType.value;
	var currentColor = φGet(color_selectedNode, "fill");
	currentColor = cBreakdownRGBA(currentColor);
	switch (type) {
		case "rgb":
			φSet(picker_rectMain2, {'style': 'mix-blend-mode: screen'});
			φSet(gradientLR.children[0], {'stop-color': `rgba(0, 0, ${currentColor.b}, ${currentColor.a})`});
			φSet(gradientLR.children[1], {'stop-color': `rgba(0, 255, ${currentColor.b}, ${currentColor.a})`});
			φSet(gradientUD.children[0], {'stop-color': `rgba(0, 0, ${currentColor.b}, ${currentColor.a})`});
			φSet(gradientUD.children[1], {'stop-color': `rgba(255, 0, ${currentColor.b}, ${currentColor.a})`});
			gradientC.innerHTML = `<stop offset="0" stop-color="rgba(0, 0, 0, ${currentColor.a})"></stop><stop offset="100%" stop-color="rgba(0, 0, 255, ${currentColor.a})"></stop>`;

			setColorPickerRGBA(currentColor.r, currentColor.g, currentColor.b, currentColor.a);
			break;
		case "hsv":
			var hsvColor = RGBtoHSV(currentColor);
			hsvColor.s *= 100;
			hsvColor.v *= 100;
			φSet(picker_rectMain2, {'style': 'mix-blend-mode: multiply'});
			φSet(gradientLR.children[0], {'stop-color': `rgba(255, 255, 255, ${currentColor.a})`});
			φSet(gradientLR.children[1], {'stop-color': `hsla(${hsvColor.h}, 100%, 50%, ${currentColor.a})`});
			φSet(gradientUD.children[0], {'stop-color': `rgba(255, 255, 255, ${currentColor.a})`});
			φSet(gradientUD.children[1], {'stop-color': `rgba(0, 0, 0, ${currentColor.a})`});

			//the C gradient has a bit of an issue - a gradient will only interpolate linearly between colors, which means the hue gradient will behave incorrectly. 
			//To fix this, the hue circle is approximated with 10 stops (a decagon is pretty close to a circle, right?).
			var stops = 10;
			var stopHTML = ``;
			for (var v=0; v<=stops; v++) {
				stopHTML += `<stop offset="${v * 100 / stops}%" stop-color="hsla(${(v / stops) * 360}, 100%, 50%, ${currentColor.a})"></stop>`;
			}
			gradientC.innerHTML = stopHTML;

			setColorPickerHSVA(hsvColor.h, hsvColor.s, hsvColor.v, currentColor.a);
			break;
		case "sw-u":
			break;
		case "sw-p":
			break;
	}
}

//sets the length of the animation (in frames) to a specified value
function user_changeAnimLength() {
	//ask the user
	//temp way, there's a better way to do this
	var newLength = prompt(`Please set the new timeline length`, timeline.len);
		
	newLength = +newLength ?? timeline.len;
	if (Number.isNaN(newLength) || newLength < 1) {
		alert(`Bad length value recieved.`);
		return;
	}


	newLength = Math.floor(newLength);
	changeAnimationLength(newLength);
}

function user_changeFPS() {
	var newFPS = parseInt(prompt(`Enter new animation frames per second`, timeline.fps));
	if (Number.isNaN(newFPS)) {
		return;
	}

	//if the framerate is out of bounds
	if (newFPS < fps_limitMin || newFPS > fps_limitMax) {
		if (newFPS < fps_limitMin) {
			alert(`This framerate is too low. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		} else {
			alert(`This framerate is too high. The framerate must be at least ${fps_limitMin} and no more than ${fps_limitMax}.`);
		}
		newFPS = clamp(newFPS, fps_limitMin, fps_limitMax);
	}

	//actually changing the framerate
	changeFramerate(newFPS);
}



//used because I can't pass in variable arguments to onclick functions
function user_keyframe(n) {
	var m = timeline;
	var iden = m.layerIDs[m.s];
	var frameIsKey = m.l[iden][m.t] != m.l[iden][m.t - 1];
	var s = m.s;
	var t = m.t;

	//delete keyframe
	if (n == 3) {
		if (frameIsKey) {
			var delNode = getSelectedFrame();
			takeAction(() => {
				makeUnKeyframe(s, t);
			}, () => {
				makeKeyframe(s, t, delNode);
			});
		}
		m.changeFrameTo(m.t);
		return;
	}

	//create keyframe
	//don't create a keyframe on the same frame as a non-keyframe
	var tStorage = m.t;
	while (frameIsKey) {
		m.t += 1;
		frameIsKey = m.l[iden][m.t] != m.l[iden][m.t - 1];
	}
	//only count if not off the end of the timeline
	if (m.t < m.len) {
		var node;
		if (n == 2) {
			node = m.l[iden][m.t];
		}
		takeAction(() => {
			makeKeyframe(s, t, frame_copy(node, timeline.layerIDs[s]));
		}, () => {
			makeUnKeyframe(s, t);
			m.changeFrameTo(t);
		});
		
	} else {
		//if off the end, ignore and revert changes
		m.t = tStorage;
	}
		
	//update what's visible by changing timeline to the same frame
	m.changeFrameTo(m.t);
}

function user_removeLayer() {
	//get the id of the currently selected layer
	var id = timeline.layerIDs[timeline.s];
	removeLayer(id);
}

/**
 * Changes the current tool to a new one
 * @param {String} toolName the name of the tool: 
 * (Pencil, Rectangle, Circle, Move, Fill, Eyedrop)
 */
function changeToolTo(toolName) {
	//escape from the previous tool
	try {
		toolCurrent.escape();
	} catch (e) {
		if (toolCurrent == undefined) {
			console.log(`old tool is undefined!`);
		} else {
			console.log(`could not escape from ${toolCurrent.constructor.name}!`, e);
		}
	}

	var pressColor = "#777777";
	//first make sure all icons are unpressed
	var icons = document.getElementsByClassName("toolIcon");
	for (var i=0; i<icons.length; i++) {
		φSet(icons[i].children[1], {"fill": "transparent"});
	}

	var table = {
		"Pencil": [ToolPencil, tool_pencil],
		"Line": [ToolLine, tool_line],
		"Rectangle": [ToolRectangle, tool_rect],
		"Circle": [ToolCircle, tool_circle],
		"Polygon": [ToolPolygon, tool_shape],
		"Move": [ToolMove, tool_move],
		"Transform": [ToolTransform, tool_transform],
		"Fill": [ToolFill, tool_fill],
		"Eyedrop": [ToolEyedrop, tool_eyedrop],
		"Text": [ToolText, tool_text]
	}

	workspace_toolTemp.innerHTML = "";
	toolCurrent = new table[toolName][0]();
	φSet(table[toolName][1].children[1], {"fill": pressColor});
}