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

    //get layers
    map.getStyle().layers.map(function (layer) {
      if (layer.id.indexOf('adm0-fills') >= 0) {
        globalLayer = layer.id;
      }
      else if (layer.id.indexOf('adm1-fills') >= 0) {
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
      }
      else if (layer.id.indexOf('adm1-boundaries') >= 0) {
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
      }
    });

    //init global and country layers
    initGlobalLayer();
    initCountryLayer();

    //create tooltip
    tooltip = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'map-tooltip'
    });
  });
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function initGlobalLayer() {
  //color scale
  colorScale = getGlobalColorScale();
  setGlobalLegend(colorScale);
  
  //data join
  var expression = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val<0 || val=='') ? colorDefault : colorScale(val);
    expression.push(d['#country+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);
  
  //set choropleths
  map.setPaintProperty(globalLayer, 'fill-color', expression);

  //define mouse events
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
        tooltip.setLngLat(e.lngLat);
        createMapTooltip(f.properties.ISO_3, f.properties.Terr_Name)
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
    currentCountryName = features[0].properties.Terr_Name;

    if (currentCountry!=undefined) {
      if (currentIndicator.id=='#food-prices') {
        openModal(features[0].properties.Terr_Name);
      }
      else {
        updateCountryLayer();
        map.setLayoutProperty(globalLayer, 'visibility', 'none');
        map.setLayoutProperty(countryLayer, 'visibility', 'visible');
        //map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
        //var center = turf.centerOfMass(features);
        //console.log(center.geometry.coordinates)
        var bbox = turf.bbox(turf.featureCollection(features));
        var offset = 50;
        map.fitBounds(bbox, {
          padding: {left: $('.map-legend.country').outerWidth()+offset, right: $('.country-panel').outerWidth()+offset},
          linear: true
        });

        map.once('moveend', initCountryView);
      }
    }
  });
}

function updateGlobalLayer() {
  //color scales
  colorScale = getGlobalColorScale();

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = colorDefault;
    if (currentIndicator.id=='#food-prices') {
      color = foodPricesColor;
    }
    else {
      color = (val<0 || val=='') ? colorDefault : colorScale(val);
    }
    expression.push(d['#country+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  setGlobalLegend(colorScale);
}

function getGlobalColorScale() {
  var max = d3.max(nationalData, function(d) { return +d[currentIndicator.id]; });
  if (currentIndicator.id.indexOf('pct')>-1) max = 1;
  else if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else max = max;

  var scale;
  if (currentIndicator.id=='#severity+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, 1]).range(reverseRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }

  return scale;
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;
  if (d3.select('.map-legend.global .scale').empty()) {
    createSource($('.map-legend.global .indicator-source'), currentIndicator.id);
    svg = div.append('svg')
      .attr('class', 'legend-container');
    svg.append('g')
      .attr('class', 'scale');

    var nodata = div.append('svg')
      .attr('class', 'no-data');

    nodata.append('rect')
      .attr('width', 15)
      .attr('height', 15);

    nodata.append('text')
      .attr('class', 'label')
      .text('No Data');
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


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryLayer() {
  currentCountryIndicator = {id: '#affected+food+p3+pct', name: 'Food Security'};

  //color scale
  var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var val = (d['#country+code']==currentCountry) ? d[currentCountryIndicator.id] : '';
    var color = (val<0 || val=='') ? colorDefault : countryColorScale(val);
    expression.push(d['#adm1+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);

  //set choropleths
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryLayer, 'fill-outline-color', '#CCC');

  //mouse events
  map.on('mouseenter', countryLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });

  map.on('mousemove', countryLayer, function(e) {
    var f = map.queryRenderedFeatures(e.point)[0];
    if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_REF==currentCountryName) {
      map.getCanvas().style.cursor = 'pointer';
      createCountryMapTooltip(f.properties.ADM1_REF);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    }
    else {
      map.getCanvas().style.cursor = '';
      tooltip.remove();
    }
  });
     
  map.on('mouseleave', countryLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });
}

function updateCountryLayer() {
  //$('.map-legend.country .legend-container').show();
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

  var clrRange = (currentCountryIndicator.id.indexOf('vaccinated')>0) ? immunizationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionOutline = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var val = (d['#country+code']==currentCountry) ? d[currentCountryIndicator.id] : '';
    var color  = (val<0 || val=='' || isNaN(val) || currentCountryIndicator.id=='#loc+count+health') ? colorDefault : countryColorScale(val);
    var colorOutline  = (d['#country+code']==currentCountry) ? '#CCC' : colorDefault;
    
    expression.push(d['#adm1+code'], color);
    expressionOutline.push(d['#adm1+code'], colorOutline);
  });
  expression.push(colorDefault);
  expressionOutline.push(colorDefault);
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryLayer, 'fill-outline-color', expressionOutline);

  //toggle health layer
  if (currentCountryIndicator.id=='#loc+count+health') $('.health-layer').fadeIn()
  else $('.health-layer').fadeOut('fast');

  //hide color scale if no data
  if (max!=undefined && max>0 && currentCountryIndicator.id!='#loc+count+health')
    updateCountryLegend(countryColorScale);
  // else
  //   $('.map-legend.country .legend-container').hide();
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
  // $('.map-legend.country .source-container').empty();
  // $('.map-legend.country .legend-container').remove();
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
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  var nodata = div.append('svg')
    .attr('class', 'no-data');

  nodata.append('rect')
    .attr('width', 15)
    .attr('height', 15);

  nodata.append('text')
    .attr('class', 'label')
    .text('No Data');
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


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
function createMapTooltip(country_code, country_name){
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  //format content for tooltip
  if (val!=undefined && val!='') {
    if (currentIndicator.id.indexOf('pct')>-1) val = percentFormat(val);
    if (currentIndicator.id=='#affected+inneed' || currentIndicator.id=='#severity+economic+num' || currentIndicator.id.indexOf('funding+total+usd')>-1) val = shortenNumFormat(val);
  }
  else {
    val = 'No Data';
  }
  var content = '<h2>' + country_name + '</h2>'+ currentIndicator.name + ':<div class="stat">' + val + '</div>';

  //covid cases and deaths
  content += '<div class="cases">COVID-19 Cases: ' + numFormat(country[0]['#affected+infected']) + '<br/>';
  content += 'COVID-19 Deaths: ' + numFormat(country[0]['#affected+killed']) + '</div>';

  showMapTooltip(content);
}

function createCountryMapTooltip(adm1_name){
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+name']==adm1_name && c['#country+code']==currentCountry)
      return c;
  });
  var val = adm1[0][currentCountryIndicator.id];

  //format content for tooltip
  if (val!=undefined && val!='' && !isNaN(val)) {
    if (currentCountryIndicator.id.indexOf('pct')>-1) val = percentFormat(val);
    if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
  }
  else {
    val = 'No Data';
  }
  var content = '<h2>' + adm1_name + '</h2>' + currentCountryIndicator.name + ':<div class="stat">' + val + '</div>';

  showMapTooltip(content);
}

function showMapTooltip(content) {
  tooltip.setHTML(content);
}


function initCountryView() {
  setSelect('countrySelect', currentCountry);
  $('.content').addClass('country-view');
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
  $('.country-panel').fadeOut();
  setSelect('countrySelect', '');

  updateGlobalLayer();

  map.flyTo({ 
    speed: 2,
    zoom: 2,
    center: [10, 6] 
  });
  map.once('moveend', function() {
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
  });
}

