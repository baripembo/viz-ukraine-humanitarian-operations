/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function handleGlobalEvents(layer) {
  //menu events
  $('.menu-indicators li').on('click', function() {
    selectGlobalLayer(this);

    //reset any deep links
    // var layer = $(this).attr('data-layer');
    // var location = (layer==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layer;
    // window.history.replaceState(null, null, location);

    //handle comparison list
    // if (currentIndicator.id=='#affected+infected+new+per100000+weekly') $('.comparison-panel').show();
    // else resetComparison();
  });

  //global figures close button
  $('.secondary-panel .close-btn').on('click', function() {
    var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
    toggleSecondaryPanel(currentBtn);
  });


  map.on('mouseenter', secondaryGlobalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      var features = map.queryRenderedFeatures(e.point, { layers: [secondaryGlobalLayer] });
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
     
  map.on('mouseleave', secondaryGlobalLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  map.on('click', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [secondaryGlobalLayer] });
    var target;
    features.forEach(function(feature) {
      if (feature.sourceLayer==adm0SourceLayer)
        target = feature;
    });
    if (target!=null) {
      currentCountry.code = target.properties.ISO_3;
      currentCountry.name = (target.properties.Terr_Name=='CuraÃ§ao') ? 'Curaçao' : target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        var country = secondaryNationalData.filter(c => c['#country+code'] == currentCountry.code);

        createComparison(country)
     
        if (currentIndicator.id=='#indicator+foodbasket+change+pct' && country[0]['#indicator+foodbasket+change+pct']!=undefined) {
          openModal(currentCountry.code, currentCountry.name);
        }
      }
    }
  });
}


function initGlobalLayer() {
  //color scale
  colorScale = getGlobalLegendScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  secondaryNationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val==null) ? colorNoData : colorScale(val);
    expression.push(d['#country+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);
  
  //set properties
  map.setPaintProperty(secondaryGlobalLayer, 'fill-color', expression);

  //define mouse events
  handleGlobalEvents();

  //global figures
  setKeyFigures();
}


function updateGlobalLayer() {
  setKeyFigures();

  //color scales
  colorScale = getGlobalLegendScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct') ? '#E7E4E6' : '#FFF';

  //data join
  var countryList = [];
  var expression = ['match', ['get', 'ISO_3']];
  secondaryNationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = (currentIndicator.id=='#indicator+foodbasket+change+pct') ? d['#indicator+foodbasket+change+category'] : d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
        val = d['#indicator+foodbasket+change+category'];
        //if (val<0) val = 0; //hotfix for negative values
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
      }
      else {
        color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
      }
      expression.push(d['#country+code'], color);

      //create country list for global timeseries chart
      countryList.push(d['#country+name']);
    }
  });

  //default value for no data
  expression.push(colorDefault);

  map.setPaintProperty(secondaryGlobalLayer, 'fill-color', expression);
  setGlobalLegend(colorScale);
}


function getGlobalLegendScale() {
  //get min/max
  var min = d3.min(secondaryNationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id]; 
  });
  var max = d3.max(secondaryNationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id];
  });

  if (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) max = 1;
  
  if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') max = 0;
  else max = Math.ceil(max)+1;

  //set scale
  var scale;
  if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
    //scale = d3.scaleQuantize().domain([min, max]).range(colorRange);
    scale = d3.scaleOrdinal().domain(foodBasketScale).range(colorRange);
  }
  else if (currentIndicator.id=='#impact+type') {
    scale = d3.scaleOrdinal().domain(['Fully open', 'Partially open', 'Closed due to COVID-19', 'Academic break']).range(schoolClosureColorRange);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(frameworkColorRange);
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

   //pin footnote
    createFootnote('.map-legend.global', '#affected+inneed+pct', 'The Total Number of People in Need figure corresponds to 28 HRPs, 8 Regional Response Plans, 3 Flash Appeals and Lebanon\'s ERP. Population percentages greater than 100% include refugees, migrants, and/or asylum seekers.');
    //food prices footnote
    createFootnote('.map-legend.global', '#indicator+foodbasket+change+pct', 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.');
    
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

    var legendFormat = (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) ? d3.format('.0%') : shortenNumFormat;
    
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

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
  else {
    noDataKey.find('.label').text('No Data');
    noDataKey.find('rect').css('fill', '#FFF');
  }

  //show/hide footnotes
  $('.footnote-indicator').hide();
  $('.footnote-indicator[data-indicator="'+ currentIndicator.id +'"]').show();
}


//set global layer view
function selectGlobalLayer(menuItem) {
  $('.menu-indicators li').removeClass('selected');
  $('.menu-indicators li div').removeClass('expand');
  $(menuItem).addClass('selected');
  if (currentIndicator.id==$(menuItem).attr('data-id')) {
    toggleSecondaryPanel(menuItem);
  }
  else {
    currentIndicator = {id: $(menuItem).attr('data-id'), name: $(menuItem).attr('data-legend'), title: $(menuItem).text()};
    toggleSecondaryPanel(menuItem, 'open');

    //set food prices view
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      closeModal();
    }

    vizTrack('wrl', $(menuItem).find('div').text());
    updateGlobalLayer();
  }
}


