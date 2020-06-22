var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = '63_polbnda_int_uncs-29lk4r';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckb843tjb46fy1ilaw49redy7/',
    center: [10, 6],
    minZoom: 1,
    zoom: 2,
    attributionControl: false
  });

  map.addControl(new mapboxgl.NavigationControl())
     .addControl(new mapboxgl.AttributionControl(), 'bottom-right');

  map.on('load', function() {
    console.log('Map loaded')
    
    mapLoaded = true;
    if (dataLoaded==true) displayMap();
  });
}

function displayMap() {
  console.log('Display map');

  //remove loader and show vis
  $('.loader, #static-map').remove();
  $('#global-map, .country-select, .map-legend, .global-figures').css('opacity', 1);

  createEvents();


  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      case 'adm0-fills':
        globalLayer = layer.id;

        // map.setPaintProperty(globalLayer, 'fill-opacity', [
        //   'case',
        //   ['boolean', ['feature-state', 'hover'], false],
        //   1,
        //   0.5
        // );

        map.setFeatureState(
          { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
          { hover: false }
        );
        break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        break;
      case 'adm0-centroids':
        globalMarkerLayer = layer.id;
        break;
      case 'adm1-fills':
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
        break;
      case 'hrp25-centroid-adm1-simplified-o':
        countryLabelLayer = layer.id;
        map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        map.setLayoutProperty(countryMarkerLayer, 'visibility', 'none');
        break;
      default:
        //do nothing
    }
  });

  mapFeatures = map.queryRenderedFeatures();

  //country select event
  d3.select('.country-select').on('change',function(e) {
    var selected = d3.select('.country-select').node().value;
    if (selected=='') {
      resetMap();
    }
    else {        
      currentCountry.code = selected;
      currentCountry.name = d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
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
}


function matchMapFeatures(country_code) {
  //loop through mapFeatures to find matches to currentCountry.code
  var selectedFeatures = [];
  mapFeatures.forEach(function(feature) {
    if (feature.sourceLayer==adm0SourceLayer && feature.properties.ISO_3==currentCountry.code) {
      selectedFeatures.push(feature)
    }
  });
  return selectedFeatures;
}

function createEvents() {
  //menu events
  $('.menu-indicators li').on('click', function() {
    $('.menu-indicators li').removeClass('selected')
    $(this).addClass('selected');
    currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};

    //set food prices view
    if (currentIndicator.id=='#food-prices') {
      $('.content').addClass('food-prices-view');
    }
    else {
      $('.content').removeClass('food-prices-view');
      closeModal();
    }

    //set travel restrictions view
    if (currentIndicator.id=='#severity+travel') {
      $('.content').addClass('travel-restrictions-view');
    }
    else {
      $('.content').removeClass('travel-restrictions-view');
    }

    updateGlobalLayer();
  });
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected div').text()};
  
  //back to global event
  $('.country-menu h2').on('click', function() {
    resetMap();
  });

  //country panel indicator select event
  d3.select('.indicator-select').on('change',function(e) {
    var selected = d3.select('.indicator-select').node().value;
    if (selected!='') {
      var container = $('.country-panel');
      var section = $('.'+selected);
      var offset = $('.panel-header').innerHeight();
      container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop() - offset}, 300);
    }
  });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
  });
}

function selectCountry(features) {
  //set first country indicator
  $('#foodSecurity').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  updateCountryLayer();
  map.setLayoutProperty(globalLayer, 'visibility', 'none');
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  var bbox = turf.bbox(turf.featureCollection(features));
  var offset = 50;
  map.fitBounds(bbox, {
    padding: {left: $('.map-legend.country').outerWidth()+offset+10, right: $('.country-panel').outerWidth()+offset},
    linear: true
  });

  map.once('moveend', initCountryView);
}

