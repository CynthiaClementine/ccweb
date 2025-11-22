

//a symbol is a document. Everything goes inside a symbol.
//Symbols have a timeline and such.
class ASymbol {
	constructor(uid) {
		this.uid = uid;
		this.workspace = new Workspace();
		this.timeline = new Timeline();
	}

	/**
	 * Draws a symbol, starting at the top-left corner and with custom transform.
	 * @param {Number} startX the x position of the top-left corner
	 * @param {Number} startY the y position of the top-left corner
	 * @param {Number[]} xHat the 2d vector corresponding to 1 x unit of the symbol
	 * @param {Number[]} yHat the 2d vector corresponding to 1 y unit of the symol
	 */
	draw(startX, startY, xHat, yHat) {

	}
}

class SymbolWrapper {
	/**
	 * An object that holds a symbol, and can be placed in a keyframe.
	 * @param {string} src the timeline object ID to pull from
	 * @param {int} frameStart the timeline object ID to pull from
	 * @param {`static`|`traverse`|`loop`|`bounce`} behavior how the symbol should translate timeline change in the parent to timeline change in the symbol.
	 * 	Static - never change from the starting frame
	 * 	Traverse - play the src timeline once, then stop
	 * 	Loop - wrap around to start once finished
	 * 	Bounce - reverse and head to frame 0 after hitting the end
	 */
	constructor(src, frameStart, behavior) {
		this.id = src;
		this.frameStart = frameStart;
		this.behavior = behavior;
	}

	/**
	 * returns the symbol from self's ID
	 */
	sym() {
		return symbolTable[this.id];
	}
}

/**
 * Loads a specific symbol into the main workspace
 * 
 * @param {String|undefined} symbolID the string ID of the symbol to load. If undefined, this creates a new symbol.
 * @returns {String} the ID of the loaded symbol.
 */
function loadSymbol(symbolID) {
	//first: unload the last symbol
	symbolCurrent.workspace.innerHTML = workspace_permanent.innerHTML;
	workspace_permanent.innerHTML = ``;

	//load the new symbol
	if (!symbolID) {
		symbolID = createUid();
		symbolTable[symbolID] = new ASymbol();
	}
	symbolCurrent = symbolTable[symbolID];
	loadTimeline(symbolCurrent.timeline);
	loadWorkspace(symbolCurrent.workspace);

	return symbolID;
}