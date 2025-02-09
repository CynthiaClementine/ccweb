function createBulletFlower(x, y, num, radialOff, angularOff, speed, bulletType) {
	var angle;
	var aSlice = Math.PI * 2 / num;
	var obj;
	for (var a=0; a<num; a++) {
		angle = a * aSlice + aSlice * angularOff;

		obj = new Bullet(...polToXY(x, y, angle, radialOff), ...polToXY(0, 0, angle, speed));
		//all bullets will start at high priority
		bullets_high.push(obj);
	}
}