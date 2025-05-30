//freePolys have to go here because of inheritance rules, soiry
class FreePoly {
	constructor(points, color) {
		this.x;
		this.y;
		this.z;
		this.points = points;
		this.normal;
		this.size;
		this.color = color;
		this.cameraDist = render_maxColorDistance + 1;
		this.playerDist = render_maxColorDistance + 1;

		//collision tolerance
		this.tolerance = player.r * 0.7;
	}

	calculateNormal() {
		//first get average point, that's self's xyz
		[this.x, this.y, this.z] = avgArray(this.points);
		//determine size based on xyz + points
		this.size = Math.sqrt((this.x - this.points[0][0]) ** 2 + (this.y - this.points[0][1]) ** 2 + (this.z - this.points[0][2]) ** 2);

		//get cross product of first two points, that's the normal
		//every shape has to have at least 3 points, so 
		//comparing points 2 and 3 to point 1 for normal getting
		var v1 = [this.points[1][0] - this.points[0][0], this.points[1][1] - this.points[0][1], this.points[1][2] - this.points[0][2]];
		var v2 = [this.points[2][0] - this.points[0][0], this.points[2][1] - this.points[0][1], this.points[2][2] - this.points[0][2]];
		
		var cross = cartToPol((v1[1] * v2[2]) - (v1[2] * v2[1]), (v1[2] * v2[0]) - (v1[0] * v2[2]), (v1[0] * v2[1]) - (v1[1] * v2[0]));
		this.normal = [cross[0], cross[1]];
	}

	collideWithEntity(entity) {
		//transform player to self's coordinates
		var entityCoords = spaceToRelativeRotless([entity.x, entity.y, entity.z], [this.x, this.y, this.z], this.normal);
		
		//sizeLong can be filled out by child classes for extra control over stretching
		if (this.longMult != undefined) {
			entityCoords[0] /= this.longMult;
		}

		//if the player is colliding, do collision stuffies
		if (Math.abs(entityCoords[2]) < this.tolerance && Math.abs(entityCoords[0]) < (this.size / 2) + this.tolerance && Math.abs(entityCoords[1]) < (this.size / 2) + this.tolerance) {
			//push player outside of self
			entityCoords[2] = this.tolerance * boolToSigned(entityCoords[2] > 0);
			//special collision effects inside the tunnel
			if (entityCoords[2] > 0) {
				this.doCollisionEffects(entity);
			}

			//transforming back to regular coordinates
			if (this.longMult != undefined) {
				entityCoords[0] *= this.longMult;
			}
			[entity.x, entity.y, entity.z] = relativeToSpace(entityCoords, [this.x, this.y, this.z], this.normal);
		}
	}

	doCollisionEffects(entity) {
		//filled out in tile class
	}

	doComplexLighting() {
		this.playerDist = getDistance_LightSource(this);
	}

	doRotationEffects(entity) {
		//filled out in tile class
	}

	//clips self and returns an array with two polygons, clipped at the input plane.
	//always returns [polygon inside plane, polgyon outside plane]
	//if self polygon does not intersect the plane, then one of the two return values will be undefined.
	clipAtPlane(planePoint, planeNormal) {
		var inPart = undefined;
		var outPart = undefined;

		//getting points aligned to the plane
		var tempPoints = [];
		for (var j=0;j<this.points.length;j++) {
			tempPoints.push(spaceToRelativeRotless(this.points[j], planePoint, planeNormal));
		}

		//checking to see if clipping is necessary
		var sign = tempPoints[0][2] > 0;
		var clip = false;
		for (var y=1;y<tempPoints.length;y++) {
			//if the signs of the points match, don't clip them. However, if any polarity of a point is different from the first one, clip the polygon
			if (sign != tempPoints[y][2] > 0) {
				clip = true;
				y = tempPoints.length;
			}
		}
		if (!clip) {
			//if clipping is not necessary, then just return self
			return (tempPoints[0][2] > 0) ? [this, undefined] : [undefined, this];
		}

		//get copy of self
		var outPoints = [];
		for (var a=0;a<tempPoints.length;a++) {
			outPoints[a] = tempPoints[a];
		}

		//clip
		tempPoints = clipToZ0(tempPoints, 0, false);

		//transforming points to world coordinates
		for (var q=0;q<tempPoints.length;q++) {
			tempPoints[q] = relativeToSpace(tempPoints[q], planePoint, planeNormal);
		}

		outPoints = clipToZ0(outPoints, 0, true);
		for (var q=0;q<outPoints.length;q++) {
			outPoints[q] = relativeToSpace(outPoints[q], planePoint, planeNormal);
		}

		//turning point array into objects that can be put into nodes
		inPart = new FreePoly(tempPoints, this.color);
		inPart.calculateNormal();
		outPart = new FreePoly(outPoints, this.color);
		outPart.calculateNormal();
		return [inPart, outPart];
	}

	tick() {
		this.getCameraDist();
	}

	getCameraDist() {
		this.cameraDist = getDistance(this, world_camera);
		this.playerDist = getDistance(this, player);
	}

	getColor() {
		return `hsl(${this.color.h}, ${this.color.s}%, ${linterp(this.color.v * 67.5, 0, clamp(this.playerDist / render_maxColorDistance, 0.1, 1))}%)`;
	}

