//
class Workspace {
	/**
	 * a Workspace is the structure that stores all the drawing data. It is organized into permanent (perm) and temporary (temp) sets. 
	 * @param {String} symbolUID the UID of the symbol this workspace belongs to
	 */
	constructor(symbolUID) {
		this.symbolUID = symbolUID;
		this.perm = φCreate('g');
		this.temp = φCreate('g');
		//all workspaces have a background! But the background only is shown if you're inside the workspace
		this.bg = φCreate('rect');
		this.establishProperties();
	}

	establishProperties() {
		var id = createUID();
		this.temp.id = `workspace_temporary~${this.symbolUID}`;
		this.perm.id = `workspace_permanent~${this.symbolUID}`;
		φSet(this.bg, {
			"id": `workspace_background~${this.symbolUID}`,
			"width": 1000,
			"height": 600
		});
	}

	//a bunch of functions that help modify data
	insertBefore() {
		
	}

	/**
	 * 
	 * @param {Number|undefined} width the new width of the workspace 
	 * @param {Number|undefined} height the new height of the workspace
	 */
	setDims(width, height) {
		if (width) {
			φSet(this.bg, {width: width});
		}
		if (height) {
			φSet(this.bg, {height: height});
		}
	}
}