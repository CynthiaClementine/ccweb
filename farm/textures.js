
var image_beacon = getImage(`img/vecon.png`, true);
var image_corn = getImage(`img/corn.png`, true);
var image_ground = getImage(`img/MapWDirtWOGrid.png`, true);
var image_player = getImage(`img/Chibi.png`, true);
var image_rock = getImage(`img/rock.png`, true);
var texture_vendors = new Texture(getImage(`img/vendors.png`, true), 320, 1e1001, [1, 1], [0.5, 1], [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]]);
var texture_potato = new Texture(getImage(`img/potato.png`), 255, 1e1001, [1, 1.36], [0.5, 0.68], [[0, 0]]);
var texture_turretArm = new Texture(getImage(`img/turret_gun.png`), 161, 1e1001, [4, 1], [0.5, 0.5], [[0, 0]]);
var texture_turretStand = new Texture(getImage(`img/turret_stand.png`), 430, 1e1001, [1, 1], [0.5, 1], [[0, 0]]);