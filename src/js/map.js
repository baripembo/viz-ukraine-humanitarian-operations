var globalMapbox;
function initMap() {
  globalMapbox = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckaoa6kf53laz1ioek5zq97qh',
    center: [10, 6],
    minZoom: 2
  });

  globalMapbox.addControl(new mapboxgl.NavigationControl());

  globalMapbox.on('load', function() {
    //remove loader and show vis
    $('.loader').hide();
    $('main, footer').css('opacity', 1);

    //add adm1 boundaries tileset
    globalMapbox.addSource('adm1', {
      type: 'vector',
      url: 'mapbox://humdata.61xqivf5'
    });

    var expression = ['match', ['get', 'ADM0_REF']];
    colorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
    nationalData.forEach(function(d) {
      var val = d['#access+constraints+pct'];
      var color = colorDefault;
      // if (val <= .20) color = colorRange[0];
      // else if (val <= .40) color = colorRange[1];
      // else if (val <= .60) color = colorRange[2];
      // else if (val <= .80) color = colorRange[3];
      // else color = colorRange[4];
      color = colorScale(val);
      expression.push(d['#country+name'], color);
    });

    // default value for no data
    expression.push(colorDefault);

    //add choropleth fills
    globalMapbox.addLayer(
      {
        'id': 'adm1-fills',
        'type': 'fill',
        'source': 'adm1',
        'source-layer' : 'features-9ljptn',
        'paint': {
          'fill-color': expression,
        }
      },
      'waterway-label'
    );

    //add outlines
    globalMapbox.addLayer(
      {
        'id': 'adm1-outlines',
        'type': 'line',
        'source': 'adm1',
        'source-layer' : 'features-9ljptn',
        'paint': {
          'line-color': '#CCC',
        }
      }
    );

    //add covid markers
    // globalMapbox.addLayer(
    //   {
    //     'id': 'adm1-covid-markers',
    //     'type': 'circle',
    //     'source': 'adm1',
    //     'source-layer' : 'features-9ljptn',
    //     'paint': {
    //       // make circles larger as the user zooms from z12 to z22
    //       'circle-radius': {
    //         'base': 1.75,
    //         'stops': [
    //           [12, 2],
    //           [22, 180]
    //         ]
    //       },
    //       'circle-color': '#ffcc00'
    //     }
    //   }
    // );

    //create tooltip
    var popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    globalMapbox.on('mouseenter', 'adm1-fills', function(e) {
      globalMapbox.getCanvas().style.cursor = 'pointer';
      popup.addTo(globalMapbox);
    });

    globalMapbox.on('mousemove', 'adm1-fills', function(e) {
      var f = globalMapbox.queryRenderedFeatures(e.point)[0];
      var content = f.properties.ADM0_REF;
      if (content!=undefined) {
        popup
          .setHTML(content)
          .setLngLat(e.lngLat);
      }
    });
       
    globalMapbox.on('mouseleave', 'adm1-fills', function() {
      globalMapbox.getCanvas().style.cursor = '';
      popup.remove();
    });

  });

  //choropleth color scale
  colorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createGlobalLegend(colorScale);
}

function updateGlobalMapbox() {
  //set up color scales
  var max = (currentIndicator.id.indexOf('pct')>-1) ? 1 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
  if (currentIndicator.id=='#severity+economic+num') max = 10;
  colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);

  var expression = ['match', ['get', 'ADM0_REF']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = colorDefault;
    if (currentIndicator.id=='#severity+type') {
      colorScale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
      if (val=='Very Low') color = informColorRange[0];
      else if (val=='Low') color = informColorRange[1];
      else if (val=='Medium') color = informColorRange[2];
      else if (val=='High') color = informColorRange[3];
      else color = informColorRange[4];
    }
    else {
      color = colorScale(val);
    }
    
    expression.push(d['#country+name'], color);
  });

  // default value for no data
  expression.push(colorDefault);

  globalMapbox.setPaintProperty('adm1-fills', 'fill-color', expression);

  //update legend
  updateGlobalLegend(colorScale);
}


function createGlobalLegend(scale) {
  //current indicator
  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  $('.map-legend.global .indicator-title').text(legendTitle);
  createSource($('.map-legend.global .indicator-source'), currentIndicator.id);

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .scale(scale);

  var div = d3.select('.map-legend.global');
  var svg = div.append('svg')
    .attr('height', '90px');
  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  //cases
  // $('.map-legend.global').append('<h4>Number of COVID-19 cases</h4>');
  // createSource($('.map-legend.global'), '#affected+infected');
  // var markersvg = div.append('svg')
  //   .attr('height', '55px');
  // markersvg.append('g')
  //   .attr("transform", "translate(5, 10)")
  //   .attr('class', 'legendSize');

  // var legendSize = d3.legendSize()
  //   .scale(markerScale)
  //   .shape('circle')
  //   .shapePadding(40)
  //   .labelFormat(numFormat)
  //   .labelOffset(15)
  //   .cells(2)
  //   .orient('horizontal');

  // markersvg.select('.legendSize')
  //   .call(legendSize);
}

function updateGlobalLegend(scale) {
  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  $('.map-legend.global .indicator-title').text(legendTitle);
  updateSource($('.indicator-source'), currentIndicator.id);

  var legendFormat = ((currentIndicator.id).indexOf('pct')>-1) ? percentFormat : shortenNumFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.global .scale');
  g.call(legend);
}