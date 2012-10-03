//0 <= h <= 360, 0 <= s <=1, 0 <= v <= 1
function convertHsvToRgb(h, s, v) {
	var c = v * s;
	var hPrime = h / 60;
	var x = c * (1 - Math.abs(hPrime % 2 - 1))
	var r, g, b;
	switch (Math.floor(hPrime)) {
		case 0: r = c; g = x; b = 0; break;
		case 1: r = x; g = c; b = 0; break;
		case 2: r = 0; g = c; b = x; break;
		case 3: r = 0; g = x; b = c; break;
		case 4: r = x; g = 0; b = c; break;
		case 5: r = c; g = 0; b = x; break;
	}
	var m = v - c;
	r += m; g += m; b +=m;
	function convertToHex(num) {
		return ('0' + Math.round(num * 255).toString(16)).substr(-2);
	}
	return '#' + convertToHex(r) + convertToHex(g) + convertToHex(b);
}