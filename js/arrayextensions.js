Array.prototype.remove = function() {
	var count = 0;
	for (var i = 0; i < arguments.length; i++) {
		var arg = arguments[i];
		if (arg.constructor == Array) {
			for (var j = 0; j < arg.length; j++)
				count += this.remove(arg[j]);
		} else {
			var index = 0;
			while (index < this.length) {
				if (this[index] == arg) {
					var end = this.slice(index + 1);
					this.length = index;
					this.push.apply(this, end);
					count++;
				} else index++;
			}
		}
	}
	return count;
};
Array.prototype.peek = function() {
	return this.length > 0 ? this[this.length - 1] : undefined;
};
Array.prototype.contains = function(el) {
	return this.indexOf(el) > -1;
};