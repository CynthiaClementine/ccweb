/*
functions that can accomplish the same tasks as user input, but with the benefit of being callable functions



INDEX
changeBrushSize(newSize)
getSelectedFrame();
toggleTimelinePlayback()
fill(workspaceX, workspaceY)
makeKeyframe(layerIndex, frame, frameNode)
makeUnKeyframe(layer, frame)
moveCursorTo(workspaceX, workspaceY)
removeLayer(id)
select(layer, frame)
setColorRGBA(r, g, b, a)
setColorHSVA(h, s, v, a)
*/

function changeBrushSize(newSize) {
	data_persistent.brushSize = clamp(newSize, brush_limits[0], brush_limits[1]);
}

/**
 * Gives the object of the current Frame selected. If multiple frames are selected, returns an array of objects.
 */
function getSelectedFrame() {
	var id = timeline.layerIDs[timeline.s];
	var layer = timeline.l[id][timeline.t];
	return layer;
}

/**
 * Toggles whether the timeline is playing
 * @param {Boolean} loop determines whether the animation should loop once the end is reached. If false, playback stops once the end is reached instead.
 */
function toggleTimelinePlayback(loop) {
	if (autoplay == undefined) {
		//if at the end, go to the start
		if (timeline.t == timeline.len - 1) {
			timeline.changeFrameTo(0);
		}

		//make sure to toggle the onion skin off during replay
		var onionToggle = timeline.onionActive;
		if (onionToggle) {
			toggleOnionSkin();
		}


		//set up stop function inside here so it knows onionToggle
		autoplayStop = () => {
			window.clearInterval(autoplay);
			autoplay = undefined;
			autoplayStop = undefined;
			if (onionToggle) {
				toggleOnionSkin();
				select(timeline.s, timeline.t);
			}
		}

		//start playing
		autoplay = window.setInterval(() => {
			if (loop && timeline.t == timeline.len - 1) {
				timeline.changeFrameTo(0);
				return;
			}
			timeline.changeFrameTo(timeline.t + 1);
			if (!loop && timeline.t == timeline.len - 1) {
				autoplayStop();
			}
		}, 1000 / timeline.fps);
	} else {
		autoplayStop();
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
	changeToolTo("Fill");
	toolCurrent.forceFillCoordinates = [workspaceX, workspaceY];
	toolCurrent.mouseDown();
}

/**
 * Turns a specified frame into a keyframe
 * @param {Number} layerIndex The index of the layer to make a keyframe
 * @param {Number} frame The frame to make the keyframe at
 * @param {*} frameNode OPTIONAL: a node to clone. If left blank, creates a blank keyframe.
 */
 function makeKeyframe(layerIndex, frame, frameNode) {
	timeline.makeInvisible();

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
 * @param {Number} frame The 0-indexed frame which is being converted to a non-keyframe
 */
function makeUnKeyframe(layer, frame) {
	//first make sure it is truly a keyframe - if it's not, break out
	if (frame != 0 && timeline.frameAt(frame, layer) == timeline.frameAt(frame-1, layer)) {
		return;
	}

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
 * although I cannot actually move the cursor due to privacy issues, I can update the application's store of where the cursor is. This function does that.
 * @param {Number} workspaceX the workspace X-coordinate to move the cursor to
 * @param {Number} workspaceY the workspace Y-coordinate to move the cursor to 
 */
function moveCursorTo(workspaceX, workspaceY) {
	var box = workspace_background.getBoundingClientRect();
	var wh = φGet(workspace_background, ['width', 'height']);
	
	//workX = (cursor.x - box.x) / box.width * wh[0]
	//workX / wh[0] * box.width = cursor.x - box.x
	//(workX / wh[0] * box.width) + box.x = cursor.x
	cursor.x = box.x + (workspaceX / wh[0] * box.width);
	cursor.y = box.y + (workspaceY / wh[1] * box.height);
}

/**
 * Removes a layer from the document. 
 * @param {String} id The ID of the layer to remove. IDs are always an x followed by one or more letters.
 */
 function removeLayer(id) {
	console.log(`removing ${id}`);
	timeline.makeInvisible();
	//move timeline objects afterwards to fill the gap
	var moveH = -(timeline_blockH + 1);
	var startIndex = timeline.layerIDs.indexOf(id);
	for (var v=startIndex; v<timeline.layerIDs.length; v++) {
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_group`), {'y': moveH});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_text`), {'y': moveH});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[v]}_udpull`), {'y': moveH});
	}

	//remove all the frame objects
	workspace_permanent.removeChild(document.getElementById(`layer_${id}`));

	//remove the timeline objects
	timeline_blocks.removeChild(document.getElementById(`layer_${id}_group`));
	timeline_text_container.removeChild(document.getElementById(`layer_${id}_text`));
	timeline_text_container.removeChild(document.getElementById(`layer_${id}_udpull`));

	//remove from the timeline object
	delete timeline.l[id];
	timeline.layerIDs.splice(startIndex, 1);
	timeline.makeVisible();

	//make sure extender length is accurate
	updateTimelineExtender();
}

/**
 * Moves a layer with a certain index to another index. Leaves every other layer in order.
 * @param {Integer} oldIndex the original index of the layer to move
 * @param {Integer} newIndex the new index to put the layer at
 */
function reorderLayer(oldIndex, newIndex) {
	if (oldIndex == newIndex || Math.min(oldIndex, newIndex) < 0 || Math.max(oldIndex, newIndex) >= timeline.layerIDs.length) {
		return;
	}
	var indexDelta = newIndex - oldIndex;
	var pxDelta = (timeline_blockH + 1) * indexDelta;
	var pxDeltaCollateral = (timeline_blockH + 1) * -Math.sign(indexDelta);
	var lID = timeline.layerIDs.splice(oldIndex, 1)[0];

	//move: 

	//the ordering in the workspace - this is super wacky because the highest layer must go last in the DOM
	var layer = document.getElementById(`layer_${lID}`);
	workspace_permanent.removeChild(layer);
	if (newIndex == 0) {
		workspace_permanent.appendChild(layer);
	} else {
		workspace_permanent.insertBefore(layer, document.getElementById(`layer_${timeline.layerIDs[newIndex-1]}`));
	}

	//the actual layer (text + timeline blocks)
	φAdd(document.getElementById(`layer_${lID}_text`), {'y': pxDelta});
	φAdd(document.getElementById(`layer_${lID}_udpull`), {'y': pxDelta});
	φAdd(document.getElementById(`layer_${lID}_group`), {'y': pxDelta});

	//other affected layers (text + timeline blocks)
	for (var b=Math.min(oldIndex, newIndex); b<Math.max(oldIndex, newIndex); b++) {
		φAdd(document.getElementById(`layer_${timeline.layerIDs[b]}_text`), {'y': pxDeltaCollateral});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[b]}_udpull`), {'y': pxDeltaCollateral});
		φAdd(document.getElementById(`layer_${timeline.layerIDs[b]}_group`), {'y': pxDeltaCollateral});
	}

	//the position in layerIDs
	timeline.layerIDs.splice(newIndex, 0, lID);



	//selected - maybe
	if (timeline.s == oldIndex) {
		timeline.s = newIndex;
	}
}

