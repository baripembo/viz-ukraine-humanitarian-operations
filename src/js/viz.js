var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.0%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var foodPricesColor = '#3B97E1';
var colorDefault = '#F2F2EF';
var geomData, geomFilteredData, nationalData, accessData, subnationalData, timeseriesData, dataByCountry, totalCases, totalDeaths, maxCases, colorScale, currentCountry = '';
  
var countryCodeList = [];
var currentIndicator = {};
var currentCountryIndicator = {};
var accessLabels = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1) ? true : false;
  console.log(prod);
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var nationalPath = (prod) ? 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv' : 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vTP8bQCTObeCb8j6binSiC0PmU_sCh6ZdfDnK9s28Pi89I-7DT_KhcVw-ZQTcWi4_VplTBBeMnP1d68%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';
  var subnationalPath = (prod) ? 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv' : 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vTP8bQCTObeCb8j6binSiC0PmU_sCh6ZdfDnK9s28Pi89I-7DT_KhcVw-ZQTcWi4_VplTBBeMnP1d68%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv';
  var accessPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k/pub?gid=0&single=true&output=csv';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  var sourcesPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D1837381168%26single%3Dtrue%26output%3Dcsv';

  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA';

  var viewportWidth = window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select(".tooltip");


  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.json(nationalPath),
      d3.json(subnationalPath),
      d3.csv(accessPath),
      d3.csv(timeseriesPath),
      d3.json(sourcesPath)
    ]).then(function(data){
      //parse data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      nationalData = data[1];
      subnationalData = data[2];
      accessData = data[3];
      timeseriesData = data[4];
      sourcesData = data[5];

      //format data
      nationalData.forEach(function(item) {
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
      })

      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      })

      //parse out access labels
      accessLabels = getAccessLabels(accessData[0]);

      //group data by country    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      console.log(nationalData)
      console.log(subnationalData)

      //get list of priority countries
      nationalData.forEach(function(item, index) {
        countryCodeList.push(item['#country+code']);
      });

      //filter for priority countries
      geomFilteredData = geomData.features.filter((country) => countryCodeList.includes(country.properties.ISO_A3));

      initDisplay();
      initMap();
    });
  }

  function getCountryData() {
    //clear map region colors
    mapsvg.selectAll('.map-regions')
      .attr('fill', colorDefault);
    $('.count-marker').hide();

    var dataPath = 'data/'+currentCountry+'.geojson';
    Promise.all([
      d3.json(dataPath)
    ]).then(function(data){
      var adm1Data = data[0];
      currentCountryIndicator = {id: '#affected+food+p3+pct', name: 'Food Security'};
      drawCountryMap(adm1Data);
    });
  }

  function initDisplay() {
    //create country select 
    var countrySelect = d3.select('.country-select')
      .selectAll('option')
      .data(nationalData)
      .enter().append('option')
        .text(function(d) { return d['#country+name']; })
        .attr('value', function (d) { return d['#country+code']; });

    //insert default option    
    $('.country-select').prepend('<option value="">Select Country</option>');
    $('.country-select').val($('.country-select option:first').val());

    //set content height
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('.footnote').width(viewportWidth - $('.global-stats').innerWidth() - 120);

    //set access constraints description    
    $('.description').text(accessLabels['#access+constraints']);

    //global stats
    maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
    totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
    totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
    createKeyFigure('.stats-priority', 'Total Confirmed Cases', 'cases', totalCases);
    createKeyFigure('.stats-priority', 'Total Confirmed Deaths', 'deaths', totalDeaths);
    createSource($('.global-stats'), '#affected+infected');

    //country select event
    d3.select('.country-select').on('change',function(e) {
      var selected = d3.select('.country-select').node().value;
      if (selected=='') {
        resetMap();
      }
      else {        
        currentCountry = selected;

        if (currentIndicator.id=='#food-prices') {
          openModal(currentCountry);
        }
        else getCountryData();
      }
    });

    //menu events
    $('.menu-indicators li').on('click', function() {
      $('.menu-indicators li').removeClass('selected')
      $(this).addClass('selected');
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};

      //toggle description
      if (currentIndicator.id=='#access+constraints') $('.description').show();
      else $('.description').hide();

      //set food prices view
      if (currentIndicator.id=='#food-prices') $('.content').addClass('food-prices-view');
      else {
        $('.content').removeClass('food-prices-view');
        closeModal();
      }

      updateGlobalMapbox();
      //updateGlobalMap();
    });
    currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected div').text()};

    //back to global event
    $('.menu h2').on('click', function() {
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

    //set up radio button events
    $('input[type="radio"]').click(function(){
      var selected = $('input[name="countryIndicators"]:checked');
      currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
      updateCountryMap();
    });

    //drawGlobalMap();
    //initTimeseries(timeseriesData, '.global-timeseries-chart');
    initTimeseries(timeseriesData, '.country-timeseries-chart');
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.menu h2').html('<a href="#">< Back to Global View</a>');
    $('.country-panel').scrollTop(0);
    $('#foodSecurity').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();
  }



  /****************************/
  /*** GLOBAL MAP FUNCTIONS ***/
  /****************************/
  var projection, zoom, g, mapsvg, path, markerScale;
  function drawGlobalMap(){
    var width = viewportWidth;
    var height = viewportHeight;
    var mapScale = width/3.5;
    var mapCenter = [10, 15];

    //choropleth color scale
    colorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);

    //create log scale for circle markers
    markerScale = d3.scaleSqrt()
      .domain([1, maxCases])
      .range([2, 15]);

    projection = d3.geoMercator()
      .center(mapCenter)
      .scale(mapScale)
      .translate([width / 2, height / 2]);

    zoom = d3.zoom()
      .scaleExtent([1, 30])
      .on("zoom", zoomed);

    path = d3.geoPath().projection(projection);

    mapsvg = d3.select('#global-map').append('svg')
      .attr("width", width)
      .attr("height", height)
      .call(zoom)
      .on("wheel.zoom", null)
      .on("dblclick.zoom", null);

    mapsvg.append("rect")
      .attr("width", "100%")
      .attr("height", viewportHeight)
        
    //draw map
    g = mapsvg.append("g");
    g.selectAll("path")
    .data(geomData.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      .attr("fill", function(d) {
        var num = -1;
        if (isHRP(d.properties.ISO_A3)){
          var country = nationalData.filter(c => c['#country+code'] == d.properties.ISO_A3);
          num = country[0][currentIndicator.id]; 
        }
        var clr = (num<0 || num=='') ? colorDefault : colorScale(num);
        return clr;
      })
      .attr("id", function(d) { return d.properties.ISO_A3; })
      .attr("d", path)
      .on("mouseover", function(d){ 
        if (isHRP(d.properties.ISO_A3) && currentIndicator.id!='#food-prices') {
          tooltip.style("opacity", 1); 
        }
      })
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) {
        if (isHRP(d.properties.ISO_A3) && currentIndicator.id!='#food-prices') {
          createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
        }
      })
      .on("click", function(d) {
        if (isHRP(d.properties.ISO_A3)) {
          currentCountry = d.properties.ISO_A3;
        
          //country click        
          if (currentIndicator.id=='#food-prices') {
            openModal(d.properties.NAME_LONG);
          }
          else getCountryData();
        }
      });

    //create count markers
    var countMarker = g.append("g")
      .attr("class", "count-layer")
      .selectAll(".count-marker")
      .data(geomFilteredData)
      .enter()
        .append("g")
        .append("circle")
        .attr("class", "marker count-marker")
        .attr("id", function(d) { return d.properties.ISO_A3; })
        .attr("r", function (d){ 
          var country = nationalData.filter(country => country['#country+code'] == d.properties.ISO_A3);
          return markerScale(+country[0]['#affected+infected']); 
        })
        .attr("transform", function(d){ return "translate(" + path.centroid(d) + ")"; })
        .on("mouseover", function(){ tooltip.style("opacity", 1); })
        .on("mouseout", function(){ tooltip.style("opacity", 0); })
        .on("mousemove", function(d) {
          createMapTooltip(d.properties.ISO_A3, d.properties.NAME_LONG);
        })
        .on("click", function(d) {
          currentCountry = d.properties.ISO_A3;
          getCountryData();
        });

    //country labels
    var label = g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", "1em")
        .text(function(d) { return d.properties.NAME_LONG; })
        .call(wrap, 100);

    //tooltip
    mapTooltip = mapsvg.append("g")
      .attr("class", "tooltip");

    //zoom controls
    d3.select("#zoom_in").on("click", function() {
      zoom.scaleBy(mapsvg.transition().duration(500), 1.5);
    }); 
    d3.select("#zoom_out").on("click", function() {
      zoom.scaleBy(mapsvg.transition().duration(500), 0.5);
    });

    createGlobalLegend(colorScale);
  }

  function updateGlobalMap() {
    //set up color scales
    var max = (currentIndicator.id.indexOf('pct')>-1) ? 1 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
    if (currentIndicator.id=='#severity+economic+num') max = 10;
    colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);

    //update choropleth
    mapsvg.selectAll('.map-regions')
      .attr("fill", function(d) {
        var val = -1;
        var clr = colorDefault;
        if (isHRP(d.properties.ISO_A3)){
          var country = nationalData.filter(c => c['#country+code'] == d.properties.ISO_A3);
          val = country[0][currentIndicator.id]; 

          if (currentIndicator.id=='#severity+type') {
            colorScale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
            clr = (val=='') ? colorDefault : colorScale(val);
          }
          else if (currentIndicator.id=='#food-prices') {
            clr = foodPricesColor;
          }
          else {
            clr = (val<0 || val=='') ? colorDefault : colorScale(val);
          }
        }

        return clr;
      });

    updateGlobalLegend(colorScale);
  }

  

  function selectCountry(d) {
    setSelect('countrySelect', d.properties.ISO_A3);

    //zoom into country
    var panelWidth = $('.country-panel').width();
    var menuWidth = $('.content-left').width();
    var legendWidth = $('.map-legend.country').width();
    var offset = menuWidth + legendWidth - 120;
    var width = viewportWidth - panelWidth - menuWidth - legendWidth;
    var height = viewportHeight;
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    mapsvg.transition().duration(200).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(((width) / 2)+offset, height / 2)
        .scale(Math.min(30, 1 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
    )
    .on('end', initCountryView);
  }


  function resetMap() {
    $('.content').removeClass('country-view');
    $('#country-map').empty();
    $('.menu h2').html('Global');
    setSelect('countrySelect', '');

    updateGlobalMap();
    mapsvg.transition().duration(500).call(
      zoom.transform, 
      d3.zoomIdentity
        .scale(1)
    )
    .on('end', function() { 
      $('.count-marker').show(); 
    });
  }

  function zoomed() {
    const {transform} = d3.event;
    currentZoom = transform.k;

    if (!isNaN(transform.k)) {
      g.attr('transform', transform);
      g.attr('stroke-width', 1 / transform.k);

      //update country labels and markers
      if (cg!=undefined) {
        cg.attr('transform', transform);
        cg.attr('stroke-width', 1 / transform.k);

        cmapsvg.selectAll('.adm1-label, .health-label')
          .style('font-size', function(d) { return 12/transform.k+'px'; });

        cmapsvg.selectAll('circle').each(function(m){
          var marker = d3.select(this);
          subnationalData.forEach(function(d){
            if (m.properties.ADM1_REF == d['#adm1+name']) {
              var r = 20;
              marker.transition().duration(500).attr('r', function (d) { 
                return (r/currentZoom);
              });
            }
          });
        });
      }

      //update global labels and markers
      mapsvg.selectAll('.country-label')
        .style('font-size', function(d) { return 12/transform.k+'px'; });
      
      mapsvg.selectAll('circle').each(function(m){
        var marker = d3.select(this);
        nationalData.forEach(function(d){
          if (m.properties.ISO_A3 == d['#country+code']) {
            var r = markerScale(d['#affected+infected']);
            marker.transition().duration(500).attr('r', function (d) { 
              return (r/currentZoom);
            });
          }
        });
      });
    }
  }

  /*****************************/
  /*** COUNTRY MAP FUNCTIONS ***/
  /*****************************/
  var cmapsvg, cg;
  function drawCountryMap(adm1Data) {
    $('#country-map').empty();
    var max = getCountryIndicatorMax();
    var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
    createCountryLegend(countryColorScale);

    if (max=='undefined' || max<=0) {
      $('.map-legend.country svg').hide();
    }

    //draw country map
    cmapsvg = d3.select('#country-map').append('svg')
      .attr("width", viewportWidth)
      .attr("height", viewportHeight);

    cmapsvg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
        
    //draw map
    cg = cmapsvg.append("g");
    cg.selectAll("path")
    .data(adm1Data.features)
    .enter()
      .append("path")
      .attr("class", "map-regions")
      .attr("id", function(d) { return d.properties.ADM1_REF; })
      .attr("d", path)
      .attr("fill", function(d) {
        var val = -1;
        var adm1 = subnationalData.filter(function(c) {
          if (c['#adm1+name']==d.properties.ADM1_REF && c['#country+code']==currentCountry)
            return c;
        });
        val = adm1[0][currentCountryIndicator.id];
        var clr = (val<0 || val=='') ? colorDefault : countryColorScale(val);
        return clr;
      })
      .on("mouseover", function(d){ tooltip.style("opacity", 1);})
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) { createCountryMapTooltip(d.properties['ADM1_REF']); });


    //create health markers
    var healthData = [];
    adm1Data.features.forEach(function(feature) {
      var adm1 = subnationalData.filter(function(c) {
        if (c['#adm1+name']==feature.properties.ADM1_REF && c['#country+code']==currentCountry && c['#loc+count+health']>0) {
          var f = feature;
          f.properties.ADM1_NUM_HEALTH_FACILITIES = c['#loc+count+health'];
          healthData.push(f);
        }
      });
    });
    var healthMarker = cg.append("g")
      .attr("class", "health-layer")
      .selectAll(".health-marker")
      .data(healthData)
      .enter()
        .append("g")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .on("mouseover", function(){ tooltip.style("opacity", 1); })
        .on("mouseout", function(){ tooltip.style("opacity", 0); })
        .on("mousemove", function(d) {
          createCountryMapTooltip(d.properties['ADM1_REF']);
        });

    healthMarker.append("circle")
      .attr("class", "marker health-marker")
      .attr("id", function(d) { return d.properties.ADM1_REF; })
      .attr("r", 20);

    healthMarker.append("text")
      .attr("class", "health-label")
      .text(function(d) { return d.properties.ADM1_NUM_HEALTH_FACILITIES; })

    //adm1 labels
    var label = cg.selectAll(".adm1-label")
      .data(adm1Data.features)
      .enter().append("text")
        .attr("class", "adm1-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", '1em')
        .text(function(d) { return d.properties.ADM1_REF; })
        .call(wrap, 100);

    //zoom into selected country
    geomFilteredData.forEach(function(c) {
      if (c.properties.ISO_A3==currentCountry) {
        selectCountry(c);
      }
    });
  }

  function getCountryIndicatorMax() {
    var max =  d3.max(subnationalData, function(d) { 
      if (d['#country+code']==currentCountry) {
        return d[currentCountryIndicator.id]; 
      }
    });
    return max;
  }

  function updateCountryMap() {
    $('.map-legend.country svg').show();
    var max = getCountryIndicatorMax();
    if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
    if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

    var colors = (currentCountryIndicator.id.indexOf('vaccinated')>0) ? immunizationColorRange : colorRange;
    var countryColorScale = d3.scaleQuantize().domain([0, max]).range(colors);

    cmapsvg.selectAll('.map-regions')
      .attr('fill', function(d) {
        var val = -1;
        var clr = colorDefault;
        var adm1 = subnationalData.filter(function(c) {
          if (c['#adm1+name']==d.properties.ADM1_REF && c['#country+code']==currentCountry)
            return c;
        });
        val = adm1[0][currentCountryIndicator.id]; 
        clr = (val<0 || val=='' || currentCountryIndicator.id=='#loc+count+health') ? colorDefault : countryColorScale(val);
        return clr;
      });

    //toggle health layer
    if (currentCountryIndicator.id=='#loc+count+health') $('.health-layer').fadeIn()
    else $('.health-layer').fadeOut('fast');

    //hide color scale if no data
    if (max!=undefined && max>0 && currentCountryIndicator.id!='#loc+count+health')
      updateCountryLegend(countryColorScale);
    else
      $('.map-legend.country svg').hide();
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


  /*************************/
  /*** TOOLTIP FUNCTIONS ***/
  /*************************/
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
    var content = '<label class="h3 label-header">' + adm1_name + '</label>' + currentCountryIndicator.name + ': ' + val + '<br/>';

    showMapTooltip(content);
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
  /*********************/


  /************************/
  /*** HELPER FUNCTIONS ***/
  /************************/
  function isHRP(country_code) {
    var included = false;
    countryCodeList.forEach(function(c){
      if (c==country_code) included = true;
    });
    return included;
  }
  /************************/


  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});