	beDrawn() {
		drawWorldPoly(this.points, this.getColor());
		if (editor_active && data_persistent.settings.enableOutlines) {
			ctx.lineWidth = 1;
			ctx.strokeStyle = color_editor_cursor;
			ctx.stroke();

			var offset = polToCart(this.normal[0], this.normal[1], render_crosshairSize);
			drawWorldLine([this.x, this.y, this.z], [this.x + offset[0], this.y + offset[1], this.z + offset[2]]);
		}
	}
}

//cut tiles are expected to retain the color of their parent. They're only used for drawing, not collision.
class FreePoly_Cut extends FreePoly {
	constructor(points, colorString) {
		super(points);
		this.colorStr = colorString;
	}

	collideWithEntity(entity) {
		console.log('why?');
	}

	doCollisionEffects(entity) {
		console.log('do not!');
	}

	doRotationEffects(entity) {
		console.log('stop.');
	}

	getColor() {
		return this.colorStr;
	}
}

class FreePoly_Vertical extends FreePoly {
	constructor(points, color) {
		super(points, color);
		this.calculateNormal();
		this.calculateCollisionPoints();
	}

	calculateCollisionPoints() {
		this.collisionPoints = [];
		this.points.forEach(p => {
			var coordinate = spaceToRelativeRotless(p, [this.x, this.y, this.z], this.normal);
			this.collisionPoints.push([coordinate[0] * 1.05, coordinate[1] * 1.05]);
		});
	}

	collideWithEntity(entity) {
		//vertical freePolys are expected to collide with the player and have irregular shapes. Because of this, 2d polygon checking is useful.
		var entityCoords = spaceToRelativeRotless([entity.x, entity.y, entity.z], [this.x, this.y, this.z], this.normal);

		if (Math.abs(entityCoords[2]) < this.tolerance && inPoly(entityCoords, this.collisionPoints)) {
			if (entityCoords[2] < 0) {
				entityCoords[2] = -1 * this.tolerance;
			} else {
				entityCoords[2] = this.tolerance;
			}
			this.doCollisionEffects(entity);
			[entity.x, entity.y, entity.z] = relativeToSpace(entityCoords, [this.x, this.y, this.z], this.normal);
		}
	}

	doCollisionEffects(entity) {
		entity.dz = 0;
		entity.onIce = false;
	}
}







class Tile extends FreePoly {
	constructor(x, y, z, size, normal, parent, color) {
		super([[0, 0, 0], [0, 0, 1], [0, 1, 1]], color);

		this.x = x;
		this.y = y;
		this.z = z;
		this.size = size;

		this.parent = parent;
		this.points;
		this.normal = normal;
		this.cameraRot = this.normal[1];
		this.dir_right;
		this.dir_down;

		this.calculatePointsAndNormal();
	}

	calculatePointsAndNormal() {
		this.points = [[-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1]];

		this.points.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 1);
		});

		this.dir_right = [this.normal[0], this.normal[1] + (Math.PI / 2)];
		this.dir_down = this.normal;
	}

	doCollisionEffects(entity) {
		//r o t a t e   P D F
		if (!haltRotation && (entity.dir_down[0] != this.dir_down[0] || entity.dir_down[1] != this.dir_down[1])) {
			this.doRotationEffects(entity);
		}
		entity.onGround = physics_graceTime;
		entity.onIce = false;
	}

	doRotationEffects(entity) {
		var cameraRotAttempt;
		//if player is jumping, keep their relative velocity
		//relative velocity is calculated by looking at the dot product, because it's tells how much the vectors align
		var cart1 = polToCart(this.dir_down[0], this.dir_down[1], 1);
		var cart2 = polToCart(entity.dir_down[0], entity.dir_down[1], 1);
		var newDy = (cart1[0] * cart2[0] + cart1[1] * cart2[1] + cart1[2] * cart2[2]) * entity.dy;
		entity.dy = ((newDy > 0.5) * newDy) || -1;

		entity.dir_front = [(Math.PI * 2) - this.parent.theta + (Math.PI * player.backwards), 0];
		entity.dir_side = [this.dir_right[0], this.dir_right[1] + (Math.PI * player.backwards)];
		entity.dir_down = this.dir_down;
		haltRotation = true;

		//increase dx a little, so they get less stuck
		entity.dx += 0.1 * Math.sign(entity.dx);

		//rotation is flipped a bit if player is going backwards
		cameraRotAttempt = ((Math.PI * (1.5 + player.backwards)) + (boolToSigned(!player.backwards) * this.dir_down[1])) % (Math.PI * 2);

		world_camera.targetPhi = 0;
		world_camera.targetTheta = entity.dir_front[0] % (Math.PI * 2);
		//if the difference is too great, fix that
		if (Math.abs(world_camera.theta - world_camera.targetTheta) > Math.PI) {
			world_camera.theta += Math.PI * 2 * boolToSigned(world_camera.theta < Math.PI);
		}

		if (!editor_active && world_camera.targetRot != cameraRotAttempt) {
			world_camera.targetRot = cameraRotAttempt;

			//if the rotation difference is too great, fix that
			if (Math.abs(world_camera.rot - world_camera.targetRot) > Math.PI) {
				world_camera.rot += Math.PI * 2 * boolToSigned(world_camera.rot <= Math.PI);
			}
		}
	}

	getColor() {
		return `hsl(${this.color.h}, ${this.color.s}%, ${linterp((this.color.v * 45) * (this.parent.power + 0.5), 0, clamp((this.playerDist / render_maxColorDistance) * (1 / (this.parent.power + 0.001)), 0.1, 1))}%)`;
	}
}

