// a leaflet layer that conveniently organizes multidimensional arrays
// of layers

// also a timedimension layer that works with the layerArray

L.LayerArray = L.LayerGroup.extend({
    initialize: function(options) {
	L.LayerGroup.prototype.initialize.call(this, []);
	this.coords = options['coords'];
	this.dim_lengths = this.coords.map(function(x) {return x.length});
	this.ndim = this.coords.length;
	this._setupCache();
	// this should be a function that takes an index array and
	// returns a promise that resolves to the corresponding layer
	this.makeLayer = options['makeLayer'];
    },
    _isPromise: function(obj) {
	// find out if an object is promise-like
	return typeof obj.then == 'function';
    },
    _setupCache: function() {
	// the cache is a one-dimensional array holding all the loaded
	// layers
	var arr_len = 1;
	for (i = 0; i < this.ndim; i++) {
	    arr_len *= this.dim_lengths[i];
	}
	this.cache = new Array(arr_len);
    },
    _indToCacheInd: function(ind) {
	// get the 1D array index
	var arr_ind = 0;
	var dim_n = 1;
	for (i = this.ndim - 2; i >= 0; i--) {
	    // gotta jump this.dim_lengths[i + 1] times farther for
	    // every index for this dimension
	    dim_n *= this.dim_lengths[i + 1];
	    arr_ind += dim_n * ind[i];
	}
	// add back that last dimension
	arr_ind += ind[this.ndim - 1];
	return arr_ind;
    },
    _setIndex: function(ind) {
	// check a few things before replacing the current index
	if (ind.length != this.ndim) {
	    throw 'Attempted to set index with wrong number of dimensions';
	}
	if (typeof this._indToCacheInd(ind) === "undefined") {
	    throw 'Attempted to set index outside of the range of the layerArray';
	}
	// if (!this._indToCacheInd(ind)) {
	//     throw 'Attempted to set index outside of the range of the layerArray';
	// }
	this.ind = ind;
    },
    _coordsToCacheInd: function(coords) {
	return this._indToCacheInd(this.getCoordsIndex(coords));
    },
    addToCache: function(ind) {
	var arr_ind = this._indToCacheInd(ind);
	if (this.cache[arr_ind]) {
	    console.warn('Overwriting an existing layer');
	};
	var new_layer = this.makeLayer(ind);
	if (this._isPromise(new_layer)) {
	    // overwrite the promise with the layer after it loads
	    var f = function(x) {
		this.cache[arr_ind] = x;
	    }.bind(this);
	    this.cache[arr_ind] = new_layer.then(f);
	    return this.cache[arr_ind];
	} else {
	    return $.when();
	};
    },
    loadLayer: function(ind) {
	var arr_ind = this._indToCacheInd(ind);
	if (this.cache[arr_ind]) {
	    // only load the layer if it hasn't been added yet!
	    return $.when(this.cache[arr_ind]);
	} else {
	    return this.addToCache(ind);
	}
    },
    layerIsLoaded: function(ind) {
	var arr_ind = this._indToCacheInd(ind);
	var cache_entry = this.cache[arr_ind];
	var is_loaded = cache_entry;
	if (cache_entry) {
	    is_loaded = !this._isPromise(cache_entry);
	};
	return is_loaded;
    },
    getCoordIndex: function(coord, dim) {
	// get the index corresponding to a coordinate value, checking
	// to properly deal with date objects
	
	// check if the dimension is a date dimension
	var is_date = this.coords[dim][0] instanceof Date;
	if (is_date) {
	    var ind = this.coords[dim].map(Number).indexOf(+coord);
	} else if (this.coords[dim][0] instanceof Object) {
	    throw "LayerArray can't get index of object values (except dates)";
	} else {
	    var ind = this.coords[dim].indexOf(coord);
	}
	if (ind == -1) {
	    throw 'Value ' + coord + ' not found in array dimension ' + dim;
	}
	return ind;
    },
    getCoordsIndex: function(coords) {
	var ind = [];
	for (i = 0; i < this.ndim; i++) {
	    ind.push(this.getCoordIndex(coords[i], i));
	};
	return ind;
    },
    addByIndex: function(ind) {
	// should check first that the layer isn't already on the map
	return this.loadLayer(ind).done(function() {
	    this.addLayer(this.cache[this._indToCacheInd(ind)]);	    
	}.bind(this));
    },
    addByCoord: function(coords) {
	var ind = this.getCoordsIndex(coords);
	this.addByIndex(ind);
    },
    removeByIndex: function(ind) {
	this.removeLayer(this.cache[this._indToCacheInd(ind)]);
    },
    removeByCoord: function(coords) {
	this.removeLayer(this.cache[this._coordsToCacheInd(coords)]);
    },
    switchToValue: function(coords) {
	var ind = this.getCoordsIndex(coords);
	return this.switchToIndex(ind);
    },
    switchToIndex: function(ind) {
	try {
	    this.clearLayers();
	} catch {};
	this._setIndex(ind);
	return this.addByIndex(ind);
    },
    switchDim: function(dim, ind) {
	if (this.ind) {
	    // make a copy of the current index
	    var new_ind = this.ind.slice();
	} else {
	    // just use zeros if the index doesn't exist yet
	    var new_ind = [];
	    for (i=0; i<this.coords.length; i++) {
		new_ind.push(0);
	    }
	}
	// update it
	new_ind[dim] = ind;
	// switch to it
	this.switchToIndex(new_ind);
    },
    makeSlider: function(dim, options) {
	if (!options) {
	    var options = {};
	}
	options['layerArray'] = this;
	options['dim'] = dim;
	return L.control.arraySlider(options);
    }
});

