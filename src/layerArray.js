// a leaflet layer that conveniently organizes multidimensional arrays
// of layers

// also a timedimension layer that works with the layerArray

L.LayerArray = L.LayerGroup.extend({
    cache: [],
    values: [],
    initialize: function(options) {
	L.LayerGroup.prototype.initialize.call(this, []);
	this.coords = options['values'];
	this.dim_lengths = this.coords.map(function(x) {return x.length});
	this.ndim = this.coords.length;
	this._setupCache();
	// this should be a function that takes an index array and
	// returns a promise that resolves to the corresponding layer
	this.makeLayer = options['makeLayer'];
    },
    _isPromise: function(obj) {
	// find out if an object is promise-like
	return typeof layerPromise.then !== 'function';
    },
    // _writePromiseToCache: function(x) {
    // 	this.cache[arr_ind] = x;
    // },
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
    _coordsToCacheInd: function(coords) {
	return this._indToCacheInd(this.getCoordsIndex(coords));
    },
    addToCache: function(ind) {
	var arr_ind = this._indToCacheInd(ind);
	if (this.cache[arr_ind]) {
	    console.warn('Overwriting an existing layer');
	};
	var new_layer = this.makeLayer(ind);
	this.cache[arr_ind] = new_layer;
	if (this._isPromise(new_layer)) {
	    // overwrite the promise with the layer after it loads
	    var f = function(x) {
		this.cache[arr_ind] = x;
	    }.bind(this);
	    return this.promiseCache[arr_ind].then(f);
	} else {
	    return $.when();
	};
    },
    loadLayer: function(ind) {
	var arr_ind = this._indToCacheInd(ind);
	if (this.cache[arr_ind]) {
	    // only load the layer if it hasn't been added yet!
	    return $.when();
	} else {
	    return this.addToCache(ind);
	}
    },
    layerIsLoaded: function(ind) {
	var arr_ind = this.indToArrayInd(ind);
	var cache_entry = this.cache[arr_ind];
	var is_loaded = cache_entry & !this._isPromise(cache_entry);
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
	    ind[i] = getCoordIndex(coords[i], i);
	};
	return ind;
    },
    addIndex: function(ind) {
	// should check first that the layer isn't already on the map
	return this.loadLayer(ind).done(function() {
	    this.addLayer(this.cache[this._indToCacheInd(ind)]);	    
	}.bind(this));
    },
    addCoord: function(coords) {
	var ind = this.getCoordsIndex(coords);
	this.addIndex(ind);
    },
    removeIndex: function(ind) {
	this.removeLayer(this.cache[this._indToCacheInd(ind)]);
    },
    removeCoord: function(coords) {
	this.removeLayer(this.cache[this._coordsToCacheInd(coords)]);
    },
    switchToValue: function(coords) {
	var ind = this.getCoordsIndex(coords);
	return this.switchToIndex(ind);
    },
    switchToIndex: function(ind) {
	this.clearLayers();
	this.ind = ind;
	return this.addIndex(ind);
    },
    switchDim: function(dim, ind) {
	if (this.ind) {
	    // make a copy of the current index
	    var new_ind[i] = this.ind.slice();
	} else {
	    // just use zeros if the index doesn't exist yet
	    var new_ind = [];
	    for (i=0; i<this.coords.length; i++) {
		new_ind[i] = 0;
	    }
	}
	// update it
	new_ind[dim] = ind;
	// switch to it
	this.switchToIndex(new_ind);
    },
    makeSlider: function(dim, orientation) {
	var slider_options = {layerArray: this, dim: dim,
			      orientation: orientation ? orientation : 'vertical'};
	return L.control.arraySlider(slider_options);
    }
});

L.layerArray = function(options) {
    return new L.LayerArray(options);
};



L.Control.ArraySlider = L.Control.extend({
    // use the other (non-bootstrap, non-jquery) slider library!!
    // this is going to have the dimension number and layerarray object
    onAdd: function() {
	var layerArray = this.options.layerArray;
	var dim = this.options.dim || 0;
	var labels = this.options.labels || layerArray.values[dim];
	var dim_length = labels.length;
	var orientation = this.options.orientation || 'horizontal';
	var is_vertical = orientation == 'vertical';
	var title = this.options.title || '';
	var slider_length = this.options.length || (25 * (dim_length - 1)) + 'px';
	// set up the div if it isn't there already
	if (is_vertical) {
	    this._div = L.DomUtil.create('div', 'info slider-axis vertical-axis');
	} else {
	    this._div = L.DomUtil.create('div', 'info slider-axis');
	}
	// var grades = levels,
	//     labels = [];
	var range_title = '<h4>' + title + '</h4>'
	var range = '<div id="height_slider2"></div>'
	this._div.innerHTML = range_title + range;
	var slider = $(this._div).find('div')[0];
	var switch_fn = function(e, ui) {
	    this.switchDim(dim, ui.value);
	}.bind(layerArray);

	// set up the jquery slider
	var slider_options = {max: dim_length - 1, orientation: orientation,
			      slide: switch_fn, change: switch_fn};

	// get the slider labels
	var pip_options = {rest: 'label', labels: labels};
	$(slider).slider(slider_options).slider("pips", pip_options);
	if (is_vertical) {
	    // set the slider height
	    $(slider)[0].style.height = slider_length;
	} else {
	    // set the slider width
	    $(slider)[0].style.width = slider_length;
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
        this._currentLoadedTime = 0;
        this._currentTimeData = null;
    },

    onAdd: function(map) {
	// I think this should be edited somehow to start with the
	// correct time
        L.TimeDimension.Layer.prototype.onAdd.call(this, map);
        // if (this._timeDimension) {
        //     this._getDataForTime(this._timeDimension.getCurrentTime());
        // }
	this._update();
    },

    _findTime: function(t) {
	// find the corresponding time index
	return this._baseLayer.getCoordIndex(t, this.dim);
    },

    _onNewTimeLoading: function(ev) {
	// ok. Instead of getting data directly, we're going to get
	// the appropriate layer from site.contours, then call
	// loadData on it
        if (!this._map) {
            return;
        }
	// should probably be grabbing data here and firing event on
	// completion (but this is good enough for now)
	var time = ev.time;
	this._baseLayer.loadTime(time).done(function() {
	    this.fire('timeload', {
		time: time
            });
	}.bind(this));
        return;
    },

    isReady: function(time) {
	// return true;
	// change this to handle a non-existent index!
	var new_ind = this._currentIndex();
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
	this._baseLayer.switchTimeVal(this._currentLoadedTime);
    }

    changeTime: function(new_time) {
	var ind = this._findTime(new_time);
	this._baseLayer.switchDim(this.dim, ind);
    },
});

L.timeDimension.layer.layerArray = function(layer, options) {
    return new L.TimeDimension.Layer.LayerArray(layer, options);
};