function toggleSecondaryPanel(currentBtn, state) {
  var width = $('.secondary-panel').outerWidth();
  var pos = $('.secondary-panel').position().left;
  var newPos = (pos<0) ? 0 : -width;
  if (state=='open') { newPos = 0; }
  if (state=='close') { newPos = -width; }
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
}

/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
function createMapTooltip(country_code, country_name, point) {
  var country = secondaryNationalData.filter(c => c['#country+code'] == country_code);
  if (country[0]!=undefined) {
    var val = country[0][currentIndicator.id];

    //format content for tooltip
    if (isVal(val)) {
      if (currentIndicator.id.indexOf('pct')>-1) {
        if (currentIndicator.id=='#value+gdp+ifi+pct') {
          if (isNaN(val))
            val = 'No Data'
          else
            val = (val==0) ? '0%' : d3.format('.2%')(val);
        }
        else
          val = (isNaN(val)) ? 'No Data' : percentFormat(val);
      }
      if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
    }
    else {
      val = 'No Data';
    }

    //format content for display
    var content = '<h2>'+ country_name +'</h2>';

    //framework index layer
    if (currentIndicator.id=='#severity+overall+num') {
      if (val!='No Data') {
        content += `${currentIndicator.name}: <div class="stat">${val}</div>`;
        content += `<div class="table-display">`;
        if (country[0]['#severity+food+short_term+num']!=undefined) content += `<div class="table-row"><div>Food Insecurity Risk, Short Term:</div><div>${country[0]['#severity+food+short_term+num']}</div></div>`;
        if (country[0]['#severity+food+long_term+num']!=undefined) content += `<div class="table-row"><div>Food Insecurity Risk, Long Term:</div><div>${country[0]['#severity+food+long_term+num']}</div></div>`;
        if (country[0]['#severity+energy+num']!=undefined) content += `<div class="table-row"><div>Energy Risk:</div><div>${country[0]['#severity+energy+num']}</div></div>`;
        if (country[0]['#severity+debt+num']!=undefined) content += `<div class="table-row"><div>Debt Risk</div><div>${country[0]['#severity+debt+num']}</div></div>`;
        if (country[0]['#severity+dependence+rus+num']!=undefined) content += `<div class="table-row"><div>Financial Dependence on Russia:</div><div>${country[0]['#severity+dependence+rus+num']}</div></div>`;
        if (country[0]['#severity+economic+num']!=undefined) content += `<div class="table-row"><div>Economic Outlook:</div><div>${country[0]['#severity+economic+num']}</div></div>`;
        if (country[0]['#severity+conflict+num']!=undefined) content += `<div class="table-row"><div>Conflict Outlook:</div><div>${country[0]['#severity+conflict+num']}</div></div>`;
        content += `</div>`;
      }
      else {
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
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
    //INFORM layer
    else if (currentIndicator.id=='#severity+inform+type') {
      var numVal = (isVal(country[0]['#severity+inform+num'])) ? country[0]['#severity+inform+num'] : 'No Data';
      var informClass = country[0]['#severity+inform+type'];
      var informTrend = country[0]['#severity+inform+trend'];
      content += 'INFORM Severity Index: <div><span class="stat">' + numVal + '</span> <span class="subtext inline">(' + informClass + ' / ' + informTrend + ')</span></div>';
    }
    //all other layers
    else {
      content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
    }

    //set content for tooltip
    tooltip.setHTML(content);
    setTooltipPosition(point);
  }
}

// function setTooltipPosition(point) {
//   var tooltipWidth = $('.map-tooltip').width();
//   var tooltipHeight = $('.map-tooltip').height();
//   var anchorDirection = (point.x + tooltipWidth > viewportWidth) ? 'right' : 'left';
//   var yOffset = 0;
//   if (point.y + tooltipHeight/2 > viewportHeight) yOffset = viewportHeight - (point.y + tooltipHeight/2);
//   if (point.y - tooltipHeight/2 < 0) yOffset = tooltipHeight/2 - point.y;
//   var popupOffsets = {
//     'right': [0, yOffset],
//     'left': [0, yOffset]
//   };
//   tooltip.options.offset = popupOffsets;
//   tooltip.options.anchor = anchorDirection;

//   if (yOffset>0) {
//     $('.mapboxgl-popup-tip').css('align-self', 'flex-start');
//     $('.mapboxgl-popup-tip').css('margin-top', point.y);
//   }
//   else if (yOffset<0)  {
//     $('.mapboxgl-popup-tip').css('align-self', 'flex-end');
//     $('.mapboxgl-popup-tip').css('margin-bottom', viewportHeight-point.y-10);
//   }
//   else {
//     $('.mapboxgl-popup-tip').css('align-self', 'center');
//     $('.mapboxgl-popup-tip').css('margin-top', 0);
//     $('.mapboxgl-popup-tip').css('margin-bottom', 0);
//   }
// }
