/*
functions that can accomplish the same tasks as user input, but with the benefit of being callable functions



INDEX

toggleOnionSkin()
fill(workspaceX, workspaceY)
makeKeyframe(layerIndex, frame, frameNode)
makeUnkeyframe(layer, frame)

removeLayer(id)
select(layer, frame)

*/

/**
 * Toggles the onion skin on or off, and then returns whether the onion skin is newly active
 * @returns the new onion skin state
 */
function toggleOnionSkin() {
	var state = !timeline.onionActive;
	timeline.onionActive = state;

	if (state) {
		φSet(timeline_onionhead, {"display": "inline-block"});
	} else {
		φSet(timeline_onionhead, {"display": "none"});
	}
	
	return timeline.onionActive;
}

/**
 * Toggles whether the timeline is playing
 */
function toggleTimelinePlayback() {
	if (autoplay == undefined) {
		//if at the end, go to the start
		if (timeline.t == timeline.len - 1) {
			timeline.changeFrameTo(0);
		}
		
		autoplay = window.setInterval(() => {
			timeline.changeFrameTo(timeline.t + 1);
			if (timeline.t == timeline.len-1) {
				handleKeyPress({code: "Enter"})
			}
		}, 1000 / timeline.fps);
	} else {
		window.clearInterval(autoplay);
		autoplay = undefined;
	}
}


/**
 * Attempts to fill a region with the current fill color that includes the specified X and Y. Will start with the currently selected layer and then try fill layers top to bottom.
 * 
 * @param {Number} workspaceX the X, in workspace coordinates, to fill at
 * @param {Number} workspaceY the Y, in workspace coordinates, to fill at
 * @returns {Boolean} whether the operation succeeded or not
 */
function fill(workspaceX, workspaceY) {
	var layers = timeline.layerIDs.slice(0);
	//prioritize the selected layer
	var selected = layers[timeline.s];
	layers.splice(timeline.s, 1);
	layers.splice(0, 0, selected);

	//try to fill each layer and go with the first one that succeeds
	for (var k=0; k<layers.length; k++) {
		if (timeline.l[layers[k]][timeline.t].fill(workspaceX, workspaceY)) {
			return true;
		}
	}
	return false;
}

function findLoops(pathObj) {
	
}

/**
 * Turns a specified frame into a keyframe
 * @param {Number} layerIndex The index of the layer to make a keyframe
 * @param {Number} frame The frame to make the keyframe at
 * @param {*} frameNode OPTIONAL: a node to clone. If left blank, creates a blank keyframe.
 */
 function makeKeyframe(layerIndex, frame, frameNode) {
	timeline.makeInvisible();
	console.log(layerIndex, frame, frameNode);

	var layerID = timeline.layerIDs[layerIndex];
	//first create the new layer object
	var arrRef = timeline.l[layerID];
	var oldObj = arrRef[frame];
	var newObj = (frameNode == undefined) ? frame_create(createUid(), layerID) : frame_copy(frameNode, layerID);
	var frameID = φGet(newObj, 'uid');

	var theBin = document.getElementById(`layer_${layerID}_group`);
	
	//move forwards, replacing all the timeline blocks and array references
	//go until the next keyframe is reached
	var endFrame = frame;
	φSet(theBin.children[`layer_${layerID}_frame_${frame}`], {'href': `#MASTER_layerKey_${frameID}`});
	arrRef[endFrame] = newObj;
	endFrame += 1;
	
	while (arrRef[endFrame] == oldObj) {
		arrRef[endFrame] = newObj;
		φSet(theBin.children[`layer_${layerID}_frame_${endFrame}`], {'href': `#MASTER_layer_${frameID}`});
		endFrame += 1;
	}

	timeline.makeVisible();
}

/**
 * Turns a specified keyframe into a regular frame
 * @param {Number} layer The index of the layer (in the timeline array) to reference
 * @param {Number} frame The frame which is being converted to a non-keyframe
 */
function makeUnKeyframe(layer, frame) {
	layer = timeline.layerIDs[layer];
	var isFirst = (frame == 0);
	var arrRef = timeline.l[layer];
	var readObj = arrRef[frame];
	//if the frame's 0 there's no previous frame and one must be created
	var writeObj = isFirst ? frame_create(createUid(), layer) : arrRef[frame-1];
	var writeID = φGet(writeObj, 'uid');
	var theBin = document.getElementById(`layer_${layer}_group`);

	//find the next spot where a keyframe is, replacing the layers and timeline blocks along the way
	
	var nextKeyIndex = frame;

	//if it's the very first frame, removing the keyframe still leaves a keyframe
	if (isFirst) {
		φSet(theBin.children[`layer_${layer}_frame_${nextKeyIndex}`], {'href': `#MASTER_layerKey_${writeID}`});
		arrRef[nextKeyIndex] = writeObj;
		nextKeyIndex += 1;
	}

	//all the other removed frames will always be set to non-keys
	while (arrRef[nextKeyIndex] == readObj) {
		φSet(theBin.children[`layer_${layer}_frame_${nextKeyIndex}`], {'href': `#MASTER_layer_${writeID}`});
		arrRef[nextKeyIndex] = writeObj;
		nextKeyIndex += 1;
	}

	//delete the removed frame from the workspace
	var layerObj = workspace_permanent.children[`layer_${layer}`];
	layerObj.removeChild(readObj);
}

