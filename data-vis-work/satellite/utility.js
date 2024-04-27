
function drawEllipse(x, y, a, b, angle) {
	push();
	translate(x, y);
	rotate(angle);
	ellipse(0, 0, a * 2, b * 2);
	pop();
}


function drawEllipseBody(x, y, a, b, c, angle) {
	push();
	translate(x, y);
	rotate(angle);
	ellipse(c, 0, a * 2, b * 2);
	pop();
}

function dateToTime(dateStr) {
	var [mon, day, year] = dateStr.split("-");
	//error correct because sometimes I forget
	if (mon.length > 3) {
		mon = mon.slice(0, 3);
	}
	var dayInd = allDays.indexOf(`${mon} ${day}`);

	return (yearsToDays * ((year - yearStart) + (dayInd / allDays.length)));
}

function timeToDate(t) {
	var scaleFactor = allDays.length / yearsToDays;
	var year = Math.floor(t / yearsToDays) + yearStart;
	var firstPart = allDays[Math.floor((t % yearsToDays) * scaleFactor)];
	
	return `${firstPart.replace(" ", "-")}-${year}`;
}