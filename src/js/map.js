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

  map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
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
  $('#global-map, .country-select, .map-legend, .tab-menubar').css('opacity', 1);

  //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
    $('.tab-menubar, #chart-view').css('left', $('.secondary-panel').outerWidth());
    $('.secondary-panel').animate({
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
          id: id+'-popdensity',
          type: 'raster',
          source: {
            type: 'raster',
            tiles: ['https://api.mapbox.com/v4/humdata.'+raster+'/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA'],
          }
        },
        countryBoundaryLayer
      );
      // map.addLayer(
      //   {
      //     'id': id+'-popdensity',
      //     'type': 'raster',
      //     'source': id+'-pop-tileset'
      //   },
      //   countryBoundaryLayer
      // );

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

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkView();

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

function deepLinkView() {
  var location = window.location.search;
  //deep link to country view
  if (location.indexOf('?c=')>-1) {
    var countryCode = location.split('c=')[1].toUpperCase();
    if (countryCodeList.hasOwnProperty(countryCode)) {    
      $('.country-select').val(countryCode);
      currentCountry.code = countryCode;
      currentCountry.name = d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
  }
  //deep link to specific layer in global view
  if (location.indexOf('?layer=')>-1) {
    var layer = location.split('layer=')[1];
    var menuItem = $('.menu-indicators').find('li[data-layer="'+layer+'"]');
    if (menuItem!=undefined) selectLayer(menuItem)
  }
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
    selectLayer(this);
  });

  //global figures close button
  $('.secondary-panel .close-btn').on('click', function() {
    var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
    toggleSecondaryPanel(currentBtn);
  });

  //ranking select event
  d3.selectAll('.ranking-select').on('change',function(e) {
    var selected = d3.select(this).node().value;
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
  $('.backtoGlobal').on('click', function() {
    resetMap();
    window.history.replaceState(null, null, window.location.pathname);
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

//set global layer view
function selectLayer(menuItem) {
  $('.menu-indicators li').removeClass('selected');
  $('.menu-indicators li div').removeClass('expand');
  $(menuItem).addClass('selected');
  if (currentIndicator.id==$(menuItem).attr('data-id')) {
    toggleSecondaryPanel(menuItem);
  }
  else {
    currentIndicator = {id: $(menuItem).attr('data-id'), name: $(menuItem).attr('data-legend')};
    toggleSecondaryPanel(menuItem, 'open');

    //set food prices view
    if (currentIndicator.id!='#value+food+num+ratio') {
      closeModal();
    }

    mpTrack('wrl', $(menuItem).find('div').text());
    updateGlobalLayer();
  }

  //handle tab views
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.content').addClass('tab-view');
    $('.tab-menubar').show();
  }
  else {
    $('.content').removeClass('tab-view');
    $('.tab-menubar').hide();
    $('#chart-view').hide();
  }
}


function toggleSecondaryPanel(currentBtn, state) {
  var width = $('.secondary-panel').outerWidth();
  var pos = $('.secondary-panel').position().left;
  var newPos = (pos<0) ? 0 : -width;
  if (state=='open') { newPos = 0; }
  var newTabPos = (newPos==0) ? width : 0;
  
  $('.secondary-panel').animate({
    left: newPos
  }, 200, function() {
    var div = $(currentBtn).find('div');
    if ($('.secondary-panel').position().left==0) {
      div.addClass('expand');
    }
    else {
      div.removeClass('expand');
    }
  });

  $('.tab-menubar, #chart-view').animate({
    left: newTabPos
  }, 200);
}


function selectRegion() {
  var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
  var offset = 50;
  map.fitBounds(regionFeature[0].bbox, {
    padding: {top: offset, right: $('.map-legend').outerWidth()+offset, bottom: offset, left: $('.secondary-panel').outerWidth()+offset},
    linear: true
  });

  mpTrack(currentRegion, currentIndicator.name);
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

  var target = bbox.default(turfHelpers.featureCollection(features));
  var offset = 50;
  map.fitBounds(target, {
    padding: {top: offset, right: $('.map-legend.country').outerWidth()+offset, bottom: offset, left: ($('.country-panel').outerWidth() - $('.content-left').outerWidth()) + offset},
    linear: true
  });

  map.once('moveend', initCountryView);
  mpTrack(currentCountry.code, currentCountryIndicator.name);

  //append country code to url
  window.history.replaceState(null, null, '?c='+currentCountry.code);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
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
        createMapTooltip(target.properties.ISO_3, target.properties.Terr_Name, e.point);
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
  setKeyFigures();
}

function updateGlobalLayer() {
  setKeyFigures();

  //color scales
  colorScale = getGlobalLegendScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct' || currentIndicator.id=='#value+funding+hrp+pct') ? '#E7E4E6' : '#FFF';

  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  //data join
  var countryList = [];
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#affected+infected+new+weekly') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
        if (isVal(val)) {
          color = (val==0) ? '#DDD' : colorScale(val);
        }
        else {
          color = colorNoData;
        }
      }
      else {
        color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
      }
      expression.push(d['#country+code'], color);

      //covid markers
      var covidVal = d['#affected+infected'];
      var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
      expressionMarkers.push(d['#country+code'], size);

      //create country list for global timeseries chart
      countryList.push(d['#country+name']);
    }
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  setGlobalLegend(colorScale);

  //update global timeseries chart
  globalTimeseriesChart.hide();
  globalTimeseriesChart.show(countryList);
  createTimeseriesLegend(globalTimeseriesChart);
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
  
  if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else if (currentIndicator.id=='#severity+inform+type') max = 0;
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') max = 0.2;
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
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
  else if (currentIndicator.id=='#vaccination+postponed+num') {
    //set the max to at least 5
    max = (max>5) ? max : 5;
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#severity+stringency+num') {
    scale = d3.scaleQuantize().domain([0, 100]).range(oxfordColorRange);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
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
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleThreshold()
      .domain([ 0.03, 0.05, 0.1, 0.15 ])
      .range(colorRange);
      //0- 3%; 3-5%; 5-10%; 10-15%; 15-20%"
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

    //bucket reserved for special cases
    var special = div.append('svg')
      .attr('class', 'special-key');

    special.append('rect')
      .attr('width', 15)
      .attr('height', 15);

    special.append('text')
      .attr('class', 'label')
      .text('');

    //no data bucket
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

    //covid positive testing footnote
    createFootnote('.map-legend.global', 'Positive Testing Rate: This is the daily positive rate, given as a rolling 7-day average. According WHO, a positive rate of less than 5% is one indicator that the pandemic may be under control in a country.', '#affected+infected+new+per100000+weekly');
    //vaccine footnote
    createFootnote('.map-legend.global', 'Note: Data refers to doses delivered to country not administered to people. Only countries with a Humanitarian Response Plan are included', '#targeted+doses+delivered+pct');
    //pin footnote
    createFootnote('.map-legend.global', 'Population percentages greater than 100% include refugees, migrants, and/or asylum seekers.', '#affected+inneed+pct');
    //vacc footnote
    createFootnote('.map-legend.global', 'Methodology: Information about interrupted immunization campaigns contains both official and unofficial information sources. The country ranking has been determined by calculating the ratio of total number of postponed or cancelled campaigns and total immunization campaigns. Note: data collection is ongoing and may not reflect all the campaigns in every country.', '#vaccination+postponed+num');
    //food prices footnote
    createFootnote('.map-legend.global', 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.', '#value+food+num+ratio');
    //oxford footnote
    createFootnote('.map-legend.global', 'Note: This is a composite measure based on nine response indicators including school closures, workplace closures, and travel bans, rescaled to a value from 0 to 100 (100 = strictest)', '#severity+stringency+num');
    //access footnote
    createFootnote('.map-legend.global', '1. Access data is collected by OCHA and is based on information provided by humanitarian partners. 2. CERF and CBPF access data is collected by OCHA at country level and includes all projects affected by security incidents, access constraints or other bureaucratic impediments. 3. In order to ensure coherence and consistency in the analysis of security incidents, a single source of information has been used (AWSD). OCHA acknowledges that other sources of information are available at country level to complement the security analysis.', '#event+year+todate+num');


    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 Cases</h4>');
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

    //gender disaggregation footnote
    // $('.map-legend.global').append('<h4><i class="humanitarianicons-User"></i> (On hover) COVID-19 Sex-Disaggregated Data Tracker</h4>');
    // createSource($('.map-legend.global'), '#affected+killed+m+pct');
    createFootnote('.map-legend.global', '*Distribution of COVID19 cases and deaths by gender are taken from Global Health 50/50 COVID-19 <a href="https://data.humdata.org/organization/global-health-50-50" target="_blank" rel="noopener">Sex-disaggregated Data Tracker</a>. Figures refer to the last date where sex-disaggregated data was available and in some cases the gender distribution may only refer to a portion of total cases or deaths. These proportions are intended to be used to understand the breakdown of cases and deaths by gender and not to monitor overall numbers per country. Definitions of COVID-19 cases and deaths recorded may vary by country.', '#affected+infected+sex+new+avg+per100000');

    //GAM footnote
    var gamText = '**Gender-Age Marker:<br>0- Does not systematically link programming actions<br>1- Unlikely to contribute to gender equality (no gender equality measure and no age consideration)<br>2- Unlikely to contribute to gender equality (no gender equality measure but includes age consideration)<br>3- Likely to contribute to gender equality, but without attention to age groups<br>4- Likely to contribute to gender equality, including across age groups';
    createFootnote('.map-legend.global', gamText, '#value+cerf+covid+funding+total+usd');
    createFootnote('.map-legend.global', gamText, '#value+cbpf+covid+funding+total+usd');

    //boundaries disclaimer
    createFootnote('.map-legend.global', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

    //expand/collapse functionality
    $('.map-legend.global .toggle-icon, .map-legend.global .collapsed-title').on('click', function() {
      $(this).parent().toggleClass('collapsed');
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
    if (currentIndicator.id=='#value+gdp+ifi+pct' || currentIndicator.id=='#targeted+doses+delivered+pct') {
      var legendFormat = d3.format('.0%');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale)
        .labels(d3.legendHelpers.thresholdLabels)
        //.useClass(true);
    }
    else {
      var legendFormat = (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) ? d3.format('.0%') : shortenNumFormat;
      if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') legendFormat = d3.format('.1f');
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
  var specialKey = $('.map-legend.global .special-key');
  specialKey.hide();
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
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    noDataKey.find('.label').text('Not Included');
    noDataKey.find('rect').css('fill', '#FFF');

    specialKey.css('display', 'block');
    specialKey.find('.label').text('Allocations');
    specialKey.find('rect').css('fill', '#DDD');
  }
  else {
    noDataKey.find('.label').text('No Data');
    noDataKey.find('rect').css('fill', '#FFF');
  }

  //show/hide footnotes
  $('.footnote-indicator').hide();
  $('.footnote-indicator[data-indicator="'+ currentIndicator.id +'"]').show();

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
  $('.content').removeClass('tab-view').addClass('country-view');
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
  if (currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct') currentCountryIndicator.id = getIPCDataSource();
  $('.map-legend.country .legend-container').removeClass('no-data');

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num' || currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 10);

  //color scale
  var clrRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#vaccination+postponed+num':
      clrRange = immunizationColorRange;
      break;
    default:
      clrRange = colorRange;
  }
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
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', expressionBoundary);
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);

  //hide color scale if no data
  if (max!=undefined && max>0)
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country .legend-container').addClass('no-data');
}

function getIPCDataSource() {
  var source = '';
  subnationalDataByCountry.forEach(function(d) {
    if (d.key==currentCountry.code) {
      source = d['#ipc+source'];
    }
  });
  return source;
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
  createSource($('.map-legend.country .idps-source'), '#affected+idps+ind');
  createSource($('.map-legend.country .food-security-source'), getIPCDataSource());
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

  //boundaries disclaimer
  createFootnote('.map-legend.country', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}

function updateCountryLegend(scale) {
  //update IPC source based on current country
  updateSource($('.map-legend.country .food-security-source'), getIPCDataSource());
  
  //special case for IPC source date in legend
  var data = dataByCountry[currentCountry.code][0];
  if (data['#date+ipc+start']!=undefined && data['#date+ipc+end']!=undefined) {
    var startDate = new Date(data['#date+ipc+start']);
    var endDate = new Date(data['#date+ipc+end']);
    startDate = (startDate.getFullYear()==endDate.getFullYear()) ? d3.utcFormat('%b')(startDate) : d3.utcFormat('%b %Y')(startDate);
    var dateRange = startDate +'-'+ d3.utcFormat('%b %Y')(endDate);// +' - '+ data['#date+ipc+period'];
    $('.map-legend.country').find('.food-security-source .source .date').text(dateRange);
  }
  else {
    var sourceObj = getSource('#affected+food+ipc+p3plus+pct');
    var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
    $('.map-legend.country').find('.food-security-source .source .date').text(date);
  }

  var legendFormat;
  if (currentCountryIndicator.id=='#affected+ch+food+p3plus+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct' || currentCountryIndicator.id.indexOf('vaccinated')>-1)
    legendFormat = d3.format('.0%');
  else if (currentCountryIndicator.id=='#population' || currentCountryIndicator.id=='#affected+idps+ind')
    legendFormat = shortenNumFormat;
  else
    legendFormat = d3.format('.0f');

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
function createMapTooltip(country_code, country_name, point) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  //format content for tooltip
  if (lastHovered!=country_code) {
    //set formats for value
    if (isVal(val)) {
      if (currentIndicator.id.indexOf('pct')>-1) {
        if (currentIndicator.id=='#value+gdp+ifi+pct' || currentIndicator.id=='#targeted+doses+delivered+pct') {
          if (isNaN(val))
            val = 'No Data'
          else
            val = (val==0) ? '0%' : d3.format('.2%')(val);
        }
        else
          val = (isNaN(val)) ? 'No Data' : percentFormat(val);
      }
      if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
      if (currentIndicator.id.indexOf('funding+total')>-1) val = formatValue(val);
    }
    else {
      val = 'No Data';
    }

    //format content for display
    var content = '<h2>'+ country_name +'</h2>';

    //COVID layer
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      if (val!='No Data') {
        content += '<div class="stat-container covid-cases-per-capita"><div class="stat-title">'+ currentIndicator.name +':</div><div class="stat">' + d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) + '</div><div class="sparkline-container"></div></div>';

        content += '<div class="stat-container condensed-stat covid-cases"><div class="stat-title">Weekly Number of New Cases:</div><div class="stat">' + numFormat(country[0]['#affected+infected+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
        content += '<div class="stat-container condensed-stat covid-deaths"><div class="stat-title">Weekly Number of New Deaths:</div><div class="stat">' + numFormat(country[0]['#affected+killed+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
        content += '<div class="stat-container condensed-stat covid-pct"><div class="stat-title">Weekly Trend (new cases past week / prior week):</div><div class="stat">' + percentFormat(country[0]['#covid+trend+pct']) + '</div><div class="sparkline-container"></div></div>';

        //testing data
        var testingValPerCapita = (country[0]['#affected+tested+avg+per1000']==undefined) ? 'No Data' : parseFloat(country[0]['#affected+tested+avg+per1000']).toFixed(2);
        content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Daily Tests Per Thousand (7-day avg):</div><div class="stat">'+ testingValPerCapita +'</div></div>';
        var testingVal = (country[0]['#affected+tested+positive+pct']==undefined) ? 'No Data' : percentFormat(country[0]['#affected+tested+positive+pct']);
        content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Positive Test Rate (rolling 7-day avg):</div><div class="stat">'+ testingVal +'</div></div>';

      }
      else {
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }
    }
    //COVID by gender layer
    else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
      content += '<div class="table-display">';
      content += '<div class="table-row"><div>'+ currentIndicator.name +':</div><div>'+ d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) +'</div></div>';
      content += '</div>';

      //covid cases and deaths
      var numCases = (isVal(country[0]['#affected+infected'])) ? country[0]['#affected+infected'] : 'NA';
      var numDeaths = (isVal(country[0]['#affected+killed'])) ? country[0]['#affected+killed'] : 'NA';
      var casesMale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+infected+m+pct']) : 'No Data';
      var casesFemale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+f+infected+pct']) : 'No Data';
      var deathsMale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+killed+m+pct']) : 'No Data';
      var deathsFemale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+f+killed+pct']) : 'No Data';
      
      content += '<div class="table-display">';
      content += '<br><div class="table-row"><div>Total COVID-19 Cases:</div><div>' + numFormat(numCases) + '</div></div>';
      content += '<div class="table-row"><div>Female</div><div>'+ casesFemale + '</div></div>';
      content += '<div class="table-row"><div>Male</div><div>'+ casesMale + '</div></div>';
      content += '<br><div class="table-row"><div>Total COVID-19 Deaths:</div><div>' + numFormat(numDeaths) + '</div></div>';
      content += '<div class="table-row"><div>Female</div><div>'+ deathsFemale + '</div></div>';
      content += '<div class="table-row"><div>Male</div><div>'+ deathsMale + '</div></div>';
      content += '</div>';
    }
    //vaccine layer
    else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
      if (val!='No Data') {
        //allocated data
        var covaxAllocatedTotal = 0;
        if (country[0]['#capacity+doses+forecast+covax']!=undefined) covaxAllocatedTotal += country[0]['#capacity+doses+forecast+covax'];
        var allocatedArray = [{label: 'COVAX', value: covaxAllocatedTotal}];

        //delivered data
        var funderArray = (country[0]['#meta+vaccine+funder']!=undefined) ? country[0]['#meta+vaccine+funder'].split('|') : [];
        var producerArray = (country[0]['#meta+vaccine+producer']!=undefined) ? country[0]['#meta+vaccine+producer'].split('|') : [];
        var dosesArray = (country[0]['#capacity+vaccine+doses']!=undefined) ? country[0]['#capacity+vaccine+doses'].split('|') : [];
        var totalDelivered = (country[0]['#capacity+doses+delivered+total']!=undefined) ? country[0]['#capacity+doses+delivered+total'] : 0;

        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
        content += '<div class="table-display layer-covax">';
        content += '<div class="table-row row-separator"><div>Allocated (doses)</div><div>'+ numFormat(covaxAllocatedTotal) +'</div></div>';
        allocatedArray.forEach(function(row, index) {
          if (row.value!=undefined) {
            content += '<div class="table-row"><div>'+ row.label +'</div><div>'+ numFormat(row.value) +'</div></div>';
          }
        });
        content += '<div class="table-row row-separator"><div>Delivered (doses)</div><div>'+ numFormat(totalDelivered) +'</div></div>';
        dosesArray.forEach(function(doses, index) {
          content += '<div class="table-row"><div>'+ funderArray[index] + ' – ' + producerArray[index] +'</div><div>'+ numFormat(doses) +'</div></div>';
        });
        content += '</div>';
      }
      else {
        content += currentIndicator.name + ':<div class="stat">Not Included</div>';
      }
    }
    //PIN layer shows refugees and IDPs
    else if (currentIndicator.id=='#affected+inneed+pct') {
      if (val!='No Data') {
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }

      content += '<div class="table-display">';
      if (country_code=='COL') {
        //hardcode PIN for COL
        content += '<div class="table-row">Refugees & Migrants:<span>1,700,000</span></div>';
      }
      else {
        var tableArray = [{label: 'People in Need', value: country[0]['#affected+inneed']},
                          {label: 'Refugees & Migrants', value: country[0]['#affected+refugees']},
                          {label: 'IDPs', value: country[0]['#affected+displaced']}];
        tableArray.forEach(function(row, index) {
          if (row.value!=undefined) {
            content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ numFormat(row.value) +'</div></div>';
          }
        });
      }
      content += '</div>';
    }
    //Access layer
    else if (currentIndicator.id=='#event+year+todate+num') {
      var tableArray = [{label: 'Violent Security Incidents Against Aid Workers since Jan 2020', value: '#event+year+todate+num'},
                        {label: '% of Visas Pending or Denied', value: '#access+visas+pct'},
                        {label: '% of Travel Authorizations Denied', value: '#access+travel+pct'},
                        {label: '% of CERF Projects Affected by Access Constraints', value: '#activity+cerf+project+insecurity+pct'},
                        {label: '% of CBPF Projects Affected by Access Constraints', value: '#activity+cbpf+project+insecurity+pct'},
                        {label: 'Status of Polio Vaccination Campaign', value: '#status+name'},
                        {label: 'Status of Schools', value: '#impact+type'}];
      content += '<div class="table-display">';
      tableArray.forEach(function(row) {
        var data = (country[0][row.value]==undefined || country[0][row.value]=='N/A') ? 'No Data' : country[0][row.value];
        var val = (row.label.indexOf('%')>-1 && !isNaN(data)) ? percentFormat(data) : data;
        var sourceObj = getSource(row.value);
        content += '<div class="table-row row-separator"><div>'+ row.label +':<div class="small">'+ sourceObj['#meta+source'] +'</div></div><div class="val">'+ val +'</div></div>';
      });
      content += '</div>';
    }
    //IPC layer
    else if (currentIndicator.id=='#affected+food+p3plus+pct') {
      var dateSpan = '';
      if (country[0]['#date+ipc+start']!=undefined) {
        var startDate = new Date(country[0]['#date+ipc+start']);
        var endDate = new Date(country[0]['#date+ipc+end']);
        startDate = (startDate.getFullYear()==endDate.getFullYear()) ? d3.utcFormat('%b')(startDate) : d3.utcFormat('%b %Y')(startDate);
        var dateSpan = '<span class="subtext">('+ startDate +'-'+ d3.utcFormat('%b %Y')(endDate) +' - '+ country[0]['#date+ipc+period'] +')</span>';
      }
      content += 'Total % Population in IPC Phase 3+ '+ dateSpan +':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        if (country[0]['#affected+food+analysed+pct']!=undefined) content += '<span>('+ percentFormat(country[0]['#affected+food+analysed+pct']) +' or '+ shortenNumFormat(country[0]['#affected+food+analysed+num']) +' of total country population analysed)</span>';
        var tableArray = [{label: 'IPC Phase 3 (Critical)', value: country[0]['#affected+food+p3+pct']},
                          {label: 'IPC Phase 4 (Emergency)', value: country[0]['#affected+food+p4+pct']},
                          {label: 'IPC Phase 5 (Famine)', value: country[0]['#affected+food+p5+pct']}];
        content += '<div class="table-display">Breakdown:';
        tableArray.forEach(function(row) {
          if (row.value!=undefined) content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ percentFormat(row.value) +'</div></div>';
        });
        content += '</div>';
      }
    }
    //SAM layer
    else if (currentIndicator.id=='#affected+children+sam') {
      val = (val!='No Data') ? numFormat(val) : val;
      content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
    }
    //Immunization campaigns layer
    else if (currentIndicator.id=='#vaccination+postponed+num') {
      var vaccData = [];
      immunizationDataByCountry.forEach(function(country) {
        if (country.key==country_code) {
          vaccData = country.values;
        }
      });
      if (vaccData.length<1) {
        var content = '<h2>' + country_name + '</h2><div class="stat">No data</div>';
      }
      else {
        var content = '<h2>' + country_name + '</h2>';
        content += '<table><tr><th>Campaign Immunization:</th><th>Planned Start Date:</th><th>Status:</th></tr>';
        vaccData.forEach(function(row) {
          var className = (row['#status+name'].indexOf('Postpone')>-1) ? 'covid-postpone' : '';
          content += '<tr class="'+className+'"><td>'+row['#service+name']+'</td><td>'+row['#date+start']+'</td><td>'+row['#status+name']+'</td></tr>';
        });
        content += '</table>';
      }
    }
    //INFORM layer
    else if (currentIndicator.id=='#severity+inform+type') {
      var numVal = (isVal(country[0]['#severity+inform+num'])) ? country[0]['#severity+inform+num'] : 'No Data';
      var informClass = country[0]['#severity+inform+type'];
      var informTrend = country[0]['#severity+inform+trend'];
      content += 'INFORM Severity Index: <div><span class="stat">' + numVal + '</span> <span class="subtext inline">(' + informClass + ' / ' + informTrend + ')</span></div>';
    }
    //Humanitarian Funding Level layer
    else if (currentIndicator.id=='#value+funding+hrp+pct') {
      if (val!='No Data') {
        content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
        var tableArray = [{label: 'HRP Requirement', value: country[0]['#value+funding+hrp+required+usd']}];
        content += '<div class="table-display">';
        tableArray.forEach(function(row) {
          if (isVal(row.value)) {
            var value = (row.label=='HRP Funding Level for COVID-19 GHRP') ? percentFormat(row.value) : formatValue(row.value);
            content += '<div class="table-row"><div>'+ row.label +':</div><div class="val">'+ value +'</div></div>';
          }
        });
        content += '</div>';
      }
      else {
        if (isVal(country[0]['#value+funding+other+plan_name'])) {
          var planArray = country[0]['#value+funding+other+plan_name'].split('|');
          var planPctArray = (isVal(country[0]['#value+funding+other+pct'])) ? country[0]['#value+funding+other+pct'].split('|') : [0];
          var planRequiredArray = (isVal(country[0]['#value+funding+other+required+usd'])) ? country[0]['#value+funding+other+required+usd'].split('|') : [0];
          var planTotalArray = (isVal(country[0]['#value+funding+other+total+usd'])) ? country[0]['#value+funding+other+total+usd'].split('|') : [0];

          if (val!='No Data') content += '<br/>';
          planArray.forEach(function(plan, index) {
            content +=  plan +' Funding Level:<div class="stat">' + percentFormat(planPctArray[index]) + '</div>';
            content += '<div class="table-display">';
            content += '<div class="table-row"><div>Requirement:</div><div>'+ formatValue(planRequiredArray[index]) +'</div></div>';
            content += '<div class="table-row"><div>Total:</div><div>'+ formatValue(planTotalArray[index]) +'</div></div>';
            content += '</div>';
            if (planArray.length>1) content += '<br/>';
          });
        }
        else {
          content +=  currentIndicator.name + ':<div class="stat">Under Review</div>';
        }
      }
    }
    //CERF
    else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        if (country[0]['#value+cerf+covid+funding+total+usd'] > 0) {
          var gmText = getGamText(country[0], 'cerf');
          content += '<div class="gam">'+ gmText +'</div>';
        }
      }
    }
    //CBPF
    else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      //hardcode value for CBPF Turkey
      if (country_code=='TUR') content+='<span>(Syria Cross Border HF)</span>';

      if (val!='No Data') {
        //gam
        if (country[0]['#value+cbpf+covid+funding+total+usd'] > 0) {
          var gmText = getGamText(country[0], 'cbpf');
          content += '<div class="gam small-pad">'+ gmText +'</div>';
        }

        //beneficieries
        if (country[0]['#affected+cbpf+covid+funding+total'] > 0) {
          var beneficiaryText = getBeneficiaryText(country[0]);
          content += '<div class="gam">'+ beneficiaryText +'</div>';
        }
      }
    }
    //IFI financing layer
    else if (currentIndicator.id=='#value+gdp+ifi+pct') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        content += '<div class="table-display">';
        if (isVal(country[0]['#value+ifi+percap'])) content += '<div class="table-row"><div>Total IFI Funding per Capita:&nbsp;</div><div>'+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'</div></div>';
        if (isVal(country[0]['#value+ifi+total'])) content += '<div class="table-row"><div>Total Amount Combined:&nbsp;</div><div>'+ formatValue(country[0]['#value+ifi+total']) +'</div></div>';
        content += '</div>';

        if (parseFloat(val)>0) {
          content += '<div class="table-display subtext">Breakdown:';
          var fundingArray = ['adb','afdb','eib', 'ebrd', 'idb','ifc','imf','isdb','unmptf','wb'];
          fundingArray.forEach(function(fund) {
            var fundName = (fund=='wb') ? 'World Bank' : fund.toUpperCase(); 
            if (isVal(country[0]['#value+'+fund+'+total'])) content += '<div class="table-row"><div>'+ fundName +':&nbsp;</div><div>'+ formatValue(country[0]['#value+'+fund+'+total']) +'</div></div>';
          });
          content += '</div>';
        }
      }
    }
    //all other layers
    else {
      content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
    }

    //covid cases and deaths
    if (currentIndicator.id!='#affected+infected+sex+new+avg+per100000') {
      var numCases = (isVal(country[0]['#affected+infected'])) ? numFormat(country[0]['#affected+infected']) : 'NA';
      var numDeaths = (isVal(country[0]['#affected+killed'])) ? numFormat(country[0]['#affected+killed']) : 'NA';
      content += '<div class="cases-total">Total COVID-19 Cases: ' + numCases + '</div>';
      content += '<div class="deaths-total">Total COVID-19 Deaths: ' + numDeaths + '</div>';
    }

    //set content for tooltip
    tooltip.setHTML(content);

    //COVID cases layer charts -- inject this after divs are created in tooltip
    if ((currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') && val!='No Data' && val>0) {
      //weekly cases per capita sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+infected+new+per100000+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases-per-capita .sparkline-container', 'large');

      //weekly cases sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases .sparkline-container');

      //weekly deaths sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-deaths .sparkline-container');
      
      //weekly trend bar charts
      if (country[0]['#covid+trend+pct']!=undefined) {
        var pctArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']};
          pctArray.push(obj);
        });
        createSparkline(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
        //createTrendBarChart(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
      }
    }
  }
  lastHovered = country_code;

  setTooltipPosition(point);
}