//I just gave up on the tile system with this one and made it its own object
class Tile_Box extends Tile {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent, RGBtoHSV(color_box));
	}

	calculatePointsAndNormal() {
		var points = [	[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1],
						[-1, -1, -1], [-1, -1, 1], [1, -1, 1], [1, -1, -1],
						[-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1]];

		for (var p=0; p<points.length; p++) {
			points[p] = transformPoint(points[p], [this.x, this.y, this.z], this.normal, this.size + 0.5);
		}

		/* 
		Points: birds eye view

		forwards in tunnel

		2       3
		 6     7
		 5     4
		1       0

		backwards in tunnel


		and then 8, 9, 10, 11 look like this, in between the other sets

		10   11

		9    8
		*/
		
		this.points = points;
		this.polys = {
			"uu": new FreePoly([points[4], points[5], points[6], points[7]], this.color),
			"ub": new FreePoly([points[4], points[5], points[9], points[8]], this.color),
			"uf": new FreePoly([points[7], points[6], points[10], points[11]], this.color),
			"ul": new FreePoly([points[5], points[6], points[10], points[9]], this.color),
			"ur": new FreePoly([points[4], points[7], points[11], points[8]], this.color),

			"dd": new FreePoly([points[0], points[1], points[2], points[3]], this.color),
			"db": new FreePoly([points[0], points[1], points[9], points[8]], this.color),
			"df": new FreePoly([points[3], points[2], points[10], points[11]], this.color),
			"dl": new FreePoly([points[1], points[2], points[10], points[9]], this.color),
			"dr": new FreePoly([points[0], points[3], points[11], points[8]], this.color),
		}
		var h = this.polys;

		//I am aware that putting the front and back faces first for insertion may create more clipping planes. However, the player can't be clipped, 
		//and therefore I don't want a lot of planes to intersect them. Putting the planes that the player will generally be perpendicular to first
		//means that the player won't be clipped through a plane as often, causing errors less often.
		this.drawPolysIn = [h["df"], h["db"], h["dl"], h["dr"], h["dd"]];
		this.drawPolysIn.forEach(a => {a.calculateNormal();});
		this.drawPolysOut = [h["uf"], h["ub"], h["ul"], h["ur"], h["uu"]];
		this.drawPolysOut.forEach(a => {a.calculateNormal();});
		
		this.dir_right = [this.normal[0], this.normal[1] + (Math.PI / 2)];
		this.dir_down = this.normal;

		//all boxes have extra tiles, for changing rotation
		var fset = polToCart(this.dir_right[0], this.dir_right[1], this.size / 2);
		this.leftTile = new Tile(this.x - fset[0], this.y - fset[1], this.z - fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 1.5)) % (Math.PI * 2)], this.parent, this.color);
		this.rightTile = new Tile(this.x + fset[0], this.y + fset[1], this.z + fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 0.5)) % (Math.PI * 2)], this.parent, this.color);
	}
	

	beDrawn() {
		//when far away
		if ((this.size / this.cameraDist) * world_camera.scale < render_minTileSize * 0.5 || this.cameraDist > render_maxColorDistance * 2) {
			//draw a simple circle
			if (!isClipped([this.x, this.y, this.z])) {
				var pos = spaceToCamera([this.x, this.y, this.z]);
				var pos2 = cameraToScreen([pos[0], pos[1] + this.size * 0.5, pos[2]]);
				pos = cameraToScreen(pos);
				drawCircle(this.getColor(), pos[0], pos[1], getDistance2d(pos2, pos));
			}
			return;
		}

		//getting camera position relative to self for proper ordering
		var relCPos = spaceToRelativeRotless([world_camera.x, world_camera.y, world_camera.z], [this.x, this.y, this.z], this.normal);
		var color = this.getColor();
		var r = this.size / 2;
		
		//top / bottom switch
		if (relCPos[2] > -r) {
			drawWorldPoly([this.points[0], this.points[1], this.points[2], this.points[3]], color);
		} 
		if (relCPos[2] < r) {
			drawWorldPoly([this.points[4], this.points[5], this.points[6], this.points[7]], color);
		}

		//forward / back switch
		if (relCPos[0] > -r) {
			drawWorldPoly([this.points[3], this.points[2], this.points[6], this.points[7]], color);
		} 
		if (relCPos[0] < r) {
			drawWorldPoly([this.points[0], this.points[1], this.points[5], this.points[4]], color);
		}

		//left / right switch
		if (relCPos[1] > -r) {
			this.leftTile.cameraDist = this.cameraDist;
			this.rightTile.playerDist = this.playerDist;
			this.rightTile.beDrawn();
		} 
		if (relCPos[1] < r) {
			this.leftTile.cameraDist = this.cameraDist;
			this.leftTile.playerDist = this.playerDist;
			this.leftTile.beDrawn();
		}
	}

	collideWithEntity(entity) {
		//only collide if within a certain distance
		if (getDistance(this, entity) < this.size * 2.5) {
			//transforming player coordinates to self
			var entityCoords = spaceToRelativeRotless([entity.x, entity.y, entity.z], [this.x, this.y, this.z], this.normal);

			//second check for collision, only collide if all 3 coordinates are under threshold
			if (Math.abs(entityCoords[0]) - this.tolerance < this.size / 2 && Math.abs(entityCoords[1]) - this.tolerance < this.size / 2 && Math.abs(entityCoords[2]) - this.tolerance < this.size / 2) {
				var distX = Math.abs(entityCoords[0]) - entity.r;
				var distY = Math.abs(entityCoords[1]);
				var distZ = Math.abs(entityCoords[2]); 
				//x = forwards / back
				//y = left / right
				//z = up / down


				//forwards / backwards collision takes priority
				if (distX > distY && distX > distZ) {
					this.collide_forwardsBackwards(entity, entityCoords);
				} else {
					var st = stripTileCoordinates(this.x, this.y, this.z, this.parent);
					st[1] = Math.floor(st[1] - 0.5);
					var totalLen = this.parent.sides * this.parent.tilesPerSide;
					//check to make sure colliding with the sides is even allowed - if there's another normal box there, the sides will be unreachable
					var sideCheck = boolToSigned(entityCoords[1] > 0);
					var sideValue = this.parent.data[modulate(st[0] + sideCheck, totalLen)][st[1]];
					var sideReachable = !isRegularBox(sideValue);

					//which side of collision should take priority? That depends on how the player is falling.
					//try to keep the player on the SAME SIDE as they're currently on, no auto-rotating
					var betweenAngle = modularDifference(player.dir_down[1], this.dir_down[1], Math.PI * 2);
					switch (true) {
						case (!sideReachable && distX > distZ):
							//same check for forwards/backwards but without taking the sides into account
							this.collide_forwardsBackwards(entity, entityCoords);
							break;
						case (!sideReachable || (betweenAngle < Math.PI * 0.26 && entityCoords[2] + player.r > distY)):
							//player is on top face
							this.collide_upDown(entity, entityCoords);
							break;
						case (betweenAngle > Math.PI * 0.75 && -entityCoords[2] + player.r > distY):
							//player is on bottom face
							this.collide_upDown(entity, entityCoords);
							break;
						case (distY + player.r > distZ):
							//player has the sides
							this.collide_leftRight(entity, entityCoords);
							break;
						default:
							//if all else fails, try top/bottom, because it's better to put the player there then have them do wacky side shenanigans
							this.collide_upDown(entity, entityCoords);
							break;
					}
				}
			}

			//transform player coords back and assign to player
			[entity.x, entity.y, entity.z] = relativeToSpace(entityCoords, [this.x, this.y, this.z], [this.normal[0], this.normal[1], 0]);
		}
	}

	collide_forwardsBackwards(entity, entityCoords) {
		//if x is the greatest
		entity.dz = 0;
		entityCoords[0] = (0.5 * this.size + this.tolerance) * boolToSigned(entityCoords[0] > 0);
	}

	collide_upDown(entity, entityCoords) {
		//if z is the greatest
		var haltStore = haltRotation;
		haltRotation = true;
		this.doCollisionEffects(entity);
		haltRotation = haltStore;

		if (entityCoords[2] > 0) {
			entityCoords[2] =  0.5 * this.size + this.tolerance;
			if (Math.abs(entityCoords[2]) < this.size * 0.95 && !haltRotation && (entity.dir_down[0] != this.dir_down[0] || entity.dir_down[1] != this.dir_down[1])) {
				this.doRotationEffects(entity);
			}
		} else {
			entityCoords[2] = -0.5 * this.size - this.tolerance;
			//rotation effects for upside down
			this.doRotationEffects_Underside(entity);
			
		}
	}

	collide_leftRight(entity, entityCoords) {
		//if y is the greatest
		var haltStore = haltRotation;
		haltRotation = true;
		this.doCollisionEffects(entity);
		haltRotation = haltStore;
		//this solution is sort of hacky, but the box is already ridiculously laggy so I don't particularly care
		if (entityCoords[1] > 0) {
			if (Math.abs(entityCoords[1]) < this.size * 0.95 && !haltRotation && (entity.dir_down[0] != this.rightTile.dir_down[0] || entity.dir_down[1] != this.rightTile.dir_down[1])) {
				this.rightTile.doRotationEffects(entity);
			}
			entityCoords[1] = 0.5 * this.size + this.tolerance;
			return;
		} 
		if (Math.abs(entityCoords[1]) < this.size * 0.95 && !haltRotation && (entity.dir_down[0] != this.leftTile.dir_down[0] || entity.dir_down[1] != this.leftTile.dir_down[1])) {
			this.leftTile.doRotationEffects(entity);
		}
		entityCoords[1] = -0.5 * this.size - this.tolerance;
	}

	doComplexLighting() {
		super.doComplexLighting();
		[...this.drawPolysOut, ...this.drawPolysIn].forEach(p => {
			p.cameraDist = this.cameraDist;
			p.playerDist = this.playerDist;
		});
	}

	doRotationEffects_Underside(entity) {
		//same but with some variables swapped around for the opposite direction
		var cameraRotAttempt;
		entity.dy = Math.max(-1, Math.cos(modularDifference(entity.dir_down[1], this.dir_down[1] + Math.PI, Math.PI * 2)) * entity.dy);

		entity.dir_front = [(Math.PI * 2) - this.parent.theta + (Math.PI * player.backwards), 0];
		entity.dir_side = [this.dir_right[0], this.dir_right[1] + (Math.PI * !player.backwards)];
		entity.dir_down = [this.dir_down[0], this.dir_down[1] + Math.PI];
		haltRotation = true;

		if (player.backwards) {
			cameraRotAttempt = ((Math.PI * 3.5) - this.dir_down[1]) % (Math.PI * 2);
		} else {
			cameraRotAttempt = (this.dir_down[1] + (Math.PI * 0.5)) % (Math.PI * 2);
		}

		world_camera.targetPhi = 0;
		world_camera.targetTheta = entity.dir_front[0] % (Math.PI * 2);
		//if the difference is too great, fix that
		if (Math.abs(world_camera.theta - world_camera.targetTheta) > Math.PI) {
			if (world_camera.theta > Math.PI) {
				world_camera.theta -= Math.PI * 2;
			} else {
				world_camera.theta += Math.PI * 2;
			}
		}

		if (!editor_active && world_camera.targetRot != cameraRotAttempt) {
			world_camera.targetRot = cameraRotAttempt;

			//if the rotation difference is too great, fix that
			if (Math.abs(world_camera.rot - world_camera.targetRot) > Math.PI) {
				world_camera.rot += Math.PI * 2 * boolToSigned(world_camera.rot <= Math.PI);
			}
		}
	}

	tick() {
		super.getCameraDist();

		//if camera distance is close enough and self needs to be rendered in the precise way
		if (this.cameraDist < render_maxColorDistance * 2 && data_persistent.settings.altRender) {
			this.drawPolysIn.forEach(p => {
				p.cameraDist = this.cameraDist;
				p.playerDist = this.playerDist;
			});
			this.drawPolysOut.forEach(p => {
				p.cameraDist = this.cameraDist;
				p.playerDist = this.playerDist;
			});
		}
	}
}

