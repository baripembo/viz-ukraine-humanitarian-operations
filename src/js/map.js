var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = 'polbnda_int_uncs-6zgtye';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/cl0cqcpm4002014utgdbhcn4q/',
    center: [-25, 0],
    minZoom: 3,
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
    $('.tab-menubar, #chart-view, .comparison-panel').css('left', $('.secondary-panel').outerWidth());
    $('.secondary-panel').animate({
      left: 0
    }, 200);
  }

  //set initial indicator
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected').attr('data-legend'), title: $('.menu-indicators').find('.selected').text()};

  //init element events
  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      // case 'adm0-fills':
      //   globalLayer = layer.id;

      //   map.setFeatureState(
      //     { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
      //     { hover: false }
      //   );
      //   break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        map.setLayoutProperty(globalLabelLayer, 'visibility', 'none');
        break;
      case 'adm0-centroids':
        globalMarkerLayer = layer.id;
        map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-fills':
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
        break;
      case 'adm1-label':
        countryLabelLayer = layer.id;
        map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        map.setLayoutProperty(countryMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
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
            tiles: ['https://api.mapbox.com/v4/humdata.'+raster+'/{z}/{x}/{y}.png?access_token='+mapboxgl.accessToken],
          }
        },
        countryBoundaryLayer
      );

      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }
  });

  //country select event
  // d3.select('.country-select').on('change',function(e) {
  //   var selected = d3.select('.country-select').node().value;
  //   if (selected=='') {
  //     resetMap();
  //   }
  //   else {        
  //     currentCountry.code = selected;
  //     currentCountry.name = d3.select('.country-select option:checked').text();

  //     //find matched features and zoom to country
  //     var selectedFeatures = matchMapFeatures(currentCountry.code);
  //     selectCountry(selectedFeatures);
  //   }
  // });

  //init global and country layers
  //initGlobalLayer();
  initCountryLayer();

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkView();

  //create tooltip
  tooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'map-tooltip'
  });
}

function deepLinkView() {
  //var location = window.location.search;
  //deep link to country view
  //if (location.indexOf('?c=')>-1) {
    var countryCode = 'UKR';//location.split('c=')[1].toUpperCase();
    if (countryCodeList.hasOwnProperty(countryCode)) {    
    //   $('.country-select').val(countryCode);
      currentCountry.code = countryCode;
      currentCountry.name = 'Ukraine';//d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
  //}
  //deep link to specific layer in global view
  // if (location.indexOf('?layer=')>-1) {
  //   var layer = location.split('layer=')[1];
  //   var menuItem = $('.menu-indicators').find('li[data-layer="'+layer+'"]');
  //   menuItem = (menuItem.length<1) ? $('.menu-indicators').find('li[data-layer="covid-19_cases_and_deaths"]') : menuItem;
  //   selectLayer(menuItem);

  //   //show/hide comparison table
  //   if (layer=='covid-19_cases_and_deaths' || layer=='')
  //     $('.comparison-panel').show();
  //   else 
  //     $('.comparison-panel').hide();
  // }
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
  // $('.menu-indicators li').on('click', function() {
  //   selectLayer(this);

  //   //reset any deep links
  //   var layer = $(this).attr('data-layer');
  //   var location = (layer==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layer;
  //   window.history.replaceState(null, null, location);

  //   //handle comparison list
  //   if (currentIndicator.id=='#affected+infected+new+per100000+weekly') $('.comparison-panel').show();
  //   else resetComparison();
  // });

  // //global figures close button
  // $('.secondary-panel .close-btn').on('click', function() {
  //   var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
  //   toggleSecondaryPanel(currentBtn);
  // });

  // //comparison panel close button
  // $('.comparison-panel .panel-close-btn').on('click', function() {
  //   $('.comparison-panel').hide();
  // });

  // //ranking select event
  // d3.selectAll('.ranking-select').on('change',function(e) {
  //   var selected = d3.select(this).node().value;
  //   if (selected!='') {  
  //     //show/hide vaccine sort select if Total Delivered is selected
  //     if (selected=='#capacity+doses+delivered+total') {
  //       $('.vaccine-sorting-container').show();
  //       updateRankingChart(selected, d3.select('#vaccineSortingSelect').node().value);
  //     }
  //     else {
  //       $('.vaccine-sorting-container').hide();
  //       updateRankingChart(selected);
  //     }
  //   }
  // });

  // //rank sorting select event (only on COVAX layer)
  // d3.selectAll('.sorting-select').on('change',function(e) {
  //   var selected = d3.select(this).node().value;
  //   if (selected!='') {
  //     updateRankingChart(d3.select('#vaccineRankingSelect').node().value, selected);
  //   }
  // });

  // //chart view trendseries select event
  // d3.select('.trendseries-select').on('change',function(e) {
  //   var selected = d3.select('.trendseries-select').node().value;
  //   updateTrendseries(selected);
  // });

  // //region select event
  // d3.select('.region-select').on('change',function(e) {
  //   currentRegion = d3.select('.region-select').node().value;
  //   if (currentRegion=='') {
  //     resetMap();
  //   }
  //   else {        
  //     selectRegion();
  //   }
  // });

  // //country select event
  // d3.select('.country-select').on('change',function(e) {
  //   var selected = d3.select('.country-select').node().value;
  //   if (selected=='') {
  //     resetMap();
  //   }
  //   else {        
  //     currentCountry.code = selected;
  //     currentCountry.name = d3.select('.country-select option:checked').text();

  //     //find matched features and zoom to country
  //     var selectedFeatures = matchMapFeatures(currentCountry.code);
  //     selectCountry(selectedFeatures);
  //   }
  // });
  
  // //back to global event
  // $('.backtoGlobal').on('click', function() {
  //   resetMap();
  //   window.history.replaceState(null, null, window.location.pathname);
  // });

  //country panel indicator select event
  // d3.select('.indicator-select').on('change',function(e) {
  //   var selected = d3.select('.indicator-select').node().value;
  //   if (selected!='') {
  //     var container = $('.panel-content');
  //     var section = $('.'+selected);
  //     container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop()}, 300);
  //   }
  // });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
    vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);
  });
}