function setTravelDescription(country) { 
  var data = dataByCountry[country.code][0];
  var text = truncateString(data['#severity+travel'], 275);
  var content = '<h2 class="title">'+ country.name +'</h2>';
  content += '<span class="small">Published on: '+ data['#severity+date+travel'] +'</span>';
  content += '<p>Restrictions: '+ text +'</p>';
  content += '<a href="https://unwfp.maps.arcgis.com/apps/opsdashboard/index.html#/db5b5df309ac4f10bfd36145a6f8880e" target="_blank">Read More&nbsp;&nbsp;<i class="humanitarianicons-Out-of-platform"></i></a>';
  $('.layer-description .description-content').empty().append(content);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function initGlobalLayer() {
  //create log scale for circle markers
  var maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
  markerScale = d3.scaleSqrt()
    .domain([1, maxCases])
    .range([2, 15]);
  
  //color scale
  colorScale = getGlobalColorScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val<=0 || val=='' || isNaN(val)) ? colorNoData : colorScale(val);
    expression.push(d['#country+code'], color);

    //covid markers
    var covidVal = d['#affected+infected'];
    var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
    expressionMarkers.push(d['#country+code'], size);
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);
  
  //set properties
  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setPaintProperty(globalMarkerLayer, 'circle-stroke-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  map.setPaintProperty(globalMarkerLayer, 'circle-translate', [0,-7]);

  //define mouse events
  handleGlobalEvents();

  //global figures
  setGlobalFigures();
}

function handleGlobalEvents(layer) {
  map.on('mouseenter', globalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id=='#food-prices' || currentIndicator.id=='#severity+travel') {
      //console.log(e)
      // if (hoveredStateId) {
      //   map.setFeatureState(
      //     { source: 'composite', sourceLayer: adm0SourceLayer, id: hoveredStateId },
      //     { hover: false }
      //   );
      // }
      // hoveredStateId = e.features[0].id;
      // //console.log('hoveredStateId', hoveredStateId  )
      // map.setFeatureState(
      //   { source: 'composite', sourceLayer: adm0SourceLayer, id: hoveredStateId },
      //   { hover: true }
      // );
    }
    else {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#food-prices' && currentIndicator.id!='#severity+travel') {
      var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
      var target;
      features.forEach(function(feature) {
        if (feature.sourceLayer==adm0SourceLayer)
          target = feature;
      });
      if (target!=undefined) {
        tooltip.setLngLat(e.lngLat);
        if (target.properties.Terr_Name=='CuraÃ§ao') target.properties.Terr_Name = 'Curaçao';
        createMapTooltip(target.properties.ISO_3, target.properties.Terr_Name)
      }
    }
  });
     
  map.on('mouseleave', globalLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  map.on('click', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
    var target;
    features.forEach(function(feature) {
      if (feature.sourceLayer==adm0SourceLayer)
        target = feature;
    });
  
    if (target!=null) {
      currentCountry.code = target.properties.ISO_3;
      currentCountry.name = target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        if (currentIndicator.id=='#food-prices' && getCountryIDByName(currentCountry.name)!=undefined) {
          openModal(currentCountry.name);
        }
        if (currentIndicator.id=='#severity+travel') {
          setTravelDescription(currentCountry);
        }
      }
    }
    
  });
}

