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
      var val = (currentIndicator.id=='#indicator+foodbasket+change+pct') ? d['#indicator+foodbasket+change+category'] : d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#affected+infected+new+weekly') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
        val = d['#indicator+foodbasket+change+category'];
        //if (val<0) val = 0; //hotfix for negative values
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
  //map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
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
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#vaccination+postponed+num') {
    //set the max to at least 5
    max = (max>5) ? max : 5;
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
    //scale = d3.scaleQuantize().domain([min, max]).range(colorRange);
    scale = d3.scaleOrdinal().domain(foodBasketScale).range(colorRange);
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
    createFootnote('.map-legend.global', '#affected+inneed+pct', 'The Total Number of People in Need figure corresponds to 28 HRPs, 8 Regional Response Plans, 3 Flash Appeals and Lebanon\'s ERP. Population percentages greater than 100% include refugees, migrants, and/or asylum seekers.');
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
