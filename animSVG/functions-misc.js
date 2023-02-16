/*
for weird functions that aren't any of the other things but that I can't be justified in creating a collection name for


*/


//takes a frame object and randomizes the colors of all the paths on it
function randomizeColorsFor(frame) {
	var r = () => {return Math.floor(randomBounded(0, 256));}
	for (var d=0; d<frame.lines.children.length; d++) {
		φSet(frame.lines.children[d], {"stroke": `rgba(${r()}, ${r()}, ${r()}, 1)`});
	}
}

// //adds a function to the history deltas that, when called, will reverse a taken action
// function historyAdd(func) {

// }

// //adds a function to the inverse history deltas that, when called, will repeat an action
// function historyActionsAdd(func) {

// }

/**
 * Runs and records a reversable action that could be undone with undo()
 * @param {Function} actionFunc The action to take
 * @param {Function} inverseFunc The function that negates actionFunc
 */
function takeAction(actionFunc, inverseFunc) {
	//execute the action
	actionFunc();
	recordAction(actionFunc, inverseFunc);
}

/**
 * Records a reversable action that could be undone with undo()
 * @param {Function} actionFunc action function
 * @param {Function} inverseFunc inverse action function
 */
function recordAction(actionFunc, inverseFunc) {
	//first make sure the counter is at the end by removing anything past it
	if (editDeltaTracker < editDeltasPast.length) {
		editDeltasPast = editDeltasPast.slice(0, editDeltaTracker);
		editDeltasFuture = editDeltasFuture.slice(0, editDeltaTracker);
	}

	//add both the action and reverse action to the list
	editDeltasPast.push(inverseFunc);
	editDeltasFuture.push(actionFunc);

	//make sure the deltas list doesn't get too long
	if (editDeltasPast.length > editDeltasMax) {
		var removeCount = editDeltasPast.length - editDeltasMax;
		editDeltasPast.splice(0, removeCount);
		editDeltasFuture.splice(0, removeCount);
		editDeltaTracker -= removeCount;
	}

	//increment the counter
	editDeltaTracker += 1;
}

// function historyStep() {
// 	//create a new bin to put history functions in
// 	editInverseDeltas

// 	//get rid of the forward steps as they are now out of sync with history
// 	editDeltas = [];

// }

function undo() {
	//move the tracker back and perform an inverse action
	if (editDeltaTracker > 0) {
		editDeltaTracker -= 1;
		editDeltasPast[editDeltaTracker]();
	}
}

function redo() {
	//similar - move the tracker forward and perform the action
	if (editDeltaTracker < editDeltasFuture.length) {
		editDeltasFuture[editDeltaTracker]();
		editDeltaTracker += 1;
	}
}