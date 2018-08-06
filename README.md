# Leaflet.LayerArray
Provides tools to organize and navigate between arrays of layers. Useful for time series, layers representing different heights, different starting points, etc.

[Demo](http://pireds.asrc.cestm.albany.edu/~xcite/layerArray/)

## L.LayerArray
An array of layers with functions for switching layers by index and coordinate values.

Option                        | Description
------------------------------|---------------------------------------------------------
`coords`               | An array of arrays of the values along each dimension. Example: `[['a','b','c'],[100,200,300]]`
`makeLayer`        | A function that takes an array of indices and returns a leaflet layer, or a promise that resolves to the corresponding layer. The layerArray will call this function to create new layers when requested.


## L.Control.ArraySlider
A jQuery UI slider used to control a dimension of a LayerArray. (Requires [noUiSlider](https://refreshless.com/nouislider/).)


Option                        | Description
------------------------------|---------------------------------------------------------
`layerArray`               | The layerArray that will be controlled with the slider
`dim`        | The dimension the slider will control (an integer starting at zero)
`orientation`        | 'horizontal' or 'vertical'
`title`        | The slider's title
`slider_length`        | The length (horizontal or vertical, depending on `orientation`) of the slider



## L.TimeDimension.Layer.LayerArray
A layer compatible with the [Leaflet.TimeDimension](https://github.com/socib/Leaflet.TimeDimension) plugin. Takes a LayerArray and integrates it into the TimeDimension framework.