class Tile_Box_Ringed extends Tile_Box {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent);
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();

		var fset = polToCart(this.normal[0], this.normal[1] + (Math.PI * 1.5), this.size / 2);
		this.leftTile = new Tile_Ringed(this.x + fset[0], this.y + fset[1], this.z + fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 1.5)) % (Math.PI * 2)], this.parent, this.color);
		this.rightTile = new Tile_Ringed(this.x - fset[0], this.y - fset[1], this.z - fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 0.5)) % (Math.PI * 2)], this.parent, this.color);
	}

	doComplexLighting() {
		super.doComplexLighting();
		this.rightTile.doComplexLighting();
		this.leftTile.doComplexLighting();
	}

	tick() {
		super.tick();
		[this.rightTile, this.leftTile, this.rightTile, this.leftTile.ring, this.rightTile.ring].forEach(f => {
			f.cameraDist = this.cameraDist;
			f.playerDist = this.playerDist;
		});
	}
}

class Tile_Box_Spun extends Tile_Box {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, [normal[0], normal[1] + (Math.PI * 0.25)], parent);
		this.collisionMult = 1.414;
	}

	calculatePointsAndNormal() {
		/*
		similar map

		    2
		6        3
		     7

		    1
		5        0
		     4

		*/
		var len = 1 / Math.sqrt(2);
		var points = [	[-1, len, -len], [-1, len, len], [1, len, len], [1, len, -len],
						[-1, -len, -len], [-1, -len, len], [1, -len, len], [1, -len, -len]];

		for (var p=0; p<points.length; p++) {
			points[p] = transformPoint(points[p], [this.x, this.y, this.z], this.normal, this.size + 0.5);
		}
		
		this.points = points;
		this.polys = {
			"u": new FreePoly([points[0], points[1], points[2], points[3]], this.color),
			"l": new FreePoly([points[1], points[5], points[6], points[2]], this.color),
			"r": new FreePoly([points[0], points[4], points[7], points[3]], this.color),
			"d": new FreePoly([points[4], points[5], points[6], points[7]], this.color),

			"uf": new FreePoly([points[2], points[6], points[3]], this.color),
			"df": new FreePoly([points[6], points[3], points[7]], this.color),
			"ub": new FreePoly([points[5], points[1], points[0]], this.color),
			"db": new FreePoly([points[5], points[0], points[4]], this.color),
		}
		var h = this.polys;

		this.drawPolysIn = [h["uf"], h["ub"], h["u"], h["l"]];
		this.drawPolysIn.forEach(a => {a.calculateNormal();});
		this.drawPolysOut = [h["df"], h["db"], h["d"], h["r"]];
		this.drawPolysOut.forEach(a => {a.calculateNormal();});
		this.dir_right = [this.normal[0], this.normal[1] + (Math.PI / 2)];
		this.dir_down = this.normal;
		this.size -= player.r * 0.6;

		var fset = polToCart(this.dir_right[0], this.dir_right[1], this.size / 2);
		this.leftTile = new Tile(this.x - fset[0], this.y - fset[1], this.z - fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 1.5)) % (Math.PI * 2)], this.parent, this.color);
		this.leftTile.points = this.polys["l"].points;
		[this.leftTile.x, this.leftTile.y, this.leftTile.z] = [this.polys["l"].x, this.polys["l"].y, this.polys["l"].z];
		this.rightTile = new Tile(this.x + fset[0], this.y + fset[1], this.z + fset[2], this.size, [this.normal[0], (this.normal[1] + (Math.PI * 0.5)) % (Math.PI * 2)], this.parent, this.color);
		this.rightTile.points = this.polys["r"].points;
		[this.rightTile.x, this.rightTile.y, this.rightTile.z] = [this.polys["r"].x, this.polys["r"].y, this.polys["r"].z];
	}
}