L.layerArray = function(options) {
    return new L.LayerArray(options);
};



L.Control.ArraySlider = L.Control.extend({
    onAdd: function() {
	var layerArray = this.options.layerArray;
	var dim = this.options.dim || 0;
	var labels = this.options.labels || layerArray.coords[dim].map(String);
	this.dim_length = labels.length;
	this.orientation = this.options.orientation || 'vertical';
	this.vertical = this.orientation == 'vertical';
	this.title = this.options.title || '';
	this.slider_length = this.options.length || (25 * (this.dim_length - 1)) + 'px';
	// set up the div if it isn't there already
	if (this.vertical) {
	    this._div = L.DomUtil.create('div', 'info slider-axis vertical-axis');
	} else {
	    this._div = L.DomUtil.create('div', 'info slider-axis');
	}
	var range_title = '<h3>' + this.title + '</h3>';
	var range = '<div id="height_slider2"></div>';
	this._div.innerHTML = range_title + range;
	var slider = $(this._div).find('div')[0];

	var format_options = {
	    to: function ( value ) {
	    	return labels[value];
	    },
	    from: function ( value ) {
	    	return labels.indexOf(value);
	    }
	}
	var pip_options = {mode: 'steps',
			   format: format_options,
			   density: 100};
	var slider_options = {start: [0], step: 1,
			      range: {min: [0], max: [this.dim_length - 1]},
			      orientation: this.orientation,
			      pips: pip_options};
	if (this.vertical) {
	    // set the slider height
	    $(slider)[0].style.height = this.slider_length;
	    slider_options['direction'] = 'rtl';
	} else {
	    // set the slider width
	    $(slider)[0].style.width = this.slider_length;
	}
	noUiSlider.create(slider, slider_options);

	// connect to the layerArray
	switch_fn = function( values, handle, unencoded, tap, positions ) {
	    // values: Current slider values (array);
	    // handle: Handle that caused the event (number);
	    // unencoded: Slider values without formatting (array);
	    // tap: Event was caused by the user tapping the slider (boolean);
	    // positions: Left offset of the handles (array);
	    layerArray.switchDim(dim, unencoded);
	};
	slider.noUiSlider.on('update', switch_fn);

	// allow navigation via clicking pips-- following:
	// https://refreshless.com/nouislider/examples/#section-click-pips
	var pips = slider.querySelectorAll('.noUi-value');
	function clickOnPip ( ) {
	    var value = Number(this.getAttribute('data-value'));
	    slider.noUiSlider.set(value);
	}
	for ( var i = 0; i < pips.length; i++ ) {
	    pips[i].addEventListener('click', clickOnPip);
	}

	// Disable dragging when user's cursor enters the element
	// courtesy of https://gis.stackexchange.com/a/104609
	this._div.addEventListener('mouseover', function (e) {
            this._map.dragging.disable();
	}.bind(this));
	// Re-enable dragging when user's cursor leaves the element
	this._div.addEventListener('mouseout', function (e) {
            this._map.dragging.enable();
	}.bind(this));
	
	return this._div;
    }
})

L.control.arraySlider = function(options) {
    return new L.Control.ArraySlider(options);
};


// A layerArray-compatible timedimension layer (from
// leaflet.timedimension). Based on advice here:
// https://github.com/socib/Leaflet.TimeDimension/issues/19
L.TimeDimension.Layer.LayerArray = L.TimeDimension.Layer.extend({

    initialize: function(layer, options) {
        L.TimeDimension.Layer.prototype.initialize.call(this, layer, options);
	this.dim = this.options.dim;
        this._currentLoadedTime = this._baseLayer.coords[this.dim][0];
    },

    onAdd: function(map) {
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
	this._update();
	this._baseLayer.addTo(map);
    },

    _findTime: function(t) {
	// find the corresponding time index
	return this._baseLayer.getCoordIndex(t, this.dim);
    },

    _loadTime: function(t) {
	// load the layer for a given time
	if (this._baseLayer.ind) {
	    var new_ind = this._baseLayer.ind.slice();
	} else {
	    var new_ind = [];
	    for (i=0; i<this._baseLayer.coords.length; i++) {
		new_ind.push(0);
	    }
	}
	new_ind[this.dim] = this._findTime(t);
	return this._baseLayer.loadLayer(new_ind);
    },

    _onNewTimeLoading: function(ev) {
	// fire event after time is loaded to let the time dimension
	// know the layer status
        if (!this._map) {
            return;
        }
	var time = ev.time;
	this._loadTime(time).done(function() {
	    this.fire('timeload', {
		time: time
            });
	}.bind(this));
    },

    isReady: function(time) {
	// change this to handle a non-existent index!
	var new_ind = this._baseLayer.ind.slice();
	var time_index = this._findTime(time);
	new_ind[this.dim] = time_index;
	return this._baseLayer.layerIsLoaded(new_ind);
    },

    _update: function() {
	// switch to the appropriate time
        if (!this._map)
            return;
	var current_time = this._timeDimension.getCurrentTime();
	if (this._currentLoadedTime != current_time) {
	    this._currentLoadedTime = current_time;
	}
	this.changeTime(current_time);
    },

    changeTime: function(new_time) {
	var ind = this._findTime(new_time);
	// if the layerArray has no indices, set them to zeros
	if (!this._baseLayer.ind) {
	    var start_ind = [];
	    for (i=0; i<this._baseLayer.coords.length; i++) {
		start_ind.push(0);
	    }
	    this._baseLayer._setIndex(start_ind);
	}
	this._baseLayer.switchDim(this.dim, ind);
    }
});

L.timeDimension.layer.layerArray = function(layer, options) {
    return new L.TimeDimension.Layer.LayerArray(layer, options);
};