function setTooltipPosition(point) {
  var tooltipWidth = $('.map-tooltip').width();
  var tooltipHeight = $('.map-tooltip').height();
  var anchorDirection = (point.x + tooltipWidth > viewportWidth) ? 'right' : 'left';
  var yOffset = 0;
  if (point.y + tooltipHeight/2 > viewportHeight) yOffset = viewportHeight - (point.y + tooltipHeight/2);
  if (point.y - tooltipHeight/2 < 0) yOffset = tooltipHeight/2 - point.y;
  var popupOffsets = {
    'right': [0, yOffset],
    'left': [0, yOffset]
  };
  tooltip.options.offset = popupOffsets;
  tooltip.options.anchor = anchorDirection;

  if (yOffset>0) {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-start');
    $('.mapboxgl-popup-tip').css('margin-top', point.y);
  }
  else if (yOffset<0)  {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-end');
    $('.mapboxgl-popup-tip').css('margin-bottom', viewportHeight-point.y-10);
  }
  else {
    $('.mapboxgl-popup-tip').css('align-self', 'center');
    $('.mapboxgl-popup-tip').css('margin-top', 0);
    $('.mapboxgl-popup-tip').css('margin-bottom', 0);
  }
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
      if (currentCountryIndicator.id=='#affected+idps+ind') val = numFormat(val);
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
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-select').val('');

  //reset region
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

  //reset tab view
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.content').addClass('tab-view');
  }
}