class Tile_Bright extends Tile {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, color);
	}

	getColor() {
		return `hsl(${this.color.h}, ${this.color.s}%, ${linterp(75, 0, clamp((this.playerDist / render_maxColorDistance) * (this.playerDist / render_maxColorDistance), 0, 1))}%)`
	}
}

class Tile_Bright_Ringed extends Tile_Bright {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, color);
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		var ringOffset = polToCart(this.normal[0], this.normal[1], 2);
		this.ring = new Ring(this.x + ringOffset[0], this.y + ringOffset[1], this.z + ringOffset[2], this.normal[0], this.normal[1], render_ringSize);
	}

	doComplexLighting() {
		super.doComplexLighting();
		this.ring.playerDist = this.playerDist;
	}

	beDrawn() {
		super.beDrawn();
		if (spaceToRelativeRotless([world_camera.x, world_camera.y, world_camera.z], [this.x, this.y, this.z], this.normal)[2] > 0) {
			this.ring.beDrawn();
		}
	}

	tick() {
		super.tick();
		this.ring.tick();
	}
}

class Tile_Conveyor extends Tile {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent, RGBtoHSV(color_conveyor));
		this.secondaryColor = RGBtoHSV(color_conveyor_secondary);
		this.time = 0;
		this.conveyTime = 80;
	}

	doCollisionEffects(entity) {
		super.doCollisionEffects(entity);
		this.doSpeedEffects(entity);
	}

	doSpeedEffects(entity) {
		if (player.backwards) {
			if (entity.dz > entity.dMax * 0.4) {
				entity.dz -= physics_conveyorStrength * 3;
			}
		} else {
			if (entity.dz < entity.dMax * 2) {
				entity.dz += physics_conveyorStrength;
			}
		}
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		this.calculateTriPoints();
	}

	calculateTriPoints() {
		this.triPoints = [[-1 + (this.time * 2), 0, -1], [-1 + (this.time * 2), 0, 0], [-1, 0, -1 * this.time], [-1, 0, this.time], [-1 + (this.time * 2), 0, 0], 
					[-1 + (this.time * 2), 0, 1], [1, 0, this.time], [1, 0, -1 * this.time]];
		this.triPoints.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 1);
		});
	}

	getSecondaryColor() {
		return `hsl(${this.secondaryColor.h}, ${this.secondaryColor.s}%, ${linterp(60, 0, clamp((this.playerDist / render_maxColorDistance) * (1 / (this.parent.power + 0.001)), 0.1, 1))}%)`;
	}

	tick() {
		super.tick();
		this.time = (world_time / this.conveyTime) % 1;
	}
	
	beDrawn() {
		//calculate triangle points
		this.calculateTriPoints();

		drawWorldPoly(this.points, this.getColor());
		drawWorldPoly(this.triPoints, this.getSecondaryColor());
		if (editor_active) {
			//draw self's normal as well
			var cXYZ = polToCart(this.normal[0], this.normal[1], 5);
			cXYZ = [this.x + cXYZ[0], this.y + cXYZ[1], this.z + cXYZ[2]];
			ctx.beginPath();
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#AFF";
			drawWorldLine([this.x, this.y, this.z], cXYZ);
		}
	}
}