/**
 * 
 * @param {String} id The ID of the layer to remove. IDs are always an x followed by one or more letters.
 */
 function removeLayer(id) {
	console.log(`removing ${id}`)
	timeline.makeInvisible();
	//move timeline objects afterwards to fill the gap
	var moveH = -(timeline_blockH + 1);
	var startIndex = timeline.layerIDs.indexOf(id);
	for (var v=startIndex; v<timeline.layerIDs.length; v++) {
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_group`), {'y': moveH});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_text`), {'y': moveH});
	}

	//remove all the frame objects
	workspace_permanent.removeChild(document.getElementById(`layer_${id}`));

	//remove the timeline objects
	timeline_blocks.removeChild(document.getElementById(`layer_${id}_group`));
	timeline_text_container.removeChild(document.getElementById(`layer_${id}_text`));

	//remove from the timeline object
	delete timeline.l[id];
	timeline.layerIDs.splice(startIndex, 1);
	timeline.makeVisible();
}

/**
 * Selects a specified frame and layer
 * @param {Number} layer The index of the layer being selected
 * @param {Number} frame The frame being selected
 */
function select(layer, frame) {
	//change the timeline selector
	timeline.s = layer;
	timeline.changeFrameTo(frame);
	φSet(timeline_selector, {
		'x': frame * (timeline_blockW + 1),
		'y': timeline_headHeight + layer * (timeline_blockH + 1)
	});
	φSet(timeline_onionhead, {
		'x': frame * (timeline_blockW + 1)
	});
	setOnionWingLengths();
}

/**
 * Sets the selected color to be a certain value. Also changes the color picker to match.
 * If an argument is left blank, the set color will keep that value from the previous color.
 * @param {Number} r The [0, 255] integer representing red content
 * @param {Number} g The [0, 255] integer representing green content
 * @param {Number} b The [0, 255] integer representing blue content
 * @param {Number} a The [0, 1] number representing opacity
 */
function setColorRGBA(r, g, b, a) {
	var rChange = r.constructor.name == "Number";
	var gChange = g.constructor.name == "Number";
	var bChange = b.constructor.name == "Number";
	var aChange = a.constructor.name == "Number";
	var prevSplit = color_selected.split(" ");

	if (rChange || gChange || bChange || aChange) {
		if (!rChange) {
			r = +prevSplit[0].slice(5, -1);
		}
		if (!gChange) {
			g = +prevSplit[1].slice(0, -1);
		}
		if (!bChange) {
			b = +prevSplit[2].slice(0, -1);
		}
		if (!aChange) {
			a = +prevSplit[3].slice(0, -1);
		}
	}

	//set the color
	color_selected = `rgba(${r}, ${g}, ${b}, ${a})`;

	//set the color picker
	var wh = φGet(MASTER_picker, ['width', 'height']);
	if (rChange || gChange) {
		φSet(picker_selectorAB, {
			'cx': g / 255 * wh[0],
			'cy': r / 255 * wh[1] * (10 / 11),
		});
	}

	if (bChange || aChange) {
		if (bChange) {
			φSet(picker_selectorC, {
				'x': (b / 255 * wh[0]) - 2
			});
		}

		if (aChange) {
			φSet(picker_selectorD, {
				'x': clamp((a * wh[0]) - 2, -2, wh[0] - 2),
			});
		}

		φSet(gradientLR.children[0], {'stop-color': `rgba(0, 0, ${b}, ${a})`});
		φSet(gradientLR.children[1], {'stop-color': `rgba(0, 255, ${b}, ${a})`});
		φSet(gradientUD.children[0], {'stop-color': `rgba(0, 0, ${b}, ${a})`});
		φSet(gradientUD.children[1], {'stop-color': `rgba(255, 0, ${b}, ${a})`});
		φSet(gradientC.children[0], {'stop-color': `rgba(0, 0, 0, ${a})`});
		φSet(gradientC.children[1], {'stop-color': `rgba(0, 0, 255, ${a})`});
	}
}

function setColorHSVA(h, s, v, a) {
	
}