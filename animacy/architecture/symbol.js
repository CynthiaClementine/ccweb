

//
//Symbols have a timeline and such.
class ASymbol {
	/**
	 * a symbol is a document. Everything goes inside a symbol. Symbols have their own workspace and timeline.
	 * Upon creating a symbol, it is automatically loaded into the symbol table. 
	 * @param {String} name the name of the symbol.
	 * @param {String|undefined} uidOverride you can put in a custom uid, if necessary
	 */
	constructor(name, uidOverride) {
		this.name = name;
		this.uid = uidOverride ?? createUID();
		this.workspace = new Workspace(this.uid);
		this.timeline = new Timeline(this.uid);
		//this is its own function so I can reference `this.`
		this.putInTable();
	}

	putInTable() {
		symbolTable[this.uid] = this;
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
	var symbolPrev = symbolCurrent;
	if (symbolPrev) {
		var [ow, ot] = [symbolPrev.workspace, symbolPrev.timeline];
	}


	//load the new symbol
	symbolCurrent = symbolID ? symbolTable[symbolID] : new ASymbol();
	if (!symbolCurrent) {
		console.error(`there is no current symbol! (trying to load symbol with ID "${symbolID}")`);
		return;
	}
	var [nw, nt] = [symbolCurrent.workspace, symbolCurrent.timeline];

	//load the timeline - it would be kind of a lot to store all the timeline block data, so we reconstruct it from the timeline object



	//load the workspace
	if (symbolPrev) {
	}

	console.log(symbolCurrent, symbolCurrent.workspace, workspace_permanent);
	workspace_permanent.replaceWith(nw.perm);
	workspace_permanent = nw.perm;
	workspace_temporary.replaceWith(nw.temp);
	workspace_temporary = nw.temp;
	workspace_background.replaceWith(nw.bg);
	workspace_background = nw.bg;
	console.log(workspace_permanent, workspace_temporary, workspace_background);

	φSet(workspace_border, {
		width: nw.width,
		height: nw.height,
	});

	return symbolCurrent.uid;
}