class Tile_Conveyor_Slow extends Tile_Conveyor {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent);
	}

	calculateTriPoints() {
		this.triPoints = [[1 - (this.time * 2), 0, -1], [1 - (this.time * 2), 0, 0], [1, 0, -1 * this.time], [1, 0, this.time], [1 - (this.time * 2), 0, 0], 
					[1 - (this.time * 2), 0, 1], [-1, 0, this.time], [-1, 0, -1 * this.time]];
		this.triPoints.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 1);
		});
	}

	doSpeedEffects(entity) {
		if (player.backwards) {
			if (entity.dz < entity.dMax * 2) {
				entity.dz += physics_conveyorStrength;
			}
		} else {
			if (entity.dz > entity.dMax * 0.4) {
				entity.dz -= physics_conveyorStrength * 3;
			}
		}
	}
}

class Tile_Conveyor_Left extends Tile_Conveyor {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent);
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		
		//rotate by 18.5° the other way, 2pi / 19.459 is 18.5° trust me
		this.dir_down = [this.normal[0], this.normal[1] - ((Math.PI * 2) / 19.459)];
		this.cameraRot = this.dir_down[1];
	}

	calculateTriPoints() {
		this.triPoints = [[-1, 0, 1 - (this.time * 2)], [0, 0, 1 - (this.time * 2)], [-1 * this.time, 0, 1], [this.time, 0, 1], [0, 0, 1 - (this.time * 2)], 
					[1, 0, 1 - (this.time * 2)], [this.time, 0, -1], [-1 * this.time, 0, -1]];
		this.triPoints.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 1);
		});
	}

	doSpeedEffects(entity) {
		entity.dx += physics_conveyorStrength * 3;
		if (player.backwards) {
			entity.dx -= physics_conveyorStrength * 6;
		}
	}
}

class Tile_Conveyor_Right extends Tile_Conveyor {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent);
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		//rotate by 18.5°
		this.dir_down = [this.normal[0], this.normal[1] + ((Math.PI * 2) / 19.459)];
		this.cameraRot = this.dir_down[1];
	}

	calculateTriPoints() {
		this.triPoints = [[-1, 0, -1 + (this.time * 2)], [0, 0, -1 + (this.time * 2)], [-1 * this.time, 0, -1], [this.time, 0, -1], [0, 0, -1 + (this.time * 2)], 
					[1, 0, -1 + (this.time * 2)], [this.time, 0, 1], [-1 * this.time, 0, 1]];
		this.triPoints.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 1);
		});
	}

	doSpeedEffects(entity) {
		entity.dx -= physics_conveyorStrength * 3;
		if (player.backwards) {
			entity.dx += physics_conveyorStrength * 6;
		}
	}
}

