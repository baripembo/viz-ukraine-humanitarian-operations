$( document ).ready(function() {
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var nationalPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';
  var accessPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k/pub?gid=0&single=true&output=csv';
  var subnationalPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  var geomData, geomFilteredData, nationalData, accessData, subnationalData, timeseriesData, dataByCountry, totalCases, totalDeaths, maxCases, colorScale, currentCountry = '';
  var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
  var informColorRange = ['#FFE6E3','#FFC4B9','#FBA291','#F37F6A','#E85945','#D24834','#BC3823','#A62612','#911300','#821000']
  //var colorRange = ['#F7DBD9', '#F5A09A', '#F2645A'];
  var colorDefault = '#F2F2EF';
  var countryCodeList = [];
  var currentIndicator = {};
  var currentCountryIndicator = {};
  var accessLabels = {};

  var numFormat = d3.format(',');
  var shortenNumFormat = d3.format('.2s');

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
        //get rid of % in access vars
        item['#access+constraints'] = item['#access+constraints'].replace('%','');
        item['#access+impact'] = item['#access+impact'].replace('%','');
      })

      accessLabels = getAccessLabels(accessData[0]);

      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
      })

      //group data by country    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      console.log(nationalData)
      console.log(subnationalData)
      console.log(dataByCountry)

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
    var dataPath = 'data/'+currentCountry+'.geojson';
    Promise.all([
      d3.json(dataPath)
    ]).then(function(data){
      var adm1Data = data[0];
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
    $('.country-select').prepend('<option value="">Select Country</option>');
    $('.country-select').val($('.country-select option:first').val());

    //select event
    d3.select('.country-select').on('change',function(e){
      var selected = d3.select('.country-select').node().value;
      if (selected=='') {
        resetMap();
      }
      else {
        geomFilteredData.forEach(function(c){
          if (c.properties.ISO_A3==selected){
            selectCountry(c);
          }
        });
      }
    });

    //global stats
    maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
    totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
    totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
    $('.global-stats .cases').html(numFormat(totalCases));
    $('.global-stats .deaths').html(numFormat(totalDeaths));

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
    $('#foodSecurity').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();

    //clear map region colors
    mapsvg.selectAll('.map-regions')
      .attr('fill', colorDefault);
  }


  /****************************/
  /*** GLOBAL MAP FUNCTIONS ***/
  /****************************/
  var projection, zoom, g, mapsvg, path;
  function drawGlobalMap(){
    var width = viewportWidth;
    var height = viewportHeight;
    var mapScale = width/3.5;
    var mapCenter = [10, 5];

    //show confirmed cases by default
    var medianCases = d3.median(nationalData, function(d) { return +d['#affected+infected']; })
    //colorScale = d3.scaleLinear().domain([0, medianCases, maxCases]).range(colorRange);
    colorScale = d3.scaleQuantize().domain([0, maxCases]).range(colorRange);

    projection = d3.geoMercator()
      .center(mapCenter)
      .scale(mapScale)
      .translate([width / 2, height / 2]);

    zoom = d3.zoom()
      .scaleExtent([1, 8])
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
          num = country[0]['#affected+infected']; 
        }
        var clr = (num<0) ? colorDefault : colorScale(num);
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
        if (isHRP(d.properties.ISO_A3))
          setSelect('countrySelect', d.properties.ISO_A3);
          selectCountry(d);
      });

    //country labels
    var label = g.selectAll(".country-label")
      .data(geomFilteredData)
      .enter().append("text")
        .attr("class", "country-label")
        .attr("transform", function(d) { return "translate(" + path.centroid(d) + ")"; })
        .attr("dy", function() {
          var dy = (isMobile) ? 0 : '1em';
          return dy;
        })
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
    var median = (currentIndicator.id.indexOf('access')>-1) ? 100 : d3.median(nationalData, function(d) { return +d[currentIndicator.id]; })
    var max = (currentIndicator.id.indexOf('access')>-1) ? 100 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
    //colorScale = d3.scaleLinear().domain([0, median, max]).range(colorRange);
    colorScale = d3.scaleQuantize().domain([0, max]).range(colorRange);
    
    mapsvg.selectAll('.map-regions')
      .attr("fill", function(d) {
        var val = -1;
        var clr = colorDefault;
        if (isHRP(d.properties.ISO_A3)){
          var country = nationalData.filter(c => c['#country+code'] == d.properties.ISO_A3);
          val = country[0][currentIndicator.id]; 

          if (currentIndicator.id=='#severity+num') {
            colorScale = d3.scaleQuantize().domain([1, 11]).range(informColorRange);
            clr = (val<0 || val=='') ? colorDefault : colorScale(val);
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
      .labelFormat(",.0f")
      .cells(colorRange.length)
      .scale(scale);

    var div = d3.select('.map-legend.global');
    var svg = div.append('svg');
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);
  }

  function updateGlobalLegend(scale) {
    var legend = d3.legendColor()
      .labelFormat(",.0f")
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.global .scale');
    g.call(legend);
  }

  function selectCountry(d) {
    //display country adm1 regions
    currentCountry = d.properties.ISO_A3;
    getCountryData();
    initCountryView();

    //zoom into country
    var width = viewportWidth;
    var height = viewportHeight;
    const [[x0, y0], [x1, y1]] = path.bounds(d);
    d3.event.stopPropagation();
    mapsvg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
        .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
      d3.mouse(mapsvg.node())
    );
  }

  function resetMap() {
    updateGlobalMap();
    mapsvg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.scale(1));

    $('.content').removeClass('country-view');
    $('#country-map').empty();
    $('.menu h2').html('Global');
    setSelect('countrySelect', '');
  }

  function zoomed(){
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
    }
  }

  /*****************************/
  /*** COUNTRY MAP FUNCTIONS ***/
  /*****************************/
  var cmapsvg, cg;
  function drawCountryMap(adm1Data) {
    var countryColorScale = d3.scaleQuantize().domain([0, 100]).range(colorRange);

    //draw country map
    cmapsvg = d3.select('#country-map').append('svg')
      .attr("width", viewportWidth)
      .attr("height", viewportHeight)
      .call(zoom)
      .on("wheel.zoom", null)
      .on("dblclick.zoom", null);

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
        var clr = (val<0) ? colorDefault : countryColorScale(val);
        return clr;
      })
      .on("mouseover", function(d){ tooltip.style("opacity", 1);})
      .on("mouseout", function(d) { tooltip.style("opacity", 0); })
      .on("mousemove", function(d) { createCountryMapTooltip(d.properties['ADM1_REF']); });

    createCountryLegend(countryColorScale);
  }

  function updateCountryMap() {
    var max = (currentCountryIndicator.id.indexOf('pct')>-1) ? 100 : d3.max(subnationalData, function(d) { 
      if (d['#country+code']==currentCountry)
        return +d[currentCountryIndicator.id]; 
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

    updateCountryLegend(countryColorScale);
  }

  function createCountryLegend(scale) {
    $('.map-legend.country svg').remove();

    var legend = d3.legendColor()
      .labelFormat(",.0f")
      .cells(colorRange.length)
      .scale(scale);

    var div = d3.select('.map-legend.country');
    var svg = div.append('svg');
    svg.append('g')
      .attr('class', 'scale')
      .call(legend);
  }

  function updateCountryLegend(scale) {
    var legend = d3.legendColor()
      .labelFormat(",.0f")
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.country .scale');
    g.call(legend);
  }


  function initCountryPanel() {
    var data = dataByCountry[currentCountry][0];

    //timeseries
    $('.country-panel').css('opacity', 0);
    updateTimeseries(timeseriesData, data['#country+code']);
    setTimeout(function() {
      $('.country-panel').css('opacity', 1);
    }, 900);
    $('.country-panel h3').text(data['#country+name']);

    //covid
    var covidDiv = $('.country-panel .covid');
    covidDiv.children().not(':first-child').remove();  
    createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: data['#affected+infected']});
    createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: data['#affected+killed']});
    
    //hrp
    var hrpDiv = $('.country-panel .hrp');
    hrpDiv.children().not(':first-child').remove();  
    createFigure(hrpDiv, {className: 'pin', title: 'Number of People in Need', stat: shortenNumFormat(data['#affected+inneed'])});
    createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: data['#value+covid+funding+pct']+'%'});
    createFigure(hrpDiv, {className: 'funding-received', title: 'HRP Funding Received', stat: shortenNumFormat(data['#value+covid+funding+total+usd'])});
    createFigure(hrpDiv, {className: 'funding-required', title: 'GHRP Request (USD)', stat: shortenNumFormat(data['#value+funding+precovid+required+usd'])});

    //inform
    var informDiv = $('.country-panel .inform');
    informDiv.children().not(':first-child').remove();  
    createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+num']});
    createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+type']});

    //school
    var schoolDiv = $('.country-panel .schools');
    schoolDiv.children().not(':first-child').remove();  
    createFigure(schoolDiv, {className: 'school', stat: data['#impact+type']});


    //access
    //console.log('--',accessLabels['#access+constraints_1'], data['#access+constraints_1']);
    // var accessDiv = $('.country-panel .humanitarian-access');
    // const keys = Object.keys(data);
    // console.log('--',data)
    // var constraints = [];
    // var impact = [];
    // keys.forEach(function(key, index) {
    //   if (key.indexOf('access+constraints_')>-1) {
    //     constraints.push(key)
    //   }
    //   if (key.indexOf('impact_')>-1) {
    //     impact.push(key)
    //   }
    // })
    // console.log(constraints)
    // console.log(impact)
    // constraints.forEach(function(item) {
    //   accessDiv.append('<p>'+ accessLabels[item] + ' ' + data[item] +'</p>')
    // });
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
    if (currentCountryIndicator.id.indexOf('pct')>-1) val += '%';
    if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
    var content = "<label class='h3 label-header'>" + adm1_name + "</label>" + currentCountryIndicator.name + ": " + val + "<br/>";
    showMapTooltip(content);
  }

  function createMapTooltip(country_code, country_name){
    var country = nationalData.filter(c => c['#country+code'] == country_code);
    var val = country[0][currentIndicator.id];

    //format content for tooltip
    if (currentIndicator.id.indexOf('access')>-1) val += '%';
    if (currentIndicator.id.indexOf('funding')>-1) val = formatValue(val);
    if (currentIndicator.id=='#affected+infected' || currentIndicator.id=='#affected+inneed') val = numFormat(val);
    var content = "<label class='h3 label-header'>" + country_name + "</label>"+ currentIndicator.name + ": " + val + "<br/>";

    //additional info for tooltip
    if (currentIndicator.id=='#affected+infected') {
      content += "COVID-19 Deaths: " + numFormat(country[0]['#affected+killed']);
    }
    if (currentIndicator.id=='#severity+num') {
      content += "INFORM Risk Class: " + country[0]['#severity+type'];
    }
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