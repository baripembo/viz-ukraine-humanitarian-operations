var map, globalLayer, countryLayer, tooltip;
function initMap() {
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckaoa6kf53laz1ioek5zq97qh',
    center: [10, 6],
    minZoom: 2
  });

  map.addControl(new mapboxgl.NavigationControl());

  map.on('load', function() {
    //remove loader and show vis
    $('.loader').hide();
    $('main, footer').css('opacity', 1);

    //add adm0 boundaries tileset
    // map.addSource('adm0', {
    //   type: 'vector',
    //   url: 'mapbox://humdata.ckarts36o033p23rzqkfebyc8-7drvx'
    // });

    //choropleth color scale
    var max = (currentIndicator.id.indexOf('pct')>-1) ? 1 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; });
    colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);
    setGlobalLegend(colorScale);
    
    //data join
    var expression = ['match', ['get', 'ISO_3']];
    nationalData.forEach(function(d) {
      var val = d[currentIndicator.id];
      var color = (val<0 || val=='') ? colorDefault : colorScale(val);
      expression.push(d['#country+code'], color);
    });

    // default value for no data
    expression.push(colorDefault);

    //create global layer
    // map.addLayer(
    //   {
    //     'id': 'adm0-fills',
    //     'type': 'fill',
    //     'source': 'adm0',
    //     'source-layer': 'hrp25_polbnda_int_15m_uncs',
    //     'paint': {
    //       'fill-color': expression,
    //       'fill-outline-color': '#CCC'
    //     }
    //   },
    //   'waterway-label'
    // );
    // globalLayer = 'adm0-fills';

    map.getStyle().layers.map(function (layer) {
      if (layer.id.indexOf('adm0-fills') >= 0) {
        globalLayer = layer;
        map.setPaintProperty(layer.id, 'fill-color', expression);
      }
    });


    //create country layer
    //initCountryLayer();

    //create tooltip
    tooltip = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false
    });

    map.on('mouseenter', globalLayer, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      if (currentIndicator.id!='#food-prices') {
        tooltip.addTo(map);
      }
    });

    map.on('mousemove', globalLayer, function(e) {
      if (currentIndicator.id!='#food-prices') {
        var f = map.queryRenderedFeatures(e.point)[0];
        var content = f.properties.Terr_Name;
        if (content!=undefined) {
          tooltip
            .setHTML(content)
            .setLngLat(e.lngLat);
        }
      }
    });
       
    map.on('mouseleave', globalLayer, function() {
      map.getCanvas().style.cursor = '';
      tooltip.remove();
    });

    map.on('click', globalLayer, function(e) {
      tooltip.remove();
      var features = map.queryRenderedFeatures(e.point);
      currentCountry = features[0].properties.ISO_3;

      if (currentCountry!=undefined) {
        if (currentIndicator.id=='#food-prices') {
          openModal(features[0].properties.Terr_Name);
        }
        else {
          updateCountryLayer();
          map.setLayoutProperty(globalLayer, 'visibility', 'none');
          map.setLayoutProperty(countryLayer, 'visibility', 'visible');
          //var center = turf.centerOfMass(features);
          //console.log(center.geometry.coordinates)
          var bbox = turf.bbox(turf.featureCollection(features));
          var offset = 50;
          map.fitBounds(bbox, {
            padding: {left: $('.map-legend.country').outerWidth()+30, right: $('.country-panel').outerWidth()+offset},
            linear: true
          });

          map.once('moveend', initCountryView);
        }
      }
    });
  });
}

function updateGlobalMap() {
  //set up color scales
  var max = (currentIndicator.id.indexOf('pct')>-1) ? 1 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
  if (currentIndicator.id=='#severity+economic+num') max = 10;
  colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);

  var expression = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = colorDefault;
    if (currentIndicator.id=='#severity+type') {
      colorScale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
      color = (val=='') ? colorDefault : colorScale(val);
    }
    else if (currentIndicator.id=='#food-prices') {
      color = foodPricesColor;
    }
    else if (currentIndicator.id=='#value+funding+hrp+pct') {
      var reverseRange = colorRange.slice().reverse();
      colorScale = d3.scaleQuantize().domain([0, 1]).range(reverseRange);
      color = (val<0 || val=='') ? colorDefault : colorScale(val);
    }
    else {
      color = (val<0 || val=='') ? colorDefault : colorScale(val);
    }
    expression.push(d['#country+code'], color);
  });

  // default value for no data
  expression.push(colorDefault);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  setGlobalLegend(colorScale);
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;
  if (d3.select('.map-legend.global .scale').empty()) {
    createSource($('.map-legend.global .indicator-source'), currentIndicator.id);
    svg = div.append('svg')
      .attr('height', '90px');
    svg.append('g')
      .attr('class', 'scale');
  }
  else {
    updateSource($('.indicator-source'), currentIndicator.id);
  }

  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  $('.map-legend.global .indicator-title').text(legendTitle);

  var legendFormat = ((currentIndicator.id).indexOf('pct')>-1) ? percentFormat : shortenNumFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.global .scale');
  g.call(legend);

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