class Tile_Crumbling extends Tile {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, RGBtoHSV(color_crumbling));
		this.crumbleSet = -1;
		this.activeSize = this.size;

		this.home = [this.x, this.y, this.z];

		this.fallStatus = undefined;
		this.fallRate = -0.52;

		//all crumbling tiles have a plexiglass tile hidden on top of them
		this.plexiTile = new Tile_Plexiglass(x, y, z, size, normal, parent, color, 0.95);
	}

	calculatePointsAndNormal() {
		if (this.activeSize == undefined) {
			this.activeSize = this.size;
		}
		this.points = [[-1, 0, -1], [-1, 0, 1], [1, 0, 1], [1, 0, -1]];

		this.points.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.activeSize);
		});

		this.line1 = [transformPoint([0.5, 0, 0.5], [this.x, this.y, this.z], this.normal, this.activeSize), transformPoint([-0.5, 0, -0.5], [this.x, this.y, this.z], this.normal, this.activeSize)];
		this.line2 = [transformPoint([-0.5, 0, 0.5], [this.x, this.y, this.z], this.normal, this.activeSize), transformPoint([0.5, 0, -0.5], [this.x, this.y, this.z], this.normal, this.activeSize)];

		this.dir_right = [this.normal[0], this.normal[1] + (Math.PI / 2)];
		this.dir_down = this.normal;
	}

	collideWithEntity(entity) {
		//only do if large enough
		if (this.activeSize > 0.01 && getDistance(this, entity) < this.size * 2) {
			super.collideWithEntity(entity);
		}

		//tick plexiglass
		this.plexiTile.collideWithEntity(entity);
	}

	tick() {
		super.tick();
		if (this.fallStatus != undefined) {
			this.fallStatus += 1;

			if (this.fallStatus > 0 && this.fallStatus <= physics_crumblingShrinkTime + physics_crumblingShrinkStart) {
				//only continue falling if large enough
				if (this.activeSize > 0.01) {
					//fall downward
					var changeBy = polToCart(this.normal[0], this.normal[1], this.fallRate);
					this.x += changeBy[0];
					this.y += changeBy[1];
					this.z += changeBy[2];

					//get smaller
					if (this.fallStatus > physics_crumblingShrinkStart) {
						this.activeSize = linterp(this.size, 0, (this.fallStatus - physics_crumblingShrinkStart) / physics_crumblingShrinkTime);
					}

					//recalculate points
					this.calculatePointsAndNormal();
				}
			}
			//tick plexiglass
			this.plexiTile.tick();
		}
	}

	reset() {
		//return to home
		this.fallStatus = undefined;
		this.activeSize = this.size;

		//recalculating points
		[this.x, this.y, this.z] = this.home;
		this.calculatePointsAndNormal();
	}

	beDrawn() {
		//only be drawn if large enough
		if (this.activeSize > 0.01) {
			super.beDrawn();
			if (this.playerDist / render_maxColorDistance < 0.95) {
				ctx.strokeStyle = `hsl(0, 0%, ${linterp(40, 0, this.playerDist / render_maxColorDistance)}%)`;
				ctx.lineWidth = (2 / this.cameraDist) * world_camera.scale;
				drawWorldLine(this.line1[0], this.line1[1]);
				drawWorldLine(this.line2[0], this.line2[1]);
			}
		}

		//draw plexiglass if falling
		if (this.fallStatus != undefined) {
			this.plexiTile.beDrawn();
		}
	}

	//yes I have three functions for this one behavior. No I'm not proud of it. But it works (:
	doCollisionEffects(entity) {
		super.doCollisionEffects(entity);
		//crumbling tiles do not place player firmly on the ground
		entity.onGround = physics_graceTime - 1;
		//only crumble if not a child and if not already crumbling
		if (this.fallStatus == undefined && entity.jumpBuffer == undefined || entity.jumpBuffer > 0) {
			this.fallStatus = 0;
			this.propogateCrumble();
		}
		
	}

	propogateCrumble() {
		//crumble all other tiles around self
		this.parent.crumbleSets[this.crumbleSet].forEach(t => {
			if (t != this && t.fallStatus == undefined) {
				t.fallStatus = this.fallStatus;
			}
		});
	}
}

class Tile_Ice extends Tile {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent, RGBtoHSV(color_ice));
	}

	getColor() {
		return `hsl(${this.color.h}, ${this.color.s}%, ${linterp(90, 0, clamp((this.playerDist / render_maxColorDistance) * (1 / (this.parent.power + 0.001)), 0, 1))}%)`;
	}

	doCollisionEffects(entity) {
		super.doCollisionEffects(entity);
		entity.onIce = true;
	}
}

class Tile_Ice_Ramp extends Tile_Ice {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent);
		this.rampPushForce = 0.15;
		//since self slopes, the long way (back to front) is longer than the side way.
		//magic number is gathered using pythagorean theorum hypotenuse sqrt(1^2 + 0.25^2)
		this.longMult = 1.15;
	}

	calculatePointsAndNormal() {
		this.points = [[-1, 0, -1], [-1, 0, 1], [1, 0.5, 1], [1, 0.5, -1]];
		this.points.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 0.5);
		});
		
		[this.x, this.y, this.z] = avgArray(this.points);
		this.dir_down = this.normal;
		this.normal = calculateNormal(this.points);
		this.dir_right = [this.dir_down[0], this.dir_down[1] + (Math.PI / 2)];
	}

	doCollisionEffects(entity) {
		super.doCollisionEffects(entity);
		//push player up a bit
		if (entity.dy * boolToSigned(!player.backwards) < entity.dz * this.rampPushForce) {
			entity.dy = entity.dz * this.rampPushForce * boolToSigned(!player.backwards);
		}
		entity.onGround = physics_graceTimeRamp;
	}
}

