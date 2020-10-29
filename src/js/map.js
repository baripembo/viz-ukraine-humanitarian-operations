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
  $('#global-map, .country-select, .map-legend').css('opacity', 1);

  //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
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

  //init global and country layers
  initGlobalLayer();
  initCountryLayer();

  //create tooltip
  tooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'map-tooltip'
  });

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkCountryView();
}

function deepLinkCountryView() {
  var location = window.location.search;
  if (location.indexOf('?c=')>-1) {
    var countryCode = location.split('=')[1].toUpperCase();
    if (countryCodeList.hasOwnProperty(countryCode)) {    
      $('.country-select').val(countryCode);
      currentCountry.code = countryCode;
      currentCountry.name = d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
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
    $('.menu-indicators li').removeClass('selected');
    $('.menu-indicators li div').removeClass('expand');
    $(this).addClass('selected');
    if (currentIndicator.id==$(this).attr('data-id')) {
      toggleSecondaryPanel(this);
    }
    else {
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};
      toggleSecondaryPanel(this, 'open');

      //set food prices view
      if (currentIndicator.id!='#value+food+num+ratio') {
        closeModal();
      }

      mpTrack('wrl', $(this).find('div').text());
      updateGlobalLayer();
    }
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
  $('.country-panel h2').on('click', function() {
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

function toggleSecondaryPanel(currentBtn, state) {
  var width = $('.secondary-panel').outerWidth();
  var pos = $('.secondary-panel').position().left;
  var newPos = (pos<0) ? 0 : -width;
  if (state=='open') {
    newPos = 0;
  }
  
  $('.secondary-panel').animate({
    left: newPos
  }, 200, function() {
    var div = $(currentBtn).find('div');
    if ($('.secondary-panel').position().left==0) {
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
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#affected+infected+new+weekly') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#severity+access+category') {
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
  else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#severity+access+category') max = 0;
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
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

    //covid positive testing explanatory text
    var covidTestText = 'Positive Testing Rate: This is the daily positive rate, given as a rolling 7-day average. According WHO, a positive rate of less than 5% is one indicator that the epidemic is under control in a country.';
    $('.map-legend.global').append('<p class="footnote test-methodology small">'+ truncateString(covidTestText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .test-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(covidTestText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(covidTestText + ' <a href="#" class="collapse">LESS</a>');
      }
    });
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
    var foodMethodologyText = 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.';
    $('.map-legend.global').append('<p class="footnote food-methodology small">'+ truncateString(foodMethodologyText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .food-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(foodMethodologyText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(foodMethodologyText + ' <a href="#" class="collapse">LESS</a>');
      }
    });
    //oxford methodology text
    var oxfordMethodologyText = 'Note: This is a composite measure based on nine response indicators including school closures, workplace closures, and travel bans, rescaled to a value from 0 to 100 (100 = strictest)';
    $('.map-legend.global').append('<p class="footnote oxford-methodology small">'+ truncateString(oxfordMethodologyText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .oxford-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(oxfordMethodologyText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(oxfordMethodologyText + ' <a href="#" class="collapse">LESS</a>');
      }
    });

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

    //gender disaggregation explanatory text
    var genderDataText = '*Distribution of COVID19 cases and deaths by gender are taken from Global Health 50/50 COVID-19 <a href="https://data.humdata.org/organization/global-health-50-50" target="_blank" rel="noopener">Sex-disaggregated Data Tracker</a>. Figures refer to the last date where sex-disaggregated data was available and in some cases the gender distribution may only refer to a portion of total cases or deaths. These proportions are intended to be used to understand the breakdown of cases and deaths by gender and not to monitor overall numbers per country. Definitions of COVID-19 cases and deaths recorded may vary by country. ';
    $('.map-legend.global').append('<h4><i class="humanitarianicons-User"></i> (On hover) COVID-19 Sex-Disaggregated Data Tracker</h4>');
    createSource($('.map-legend.global'), '#affected+killed+m+pct');
    $('.map-legend.global').append('<p class="footnote gender-data small">'+ truncateString(genderDataText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .gender-data').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(genderDataText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(genderDataText + ' <a href="#" class="collapse">LESS</a>');
      }
    });

    //GAM explanatory text
    var gamDataText = '**Gender-Age Marker: 0- Does not systematically link programming actions<br>1- Unlikely to contribute to gender equality (no gender equality measure and no age consideration)<br>2- Unlikely to contribute to gender equality (no gender equality measure but includes age consideration)<br>3- Likely to contribute to gender equality, but without attention to age groups<br>4- Likely to contribute to gender equality, including across age groups';
    $('.map-legend.global').append('<p class="footnote gam-methodology small">'+ truncateString(gamDataText, 65) +' <a href="#" class="expand">MORE</a></p>');
    $('.map-legend.global .gam-methodology').click(function() {
      if ($(this).find('a').hasClass('collapse')) {
        $(this).html(truncateString(gamDataText, 65) + ' <a href="#" class="expand">MORE</a>');
      }
      else {
        $(this).html(gamDataText + ' <a href="#" class="collapse">LESS</a>');
      }
    });

    //boundaries disclaimer
    boundariesDisclaimer($('.map-legend.global'));

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
      if (currentIndicator.id=='#affected+infected+new+per100000+weekly') legendFormat = d3.format('.1f');
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
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly')
    $('.test-methodology').show();
  else
    $('.test-methodology').hide();

  if (currentIndicator.id=='#vaccination+num+ratio')
    $('.vacc-methodology').show();
  else
    $('.vacc-methodology').hide();

  if (currentIndicator.id=='#value+food+num+ratio')
    $('.food-methodology').show();
  else
    $('.food-methodology').hide();

  if (currentIndicator.id=='#value+cerf+covid+funding+total+usd' || currentIndicator.id=='#value+cbpf+covid+funding+total+usd')
    $('.gam-methodology').show();
  else
    $('.gam-methodology').hide();

  if (currentIndicator.id=='#severity+stringency+num')
    $('.oxford-methodology').show();
  else
    $('.oxford-methodology').hide();

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
  if (currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct') checkIPCData();
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
    case '#vaccination+num+ratio':
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
  if (isEmpty) currentCountryIndicator.id = '#affected+ch+food+p3plus+pct';
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
  createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3plus+pct');
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
  boundariesDisclaimer($('.map-legend.country'));

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}

function updateCountryLegend(scale) {
  if (currentCountryIndicator.id=='#affected+ch+food+p3plus+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct') {
    $('.map-legend.country .food-security-source').empty();
    createSource($('.map-legend.country .food-security-source'), currentCountryIndicator.id);
  }

  var legendFormat;
  if (currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct' || currentCountryIndicator.id=='#affected+ch+food+p3plus+pct' || currentCountryIndicator.id.indexOf('vaccinated')>-1)
    legendFormat = d3.format('.0%');
  else if (currentCountryIndicator.id=='#population')
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

function boundariesDisclaimer(target) {
  var disclaimerText = 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.';
  target.append('<p class="footnote disclaimer small">'+ truncateString(disclaimerText, 65) +' <a href="#" class="expand">MORE</a></p>');
  target.find('.disclaimer').click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(truncateString(disclaimerText, 65) + ' <a href="#" class="expand">MORE</a>');
    }
    else {
      $(this).html(disclaimerText + ' <a href="#" class="collapse">LESS</a>');
    }
  });
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
      if (currentIndicator.id.indexOf('pct')>-1) val = (isNaN(val)) ? 'No Data' : percentFormat(val);
      if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
      if (currentIndicator.id.indexOf('funding+total')>-1) val = formatValue(val);
    }
    else {
      val = 'No Data';
    }

    //format content for display
    var content = '<h2>' + country_name;
    if (hasGamData(country[0])) content += ' <i class="humanitarianicons-User"></i>';
    content += '</h2>';

    //COVID trend layer shows sparklines
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      content += '<div class="stat-container covid-cases-per-capita"><div class="stat-title">Weekly Number of New Cases per 100,000 People:</div><div class="stat">' + d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) + '</div><div class="sparkline-container"></div></div>';
      content += '<div class="stat-container condensed-stat covid-cases"><div class="stat-title">Weekly Number of New Cases:</div><div class="stat">' + numFormat(country[0]['#affected+infected+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
      content += '<div class="stat-container condensed-stat covid-deaths"><div class="stat-title">Weekly Number of New Deaths:</div><div class="stat">' + numFormat(country[0]['#affected+killed+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
      content += '<div class="stat-container condensed-stat covid-pct"><div class="stat-title">Weekly Trend (new cases past week / prior week):</div><div class="stat">' + percentFormat(country[0]['#covid+trend+pct']) + '</div><div class="sparkline-container"></div></div>';

      //testing data #affected+tested+positive+pct
      // if (country[0]['#affected+tested+per1000']!=undefined) {
      //   var testingVal = Number(country[0]['#affected+tested+per1000']).toFixed(2);
      //   content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">New Daily Tests per 1,000 People:</div><div class="stat">'+ testingVal +'</div><div class="sparkline-container"></div></div>';
      // }
      if (country[0]['#affected+tested+positive+pct']!=undefined) {
        var testingVal = percentFormat(country[0]['#affected+tested+positive+pct']);
        content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Positive Test Rate (rolling 7-day avg):</div><div class="stat">'+ testingVal +'</div><div class="sparkline-container"></div></div>';
      }
    }

    //PIN layer shows refugees and IDPs
    else if (currentIndicator.id=='#affected+inneed+pct') {
      if (val!='No Data') {
        content +=  currentIndicator.name + ' (of total population):<div class="stat">' + val + '</div>';
      }
      content += '<div class="pins">';
      if (isVal(country[0]['#affected+inneed'])) content += 'People in Need: '+ numFormat(country[0]['#affected+inneed']) +'<br/>';
      
      //hardcode label for Colombia
      if (country_code=='COL') 
        content += 'Refugees & Migrants: 1,700,000' +'<br/>';
      else
        if (isVal(country[0]['#affected+refugees'])) content += 'Refugees: '+ numFormat(country[0]['#affected+refugees']) +'<br/>';

      if (isVal(country[0]['#affected+displaced'])) content += 'IDPs: '+ numFormat(country[0]['#affected+displaced']) +'<br/>';
      content += '</div>';
    }
    //access layer
    else if (currentIndicator.id=='#severity+access+category') {
      if (val!='No Data') {
        var accessLabels = ['Top Access Constraints into Country:', 'Top Access Constraints within Country:', 'Top Impacts:', 'Mitigation Measures:'];
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
    //IPC layer
    else if (currentIndicator.id=='#affected+ch+food+p3plus+pct') {
      content += 'Total % Population in IPC Phase 3+:<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        content += '<span>('+ percentFormat(country[0]['#affected+ch+food+analysed+pct']) +' of Total Country Population Analysed)</span>';
        content += '<div class="subtext">Breakdown:<br/>';
        if (country[0]['#affected+ch+food+p3+pct']!=undefined) content += 'IPC Phase 3 (Critical): '+ percentFormat(country[0]['#affected+ch+food+p3+pct']) +'<br>';
        if (country[0]['#affected+ch+food+p4+pct']!=undefined) content += 'IPC Phase 4 (Emergency): '+ percentFormat(country[0]['#affected+ch+food+p4+pct']) +'<br>';
        if (country[0]['#affected+ch+food+p5+pct']!=undefined) content += 'IPC Phase 5 (Famine): '+ percentFormat(country[0]['#affected+ch+food+p5+pct']) +'<br>';
        content += '</div>';
      }
    }
    //INFORM layer
    else if (currentIndicator.id=='#severity+inform+type') {
      var numVal = (isVal(country[0]['#severity+inform+num'])) ? country[0]['#severity+inform+num'] : 'No Data';
      content += 'INFORM COVID-19 Risk Index:<div class="stat">' + numVal + '</div>';
      if (numVal!='No Data') {
        if (country[0]['#severity+coping+inform+num']!=undefined) content += 'Lack of Coping Capacity: '+ country[0]['#severity+coping+inform+num']+'<br>';
        if (country[0]['#severity+hazard+inform+num']!=undefined) content += 'COVID-19 Hazard & Exposure: '+ country[0]['#severity+hazard+inform+num']+'<br>';
        if (country[0]['#severity+inform+num+vulnerability']!=undefined) content += 'Vulnerability: '+ country[0]['#severity+inform+num+vulnerability']+'<br>';
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
        if (isVal(country[0]['#value+funding+hrp+required+usd'])) content += 'HRP Requirement: '+ formatValue(country[0]['#value+funding+hrp+required+usd']) +'<br/>';
        if (isVal(country[0]['#value+covid+funding+hrp+pct'])) content += 'HRP Funding Level for COVID-19 GHRP: '+ percentFormat(country[0]['#value+covid+funding+hrp+pct']) +'<br/>';
        if (isVal(country[0]['#value+covid+funding+hrp+required+usd'])) content += 'HRP Requirement for COVID-19 GHRP: '+ formatValue(country[0]['#value+covid+funding+hrp+required+usd']) +'<br/>';
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
        if (isVal(country[0]['#value+ifi+percap'])) content += 'Total IFI Funding per Capita: '+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'<br/>';
        if (isVal(country[0]['#value+ifi+total'])) content += 'Total Amount Combined: '+ formatValue(country[0]['#value+ifi+total']);
      
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
    var genderCases = (hasGamData(country[0], 'cases')) 
      ? '<i class="humanitarianicons-User"></i> (*' + percentFormat(country[0]['#affected+infected+m+pct']) + ' Male, ' + percentFormat(country[0]['#affected+f+infected+pct']) + ' Female)'
      : '(*Sex-disaggregation not reported)';
    var genderDeaths = (hasGamData(country[0], 'deaths')) 
      ? '<i class="humanitarianicons-User"></i> (*' + percentFormat(country[0]['#affected+killed+m+pct']) + ' Male, ' + percentFormat(country[0]['#affected+f+killed+pct']) + ' Female)'
      : '(*Sex-disaggregation not reported)';

    content += '<div class="cases-total">Total COVID-19 Cases: ' + numCases + '<br/>';
    content += '<span>' + genderCases + '</span></div>';
    content += '<div class="deaths-total">Total COVID-19 Deaths: ' + numDeaths + '<br/>';
    content += '<span>' + genderDeaths + '</span></div>';

    //set content for tooltip
    tooltip.setHTML(content);

    //COVID cases layer charts -- inject this after divs are created in tooltip
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly' && val!='No Data') {
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

