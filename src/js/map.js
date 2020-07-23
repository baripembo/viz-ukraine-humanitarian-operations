var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = '63_polbnda_int_uncs-29lk4r';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckb843tjb46fy1ilaw49redy7/',
    center: [-25, 0],
    minZoom: 1,
    zoom: zoomLevel,
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
  $('#global-map, .country-select, .map-legend').css('opacity', 1);

  //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
    $('.global-figures').animate({
      left: 0
    }, 200);
  }

  //set initial indicator
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected').attr('data-legend')};

  //init element events
  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      case 'adm0-fills':
        globalLayer = layer.id;

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

  //load pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    var raster = countryCodeList[country_code];
    if (raster!='') {
      map.addSource(id+'-pop-tileset', {
        type: 'raster',
        url: 'mapbox://humdata.'+raster
      });

      map.addLayer(
        {
          'id': id+'-popdensity',
          'type': 'raster',
          'source': id+'-pop-tileset'
        },
        countryBoundaryLayer
      );

      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }
  });

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
    $('.menu-indicators li').removeClass('selected');
    $('.menu-indicators li div').removeClass('expand');
    $(this).addClass('selected');
    if (currentIndicator.id==$(this).attr('data-id')) {
      toggleGlobalFigures(this);
    }
    else {
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};
      toggleGlobalFigures(this, 'open');

      //set food prices view
      if (currentIndicator.id!='#value+food+num+ratio') {
        closeModal();
      }

      mpTrack('wrl', $(this).find('div').text());
      updateGlobalLayer();
    }
  });

  //global figures close button
  $('.global-figures .close-btn').on('click', function() {
    var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
    toggleGlobalFigures(currentBtn);
  });

  //ranking select event
  d3.select('.ranking-select').on('change',function(e) {
    var selected = d3.select('.ranking-select').node().value;
    if (selected!='') {
      updateRankingChart(selected);
    }
  });

  //region select event
  d3.select('.region-select').on('change',function(e) {
    currentRegion = d3.select('.region-select').node().value;
    if (currentRegion=='') {
      resetMap();
    }
    else {        
      selectRegion();
    }
  });

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
  
  //back to global event
  $('.country-panel h2').on('click', function() {
    resetMap();
  });

  //country panel indicator select event
  d3.select('.indicator-select').on('change',function(e) {
    var selected = d3.select('.indicator-select').node().value;
    if (selected!='') {
      var container = $('.panel-content');
      var section = $('.'+selected);
      container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop()}, 300);
    }
  });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
    mpTrack(currentCountry.code, currentCountryIndicator.name);
  });
}

function toggleGlobalFigures(currentBtn, state) {
  var width = $('.global-figures').outerWidth();
  var pos = $('.global-figures').position().left;
  var newPos = (pos<0) ? 0 : -width;
  if (state=='open') {
    newPos = 0;
  }
  
  $('.global-figures').animate({
    left: newPos
  }, 200, function() {
    var div = $(currentBtn).find('div');
    if ($('.global-figures').position().left==0) {
      div.addClass('expand');
    }
    else{
      div.removeClass('expand');
    }
  });
}


function selectRegion() {
  var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
  var offset = 50;
  map.fitBounds(regionFeature[0].bbox, {
    padding: {top: offset, right: $('.map-legend').outerWidth()+offset, bottom: offset, left: $('.global-figures').outerWidth()+offset},
    linear: true
  });

  updateGlobalLayer();
}

function selectCountry(features) {
  //set first country indicator
  $('#population').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);
  $('.indicator-select').val('');

  updateCountryLayer();
  map.setLayoutProperty(globalLayer, 'visibility', 'none');
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  //fix hardcoded coords
  var bbox;
  if (currentCountry.code=='MMR') 
    bbox = [92.197265625, 9.990490803070287, 101.162109375, 28.555576049185973]
  else if (currentCountry.code=='PSE')
    bbox = [34.292578125, 31.35363694150098, 35.5517578125, 32.509761735919426];
  else
    bbox = turf.bbox(turf.featureCollection(features));

  var offset = 50;
  map.fitBounds(bbox, {
    padding: {top: offset, right: $('.map-legend.country').outerWidth()+offset, bottom: offset, left: ($('.country-panel').outerWidth() - $('.content-left').outerWidth()) + offset},
    linear: true
  });

  map.once('moveend', initCountryView);
  mpTrack(currentCountry.code, currentCountryIndicator.name);
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
  colorScale = getGlobalLegendScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val==null) ? colorNoData : colorScale(val);
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
    if (currentIndicator.id!='#value+food+num+ratio') {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#value+food+num+ratio') {
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
      currentCountry.name = (target.properties.Terr_Name=='CuraÃ§ao') ? 'Curaçao' : target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        var country = nationalData.filter(c => c['#country+code'] == currentCountry.code);
        if (currentIndicator.id=='#value+food+num+ratio' && country[0]['#value+food+num+ratio']!=undefined) {
          openModal(currentCountry.name);
        }
      }
    }
  });
}