/**
 * Selects a specified frame and layer
 * @param {Number} layer The index of the layer being selected
 * @param {Number} frame The frame being selected
 */
function select(layer, frame) {
	//change the timeline selector while staying in-bounds
	timeline.s = clamp(layer, 0, timeline.layerIDs.length-1);
	timeline.changeFrameTo(frame);

	//update layer/frame variables so I can use them
	layer = timeline.s;
	frame = timeline.t;
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
 * Given a position, returns the highest object on the highest layer that occupies that position
 * @param {*} workX workspace X coordinate to query
 * @param {*} workY workspace Y coordinate to query
 * @returns [object, layer]
 */
function selectAt(workX, workY) {
	var layer;
	//look top to bottom
	var bin;
	for (var l=0; l<timeline.layerIDs.length; l++) {
		layer = timeline.frameAt(timeline.t, l);
		//figure out the bin to look for
		bin = layer.binAt(workX, workY);

		//only bother if there are splines in the bin
		if (bin.length > 0) {
			//test for intersection
			for (var j=0; j<bin.length; j++) {
				if (bin[j].intersectsPoint(workX, workY)) {
					return [bin[j], layer];
				}
			}
		}
	}
	return [];
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
	var cRef = φGet(color_selectedNode, "fill");
	var rChange = r.constructor.name == "Number";
	var gChange = g.constructor.name == "Number";
	var bChange = b.constructor.name == "Number";
	var aChange = a.constructor.name == "Number";
	if (color_objLast == undefined || color_objLast.r == undefined) {
		color_objLast = cBreakdownRGBA(cRef);
	}

	//don't bother if none of them are changing
	if (!(rChange || gChange || bChange || aChange)) {
		return;
	}
	if (rChange) {
		color_objLast.r = r;
	} else {
		r = color_objLast.r;
	}
	if (gChange) {
		color_objLast.g = g;
	} else {
		g = color_objLast.g;
	}
	if (bChange) {
		color_objLast.b = b;
	} else {
		b = color_objLast.b;
	}
	if (aChange) {
		color_objLast.a = a;
	} else {
		a = color_objLast.a;
	}

	//set the color
	var newColorStr = `rgba(${r}, ${g}, ${b}, ${a})`;
	φSet(color_selectedNode, {"fill": newColorStr});
	//special - color variables need to be updated
	switch (color_selectedNode) {
		case activeColor_stroke:
			color_stroke = newColorStr;
			break;
		case activeColor_fill:
			color_fill = newColorStr;
			break;
		case activeColor_stage:
			color_stage = newColorStr;
			φSet(workspace_background, {"fill": newColorStr});
			break;
		
	}

	//set the color picker
	setColorPickerRGBA(r, g, b, a);
}

function setColorHSVA(h, s, v, a) {
	if (color_objLast == undefined || color_objLast.h == undefined) {
		color_objLast = RGBtoHSV(cBreakdownRGBA(φGet(color_selectedNode, "fill")));
		//adjust for range issues
		color_objLast.s *= 100;
		color_objLast.v *= 100;
	}
	
	var hChange = h.constructor.name == "Number";
	var sChange = s.constructor.name == "Number";
	var vChange = v.constructor.name == "Number";
	var aChange = a.constructor.name == "Number";
	if (!(hChange || sChange || vChange || aChange)) {
		return;
	}
	if (hChange) {
		color_objLast.h = h;
	} else {
		h = color_objLast.h;
	}
	if (sChange) {
		color_objLast.s = s;
	} else {
		s = color_objLast.s;
	}
	if (vChange) {
		color_objLast.v = v;
	} else {
		v = color_objLast.v;
	}
	if (aChange) {
		color_objLast.a = a;
	} else {
		a = color_objLast.a;
	}

	console.log(h, s, v, a);

	var newRGB = HSVtoRGB({h: h, s: s, v: v / 100, a: a});
	var newColorStr = `rgba(${newRGB.r}, ${newRGB.g}, ${newRGB.b}, ${newRGB.a})`;
	φSet(color_selectedNode, {"fill": newColorStr});
	switch (color_selectedNode) {
		case activeColor_stroke:
			color_stroke = newColorStr;
			break;
		case activeColor_fill:
			color_fill = newColorStr;
			break;
		case activeColor_stage:
			color_stage = newColorStr;
			φSet(workspace_background, {"fill": newColorStr});
			break;
	}

	setColorPickerHSVA(h, s, v, a);
}

function setColorPickerRGBA(r, g, b, a) {
	var wh = φGet(MASTER_picker, ['width', 'height']);
	//red + green circle pos
	φSet(picker_selectorAB, {
		'cx': g / 255 * wh[0],
		'cy': r / 255 * wh[1] * (10 / 11),
	});

	//blue indicator pos
	φSet(picker_selectorC, {
		'x': (b / 255 * wh[0]) - 2
	});

	//alpha indicator pos
	φSet(picker_selectorD, {
		'x': clamp((a * wh[0]) - 2, -2, wh[0] - 2),
	});

	//gradients
	φSet(gradientLR.children[0], {'stop-color': `rgba(0, 0, ${b}, ${a})`});
	φSet(gradientLR.children[1], {'stop-color': `rgba(0, 255, ${b}, ${a})`});
	φSet(gradientUD.children[0], {'stop-color': `rgba(0, 0, ${b}, ${a})`});
	φSet(gradientUD.children[1], {'stop-color': `rgba(255, 0, ${b}, ${a})`});
	φSet(gradientC.children[0], {'stop-color': `rgba(0, 0, 0, ${a})`});
	φSet(gradientC.children[1], {'stop-color': `rgba(0, 0, 255, ${a})`});
}

function setColorPickerHSVA(h, s, v, a) {
	var wh = φGet(MASTER_picker, ['width', 'height']);

	//saturation and value control circle pos
	φSet(picker_selectorAB, {
		'cx': s / 100 * wh[0],
		'cy': (100 - v) / 100 * wh[1] * (10 / 11),
	});

	//hue
	φSet(picker_selectorC, {
		'x': (h / 360 * wh[0]) - 2
	});

	//alpha
	φSet(picker_selectorD, {
		'x': clamp((a * wh[0]) - 2, -2, wh[0] - 2),
	});

	//gradients
	φSet(gradientLR.children[1], {'stop-color': `hsla(${h}, 100%, 50%, ${a})`});
}