function updateGlobalLayer() {
  setGlobalFigures();

  //color scales
  colorScale = getGlobalColorScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct' || currentIndicator.id=='#value+funding+hrp+pct') ? '#E7E4E6' : '#FFF';

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = colorDefault;
    
    if (currentIndicator.id=='#food-prices') {
      var id = getCountryIDByName(d['#country+name']);
      color = (id!=undefined) ? foodPricesColor : colorNoData;
    }
    else if (currentIndicator.id=='#severity+travel') {
      color = travelColor;
    }
    else if (currentIndicator.id=='#severity+type' || currentIndicator.id=='#vaccination-campaigns') {
      color = (!isVal(val)) ? colorNoData : colorScale(val);
    }
    else {
      color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
    }
    expression.push(d['#country+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  setGlobalLegend(colorScale);

  if (currentIndicator.id=='#food-prices' || currentIndicator.id=='#severity+travel') {
    map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');

    var layer = $('.layer-description');
    layer.find('.description-content, .description-source').empty();    
    createSource($('.layer-description .description-source'), currentIndicator.id);
    if (currentIndicator.id=='#food-prices') {
      layer.find('h4').text('Click on a country to explore commodity prices');
    }
    if (currentIndicator.id=='#severity+travel') {
      layer.find('h4').text('Click on a country to view travel restrictions');
    }
  }
  else {
    map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  }
}

function getGlobalColorScale() {
  var min = d3.min(nationalData, function(d) { return +d[currentIndicator.id]; });
  var max = d3.max(nationalData, function(d) { return +d[currentIndicator.id]; });
  if (currentIndicator.id.indexOf('pct')>-1) max = 1;
  else if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else max = max;

  var scale;
  if (currentIndicator.id=='#severity+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id.indexOf('funding')>-1 || currentIndicator.id=='#value+gdp+ifi+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, max]).range(reverseRange);
  }
  else if (currentIndicator.id=='#covid+cases+per+capita') {
    scale = d3.scaleQuantile().domain([0, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#vaccination-campaigns') {
    scale = d3.scaleOrdinal().domain(['Postponed / May postpone', 'On Track']).range(vaccinationColorRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }

  return scale;
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;

  //catch PIN pct indicator
  var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;
  $('.map-legend.global .source-secondary').empty();

  if (d3.select('.map-legend.global .scale').empty()) {
    createSource($('.map-legend.global .indicator-source'), indicator);
    svg = div.append('svg')
      .attr('class', 'legend-container');
    svg.append('g')
      .attr('class', 'scale');

    var nodata = div.append('svg')
      .attr('class', 'no-data-key');

    nodata.append('rect')
      .attr('width', 15)
      .attr('height', 15);

    nodata.append('text')
      .attr('class', 'label')
      .text('No Data');

    //secondary source
    $('.map-legend.global').append('<div class="source-secondary"></div>');

    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 cases</h4>');
    createSource($('.map-legend.global'), '#affected+infected');
    var markersvg = div.append('svg')
      .attr('height', '55px');
    markersvg.append('g')
      .attr("transform", "translate(5, 10)")
      .attr('class', 'legendSize');

    var legendSize = d3.legendSize()
      .scale(markerScale)
      .shape('circle')
      .shapePadding(40)
      .labelFormat(numFormat)
      .labelOffset(15)
      .cells(2)
      .orient('horizontal');

    markersvg.select('.legendSize')
      .call(legendSize);
  }
  else {
    updateSource($('.indicator-source'), indicator);
  }

  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  $('.map-legend.global .indicator-title').text(legendTitle);

  if (currentIndicator.id=='#affected+inneed+pct') {
    $('.no-data-key .label').text('Refugee/IDP data only');
    $('.no-data-key rect').css('fill', '#e7e4e6');

    createSource($('.map-legend.global .source-secondary'), '#affected+refugees');
    createSource($('.map-legend.global .source-secondary'), '#affected+displaced');
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    $('.no-data-key .label').text('Other response plans');
    $('.no-data-key rect').css('fill', '#e7e4e6');
  }
  else {
    $('.no-data-key .label').text('No Data');
    $('.no-data-key rect').css('fill', '#FFF');
  }

  var legendFormat = ((currentIndicator.id).indexOf('pct')>-1) ? d3.format('.0%') : shortenNumFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.global .scale');
  g.call(legend);

  if (currentIndicator.id=='#vaccination-campaigns')
    $('.legend-container').addClass('vaccination-campaign');
  else
    $('.legend-container').removeClass('vaccination-campaign');
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.content').removeClass('food-prices-view');
  $('.content').removeClass('travel-restrictions-view');
  $('.content').addClass('country-view');
  $('.country-panel').show().scrollTop(0);

  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  //mouse events
  map.on('mouseenter', countryLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });

  map.on('mousemove', countryLayer, function(e) {
    var f = map.queryRenderedFeatures(e.point)[0];
    if (f.properties.ADM0_REF=='State of Palestine' || f.properties.ADM0_REF=='Venezuela (Bolivarian Republic of)') f.properties.ADM0_REF = currentCountry.name;
    if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_REF==currentCountry.name) {
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
  if (currentCountryIndicator.id=='#affected+food+ipc+p3+pct') checkIPCData();

  $('.map-legend.country .legend-container').removeClass('no-data');
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

  //color scale
  var clrRange = (currentCountryIndicator.id.indexOf('vaccinated')>0) ? immunizationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  //create log scale for circle markers
  // var healthFacilityMax = d3.max(subnationalData, function(d) {
  //   if (d['#country+code']==currentCountry.code)
  //     return +d['#loc+count+health']; 
  // })
  // var markerScale = d3.scaleSqrt()
  //   .domain([1, healthFacilityMax])
  //   .range([2, 15]);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  //var expressionMarkers = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || val=='' || isNaN(val)) ? colorNoData : countryColorScale(val);
      layerOpacity = 1;

      //health facility markers
      // var healthVal = (currentCountryIndicator.id=='#loc+count+health') ? d['#loc+count+health'] : 0;
      // markerSize = markerScale(healthVal);
    }
    else {
      color = colorDefault;
      layerOpacity = 0;
      //markerSize = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
    //expressionMarkers.push(d['#adm1+code'], markerSize);
  });
  expression.push(colorDefault);
  expressionOpacity.push(0);
  //expressionMarkers.push(0);

  //set properties
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);

  //set health facility markers
  // map.setPaintProperty(countryMarkerLayer, 'circle-radius', expressionMarkers);
  // map.setPaintProperty(countryMarkerLayer, 'circle-color', '#007ce1');
  // map.setPaintProperty(countryMarkerLayer, 'circle-opacity', 0.6);
  // map.setPaintProperty(countryMarkerLayer, 'circle-translate', [0,-10]);

  //hide color scale if no data
  if (max!=undefined && max>0)
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country .legend-container').addClass('no-data');

  //load pop density raster
  // var id = currentCountry.code.toLowerCase();
  // var raster = '';
  // switch(id) {
  //   case 'ukr':
  //     raster = 'adkwa0bw';
  //     break;
  //   case 'bdi':
  //     raster = '85uxb0dw';
  //     break;
  //   case 'col':
  //     raster = 'awxirkoh';
  //     break;
  //   case 'pse':
  //     raster = '1emy37d7';
  //     break;
  //   default:
  //     //
  // }


  // if (map.getLayer(id+'-popdensity')) {
  //   map.removeLayer(id+'-popdensity');
  // }
  // if (map.getSource(id+'-pop-tileset')) {
  //   map.removeSource(id+'-pop-tileset');
  // }


  // if (currentCountryIndicator.id=='#population' && raster!='') {
  //   map.addSource(id+'-pop-tileset', {
  //     type: 'raster',
  //     url: 'mapbox://humdata.'+raster
  //   });

  //   map.addLayer(
  //     {
  //       'id': id+'-popdensity',
  //       'type': 'raster',
  //       'source': id+'-pop-tileset'
  //     },
  //     countryBoundaryLayer
  //   );
  // }
}

function checkIPCData() {
  //swap food security data source if empty
  var index = 0;
  var isEmpty = false;
  subnationalData.forEach(function(d) {
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      if (index==0 && val==' ') {
        isEmpty = true;
      }
      if (isEmpty && index==1 && val!=' ') {
        isEmpty = false;
      }
      index++;
    }
  });

  if (isEmpty) currentCountryIndicator.id = '#affected+ch+food+p3+pct';
}

function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}

function createCountryLegend(scale) {
  createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3+pct');
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

  //no data
  var nodata = div.append('svg')
    .attr('class', 'no-data-key');

  nodata.append('rect')
    .attr('width', 15)
    .attr('height', 15);

  nodata.append('text')
    .attr('class', 'label')
    .text('No Data');
}

function updateCountryLegend(scale) {
  if (currentCountryIndicator.id=='#affected+ch+food+p3+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3+pct') {
    $('.map-legend.country .food-security-source').empty();
    createSource($('.map-legend.country .food-security-source'), currentCountryIndicator.id);
  }

  var legendFormat;
  switch(currentCountryIndicator.id) {
    case '#affected+food+ipc+p3+pct':
      legendFormat = percentFormat;
      break;
    case '#affected+ch+food+p3+pct':
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
var lastHovered = '';
function createMapTooltip(country_code, country_name) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  //format content for tooltip
  if (lastHovered!=country_code) {
    //set formats for value
    if (isVal(val)) {
      if (currentIndicator.id.indexOf('pct')>-1) val = (isNaN(val)) ? 'No Data' : percentFormat(val);
      if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
      if (currentIndicator.id.indexOf('funding+total')>-1) val = formatValue(val);
    }
    else {
      val = 'No Data';
    }

    //format content for display
    var content = '<h2>' + country_name + '</h2>';

    //COVID trend layer shows sparklines
    if (currentIndicator.id=='#covid+cases+per+capita') {
      if (val!='No Data') {
        val = (val.toFixed(0)<1) ? '<1' : val.toFixed(0);
      }
      content += "Weekly number of new cases per 100,000 people" + ':<div class="stat covid-capita">' + val + '</div>';
      content += "Weekly trend (new cases past week / prior week)" + ':<div class="stat covid-pct">' + percentFormat(country[0]['#covid+trend+pct']) + '</div>';
    }
    //PIN layer shows refugees and IDPs
    else if (currentIndicator.id=='#affected+inneed+pct') {
      if (val!='No Data') {
        content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }
      content += '<div class="pins">';
      if (isVal(country[0]['#affected+inneed'])) content += 'People in Need: '+ numFormat(country[0]['#affected+inneed']) +'<br/>';
      if (isVal(country[0]['#affected+refugees'])) content += 'Refugees: '+ numFormat(country[0]['#affected+refugees']) +'<br/>';
      if (isVal(country[0]['#affected+displaced'])) content += 'IDPs: '+ numFormat(country[0]['#affected+displaced']) +'<br/>';
      content += '</div>';
    }
    //Vaccination campaigns layer
    else if (currentIndicator.id=='#vaccination-campaigns') {
      var vaccData = [];
      vaccinationDataByCountry.forEach(function(country) {
        if (country.key==country_code) {
          vaccData = country.values;
        }
      });
      if (vaccData.length<1) {
        var content = '<h2>' + country_name + '</h2><div class="stat">No data</div>';
      }
      else {
        var content = '<h2>' + country_name + '</h2>';
        content += '<table><tr><th>Campaign Vaccine:</th><th>Planned Start Date:</th><th>Status:</th></tr>';
        vaccData.forEach(function(row) {
          var className = (row['#status+name'].indexOf('Postpone')>-1) ? 'covid-postpone' : '';
          content += '<tr class="'+className+'"><td>'+row['#service+name']+'</td><td>'+row['#date+start']+'</td><td>'+row['#status+name']+'</td></tr>';
        });
        content += '</table>';
      }
    }
    //Humanitarian Funding Level layer
    else if (currentIndicator.id=='#value+funding+hrp+pct') {
      if (val!='No Data') {
        content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
        if (isVal(country[0]['#value+funding+hrp+required+usd'])) content += 'HRP requirement: '+ formatValue(country[0]['#value+funding+hrp+required+usd']) +'<br/>';
        if (isVal(country[0]['#value+covid+funding+hrp+required+usd'])) content += 'COVID-19 GHRP requirement: '+ formatValue(country[0]['#value+covid+funding+hrp+required+usd']) +'<br/>';
      }
      if (isVal(country[0]['#value+funding+other+planname'])) {
        var planArray = country[0]['#value+funding+other+planname'].split('|');
        var planPctArray = (isVal(country[0]['#value+funding+other+pct'])) ? country[0]['#value+funding+other+pct'].split('|') : [0];
        var planRequiredArray = (isVal(country[0]['#value+funding+other+required+usd'])) ? country[0]['#value+funding+other+required+usd'].split('|') : [0];
        var planTotalArray = (isVal(country[0]['#value+funding+other+total+usd'])) ? country[0]['#value+funding+other+total+usd'].split('|') : [0];

        if (val!='No Data') content += '<br/>';
        planArray.forEach(function(plan, index) {
          content +=  plan + ' Funding Level:<div class="stat">' + percentFormat(planPctArray[index]) + '</div>';
          content += 'Requirement: '+ formatValue(planRequiredArray[index]) +'<br/>';
          content += 'Total: '+ formatValue(planTotalArray[index]) +'<br/>';
          if (index==0 && planArray.length>1) content += '<br/>';
        });
      }
    }
    //IFI financing layer
    else if (currentIndicator.id=='#value+gdp+ifi+pct') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        if (isVal(country[0]['#value+ifi+percap'])) content += 'Total IFI Funding per Capita: '+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'<br/>';
        if (isVal(country[0]['#value+ifi+total'])) content += 'Total amount combined: '+ formatValue(country[0]['#value+ifi+total']);
      
        content += '<div class="subtext">Breakdown:<br/>';
        var fundingArray = ['adb','afdb','devco','eib','imf','isdb','ladb','unmptf','wb'];
        fundingArray.forEach(function(fund) {
          var fundName = (fund=='wb') ?  'World Bank' : fund.toUpperCase(); 
          if (isVal(country[0]['#value+'+fund+'+total'])) content += fundName +': '+ formatValue(country[0]['#value+'+fund+'+total']) +'<br/>';
        });
        content += '</div>';
      }
    }
    //all other layers
    else {
      content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
    }

    //covid cases and deaths
    var numCases = (isVal(country[0]['#affected+infected'])) ? numFormat(country[0]['#affected+infected']) : 'NA';
    var numDeaths = (isVal(country[0]['#affected+killed'])) ? numFormat(country[0]['#affected+killed']) : 'NA';
    content += '<div class="cases">COVID-19 Cases: ' + numCases + '<br/>';
    content += 'COVID-19 Deaths: ' + numDeaths + '</div>';

    //set content for tooltip
    tooltip.setHTML(content);

    //COVID cases layer charts -- inject this after divs are created in tooltip
    if (currentIndicator.id=='#covid+cases+per+capita' && val!='No Data') {
      //per capita sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d.date_epicrv, value: d.weekly_new_cases_per_ht};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .stat.covid-capita');
      
      //weekly trend bar charts
      if (country[0]['#covid+trend+pct']!=undefined) {
        var pctArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d.date_epicrv, value: d.weekly_pc_change};
          pctArray.push(obj);
        });
        createTrendBarChart(pctArray, '.mapboxgl-popup-content .stat.covid-pct');
      }
      
    }
  }
  lastHovered = country_code;
}


function createCountryMapTooltip(adm1_name) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+name']==adm1_name && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
    }
    else {
      val = 'No Data';
    }
    var content = '<h2>' + adm1_name + '</h2>' + currentCountryIndicator.name + ':<div class="stat">' + val + '</div>';

    tooltip.setHTML(content);
  }
}


function resetMap() {
  // var id = currentCountry.code.toLowerCase();
  // if (map.getLayer(id+'-popdensity')) {
  //   map.removeLayer(id+'-popdensity');
  // }
  // if (map.getSource(id+'-pop-tileset')) {
  //   map.removeSource(id+'-pop-tileset');
  // }
  
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-panel').fadeOut();
  setSelect('countrySelect', '');

  if (currentIndicator.id=='#food-prices') {
    $('.content').addClass('food-prices-view');
  }
  if (currentIndicator.id=='#severity+travel') {
    $('.content').addClass('travel-restrictions-view');
  }

  updateGlobalLayer();

  map.flyTo({ 
    speed: 2,
    zoom: 2,
    center: [10, 6] 
  });
  map.once('moveend', function() {
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    //map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  });
}