function updateGlobalLayer() {
  setGlobalFigures();

  //color scales
  colorScale = getGlobalLegendScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct' || currentIndicator.id=='#value+funding+hrp+pct') ? '#E7E4E6' : '#FFF';

  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#covid+cases') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+type' || currentIndicator.id=='#severity+access+category') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
      }
      else {
        color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
      }
      expression.push(d['#country+code'], color);

      //covid markers
      var covidVal = d['#affected+infected'];
      var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
      expressionMarkers.push(d['#country+code'], size);
    }
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  setGlobalLegend(colorScale);
}

function getGlobalLegendScale() {
  //get min/max
  var min = d3.min(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id]; 
  });
  var max = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id];
  });
  if (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) max = 1;
  else if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else if (currentIndicator.id=='#severity+type' || currentIndicator.id=='#severity+access+category') max = 0;
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#covid+cases+per+capita') {
    var data = [];
    nationalData.forEach(function(d) {
      if (d[currentIndicator.id]!=null && regionMatch(d['#region+name']))
        data.push(d[currentIndicator.id]);
    })
    if (data.length==1)
      scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
    else
      scale = d3.scaleQuantile().domain(data).range(colorRange);
  }
  else if (currentIndicator.id=='#severity+access+category') {
    scale = d3.scaleOrdinal().domain(['Low', 'Medium', 'High']).range(accessColorRange);
  }
  else if (currentIndicator.id=='#severity+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id.indexOf('funding')>-1) {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, max]).range(reverseRange);
  }
  else if (currentIndicator.id=='#value+gdp+ifi+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleThreshold()
      .domain([ .01, .02, .03, .05, .05 ])
      .range(reverseRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }

  return (max==undefined) ? null : scale;
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;
  var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;
  $('.map-legend.global .source-secondary').empty();

  //SETUP
  if (d3.select('.map-legend.global .scale').empty()) {
    //current indicator
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

    //vacc methodology explanatory text
    var vaccinationMethodologyText = 'Methodology: Information about interrupted vaccination campaigns contains both official and unofficial information sources. The country ranking has been determined by calculating the ratio of total number of postponed or cancelled campaigns and total vaccination campaigns. Note: data collection is ongoing and may not reflect all the campaigns in every country.';
    $('.map-legend.global').append('<p class="footnote vacc-methodology small">'+ truncateString(vaccinationMethodologyText, 60) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .vacc-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(vaccinationMethodologyText, 60) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(vaccinationMethodologyText + ' <a href="#" class="collapse">LESS</a>');
      }
    });
    //food methodology explanatory text
    var foodMethodologyText = 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://snap.vam.wfp.org/main/" target="_blank">WFP’s model</a>.';
    $('.map-legend.global').append('<p class="footnote food-methodology small">'+ truncateString(foodMethodologyText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .food-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(foodMethodologyText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(foodMethodologyText + ' <a href="#" class="collapse">LESS</a>');
      }
    });

    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 cases</h4>');
    createSource($('.map-legend.global'), '#affected+infected');

    var markersvg = div.append('svg')
      .attr('height', '55px')
      .attr('class', 'casesScale');
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

    //boundaries disclaimer
    var disclaimerText = 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.';
    $('.map-legend.global').append('<p class="footnote disclaimer small">'+ truncateString(disclaimerText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .disclaimer').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(disclaimerText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(disclaimerText + ' <a href="#" class="collapse">LESS</a>');
      }
    });
  }
  else {
    updateSource($('.indicator-source'), indicator);
  }

  //POPULATE
  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  if (currentIndicator.id=='#value+food+num+ratio') legendTitle += '<br>Click on a country to explore commodity prices';
  $('.map-legend.global .indicator-title').html(legendTitle);

  //current indicator
  if (scale==null) {
    $('.map-legend.global .legend-container').hide();
  }
  else {
    $('.map-legend.global .legend-container').show();
    var legend;
    if (currentIndicator.id=='#value+gdp+ifi+pct') {
      var legendFormat = d3.format('.0%');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale)
        .labels(d3.legendHelpers.thresholdLabels)
        //.useClass(true);
    }
    else if (currentIndicator.id=='#severity+access+category') {
      $('.legend-container').addClass('access-severity');
      legend = d3.legendColor()
        .cells(3)
        .scale(scale);
    }
    else {
      $('.legend-container').removeClass('access-severity');
      var legendFormat = (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) ? d3.format('.0%') : shortenNumFormat;
      if (currentIndicator.id=='#covid+cases+per+capita') legendFormat = d3.format('.1f');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale);
    }
    var g = d3.select('.map-legend.global .scale');
    g.call(legend);
  }

  //no data
  var noDataKey = $('.map-legend.global .no-data-key');
  if (currentIndicator.id=='#affected+inneed+pct') {
    noDataKey.find('.label').text('Refugee/IDP data only');
    noDataKey.find('rect').css('fill', '#E7E4E6');

    createSource($('.map-legend.global .source-secondary'), '#affected+refugees');
    createSource($('.map-legend.global .source-secondary'), '#affected+displaced');
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    noDataKey.find('.label').text('Other response plans');
    noDataKey.find('rect').css('fill', '#E7E4E6');
  }
  else {
    noDataKey.find('.label').text('No Data');
    noDataKey.find('rect').css('fill', '#FFF');
  }

  //methodology
  if (currentIndicator.id=='#vaccination+num+ratio')
    $('.vacc-methodology').show();
  else
    $('.vacc-methodology').hide();

  if (currentIndicator.id=='#value+food+num+ratio')
    $('.food-methodology').show();
  else
    $('.food-methodology').hide();

  //cases
  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  d3.select('.casesScale .cell:nth-child(2) .label').text(numFormat(maxCases));
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.content').addClass('country-view');
  $('.country-panel').scrollTop(0);

  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  var clrRange = (currentCountryIndicator.id=='#population') ? populationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(clrRange);
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
  colorNoData = '#FFF';
  if (currentCountryIndicator.id=='#affected+food+ipc+p3+pct') checkIPCData();

  $('.map-legend.country .legend-container').removeClass('no-data');
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

  //color scale
  var clrRange;
  if (currentCountryIndicator.id.indexOf('vaccinated')>0)
    clrRange = immunizationColorRange;
  else if (currentCountryIndicator.id=='#population')
    clrRange = populationColorRange;
  else
    clrRange = colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || val=='' || isNaN(val)) ? colorNoData : countryColorScale(val);
      boundaryColor = (currentCountryIndicator.id=='#population') ? '#FFF' : '#E0E0E0';
      layerOpacity = 1;
    }
    else {
      color = colorDefault;
      boundaryColor = '#E0E0E0';
      layerOpacity = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionBoundary.push(d['#adm1+code'], boundaryColor);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
  });
  expression.push(colorDefault);
  expressionBoundary.push('#E0E0E0');
  expressionOpacity.push(0);

  
  //hide all pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    if (map.getLayer(id+'-popdensity'))
      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  });

  //set properties
  if (currentCountryIndicator.id=='#population') {
    var id = currentCountry.code.toLowerCase();
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'visible');
  }
  else {
    map.setPaintProperty(countryLayer, 'fill-color', expression);
  }
  map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', expressionBoundary);
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);

  //hide color scale if no data
  if (max!=undefined && max>0)
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country .legend-container').addClass('no-data');
}

