var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = 'polbnda_int_uncs-6zgtye';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/cl0cqcpm4002014utgdbhcn4q',
    center: [-25, 0],
    minZoom: minZoom,
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
  $('#global-map, .map-legend').css('opacity', 1);

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
  var countryCode = 'UKR';
  if (countryCodeList.hasOwnProperty(countryCode)) {
    currentCountry.code = countryCode;
    currentCountry.name = 'Ukraine';

    //find matched features and zoom to country
    var selectedFeatures = matchMapFeatures(currentCountry.code);
    selectCountry(selectedFeatures);
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
  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
    vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);
  });
}

function selectCountry(features) {
  //set first country indicator
  $('#affected+idps').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);

  updateCountryLayer();
  // map.setLayoutProperty(globalLayer, 'visibility', 'none');
  // map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  //map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  let target = bbox.default(turfHelpers.featureCollection(features));
  let mapPadding = (isMobile) ?
    {
        right: -100,
        left: -200,
        bottom: 0
    } :
    { 
      right: $('.map-legend.country').outerWidth()+65,
      left: $('.country-panel').outerWidth()-80,
      bottom: 50
    };
  map.fitBounds(regionBoundaryData[0].bbox, {
    offset: [ 0, -25],
    padding: {right: mapPadding.right, bottom: mapPadding.bottom, left: mapPadding.left},
    linear: true
  });

  map.once('moveend', initCountryView);
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
  countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  initIDPLayer();
  initBorderCrossingLayer();
  initHostilityLayer();
  initLocationLabels();
  initAcledLayer();
  initRefugeeLayer();

  //mouse events
  map.on('mouseenter', countryLayer, onMouseEnter);
  map.on('mouseleave', countryLayer, onMouseLeave);
  map.on('mousemove', countryLayer, function(e) {  
    if (currentCountryIndicator.id!='#acled+events') {
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
}


function initIDPLayer() {
  const max = d3.max(idpMacroData, function(d) { return +d['#affected+idps']; });
  const colorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);

  //match macro region features with idp data
  idpGeoJson.features.forEach(function(f) {
    let prop = f.properties;
    idpMacroData.forEach(function(d) {
      if (prop.ADM1_EN!=='') {
        if (prop.ADM1_EN.toLowerCase()==d['#region+macro+name'].toLowerCase()) {
          prop.idpPresence = d['#affected+idps'];
          prop.color = colorScale(d['#affected+idps']);
        }
      }
      else {
        prop.idpPresence = '';
        prop.color = '#FFF';
      }
    });
  });

  map.addSource('macro-region-data', {
    type: 'geojson',
    data: idpGeoJson
  });

  map.addLayer({
    id: 'macro-regions',
    source: 'macro-region-data',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-outline-color': '#E0E0E0'
    }
  }, globalLabelLayer);

  //mouse events
  map.on('mouseenter', 'macro-regions', onMouseEnter);
  map.on('mouseleave', 'macro-regions', onMouseLeave);
  map.on('mousemove', 'macro-regions', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const macroRegion = e.features[0].properties.ADM1_EN;
    const content = (macroRegion=='') ? 'IDP Estimate:<div class="stat">No Data</div>' : `<h2>${macroRegion} Region</h2>IDP Estimate:<div class="stat">${numFormat(e.features[0].properties.idpPresence)}</div>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initBorderCrossingLayer() {
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
      'icon-image': 'marker-border-crossing',
      'icon-size': 0.6,
      'icon-allow-overlap': isMobile ? false : true
    }
  });

  //mouse events
  map.on('mouseenter', 'border-crossings-layer', onMouseEnter);
  map.on('mouseleave', 'border-crossings-layer', onMouseLeave);
  map.on('mousemove', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const content = `Border Crossing:<h2>${e.features[0].properties['Name - English']}</h2>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initLocationLabels() {
  //location data
  map.addSource('location-data', {
    type: 'geojson',
    data: locationData,
    generateId: true 
  });

  //country labels
  map.addLayer({
    id: 'country-labels',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'ADMIN 0'],
    layout: {
      'text-field': [
        'format',
        ['upcase', ['get', 'CNTRY']]
      ],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-allow-overlap': true,
      'text-letter-spacing': 0.3
    },
    paint: {
      'text-color': '#666',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });

  //towm markers
  map.addLayer({
    id: 'town-dots',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'ADMIN 1'],
    layout: {
      'icon-image': 'marker-town',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1],
      'icon-allow-overlap': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.4
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);


  //capital markers
  map.addLayer({
    id: 'marker-capital',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'TERRITORY'],
    layout: {
      'icon-image': 'marker-capital',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.7,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);

}


function initHostilityLayer() {
  //add hostilty markers
  map.addSource('hostility-data', {
    type: 'geojson',
    data: hostilityData,
    generateId: true 
  });
  map.addLayer({
    id: 'hostilities-layer',
    type: 'symbol',
    source: 'hostility-data',
    layout: {
      'icon-image': 'marker-hostility',
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
      'text-color': '#000',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1,
    }
  });
}


function initAcledLayer() {
  let maxCount = d3.max(cleanedCoords, function(d) { return +d['#affected+killed']; });
  let dotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 15]);

  //get unique event types
  let acledEvents = [...new Set(cleanedCoords.map(d => d['#event+type']))];
  
  //build expression for event dot circles
  let eventTypeColorScale = ['match', ['get', 'event_type']];
  for (const [index, event] of acledEvents.sort().entries()) {
    eventTypeColorScale.push(event);
    eventTypeColorScale.push(eventColorRange[index]);
  }
  eventTypeColorScale.push('#666');

  let events = [];
  for (let e of cleanedCoords) {
    events.push({
      'type': 'Feature',
      'properties': {
        'adm1': e['#adm1+name'],
        'adm3': e['#adm3+name'],
        'event_type': e['#event+type'],
        'date': e['#date+occurred'],
        'fatalities': e['#affected+killed'],
        'notes': e['#description'],
        'iconSize': dotScale(e['#affected+killed'])
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': e['#coords']
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

  map.addLayer({
    id: 'acled-dots',
    type: 'circle',
    source: 'acled',
    paint: {
      'circle-color': eventTypeColorScale,
      'circle-stroke-color': eventTypeColorScale,
      'circle-opacity': 0.7,
      'circle-radius': ['get', 'iconSize'],
      'circle-stroke-width': 1,
    }
  });
  map.setLayoutProperty('acled-dots', 'visibility', 'none');


  //acled events mouse events
  map.on('mouseenter', 'acled-dots', onMouseEnter);
  map.on('mouseleave', 'acled-dots', onMouseLeave);
  map.on('mousemove', 'acled-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let prop = e.features[0].properties;
    let date = new Date(prop.date);
    let content = `<span class='small'>${moment(date).format('MMM D, YYYY')}</span>`;
    content += `<h2>${prop.event_type}</h2>`;
    content += `<p>'${prop.notes}</p>`;
    content += `<p>Fatalities: ${prop.fatalities}</p>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initRefugeeLayer() {
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeLineScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([2, 20]);

  let refugeeIconScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([0.25, 1]);

  //draw directional curved arrows
  for (let d of refugeeLineData.features) {
    const iso = d.properties.ISO_3;
    const start = d.geometry.coordinates[0];
    const end = d.geometry.coordinates[1];

    const curve = getCurvedLine(start, end);
    const bearing = curve.bearing;

    map.addSource(`route-${iso}`, {
      'type': 'geojson',
      'lineMetrics': true,
      'data': curve.line
    });

    //draw line
    map.addLayer({
      'id': `line-${iso}`,
      'type': 'line',
      'source': `route-${iso}`,
      'paint': {
        'line-color': '#0072BC',
        'line-opacity': 0.8,
        'line-width': refugeeLineScale(dataByCountry[iso][0]['#affected+refugees']),
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, "rgba(0, 114, 188, 1)",
          1, "rgba(0, 114, 188, 0.2)"
        ]
      }
    });

    //get geo for arrow head and label
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
        'icon-offset': [1, -20.5]
      },
      paint: {
        'icon-color': '#0072BC',
        'icon-opacity': 0.8
      }
    });


    //mouse events
    map.on('mouseenter', `arrow-${iso}`, onMouseEnter);
    map.on('mouseleave', `arrow-${iso}`, onMouseLeave);
    map.on('mousemove', `arrow-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });


    map.on('mouseenter', `line-${iso}`, onMouseEnter);
    map.on('mouseleave', `line-${iso}`, onMouseLeave);
    map.on('mousemove', `line-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });
  }
}

function updateCountryLayer() {
  colorNoData = '#F9F9F9';
  $('.no-data-key').hide();

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 100);

  //color scale
  var clrRange = colorRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#affected+idps':
      clrRange = idpColorRange;
      break;
    case '#org+count+num':
      clrRange = orgsRange;
    default:
      //
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  $('.map-legend.country').removeClass('population acled idps');
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
    $('.no-data-key').show();
    $('.map-legend.country').addClass('idps');

    let max = d3.max(idpGeoJson.features, function(d) { return +d.properties.idpPresence; });
    countryColorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);
  }
  else if (currentCountryIndicator.id=='#org+count+num') {
    $('.no-data-key').show();
    //$('.map-legend.country').addClass('idps');
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
      layerOpacity = 1;
      color = (val<0 || !isVal(val) || isNaN(val)) ? colorNoData : countryColorScale(val);

      //turn off choropleth for population layer
      color = (currentCountryIndicator.id=='#population') ? colorDefault : color;
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
  //set expression defaults
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
    resetLayers();
    map.setLayoutProperty('acled-dots', 'visibility', 'visible');
    map.setLayoutProperty('border-crossings-layer', 'visibility', 'none');
    map.setLayoutProperty('hostilities-layer', 'visibility', 'none');
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    resetLayers();
    map.setLayoutProperty(countryLayer, 'visibility', 'none');
    map.setLayoutProperty('macro-regions', 'visibility', 'visible');
  }
  else {
    resetLayers();
  }
}


function resetLayers() {
  map.setLayoutProperty(countryLayer, 'visibility', 'visible')
  map.setLayoutProperty('acled-dots', 'visibility', 'none');
  map.setLayoutProperty('border-crossings-layer', 'visibility', 'visible');
  map.setLayoutProperty('hostilities-layer', 'visibility', 'visible');
  map.setLayoutProperty('macro-regions', 'visibility', 'none');
}


function createCountryLegend(scale) {
  //set data sources
  createSource($('.map-legend.country .idp-source'), '#affected+idps');
  createSource($('.map-legend.country .acled-source'), '#date+latest+acled');
  createSource($('.map-legend.country .orgs-source'), '#org+count+num');
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  createSource($('.map-legend.country .refugee-arrivals-source'), '#affected+refugees');
  createSource($('.map-legend.country .border-crossing-source'), '#geojson');

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
  createFootnote('.map-legend.country', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}


function updateCountryLegend(scale) {
  //set format for legend format
  let legendFormat = (currentCountryIndicator.id=='#affected+idps' || currentCountryIndicator.id=='#population') ? shortenNumFormat : d3.format('.0f');

  //set legend title
  let legendTitle = $('input[name="countryIndicators"]:checked').attr('data-legend');
  $('.map-legend.country .legend-title').html(legendTitle);

  //update legend
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


function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}


//mouse event/leave events
function onMouseEnter(e) {
  map.getCanvas().style.cursor = 'pointer';
  tooltip.addTo(map);
}
function onMouseLeave(e) {
  map.getCanvas().style.cursor = '';
  tooltip.remove();
}


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
function createCountryMapTooltip(adm1_name, adm1_pcode) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+code']==adm1_pcode && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];
    var label = currentCountryIndicator.name;

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
      if (currentCountryIndicator.id=='#affected+idps') val = numFormat(val);
      if (currentCountryIndicator.id=='#org+count+num') label = 'Humanitarian organizations present';
    }
    else {
      val = 'No Data';
    }
    var content = `<h2>${adm1_name} Oblast</h2>${label}:<div class="stat">${val}</div>`;

    tooltip.setHTML(content);
  }
}

