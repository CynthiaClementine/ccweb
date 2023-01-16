/*
functions that can accomplish the same tasks as user input, but with the benefit of being callable functions



INDEX

*/



function fill(workspaceX, workspaceY) {

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

	var layerID = timeline.layerIDs[layerIndex];
	//first create the new layer object
	var arrRef = timeline.l[layerID];
	var oldObj = arrRef[frame];
	var newObj = (frameNode == undefined) ? layer_create(createUid()) : layer_copy(frameNode);
	var frameID = φGet(newObj, 'uid');

	document.getElementById(`layer_${layerID}`).appendChild(newObj);
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
	//don't do it if the frame is the first one
	if (frame == 0) {
		return;
	}

	layer = timeline.layerIDs[layer];
	var arrRef = timeline.l[layer];
	var readObj = arrRef[frame];
	var writeObj = arrRef[frame-1];
	var writeID = φGet(writeObj, 'uid');
	var theBin = document.getElementById(`layer_${layer}_group`);

	//find the next spot where a keyframe is, replacing the layers and timeline blocks along the way
	
	var nextKeyIndex = frame;
	while (arrRef[nextKeyIndex] == readObj) {
		φSet(theBin.children[`layer_${layer}_frame_${nextKeyIndex}`], {'href': `#MASTER_layer_${writeID}`});
		arrRef[nextKeyIndex] = writeObj;
		nextKeyIndex += 1;
	}

	//delete that frame from the workspace
	var layerObj = workspace_permanent.children[`layer_${layer}`];
	layerObj.removeChild(readObj);
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