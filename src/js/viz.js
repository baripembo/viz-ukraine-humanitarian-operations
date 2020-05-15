$( document ).ready(function() {
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var nationalPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';
  var accessPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k/pub?gid=0&single=true&output=csv';
  var subnationalPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  var geomData, geomFilteredData, nationalData, accessData, subnationalData, timeseriesData, dataByCountry, totalCases, totalDeaths, maxCases, colorScale, currentCountry = '';
  var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
  var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
  var colorDefault = '#F2F2EF';
  var countryCodeList = [];
  var currentIndicator = {};
  var currentCountryIndicator = {};
  var accessLabels = {};

  var numFormat = d3.format(',');
  var shortenNumFormat = d3.format('.2s');
  var percentFormat = d3.format('.0%');

  var viewportWidth = window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select(".tooltip");


  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.json(nationalPath),
      d3.json(subnationalPath),
      d3.csv(accessPath),
      d3.csv(timeseriesPath)
    ]).then(function(data){
      //parse data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      nationalData = data[1];
      subnationalData = data[2];
      accessData = data[3];
      timeseriesData = data[4];

      //format data
      nationalData.forEach(function(item) {
        if (item['#access+constraints']!=undefined) item['#access+constraints'] = item['#access+constraints'].replace('%','')/100;
        item['#value+covid+funding+pct'] = item['#value+covid+funding+pct']/100;
      })

      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#affected+food+p3+pct'] = item['#affected+food+p3+pct']/100;
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

    //country select event
    d3.select('.country-select').on('change',function(e) {
      var selected = d3.select('.country-select').node().value;
      if (selected=='') {
        resetMap();
      }
      else {        
        currentCountry = selected;
        getCountryData();
      }
    });

    //indicator select event
    d3.select('.indicator-select').on('change',function(e) {
      var selected = d3.select('.indicator-select').node().value;
      if (selected!='') {
        var container = $('.country-panel');
        var section = $('.'+selected);
        var offset = $('.panel-header').innerHeight();
        container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop() - offset}, 300);
      }
    });

    //set content height
    $('.content').height(viewportHeight);

    //global stats
    maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
    totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
    totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
    $('.global-stats .cases').html(numFormat(totalCases));
    $('.global-stats .deaths').html(numFormat(totalDeaths));

    //access constraints description    
    $('.description').text('Humanitarian Access Constraints: ' + accessLabels['#access+constraints']);
    $('.description').width(viewportWidth - $('.global-stats').innerWidth() - $('.zoom-controls').innerWidth() - 150);

    //set up menu events
    $('.menu-indicators li').on('click', function() {
      $('.menu-indicators li').removeClass('selected')
      $(this).addClass('selected');
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).text()};
      updateGlobalMap();
    });
    currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected').text()};

    $('.menu h2').on('click', function() {
      resetMap();
    });

    //set up radio button events
    $('input[type="radio"]').click(function(){
      var selected = $('input[name="countryIndicators"]:checked');
      currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
      updateCountryMap();
    });

    drawGlobalMap();
    initTimeseries(timeseriesData);

    //remove loader and show vis
    $('.loader').hide();
    $('main, footer').css('opacity', 1);
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
    var mapCenter = [10, 5];

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
        if (isHRP(d.properties.ISO_A3)){
          tooltip.style("opacity", 1); 
        }
      })
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) {
        if (isHRP(d.properties.ISO_A3)){
          createMapTooltip(d.properties['ISO_A3'], d.properties.NAME_LONG);
        }
      })
      .on("click", function(d) {
        if (isHRP(d.properties.ISO_A3)) {
          currentCountry = d.properties.ISO_A3;
          getCountryData();
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
    var max = (currentIndicator.id.indexOf('access')>-1 || currentIndicator.id.indexOf('funding')>-1) ? 1 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
    colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);

    //toggle description
    if (currentIndicator.id=='#access+constraints')
      $('.description').show();
    else
      $('.description').hide();
    
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
          else {
            clr = (val<0 || val=='') ? colorDefault : colorScale(val);
          }
        }

        return clr;
      });

    updateGlobalLegend(colorScale);
  }

  function createGlobalLegend(scale) {
    var legend = d3.legendColor()
      .labelFormat(percentFormat)
      .cells(colorRange.length)
      .scale(scale);

    var div = d3.select('.map-legend.global');
    var svg = div.append('svg')
      .attr('height', '90px');
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);

    var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
    $('.map-legend.global .indicator-title').text(legendTitle);

    $('.map-legend.global').append('<h4>Number of COVID-19 cases</h4>');
    var markersvg = div.append('svg');
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

  function updateGlobalLegend(scale) {
    var legendFormat = (currentIndicator.id=='#access+constraints' || currentIndicator.id=='#value+covid+funding+pct') ? percentFormat : shortenNumFormat;
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.global .scale');
    g.call(legend);

    var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
    $('.map-legend.global .indicator-title').text(legendTitle);
  }

  function selectCountry(d) {
    setSelect('countrySelect', d.properties.ISO_A3);

    //zoom into country
    var panelWidth = $('.country-panel').width();
    var menuWidth = $('.content-left').width();
    var width = viewportWidth - panelWidth - menuWidth;
    var height = viewportHeight;
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    mapsvg.transition().duration(200).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(((width-panelWidth) / 2)+menuWidth+100, height / 2)
        .scale(Math.min(30, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
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

      if (cg!=undefined) {
        cg.attr('transform', transform);
        cg.attr('stroke-width', 1 / transform.k);
      }

      mapsvg.selectAll('.country-label')
        .style('font-size', function(d) { return 12/transform.k+'px'; });

      if (cmapsvg!=undefined) {
        cmapsvg.selectAll('.adm1-label')
          .style('font-size', function(d) { return 12/transform.k+'px'; });
      }

      //update map markers
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
    var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);

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
        var adm1 = subnationalData.filter(c => c['#adm1+name'] == d.properties.ADM1_REF);
        val = adm1[0][currentCountryIndicator.id];
        var clr = (val<0 || val=='') ? colorDefault : countryColorScale(val);
        return clr;
      })
      .on("mouseover", function(d){ tooltip.style("opacity", 1);})
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) { createCountryMapTooltip(d.properties['ADM1_REF']); });


    //adm1 labels
    var label = cg.selectAll(".adm1-label")
      .data(adm1Data.features)
      .enter().append("text")
        .attr("class", "adm1-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", '1em')
        .text(function(d) { return d.properties.ADM1_REF; })
        .call(wrap, 100);

    createCountryLegend(countryColorScale);

    //zoom into selected country
    geomFilteredData.forEach(function(c) {
      if (c.properties.ISO_A3==currentCountry) {
        selectCountry(c);
      }
    });
  }

  function updateCountryMap() {
    $('.map-legend.country svg').show();
    var max = (currentCountryIndicator.id.indexOf('pct')>-1) ? 1 : d3.max(subnationalData, function(d) { 
      if (d['#country+code']==currentCountry)
        return d[currentCountryIndicator.id]; 
    })
    var countryColorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);

    cmapsvg.selectAll('.map-regions')
      .attr('fill', function(d) {
        var val = -1;
        var clr = colorDefault;
        var adm1 = subnationalData.filter(c => c['#adm1+name'] == d.properties.ADM1_REF);
        val = adm1[0][currentCountryIndicator.id]; 
        clr = (val<0 || val=='') ? colorDefault : countryColorScale(val);
        return clr;
      });

    if (max!=undefined)
      updateCountryLegend(countryColorScale);
    else
      $('.map-legend.country svg').hide();
  }

  function createCountryLegend(scale) {
    $('.map-legend.country svg').remove();

    var legend = d3.legendColor()
      .labelFormat(percentFormat)
      .cells(colorRange.length)
      .scale(scale);

    var div = d3.select('.map-legend.country');
    var svg = div.append('svg');
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);
  }

  function updateCountryLegend(scale) {
    var legendFormat = (currentCountryIndicator.id=='#affected+food+p3+pct') ? percentFormat : shortenNumFormat;
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.country .scale');
    g.call(legend);
  }


  /***********************/
  /*** PANEL FUNCTIONS ***/
  /***********************/
  function initCountryPanel() {
    var data = dataByCountry[currentCountry][0];

    //timeseries
    updateTimeseries(timeseriesData, data['#country+code']);

    //set panel header
    $('.flag').attr('src', '/assets/flags/'+data['#country+code']+'.png');
    $('.country-panel h3').text(data['#country+name']);

    //covid
    var covidDiv = $('.country-panel .covid .panel-inner');
    covidDiv.children().remove();  
    createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: data['#affected+infected']});
    createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: data['#affected+killed']});

    //projections
    var projectionsDiv = $('.country-panel .projections .panel-inner');
    projectionsDiv.children().remove();  
    projectionsDiv.append('<h6>COVID-19 Projections</h6><div class="bar-chart projections-cases"><p class="chart-title">Cases</p></div>');
    var cases = [{model: 'Imperial', min: data['#affected+cases+imperial+infected+min'], max: data['#affected+cases+imperial+infected+max']},
                 {model: 'LSHTM', min: data['#affected+cases+infected+lshtm+min'], max: data['#affected+cases+infected+lshtm+max']}];
    createBarChart(cases, 'Cases');
    
    projectionsDiv.append('<div class="bar-chart projections-deaths"><p class="chart-title">Deaths</p></div>');
    var deaths = [{model: 'Imperial', min: data['#affected+deaths+imperial+min'], max: data['#affected+deaths+imperial+max']},
                  {model: 'LSHTM', min: data['#affected+deaths+lshtm+min'], max: data['#affected+deaths+lshtm+max']}];
    createBarChart(deaths, 'Deaths');
  
    //hrp
    var hrpDiv = $('.country-panel .hrp .panel-inner');
    hrpDiv.children().remove();  
    createFigure(hrpDiv, {className: 'pin', title: 'Number of People in Need', stat: shortenNumFormat(data['#affected+inneed'])});
    createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: data['#value+covid+funding+pct']+'%'});
    createFigure(hrpDiv, {className: 'funding-received', title: 'HRP Funding Received', stat: shortenNumFormat(data['#value+covid+funding+total+usd'])});
    createFigure(hrpDiv, {className: 'funding-required', title: 'GHRP Request (USD)', stat: shortenNumFormat(data['#value+funding+precovid+required+usd'])});

    //inform
    var informDiv = $('.country-panel .inform .panel-inner');
    informDiv.children().remove();  
    createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+num']});
    createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+type']});

    //school
    var schoolDiv = $('.country-panel .schools .panel-inner');
    schoolDiv.children().remove();  
    createFigure(schoolDiv, {className: 'school', stat: data['#impact+type']});

    //access -- fix this logic
    var accessDiv = $('.country-panel .humanitarian-access .panel-inner');
    accessDiv.children().remove();  
    const keys = Object.keys(data);
    var constraintsCount = 0;
    var impactCount = 0;
    var phrase = ['Restriction of movements INTO the country ', 'Restriction of movements WITHIN the country '];
    keys.forEach(function(key, index) {
      if (key.indexOf('constraints_')>-1) constraintsCount++;
      if (key.indexOf('impact_')>-1) impactCount++;
    });
    var headerCount = 0;
    var text = '';
    for (var i=1; i<=constraintsCount; i++) {
      var key = '#access+constraints_'+i;
      if (accessLabels[key].indexOf(phrase[0])>-1) {
        text = accessLabels[key].replace(phrase[0],'');
        if (headerCount==0) {
          accessDiv.append('<h6 class="access-title">'+ phrase[0] +'</h6>');
          headerCount++;
        }
      }
      else if (accessLabels[key].indexOf(phrase[1])>-1) {
        text = accessLabels[key].replace(phrase[1],'');
        if (headerCount==1) {
          accessDiv.append('<h6 class="access-title">'+ phrase[1] +'</h6>');
          headerCount++;
        }
      }
      else {
        text = accessLabels[key];
        if (headerCount==2) {
          accessDiv.append('<h6 class="access-title"></h6>');
          headerCount++;
        }
      }
      var content = '<div class="access-row">';
      content += (data[key]==1) ? '<div class="access-icon yes">YES</div>' : '<div class="access-icon">NO</div>';
      content += '<div>'+ text +'</div></div>';
      accessDiv.append(content);
    }
    accessDiv.append('<h6 class="access-title">What is the impact of COVID-19 related measures on the response?</h6>');
    for (var j=1; j<=impactCount; j++) {
      var key = '#access+impact_'+j;
      var content = '<div class="access-row">';
      content += (data[key]==j) ? '<div class="access-icon yes">YES</div>' : '<div class="access-icon">NO</div>';
      content += '<div>'+ accessLabels[key] +'</div></div>';
      accessDiv.append(content);
    }
  }


  function createFigure(div, obj) {
    div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
    var divInner = $('.'+ obj.className +' .figure-inner');
    if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
    divInner.append('<p class="stat">'+ obj.stat +'</p>');
    divInner.append('<p class="small"><span class="date">May 2, 2020</span> | <a href="" class="dataURL">DATA</a></p>');
  }


  /*************************/
  /*** TOOLTIP FUNCTIONS ***/
  /*************************/
  function createCountryMapTooltip(adm1_name){
    var adm1 = subnationalData.filter(c => c['#adm1+name'] == adm1_name);
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
      if (currentIndicator.id.indexOf('access')>-1 || currentIndicator.id.indexOf('funding')>-1) val = percentFormat(val);
      if (currentIndicator.id=='#affected+inneed') val = shortenNumFormat(val);
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