//set global layer view
// function selectLayer(menuItem) {
//   $('.menu-indicators li').removeClass('selected');
//   $('.menu-indicators li div').removeClass('expand');
//   $(menuItem).addClass('selected');
//   if (currentIndicator.id==$(menuItem).attr('data-id')) {
//     toggleSecondaryPanel(menuItem);
//   }
//   else {
//     currentIndicator = {id: $(menuItem).attr('data-id'), name: $(menuItem).attr('data-legend'), title: $(menuItem).text()};
//     toggleSecondaryPanel(menuItem, 'open');

//     //set food prices view
//     if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
//       closeModal();
//     }
//     //reset vaccine sorting select
//     if (currentIndicator.id!='#targeted+doses+delivered+pct') {
//       $('.vaccine-sorting-container').show();
//     }

//     vizTrack('wrl', $(menuItem).find('div').text());
//     updateGlobalLayer();
//   }

//   //handle tab views
//   if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
//     $('.content').addClass('tab-view');
//     $('.tab-menubar').show();
//   }
//   else {
//     $('.content').removeClass('tab-view');
//     $('.tab-menubar').hide();
//     $('#chart-view').hide();
//   }
// }


// function toggleSecondaryPanel(currentBtn, state) {
//   var width = $('.secondary-panel').outerWidth();
//   var pos = $('.secondary-panel').position().left;
//   var newPos = (pos<0) ? 0 : -width;
//   if (state=='open') { newPos = 0; }
//   if (state=='close') { newPos = -width; }
//   var newTabPos = (newPos==0) ? width : 0;
  
//   $('.secondary-panel').animate({
//     left: newPos
//   }, 200, function() {
//     var div = $(currentBtn).find('div');
//     if ($('.secondary-panel').position().left==0) {
//       div.addClass('expand');
//     }
//     else {
//       div.removeClass('expand');
//     }
//   });

//   $('.tab-menubar, #chart-view, .comparison-panel').animate({
//     left: newTabPos
//   }, 200);
// }


// function selectRegion() {
//   console.log('selectRegion')
//   var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
//   var offset = 50;
//   map.fitBounds(regionFeature[0].bbox, {
//     padding: {top: offset, right: $('.map-legend').outerWidth()+offset, bottom: offset, left: $('.secondary-panel').outerWidth()+offset},
//     linear: true
//   });

//   vizTrack(currentRegion, currentIndicator.name);
//   updateGlobalLayer();
// }