function checkIPCData() {
  //swap food security data source if empty
  var index = 0;
  var isEmpty = false;
  subnationalData.forEach(function(d) {
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      if (index==0 && (!isVal(val) || isNaN(val))) {
        isEmpty = true;
      }
      if (index==1 && isEmpty && isVal(val) && !isNaN(val)) {
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
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3+pct');
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

  $('.map-legend.country').append('<p class="footnote small">The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.</p>');
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
      content += "Weekly number of new cases" + ':<div class="stat covid-cases">' + numFormat(country[0]['#covid+cases']) + '</div>';
      content += "Weekly number of new deaths" + ':<div class="stat covid-deaths">' + numFormat(country[0]['#covid+deaths']) + '</div>';
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
    //access layer
    else if (currentIndicator.id=='#severity+access+category') {
      if (val!='No Data') {
        var accessLabels = ['Top 3 access restrictions into country:', 'Top 3 access restrictions within country:', 'Top 3 impacts:', 'Mitigation measures:'];
        var accessTags = ['#access+constraints+into+desc','#access+constraints+within+desc','#access+impact+desc','#access+mitigation+desc'];
        accessLabels.forEach(function(label, index) {
          if (accessTags[index]=='#access+mitigation+desc' && country[0][accessTags[index]]!=undefined) {
            content += '<label class="access-label">'+ label + '</label> '+ country[0][accessTags[index]].toUpperCase();
          }
          else {
            var arr = (country[0][accessTags[index]]!=undefined) ? country[0][accessTags[index]].split('|') : [];
            content += '<label class="access-label">'+ label + '</label>';
            content += '<ul>';
            arr.forEach(function(item, index) {
              if (index<3)
                content += '<li>'+ item + '</li>';
            });
            content += '</ul>';
          }
        });
      }
      else {
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }
    }
    //Vaccination campaigns layer
    else if (currentIndicator.id=='#vaccination+num+ratio') {
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
        var fundingArray = ['adb','afdb','ec','eib','idb','imf','isdb','unmptf','wb'];
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
      //weekly cases sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d.date_epicrv, value: d.weekly_new_cases};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .stat.covid-cases');

      //weekly deaths sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d.date_epicrv, value: d.weekly_new_deaths};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .stat.covid-deaths');
      
      //weekly trend bar charts
      if (country[0]['#covid+trend+pct']!=undefined) {
        var pctArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d.date_epicrv, value: d.weekly_new_cases_pc_change};
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
   if (currentCountry.code!=undefined) {
    var id = currentCountry.code.toLowerCase()
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  }
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-select').val('');

  if (currentRegion!='') {
    selectRegion();
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
  }
  else {
    updateGlobalLayer();

    map.flyTo({ 
      speed: 2,
      zoom: zoomLevel,
      center: [-25, 0] 
    });
    map.once('moveend', function() {
      map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    });
  }
}

