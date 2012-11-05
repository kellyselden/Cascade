jQuery.url = {
	getUrl: function() {
		return window.location.href;
	},
	getPath: function() {
		return window.location.protocol + window.location.host + window.location.pathname;
	},
	getQuery: function(query) {
		var pairs = window.location.search.replace('?', '').split('&');
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i].split('=');
			if (pair[0] == query)
				return decodeURIComponent(pair[1]);
		}
		return null;
	}
}