function initCountryLayer() {
  currentCountryIndicator = {id: '#affected+food+p3+pct', name: 'Food Security'};

  //create country layer
  // map.addSource('adm1', {
  //   type: 'vector',
  //   url: 'mapbox://humdata.61xqivf5'
  // });

  colorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  subnationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val<0 || val=='') ? colorDefault : colorScale(val);
    expression.push(d['#country+code'], color);
  });

  // default value for no data
  expression.push(colorDefault);

  //create country layer
  // map.addLayer(
  //   {
  //     'id': 'adm1-fills',
  //     'type': 'fill',
  //     'source': 'adm1',
  //     'source-layer': 'features-9ljptn',
  //     'paint': {
  //       'fill-color': colorDefault,
  //       'fill-outline-color': colorDefault
  //     }
  //   },
  //   'waterway-label'
  // );
  // countryLayer = 'adm1-fills';
  map.getStyle().layers.map(function (layer) {
    if (layer.id.indexOf('adm1-fills') >= 0) {
      countryLayer = layer;
      map.setPaintProperty(layer.id, 'fill-color', colorDefault);
    }
  });

  map.setLayoutProperty(countryLayer, 'visibility', 'none');
}

function updateCountryLayer() {
  colorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    //var val = d[currentIndicator.id];
    //var color = (val<0 || val=='') ? colorDefault : colorScale(val);
    var color = (d['#country+code']==currentCountry) ? colorRange[0] : colorDefault;
    expression.push(d['#adm1+code'], color);
  });
  expression.push(colorDefault);

  map.setPaintProperty(countryLayer, 'fill-color', expression);


  $('.map-legend.country svg').show();
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

  var colors = (currentCountryIndicator.id.indexOf('vaccinated')>0) ? immunizationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(colors);

  // cmapsvg.selectAll('.map-regions')
  //   .attr('fill', function(d) {
  //     var val = -1;
  //     var clr = colorDefault;
  //     var adm1 = subnationalData.filter(function(c) {
  //       if (c['#adm1+name']==d.properties.ADM1_REF && c['#country+code']==currentCountry)
  //         return c;
  //     });
  //     val = adm1[0][currentCountryIndicator.id]; 
  //     clr = (val<0 || val=='' || currentCountryIndicator.id=='#loc+count+health') ? colorDefault : countryColorScale(val);
  //     return clr;
  //   });

  //toggle health layer
  if (currentCountryIndicator.id=='#loc+count+health') $('.health-layer').fadeIn()
  else $('.health-layer').fadeOut('fast');

  //hide color scale if no data
  if (max!=undefined && max>0 && currentCountryIndicator.id!='#loc+count+health')
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country svg').hide();
}

function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry) {
      return d[currentCountryIndicator.id]; 
    }
  });
  return max;
}


function createCountryLegend(scale) {
  $('.map-legend.country .source-container').empty();
  $('.map-legend.country svg').remove();
  createSource($('.map-legend.country .food-security-source'), '#affected+food+p3+pct');
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .orgs-source'), '#org+count+num');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  createSource($('.map-legend.country .immunization-source'), '#population+ipv1+pct+vaccinated');

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .title('LEGEND')
    .scale(scale);

  var div = d3.select('.map-legend.country');
  var svg = div.append('svg');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);
}

function updateCountryLegend(scale) {
  var legendFormat;
  switch(currentCountryIndicator.id) {
    case '#affected+food+p3+pct':
      legendFormat = percentFormat;
      break;
    case '#population':
      legendFormat = shortenNumFormat;
      break;
    default:
      legendFormat = d3.format('.0s');
  }
  if (currentCountryIndicator.id.indexOf('vaccinated')>-1) legendFormat = percentFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.country .scale');
  g.call(legend);
}



function createMapTooltip(country_code, country_name){
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  //format content for tooltip
  if (val!=undefined && val!='') {
    if (currentIndicator.id.indexOf('pct')>-1) val = percentFormat(val);
    if (currentIndicator.id=='#affected+inneed' || currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
  }
  else {
    val = 'No Data';
  }
  var content = '<label class="h3 label-header">' + country_name + '</label>'+ currentIndicator.name + ': ' + val + '<br/><br/>';

  //covid cases and deaths
  content += 'COVID-19 Cases: ' + numFormat(country[0]['#affected+infected']) + '<br/>';
  content += 'COVID-19 Deaths: ' + numFormat(country[0]['#affected+killed']);

  showMapTooltip(content);
}

function showMapTooltip(content) {
  var w = $('.tooltip').outerWidth();
  var h = ($('.tooltip-inner').outerHeight() <= 0) ? 80 : $('.tooltip-inner').outerHeight() + 20;
  tooltip.select('div').html(content);
  tooltip
    .style('height', h + 'px')
    .style('left', (d3.event.pageX - w/2) + 'px')
    .style('top', (d3.event.pageY - h - 15) + 'px')
    .style('text-align', 'left')
    .style('opacity', 1);
}


function initCountryView() {
  setSelect('countrySelect', currentCountry);
  $('.content').addClass('country-view');
  $('.menu h2').html('<a href="#">< Back to Global View</a>');
  $('.country-panel').show().scrollTop(0);
  $('#foodSecurity').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  initCountryPanel();
}


function resetMap() {
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.menu h2').html('Global');
  $('.country-panel').fadeOut();
  setSelect('countrySelect', '');

  updateGlobalMap();

  map.flyTo({ 
    speed: 2,
    zoom: 2,
    center: [10, 6] 
  });
  map.once('moveend', function() {
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
  });
}

