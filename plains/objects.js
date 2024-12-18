

//abstract class for basic editor functionality
class EditableWorldObject {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.normal;
		this.faces = [];
		this.handles = [
			[render_crosshairSize, 0, 0],
			[0, render_crosshairSize, 0],
			[0, 0, render_crosshairSize]
		]
		this.handleSelected = -1;
	}

	construct() {

	}

	tick() {
		this.faces.forEach(f => {
			f.tick();
		});
	}

	beDrawn() {

	}

	move(changeXBy, changeYBy, changeZBy) {
		this.x += changeXBy;
		this.y += changeYBy;
		this.z += changeZBy;
		this.construct();
		if (editor_meshSelected != loading_world.meshes[0]) {
			editor_meshSelected.generateBinTree();
		} else {
			loading_world.generateBinTree();
		}
	}

	giveStringData() {
		return `ERROR: STRING DATA NOT DEFINED FOR OBJECT ${this.constructor.name}`;
	}
}

//abstract class for storing multiple arbitrary faces in an object
class CustomObject extends EditableWorldObject {
	constructor(x, y, z, faceData) {
		super(x, y, z);
	}
}


class Mesh extends EditableWorldObject {
	constructor(name) {
		super(undefined, undefined, undefined);
		this.faces = undefined;
		this.name = name;
		this.objects = [];
		this.tolerance = 11;
		this.binTree;
		this.minMaxs;
	}

	generateBinTree() {
		//when generating the binary tree, also generate bounds for self
		this.generatePosBounds();

		//actual tree part
		this.binTree = new TreeNode();
		this.binTree.parent = this;
	
		this.objects.forEach(r => {
			//if the objects have points (are a face), put them in directly. If not, put their component faces in
			if (r.points != undefined) {
				this.binTree.acceptFace(r);
			} else {
				r.faces.forEach(f => {
					this.binTree.acceptFace(f);
				});
			}
		});
	}

	generatePosBounds() {
		this.minMaxs = [[1e1001, -1e1001], [1e1001, -1e1001], [1e1001, -1e1001]];
		//loop through all objects
		this.objects.forEach(r => {
			//face / component distinction
			if (r.points != undefined) {
				r.points.forEach(p => {
					this.generatePosBoundsPoint(p);
				});
			} else {
				r.faces.forEach(f => {
					f.points.forEach(p => {
						this.generatePosBoundsPoint(p);
					});
				});
			}
		});

		//add tolerance to pos bounds in either direction
		this.minMaxs[0][0] -= this.tolerance;
		this.minMaxs[0][1] += this.tolerance;
		this.minMaxs[1][0] -= this.tolerance;
		this.minMaxs[1][1] += this.tolerance;
		this.minMaxs[2][0] -= this.tolerance;
		this.minMaxs[2][1] += this.tolerance;

		//get coordsinates from mins + maxes
		this.x = (this.minMaxs[0][0] + this.minMaxs[0][1]) / 2;
		this.y = (this.minMaxs[1][0] + this.minMaxs[1][1]) / 2;
		this.z = (this.minMaxs[2][0] + this.minMaxs[2][1]) / 2;
	}

	generatePosBoundsPoint(point) {
		this.minMaxs[0][0] = Math.min(point[0], this.minMaxs[0][0]);
		this.minMaxs[1][0] = Math.min(point[1], this.minMaxs[1][0]);
		this.minMaxs[2][0] = Math.min(point[2], this.minMaxs[2][0]);

		this.minMaxs[0][1] = Math.max(point[0], this.minMaxs[0][1]);
		this.minMaxs[1][1] = Math.max(point[1], this.minMaxs[1][1]);
		this.minMaxs[2][1] = Math.max(point[2], this.minMaxs[2][1]);
	}

	giveStringData() {
		var output = `MESH~${this.name}\n`;
		this.objects.forEach(b => {
			output += b.giveStringData() + "\n";
		});
		return output;
	}

