# Leaflet.LayerArray
Provides tools to create arrays of layers and easily switch between them. Useful for time series, layers representing different heights, different starting points, etc.

## L.LayerArray
An array of layers with functions for switching layers by index and dimension values.

Option                        | Description
------------------------------|---------------------------------------------------------
`values`               | A array of arrays of the values along each dimension. Example: `[['a','b','c'],[100,200,300]]`
`makeLayer`        | A function that takes an array of indices and returns a promise that resolves to the corresponding layer. The layerArray will use this function to create new layers when requested.


## L.Control.ArraySlider
A jQuery UI slider used to control a dimension of a LayerArray. (Requires jQuery, jQuery UI, and [jQuery UI Slider Pips](http://simeydotme.github.io/jQuery-ui-Slider-Pips/).)


Option                        | Description
------------------------------|---------------------------------------------------------
`layerArray`               | The layerArray that will be controlled with the slider
`dim`        | The dimension the slider will control (an integer starting at zero)
`orientation`        | 'horizontal' or 'vertical'
`title`        | The slider's title
`slider_length`        | The length (horizontal or vertical, depending on `orientation`) of the slider



## L.TimeDimension.Layer.LayerArray
A layer compatible with the [Leaflet.TimeDimension](https://github.com/socib/Leaflet.TimeDimension) plugin. Takes a LayerArray and integrates it into the TimeDimension framework.