function selectCountry(features) {
  //set first country indicator
  $('#affected+idps').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);
  $('.indicator-select').val('');

  updateCountryLayer();
  // map.setLayoutProperty(globalLayer, 'visibility', 'none');
  // map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  var target = bbox.default(turfHelpers.featureCollection(features));
  var offset = 50;
  map.fitBounds(regionBoundaryData[0].bbox, {
    offset: [ 0, -25],
    padding: {right: $('.map-legend.country').outerWidth()+offset, bottom: offset, left: ($('.country-panel').outerWidth())-offset},
    linear: true
  });

  map.once('moveend', initCountryView);
  //vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);

  //append country code to url
  //window.history.replaceState(null, null, '?c='+currentCountry.code);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function handleGlobalEvents(layer) {
  map.on('mouseenter', globalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
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

        createComparison(country)
     
        if (currentIndicator.id=='#indicator+foodbasket+change+pct' && country[0]['#indicator+foodbasket+change+pct']!=undefined) {
          openModal(currentCountry.code, currentCountry.name);
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
      else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
        if (val<0) val = 0; //hotfix for negative values
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
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
  else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') max = 0;
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
  else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
    scale = d3.scaleQuantize().domain([min, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#impact+type') {
    scale = d3.scaleOrdinal().domain(['Fully open', 'Partially open', 'Closed due to COVID-19', 'Academic break']).range(schoolClosureColorRange);
  }
  else if (currentIndicator.id=='#severity+stringency+num') {
    scale = d3.scaleQuantize().domain([0, 100]).range(oxfordColorRange);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id.indexOf('funding')>-1 || currentIndicator.id.indexOf('financing')>-1) {
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
    createFootnote('.map-legend.global', '#affected+infected+new+per100000+weekly', 'Positive Testing Rate: This is the daily positive rate, given as a rolling 7-day average. According WHO, a positive rate of less than 5% is one indicator that the pandemic may be under control in a country.');
    //vaccine footnote
    createFootnote('.map-legend.global', '#targeted+doses+delivered+pct', 'Note: Data refers to doses delivered to country not administered to people. Only countries with a Humanitarian Response Plan are included');
    //pin footnote
    createFootnote('.map-legend.global', '#affected+inneed+pct', 'The Total Number of People in Need figure corresponds to 28 HRPs, 7 Regional Appeals, Madagascar\'s Flash Appeal and Lebanon\'s ERP. Population percentages greater than 100% include refugees, migrants, and/or asylum seekers');
    //vacc footnote
    createFootnote('.map-legend.global', '#vaccination+postponed+num', 'Methodology: Information about interrupted immunization campaigns contains both official and unofficial information sources. The country ranking has been determined by calculating the ratio of total number of postponed campaigns and total immunization campaigns. Note: data collection is ongoing and may not reflect all the campaigns in every country.');
    //food prices footnote
    createFootnote('.map-legend.global', '#indicator+foodbasket+change+pct', 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.');
    //oxford footnote
    createFootnote('.map-legend.global', '#severity+stringency+num', 'Note: This is a composite measure based on nine response indicators including school closures, workplace closures, and travel bans, rescaled to a value from 0 to 100 (100 = strictest)');
    //CERF footnote
    createFootnote('.map-legend.global', '#value+cerf+funding+total+usd', 'The Total CERF Funding 2022 figure refers to the Global CERF Allocations, including some non-GHO locations which are not listed on this dashboard.');
    //CBPF footnote
    createFootnote('.map-legend.global', '#value+cbpf+funding+total+usd', 'The Total CBPF Funding 2022 figure refers to the Global CBPF Allocations, including some non-GHO locations which are not listed on this dashboard.');
    //access footnote
    // createFootnote('.map-legend.global', '#event+year+todate+num', '1. Access data is collected by OCHA and is based on information provided by humanitarian partners. 2. CERF and CBPF access data is collected by OCHA at country level and includes all projects affected by security incidents, access constraints or other bureaucratic impediments. 3. In order to ensure coherence and consistency in the analysis of security incidents, a single source of information has been used (AWSD). OCHA acknowledges that other sources of information are available at country level to complement the security analysis.');


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
    createFootnote('.map-legend.global', '#affected+infected+sex+new+avg+per100000', '*Distribution of COVID19 cases and deaths by gender are taken from Global Health 50/50 COVID-19 <a href="https://data.humdata.org/organization/global-health-50-50" target="_blank" rel="noopener">Sex-disaggregated Data Tracker</a>. Figures refer to the last date where sex-disaggregated data was available and in some cases the gender distribution may only refer to a portion of total cases or deaths. These proportions are intended to be used to understand the breakdown of cases and deaths by gender and not to monitor overall numbers per country. Definitions of COVID-19 cases and deaths recorded may vary by country.');

    //GAM footnote
    var gamText = '**Gender-Age Marker:<br>0- Does not systematically link programming actions<br>1- Unlikely to contribute to gender equality (no gender equality measure and no age consideration)<br>2- Unlikely to contribute to gender equality (no gender equality measure but includes age consideration)<br>3- Likely to contribute to gender equality, but without attention to age groups<br>4- Likely to contribute to gender equality, including across age groups';
    createFootnote('.map-legend.global', '#value+cerf+covid+funding+total+usd', gamText);
    createFootnote('.map-legend.global', '#value+cbpf+covid+funding+total+usd', gamText);

    //boundaries disclaimer
    createFootnote('.map-legend.global', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

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
  if (currentIndicator.id=='#indicator+foodbasket+change+pct') legendTitle += '<br>Click on a country to explore commodity prices';
  $('.map-legend.global .indicator-title').html(legendTitle);

  //current indicator
  if (scale==null) {
    $('.map-legend.global .legend-container').hide();
  }
  else {
    $('.map-legend.global .legend-container').show();
    var layerID = currentIndicator.id.replaceAll('+','-').replace('#','');
    $('.map-legend.global .legend-container').attr('class', 'legend-container '+ layerID);

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
      if (currentIndicator.id=='#vaccination+postponed+num') legendFormat = numFormat;
      
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
  // var specialKey = $('.map-legend.global .special-key');
  // specialKey.hide();
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
    noDataKey.find('rect').css('fill', '#F2F2EF');

    // specialKey.css('display', 'block');
    // specialKey.find('.label').text('Allocations');
    // specialKey.find('rect').css('fill', '#DDD');
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
  $('.country-panel').scrollTop(0);

  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  //var clrRange = (currentCountryIndicator.id=='#population') ? populationColorRange : colorRange;
  //var countryColorScale = (currentCountryIndicator.id=='#population') ? d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(clrRange) : d3.scaleQuantize().domain([0, 1]).range(clrRange);
  
  switch(currentIndicator.id) {
    case '#population':
      countryColorScale = d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(populationColorRange);
      break;
    case '#affected+idps':
      countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
      break;
    case '#acled+events':
      countryColorScale = d3.scaleOrdinal().domain(['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians']).range(eventColorRange);
      break;
    default:
      countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  }
  createCountryLegend(countryColorScale);


  //add border crossing markers
  map.loadImage('assets/marker-crossing.png', (error, image) => {
    if (error) throw error;
    map.addImage('crossing', image);
    map.addSource('border-crossings', {
      type: 'geojson',
      data: borderCrossingData,
      generateId: true 
    });
    map.addLayer({
      id: 'border-crossings-layer',
      type: 'symbol',
      source: 'border-crossings',
      layout: {
        'icon-image': 'crossing',
        'icon-size': 0.6,
        'icon-allow-overlap': true
      }
    });
  });

  //refugee count data
  let refugeeCounts = [];
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeDotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 45]);

  let countries = {'Slovakia': 'SVK', 'Hungary': 'HUN', 'Poland': 'POL', 'Romania': 'ROU', 'Belarus': 'BLR', 'Republic of Moldova': 'MDA', 'Russian Federation': 'RUS'};
  for (let val of refugeeCountData) {
    let code = countries[val.geomaster_name];
    let count = dataByCountry[code][0]['#affected+refugees'];
    refugeeCounts.push({
      'type': 'Feature',
      'properties': {
        'country': val.geomaster_name,
        'count': count,
        'iconSize': refugeeDotScale(count)
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': [ val.centroid_lon, val.centroid_lat ] 
      } 
    })
  }
  let refugeeCountGeoJson = {
    'type': 'FeatureCollection',
    'features': refugeeCounts
  };
  map.addSource('refugee-counts', {
    type: 'geojson',
    data: refugeeCountGeoJson,
    generateId: true 
  });

  //add refugee country labels
  map.addLayer({
    id: 'refugee-counts-labels',
    type: 'symbol',
    source: 'refugee-counts',
    layout: {
      'text-field': [
        'format',
        ['upcase', ['get', 'country']]
      ],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-allow-overlap': true
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#EEEEEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });

  //town labels
  map.addSource('town-data', {
    type: 'geojson',
    data: 'data/wrl_ukr_capp.geojson',
    generateId: true 
  });
  map.addLayer({
    id: 'town-labels',
    type: 'symbol',
    source: 'town-data',
    layout: {
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': [
        'match',
        ['get', 'TYPE'],
        'TERRITORY',
        0.7,
        'ADMIN 1',
        0.4,
        0.5
      ]
    },
    paint: {
      'text-color': '#888888',
      'text-halo-color': '#EEEEEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);


  //add town circles, capital icons
  map.addLayer({
    id: 'town-dots',
    type: 'circle',
    source: 'town-data',
    filter: ['==', 'TYPE', 'ADMIN 1'],
    paint: {
      'circle-color': '#777777',
      'circle-radius': 3
    }
  });

  map.loadImage('assets/marker-capital.png', (error, image) => {
    if (error) throw error;
    map.addImage('capital', image);
    map.addLayer({
      id: 'capital-dots',
      type: 'symbol',
      source: 'town-data',
      filter: ['==', 'TYPE', 'TERRITORY'],
      layout: {
        'icon-image': 'capital',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 0.9],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    }, globalLabelLayer);
  });


  //add hostilty markers
  map.loadImage('assets/marker-hostility.png', (error, image) => {
    if (error) throw error;
    map.addImage('hostility', image);
    map.addSource('hostility-data', {
      type: 'geojson',
      data: 'data/hostilities.geojson',
      generateId: true 
    });
    map.addLayer({
      id: 'hostilities-layer',
      type: 'symbol',
      source: 'hostility-data',
      layout: {
        'icon-image': 'hostility',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1.5, 6, 1.8],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ["get", "NAME"],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 4, 12],
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.7
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#EEEEEE',
        'text-halo-width': 1,
        'text-halo-blur': 1,
      }
    });
  });


  //mouse events
  map.on('mouseenter', countryLayer, function(e) {
    if (currentCountryIndicator.id!=='#acled+events') {  
      map.getCanvas().style.cursor = 'pointer';
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', countryLayer, function(e) {
    if (currentCountryIndicator.id!=='#acled+events') {    
      var f = map.queryRenderedFeatures(e.point)[0];
      if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_EN==currentCountry.name) {
        map.getCanvas().style.cursor = 'pointer';
        createCountryMapTooltip(f.properties.ADM1_EN, f.properties.ADM1_PCODE);
        tooltip
          .addTo(map)
          .setLngLat(e.lngLat);
      }
      else {
        map.getCanvas().style.cursor = '';
        tooltip.remove();
      }
    }
  });
     
  map.on('mouseleave', countryLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });


  //refugee dots mouse events
  // map.on('mouseenter', 'refugee-counts-dots', function(e) {
  //   map.getCanvas().style.cursor = 'pointer';
  //   tooltip.addTo(map);
  // });
  // map.on('mousemove', 'refugee-counts-dots', function(e) {
  //   map.getCanvas().style.cursor = 'pointer';
  //   const content = `<h2>${e.features[0].properties.country}</h2>Refugees arrivals from Ukraine: <div class='stat'>${numFormat(e.features[0].properties.count)}</div>`;
  //   tooltip.setHTML(content);
  //   tooltip
  //     .addTo(map)
  //     .setLngLat(e.lngLat);
  // });
  // map.on('mouseleave', 'refugee-counts-dots', function() {
  //   map.getCanvas().style.cursor = '';
  //   tooltip.remove();
  // });

  //border crossing mouse events
  map.on('mouseenter', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });
  map.on('mousemove', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const content = `Border Crossing:<h2>${e.features[0].properties['Name - English']}</h2>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseleave', 'border-crossings-layer', function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  initAcledLayer();
  //initIDPLayer();
  initRefugeeLayer();
}

function initAcledLayer() {
  let acledEvents = new Set(acledData.map(d => d['#event+type']));

  let events = [];
  for (let e of acledData) {
    events.push({
      'type': 'Feature',
      'properties': {
        'adm1': e['#adm1+name'],
        'adm3': e['#adm3+name'],
        'event_type': e['#event+type'],
        'date': e['#date+occurred'],
        'fatalities': e['#affected+killed'],
        'notes': e['#description'],
        'sub_event_type': e['#event+type+sub'],
        'actor1': e['#group+name+first'],
        'actor2': e['#group+name+second']
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': [ Number(e['#geo+lon']), Number(e['#geo+lat']) ] 
      } 
    })
  }
  let eventsGeoJson = {
    'type': 'FeatureCollection',
    'features': events
  };
  map.addSource('acled', {
    type: 'geojson',
    data: eventsGeoJson,
    generateId: true 
  });

  //add acled dots
  // map.loadImage('assets/marker-events.png', (error, image) => {
  //   if (error) throw error;
  //   map.addImage('marker-event', image, { 'sdf': true });
  //   map.addLayer({
  //     id: 'acled-dots',
  //     type: 'symbol',
  //     source: 'acled',
  //     layout: {
  //       'icon-image': 'marker-event',
  //       'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1, 8, 1.5],
  //       'icon-allow-overlap': true,
  //       'icon-ignore-placement': true
  //     },
  //     paint: {
  //       'icon-color': [
  //         'match',
  //           ['get', 'event_type'],
  //           'Explosions/Remote violence',
  //           '#A67037',
  //           'Battles',
  //           '#A0A445',
  //           'Protests',
  //           '#7CA544',
  //           'Violence against civilians',
  //           '#4FA59F',
  //           'Strategic developments',
  //           '#724CA4',
  //           'Riots',
  //           '#A49169',
  //           '#666'
  //       ],
  //       'icon-opacity': 0.6
  //     }
  //   });
  //   map.setLayoutProperty('acled-dots', 'visibility', 'none');
  // });

  map.addLayer({
    id: 'acled-dots',
    type: 'circle',
    source: 'acled',
    paint: {
      'circle-color': [
        'match',
          ['get', 'event_type'],
          'Battles',
          '#A0A445',
          'Explosions/Remote violence',
          '#A67037',
          'Riots',
          '#724CA4',
          'Violence against civilians',
          '#4FA59F',
          '#666'
      ],
      'circle-opacity': 0.6,
      "circle-radius": 5
    }
  });
  map.setLayoutProperty('acled-dots', 'visibility', 'none');


  //acled events mouse events
  map.on('mouseenter', 'acled-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });
  map.on('mousemove', 'acled-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let prop = e.features[0].properties;
    let date = new Date(prop.date);
    let content = '<span class="small">' + moment(date).format('MMM D, YYYY') + '</span>';
    content += '<h2>' + prop.event_type + '</h2>';
    content += '<p>Fatalities: ' + prop.fatalities + '</p>';
    content += '<p>' + prop.notes + '</p>';
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseleave', 'acled-dots', function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });
}

let idpDotScale;
function initIDPLayer() {
  let maxCount = d3.max(idpData, function(d) { return +d.value.count; });
  idpDotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 25]);
  
  //format geojson
  let idpCounts = [];
  for (let d of idpData) {
    idpCounts.push({
      'type': 'Feature',
      'properties': {
        'oblast': d.key,
        'count': d.value.count,
        'iconSize': idpDotScale(d.value.count)
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': [ d.value.lon, d.value.lat ] 
      } 
    })
  }
  let idpGeojson = {
    'type': 'FeatureCollection',
    'features': idpCounts
  };

  //init data source for idp layer
  map.addSource('idp-data', {
    type: 'geojson',
    data: idpGeojson,
    generateId: true 
  });

  //add idp dots
  map.addLayer({
    id: 'idp-dots',
    type: 'circle',
    source: 'idp-data',
    paint: {
      'circle-color': '#D3BC8D',
      'circle-opacity': 0.8,
      'circle-radius': ['get', 'iconSize']
    }
  });

  //layer events
  map.on('mouseenter', 'idp-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });
  map.on('mousemove', 'idp-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let prop = e.features[0].properties;
    let content = '<h2>'+ prop.oblast +'</h2>';
    content += 'Number of Internally Displaced People (estimated):<br>';
    content += '<span class="stat">'+ numFormat(prop.count) +'</span>';
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseleave', 'idp-dots', function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });


  //hide layers
  map.setLayoutProperty('idp-dots', 'visibility', 'none');
}


function initRefugeeLayer() {
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeLineScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([2, 20]);

  let refugeeIconScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([0.3, 1]);

    //draw directional curved arrows
    for (let d of refugeeLineData.features) {
      const iso = d.properties.ISO_3;
      const start = d.geometry.coordinates[0];
      const end = d.geometry.coordinates[1];

      const curve = getCurvedLine(start, end);
      const bearing = curve.bearing;

      map.addSource(`route-${iso}`, {
        'type': 'geojson',
        'data': curve.line
      });

      console.log(curve.line)

      map.addLayer({
        'id': `line-${iso}`,
        'type': 'line',
        'source': `route-${iso}`,
        'paint': {
          'line-color': '#0072BC',
          'line-opacity': 0.8,
          'line-width': refugeeLineScale(dataByCountry[iso][0]['#affected+refugees']),
        }
      });

      //get geometry for arrow head and label
      map.addSource(`point-${iso}`, {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': [
            {
              'type': 'Feature',
              'geometry': {
                'type': 'Point',
                'coordinates': end
              }
            }
          ]
        }
      });

      //attach arrow head
      map.addLayer({
        id: `arrow-${iso}`,
        type: 'symbol',
        source: `point-${iso}`,
        layout: {
          'icon-image': 'marker-arrowhead-blue',
          'icon-size': refugeeIconScale(dataByCountry[iso][0]['#affected+refugees']),
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-rotate': bearing+68,
          'icon-offset': [0, -20.5]
        },
        paint: {
          'icon-color': '#0072BC',
          'icon-opacity': 0.8
        }
      });


      //mouse events
      map.on('mouseenter', `arrow-${iso}`, function(e) {
        map.getCanvas().style.cursor = 'pointer';
        tooltip.addTo(map);
      });
      map.on('mousemove', `arrow-${iso}`, function(e) {
        map.getCanvas().style.cursor = 'pointer';
        let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
        content += 'Number of Refugees from Ukraine:<br>';
        content += '<span class="stat">'+ numFormat(dataByCountry[iso][0]['#affected+refugees']) +'</span>';
        tooltip.setHTML(content);
        tooltip
          .addTo(map)
          .setLngLat(e.lngLat);
      });
      map.on('mouseleave', `arrow-${iso}`, function() {
        map.getCanvas().style.cursor = '';
        tooltip.remove();
      });


      map.on('mouseenter', `line-${iso}`, function(e) {
        map.getCanvas().style.cursor = 'pointer';
        tooltip.addTo(map);
      });
      map.on('mousemove', `line-${iso}`, function(e) {
        map.getCanvas().style.cursor = 'pointer';
        let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
        content += 'Number of Refugees from Ukraine:<br>';
        content += '<span class="stat">'+ numFormat(dataByCountry[iso][0]['#affected+refugees']) +'</span>';
        tooltip.setHTML(content);
        tooltip
          .addTo(map)
          .setLngLat(e.lngLat);
      });
      map.on('mouseleave', `line-${iso}`, function() {
        map.getCanvas().style.cursor = '';
        tooltip.remove();
      });
    }
}

function updateCountryLayer() {
  colorNoData = '#F9F9F9';
  //$('.map-legend.country .legend-container').removeClass('no-data');

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
    case '#affected+idps':
      clrRange = idpColorRange;
      break;
    default:
      clrRange = colorRange;
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);


  $('.map-legend.country').removeClass('population');
  $('.map-legend.country').removeClass('acled');
  $('.map-legend.country').removeClass('idps');
  if (currentCountryIndicator.id=='#population') {
    $('.map-legend.country').addClass('population');
    countryColorScale = d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(populationColorRange);
  }
  else if (currentCountryIndicator.id=='#acled+events') {
    $('.map-legend.country').addClass('acled');
    countryColorScale = d3.scaleOrdinal()
      .domain(['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians'])
      .range(eventColorRange);
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    $('.map-legend.country').addClass('idps');
    countryColorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange)
  }
  else {}
  updateCountryLegend(countryColorScale);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || !isVal(val) || isNaN(val)) ? colorNoData : countryColorScale(val);

      //turn off choropleth for population layer
      color = (currentCountryIndicator.id=='#population') ? colorDefault : color;

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
  //map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', '#C4C4C4');//expressionBoundary
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);



  //toggle layers
  if (currentCountryIndicator.id=='#acled+events') {
    map.setLayoutProperty('acled-dots', 'visibility', 'visible');
    map.setLayoutProperty('border-crossings-layer', 'visibility', 'none');
    map.setLayoutProperty('hostilities-layer', 'visibility', 'none');
    //map.setLayoutProperty('idp-dots', 'visibility', 'none');
    //map.setLayoutProperty('refugee-counts-dots', 'visibility', 'visible');
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    //map.setLayoutProperty('refugee-counts-dots', 'visibility', 'none');
    map.setLayoutProperty('acled-dots', 'visibility', 'none');
    map.setLayoutProperty('border-crossings-layer', 'visibility', 'visible');
    map.setLayoutProperty('hostilities-layer', 'visibility', 'visible');
    //map.setLayoutProperty('idp-dots', 'visibility', 'visible');
  }
  else {
    if (map.getLayer('hostilities-layer') && map.getLayer('border-crossings-layer')) {  
      //map.setLayoutProperty('refugee-counts-dots', 'visibility', 'visible');
      map.setLayoutProperty('border-crossings-layer', 'visibility', 'visible');
      map.setLayoutProperty('hostilities-layer', 'visibility', 'visible');
      map.setLayoutProperty('acled-dots', 'visibility', 'none');
      //map.setLayoutProperty('idp-dots', 'visibility', 'none');
    }
  }
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
  createSource($('.map-legend.country .idp-source'), '#affected+idps');
  createSource($('.map-legend.country .acled-source'), '#date+latest+acled');
  createSource($('.map-legend.country .refugee-arrivals-source'), '#affected+refugees');
  createSource($('.map-legend.country .border-crossing-source'), '#geojson');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  

  //let title = (currentCountryIndicator.id=='#population') ? 'Population Density (people per sq km)' : 'Number of Health Facilities';
  //$('.legend-title').html(title);


  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .scale(scale);

  var div = d3.select('.map-legend.country .legend-scale');
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  // //no data
  // var nodata = div.append('svg')
  //   .attr('class', 'no-data-key');

  // nodata.append('rect')
  //   .attr('width', 15)
  //   .attr('height', 15);

  // nodata.append('text')
  //   .attr('class', 'label')
  //   .text('No Data');

  //boundaries disclaimer
  createFootnote('.map-legend.country', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}

function updateCountryLegend(scale) {
  var legendFormat, legendTitle;
  switch(currentCountryIndicator.id) {
    case '#population':
      legendTitle = 'Population Density (people per sq km)';
      legendFormat = shortenNumFormat;
      break;
    case '#loc+count+health':
      legendTitle = 'Number of Health Facilities';
      legendFormat = d3.format('.0f');
      break;
    case '#acled+events':
      legendTitle = 'Conflict Event Type';
      legendFormat = d3.format('.0f');
      break;
    case '#affected+idps':
      legendTitle = 'Estimated Number of Internally Displaced People';
      legendFormat = shortenNumFormat;
      break;
    default:
      tilegendTitletle = '';
      legendFormat = d3.format('.0f');
  }
  $('.map-legend.country .legend-title').html(legendTitle);

  // var legend = d3.legendColor()
  //   .labelFormat(legendFormat)
  //   .cells(colorRange.length)
  //   .scale(scale);

  // var g = d3.select('.map-legend.country .scale');
  // g.call(legend);
  if (currentCountryIndicator.id=='#acled+events') {
    if (d3.selectAll('.legendCells-events').empty()) {
      var svg = d3.select('.map-legend.country .scale');
      svg.append("g")
        .attr("class", "legendCells-events")
        .attr("transform", "translate(6,10)");

      var legendOrdinal = d3.legendColor()
        .shape("path", d3.symbol().type(d3.symbolCircle).size(90)())
        .shapePadding(3)
        .scale(scale);

      svg.select(".legendCells-events")
        .call(legendOrdinal);
    }
  }
  else {
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.country .scale');
    g.call(legend);
  }
}


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
var lastHovered = '';
function createMapTooltip(country_code, country_name, point) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  if (country[0]!=undefined) {
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
              content += '<div class="table-row"><div>'+ funderArray[index];
              content += (producerArray[index] != '') ? ' – ' + producerArray[index] : '';
              content += '</div><div>'+ numFormat(doses) +'</div></div>';
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
        else if (currentIndicator.id=='#affected+food+p3plus+num') {
          var dateSpan = '';
          if (country[0]['#date+ipc+start']!=undefined) {
            var startDate = new Date(country[0]['#date+ipc+start']);
            var endDate = new Date(country[0]['#date+ipc+end']);
            startDate = (startDate.getFullYear()==endDate.getFullYear()) ? d3.utcFormat('%b')(startDate) : d3.utcFormat('%b %Y')(startDate);
            var dateSpan = '<span class="subtext">('+ startDate +'-'+ d3.utcFormat('%b %Y')(endDate) +' - '+ country[0]['#date+ipc+period'] +')</span>';
          }
          var shortVal = (isNaN(val)) ? val : shortenNumFormat(val);
          content += 'Total Population in IPC Phase 3+ '+ dateSpan +':<div class="stat">' + shortVal + '</div>';
          if (val!='No Data') {
            if (country[0]['#affected+food+analysed+num']!=undefined) content += '<span>('+ shortenNumFormat(country[0]['#affected+food+analysed+num']) +' of total country population analysed)</span>';
            var tableArray = [{label: 'IPC Phase 3 (Critical)', value: country[0]['#affected+food+p3+num']},
                              {label: 'IPC Phase 4 (Emergency)', value: country[0]['#affected+food+p4+num']},
                              {label: 'IPC Phase 5 (Famine)', value: country[0]['#affected+food+p5+num']}];
            content += '<div class="table-display">Breakdown:';
            tableArray.forEach(function(row) {
              if (row.value!=undefined) {
                var shortRowVal = (row.value==0) ? 0 : shortenNumFormat(row.value);
                content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ shortRowVal +'</div></div>';
              }
            });
            content += '</div>';
          }
        }
        //SAM layer
        else if (currentIndicator.id=='#affected+children+sam') {
          val = (val!='No Data') ? numFormat(val) : val;
          content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
        }
        //School closures layer
        else if (currentIndicator.id=='#impact+type') {
          content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
          var tableArray = [{label: 'Total duration of full and partial school closures (in weeks)', value: country[0]['#impact+full_partial+weeks']},
                            {label: 'Number of learners enrolled from pre-primary to upper-secondary education', value: country[0]['#population+learners+pre_primary_to_secondary']},
                            {label: 'Number of learners enrolled in tertiary education programmes', value: country[0]['#population+learners+tertiary']}];
          content += '<div class="table-display">';
          tableArray.forEach(function(row) {
            if (row.value!=undefined) content += '<div class="table-row row-separator"><div>'+ row.label +':</div><div>'+ numFormat(row.value) +'</div></div>';
          });
          content += '</div>';
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
            content += '<table class="immunization-table"><tr><th>Campaign Immunization:</th><th>Planned Start Date:</th><th>Status:</th></tr>';
            vaccData.forEach(function(row) {
              var className = (row['#status+name'].indexOf('Postponed COVID')>-1) ? 'covid-postpone' : '';
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
        //Vaccine Financing layer
        else if (currentIndicator.id=='#value+financing+approved') {
          if (val!='No Data') {
            var gaviEarlyAccessDisbursed = (country[0]['#value+financing+gavi+earlyaccess+disbursed']!=undefined) ? country[0]['#value+financing+gavi+earlyaccess+disbursed'] : 0;
            var gaviNeedsDisbursed = (country[0]['#value+financing+gavi+needs+disbursed']!=undefined) ? country[0]['#value+financing+gavi+needs+disbursed'] : 0;
            var gaviEarlyAccessApproved = (country[0]['#value+financing+gavi+earlyaccess+approved']!=undefined) ? country[0]['#value+financing+gavi+earlyaccess+approved'] : 0;
            var gaviNeedsApproved = (country[0]['#value+financing+gavi+needs+approved']!=undefined) ? country[0]['#value+financing+gavi+needs+approved'] : 0;
            var wbApproved = (country[0]['#value+financing+worldbank+approved']!=undefined) ? country[0]['#value+financing+worldbank+approved'] : 0;

            content += currentIndicator.name + ':<div class="stat">' + formatValue(val) + '</div>';
            content += '<div class="table-display layer-covax">';
            content += '<div class="table-row row-separator"><div>Disbursed:</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Early Access)</div><div>'+ d3.format('$,')(gaviEarlyAccessDisbursed) +'</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Needs Based)</div><div>'+ d3.format('$,')(gaviNeedsDisbursed) +'</div></div>';

            content += '<div class="table-row row-separator"><div>Approved:</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Early Access)</div><div>'+ d3.format('$,')(gaviEarlyAccessApproved) +'</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Needs Based)</div><div>'+ d3.format('$,')(gaviNeedsApproved) +'</div></div>';
            content += '<div class="table-row"><div>World Bank</div><div>'+ d3.format('$,')(wbApproved) +'</div></div>';
            content += '</div>';
          }
          else {
            content += currentIndicator.name + ':<div class="stat">' + formatValue(val) + '</div>';
          }
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
                content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ value +'</div></div>';
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
              content +=  currentIndicator.name + ':<div class="stat">N/A</div>';
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
            if (isVal(country[0]['#value+ifi+percap'])) content += '<div class="table-row"><div>Total IFI Funding per Capita:</div><div>'+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'</div></div>';
            if (isVal(country[0]['#value+ifi+total'])) content += '<div class="table-row"><div>Total Amount Combined:</div><div>'+ formatValue(country[0]['#value+ifi+total']) +'</div></div>';
            content += '</div>';

            if (parseFloat(val)>0) {
              content += '<div class="table-display subtext">Breakdown:';
              var fundingArray = ['adb','afdb','eib', 'ebrd', 'idb','ifc','imf','isdb','unmptf','wb'];
              fundingArray.forEach(function(fund) {
                var fundName = (fund=='wb') ? 'World Bank' : fund.toUpperCase(); 
                if (isVal(country[0]['#value+'+fund+'+total'])) content += '<div class="table-row"><div>'+ fundName +':</div><div>'+ formatValue(country[0]['#value+'+fund+'+total']) +'</div></div>';
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
              var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']*100};
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


function createCountryMapTooltip(adm1_name, adm1_pcode) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+code']==adm1_pcode && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
      if (currentCountryIndicator.id=='#affected+idps') val = numFormat(val);
    }
    else {
      val = 'No Data';
    }
    var content = `<h2>${adm1_name} Oblast</h2>${currentCountryIndicator.name}:<div class="stat">${val}</div>`;

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