	//returns whether the point is inside this mesh or not
	contains(x, y, z) {
		return (
			(x > this.minMaxs[0][0] && x < this.minMaxs[0][1]) && 
			(y > this.minMaxs[1][0] && y < this.minMaxs[1][1]) && 
			(z > this.minMaxs[2][0] && z < this.minMaxs[2][1]));
	}

	move(changeXBy, changeYBy, changeZBy) {
		this.x += changeXBy;
		this.y += changeYBy;
		this.z += changeZBy;
		//reconstruct all objects in mesh
		this.objects.forEach(h => {
			h.x += changeXBy;
			h.y += changeYBy;
			h.z += changeZBy;

			if (h.points != undefined) {
				h.points.forEach(p => {
					p[0] += changeXBy;
					p[1] += changeYBy;
					p[2] += changeZBy;
				});
			} else {
				h.construct();
			}
		});
	}

	tick() {
		//only tick objects if player is in bounds
		var ref = this.minMaxs;
		if ((player.x > ref[0][0] && player.x < ref[0][1]) && (player.y > ref[1][0] && player.y < ref[1][1]) && (player.z > ref[2][0] && player.z < ref[2][1])) {
			this.objects.forEach(o => {
				o.tick();
			});
		}
	}
}


class TreeNode {
	constructor(contains) {
		this.contains = contains;
		//"inside" means in front - the same direction the normal points
		this.inObj = undefined;
		this.outObj = undefined;
	}

	//passes object to a spot below the self
	acceptFace(object) {
		if (this.contains == undefined) {
			console.log('case caught');
			this.contains = object;
			return;
		}
		var ref = this.contains;
		var outputs = object.clipAtPlane([ref.x, ref.y, ref.z], ref.normal);

		//if a below clipped output exists, push to below
		if (outputs[0] != undefined) {
			if (this.inObj == undefined) {
				this.inObj = new TreeNode(outputs[0]);
			} else {
				//if there is something in the below bucket, make sure that the output is valid before making it the below bucket's problem
				this.inObj.acceptFace(outputs[0]);
			}
		}

		if (outputs[1] != undefined) {
			if (this.outObj == undefined) {
				this.outObj = new TreeNode(outputs[1]);
			} else {
				this.outObj.acceptFace(outputs[1]);
			}
		}
	}

	//passes object down the tree, but with no clipping, just inserts the node into the suitable bin
	acceptNode(node) {
		//assumes tree is already built, except for final bins
		var ref = node.contains;
		var zPos = spaceToRelative([ref.x, ref.y, ref.z], [this.contains.x, this.contains.y, this.contains.z], this.contains.normal)[2];
		

		//positive (in self)
		if (zPos > 0) {
			//create blob or push to blob's bin
			if (this.inObj == undefined) {
				this.inObj = new TreeBlob(node);
			} else {
				this.inObj.acceptNode(node);
			}
		} else {
			//negative (out of self)
			if (this.outObj == undefined) {
				this.outObj = new TreeBlob(node);
			} else {
				this.outObj.acceptNode(node);
			}
		}
	}

	isBackwards() {
		//getting the dot product of angles between self normal and player normal
		var v1 = polToCart(this.contains.normal[0], this.contains.normal[1], 1);
		var v2 = [player.x - this.contains.x, player.y - this.contains.y, player.z - this.contains.z];
		return ((v1[0] * v2[0]) + (v1[1] * v2[1]) + (v1[2] * v2[2])) <= 0;
	}

	//calculates whether a point is inside the partition
	isInside(point) {
		var v1 = polToCart(this.contains.normal[0], this.contains.normal[1], 1);
		var v2 = [point[0] - this.contains.x, point[1] - this.contains.y, point[2] - this.contains.z];
		return ((v1[0] * v2[0]) + (v1[1] * v2[1]) + (v1[2] * v2[2])) <= 0;

	}