class Tile_Ringed extends Tile {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, color);
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		var ringOffset = polToCart(this.normal[0], this.normal[1], 2);
		this.ring = new Ring(this.x + ringOffset[0], this.y + ringOffset[1], this.z + ringOffset[2], this.normal[0], this.normal[1], render_ringSize);
	}

	doComplexLighting() {
		super.doComplexLighting();
		//rings on tiles are close enough that it probably doesn't matter, and will save time to not do the computation
		this.ring.playerDist = this.playerDist;
	}

	beDrawn() {
		super.beDrawn();
		//if the camera is on same side as normal, draw ring
		if (spaceToRelativeRotless([world_camera.x, world_camera.y, world_camera.z], [this.x, this.y, this.z], this.normal)[2] > 0) {
			this.ring.beDrawn();
		}
	}

	tick() {
		super.tick();
		this.ring.tick();
	}
}

//this is called a plexiglass tile because I thought it looked a bit like plexiglass. It's not actually made of plexiglass. don't get confused ;)
class Tile_Plexiglass extends Tile {
	constructor(x, y, z, size, normal, parent, color, strength) {
		super(x, y, z, size, normal, parent, color);
		this.strength = strength;
		this.minStrength = 0.04;
	}

	getAlpha() {
		//show default strength in editor for convienence
		if (editor_active) {
			return this.strength;
		}
		return (linterp(this.strength, 0, clamp((this.playerDist / physics_maxBridgeDistance) * (1.2 / (this.parent.power + 0.2)), 0.1, 1)) * player.personalBridgeStrength);
	}

	getColor() {
		return `hsl(${this.color.h}, ${this.color.s}%, ${linterp(70, 25, clamp((this.playerDist / render_maxColorDistance) * 0.5, 0.1, 1))}%)`
	}

	beDrawn() {
		if (player.personalBridgeStrength != undefined) {
			if (this.getAlpha() > this.minStrength) {
				ctx.globalAlpha = this.getAlpha();
				super.beDrawn();
				ctx.globalAlpha = 1;
			}
		}
	}

	tick() {
		if (player.personalBridgeStrength != undefined) {
			super.tick();
		}
	}

	collideWithEntity(entity) {
		if (player.personalBridgeStrength != undefined) {
			if (this.getAlpha() > this.minStrength && this.playerDist < this.size * 2) {
				super.collideWithEntity(entity);
			}
		}
	}
}

class Tile_Ramp extends Tile {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, color);
		this.tolerance = player_radius * 0.8;
		this.rampPushForce = 0.5;
		this.longMult = 1.4142135624;
	}

	calculatePointsAndNormal() {
		this.points = [[-1, 0, -1], [-1, 0, 1], [1, 1, 1], [1, 1, -1]];
		this.points.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 0.5);
		});

		[this.x, this.y, this.z] = avgArray(this.points);
		this.dir_down = this.normal;
		this.normal = calculateNormal(this.points);
		this.dir_right = [this.dir_down[0], this.dir_down[1] + (Math.PI / 2)];
	}

	collideWithEntity(entity) {
		//if the player's backwards, make sure not to collide with them when they're above the ramp
		if (player.backwards) {
			var entityCoords = spaceToRelativeRotless([entity.x, entity.y, entity.z], [this.x, this.y, this.z], this.dir_down);
			if (entityCoords[0] > this.size / 2) {
				return;
			}
		}
		super.collideWithEntity(entity);
	}

	doCollisionEffects(entity) {
		super.doCollisionEffects(entity);
		//push player up a bit
		if (entity.dy * boolToSigned(!player.backwards) < entity.dz * this.rampPushForce) {
			entity.dy = entity.dz * this.rampPushForce * boolToSigned(!player.backwards);
		}
		entity.onground = physics_graceTimeRamp;
	}
}

class Tile_Vertical extends Tile {
	constructor(x, y, z, size, normal, parent, color) {
		super(x, y, z, size, normal, parent, color);
	}
}

//TODO: it would probably be easier to just have the vertical component be its own object
class Tile_Warning extends Tile {
	constructor(x, y, z, size, normal, parent) {
		super(x, y, z, size, normal, parent, RGBtoHSV(color_warning));
	}

	calculatePointsAndNormal() {
		super.calculatePointsAndNormal();
		var verticalPoints = [[1, 0, -1], [1, 1.25, -1], [1, 1.25, 1], [1, 0, 1]];
		verticalPoints.forEach(p => {
			transformPoint(p, [this.x, this.y, this.z], this.normal, this.size + 0.5);
		});
		this.verticalObj = new FreePoly_Vertical(verticalPoints, this.color);
	}

	doComplexLighting() {
		super.doComplexLighting();
		this.verticalObj.doComplexLighting();
	}

	tick() {
		super.tick();
		this.verticalObj.tick();
	}

	collideWithEntity(entity) {
		super.collideWithEntity(entity);
		this.verticalObj.collideWithEntity(entity);
	}

	beDrawn() {
		super.beDrawn();
		//don't draw vertical part if that's being taken care of
		if (this.parent.simple) {
			this.verticalObj.beDrawn();
		}
	}
}