	drawPartition() {
		//use containment normal to get points, then draw those points transparently
		var partDist = 200;
		var norm = this.contains.normal;
		var pts = [[partDist, partDist, 0], [partDist, -partDist, 0], [-partDist, -partDist, 0], [-partDist, partDist, 0]];
		pts = pts.map(a => spaceToRelative(a, [this.contains.x, this.contains.y, this.contains.z], norm));

		var alphaStore = ctx.globalAlpha;
		ctx.globalAlpha = 0.1;
		drawWorldPoly(pts, color_partition);
		ctx.globalAlpha = alphaStore;
		
	}

	traverse(ticking) {
		//decide traversal order
		var toggleOrder = this.isBackwards();

		//back
		if (toggleOrder) {
			if (this.inObj != undefined) {
				this.inObj.traverse(ticking);
			}
		} else {
			if (this.outObj != undefined) {
				this.outObj.traverse(ticking);
			}
		}

		//center
		if (ticking) {
			this.contains.tick();
		} else {
			if (render_drawPartitions) {
				this.drawPartition();
			}
			this.contains.beDrawn();
		}

		//front
		if (toggleOrder) {
			if (this.outObj != undefined) {
				this.outObj.traverse(ticking);
			}
		} else {
			if (this.inObj != undefined) {
				this.inObj.traverse(ticking);
			}
		}
	}
}

//like a treenode, but doesn't have children. Instead, any objects that go in will be grouped by distance to the camera
class TreeBlob {
	constructor(contains) {
		//this array should contain only binary trees containing meshes or entities
		this.contains = [contains];
	}

	acceptFace(faceObj) {
		this.contains.push(faceObj);
	}

	acceptNode(object) {
		this.contains.push(object);
	}

	acceptEntity(entity) {
		//if the entity fits into any of the meshes, place it there
		for (var g=0; g<this.contains.length; g++) {
			//make sure it's a mesh
			if (this.contains[g].minMaxs != undefined) {
				if (this.contains[g].contains(entity)) {
					this.contains[g].acceptEntity(entity);
					return;
				}
			}
		}

		//if it doesn't just place it in contains arr
		this.contains.push(entity);
		//give entity a copy of its location
		entity.inList = this.contains;
	}

	traverse(ticking) {
		if (ticking) {
			this.contains.forEach(c => {
				c.traverse(true);
			});
		} else {
			//get distance to all objects
			this.contains.forEach(c => {
				c.parent.playerDist = Math.hypot(c.parent.x - player.x, c.parent.y - player.y, c.parent.z - player.z);
			});
			//order based on distance
			//TODO: change this sort to be custom, rather than the built-in javascript sort. Also test if my custom sorting algorithm is faster or if I'm wasting my time
			this.contains.sort(function (a, b) {
				return b.parent.playerDist - a.parent.playerDist;
			});

			this.contains.forEach(c => {
				c.traverse(false);
			});
		}
	}
}

class World {
	constructor(worldID, bgColor) {
		this.id = worldID;
		this.bg = bgColor;
		this.meshes = [];
		this.entities = [];
		this.binTree;
	}

	addFormally(object) {
		editor_meshSelected.objects.push(object);
		this.generateBinTree();
	}

	addEntity(entity) {
		//put entity through the first binary tree

		//after its position
	}

	generateBinTree() {
		//step 1: generate all mesh trees
		this.meshes.forEach(m => {
			m.generateBinTree();
		});

		//step 2: steal first mesh's tree
		this.binTree = this.meshes[0].binTree;

		//step 3: put other meshes into the tree
		for (var m=1; m<this.meshes.length; m++) {
			this.binTree.acceptNode(this.meshes[m].binTree);
		}

		//step 4: place all entities
	}

	giveStringData() {
		var output = `\n\nWORLD~${this.id}~${this.bg}\n`;
		this.meshes.forEach(v => {
			output += v.giveStringData() + "\n";
		});
		return output;
	}

	exist() {
		this.tick();
		this.beDrawn();
	}

	tick() {
		player.tick();
		this.meshes.forEach(o => {
			o.tick();
		});
		player.fixPosBuffer();
	}

	beDrawn() {
		this.binTree.traverse(false);
	}
}