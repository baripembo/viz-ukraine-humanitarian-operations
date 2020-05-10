$( document ).ready(function() {
  var isMobile = window.innerWidth<768? true : false;
  var geomPath = 'data/worldmap.json';
  var nationalPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';
  var geomData, geomFilteredData, nationalData, totalCases, totalDeaths, maxCases, colorScale = '';
  var countryCodeList = [];
  var currentIndicator = {};
  var numFormat = d3.format(",");

  var viewportWidth = window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select(".tooltip");


  function getData() {
    Promise.all([
      d3.json(geomPath),
      d3.json(nationalPath)    ]).then(function(data){
      //parse data
      geomData = topojson.feature(data[0], data[0].objects.geom);
      nationalData = data[1];

      nationalData.forEach(function(item) {
        //get rid of % in access vars
        item['#access+constraints'] = item['#access+constraints'].replace('%','');
        item['#access+impact'] = item['#access+impact'].replace('%','');
      })
      console.log(nationalData)

      //get list of priority countries
      nationalData.forEach(function(item, index) {
        countryCodeList.push(item['#country+code']);
      });

      //filter for priority countries
      geomFilteredData = geomData.features.filter((country) => countryCodeList.includes(country.properties.ISO_A3));

      initDisplay();
    });
  }

  function getCountryData(country_code) {
    var dataPath = 'data/'+country_code+'.geojson';
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
      console.log('selected', selected);
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

    initMap();

    //remove loader and show vis
    $('.loader').hide();
    $('main, footer').css('opacity', 1);
  }


  /*********************/
  /*** MAP FUNCTIONS ***/
  /*********************/
  var projection, zoom, g, mapsvg, path;

  function initMap(){
    setTimeout(function() {
      drawGlobalMap();
      //drawCountryMap();
      //createMapLegend();
    }, 100);
  }

  function createMapLegend() {
    var cases = d3.select('.legend-inner').append('svg')
      .attr('width', 95)
      .attr('height', 80);

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(0,8)')
      .text('Number of confirmed cases')
      .call(wrap, 100);

    cases.append('circle')
      .attr('class', 'count-marker')
      .attr('r', 2)
      .attr('transform', 'translate(10,43)');

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(7,75)')
      .text('1');

    cases.append("circle")
      .attr('class', 'count-marker')
      .attr('r', 15)
      .attr("transform", "translate(50,43)");

    cases.append('text')
      .attr('class', 'label')
      .attr('transform', 'translate(38,75)')
      .text(maxCases);
  }


  var cmapsvg, cg;
  function drawCountryMap(adm1Data) {
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
      .attr("id", function(d) {
        //console.log(d.properties.ADM1_REF, d.properties.ADM0_REF)
        return d.properties.ADM1_REF;
      })
      .attr("d", path);
  }


  function drawGlobalMap(){
    var width = viewportWidth;
    var height = viewportHeight;
    var mapScale = width/3.5;
    var mapCenter = [10, 5];

    //show confirmed cases by default
    colorScale = d3.scaleLinear().domain([0, maxCases]).range(['beige', 'red']);

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
        var clr = (num<0) ? '#F2F2EF' : colorScale(num);
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
  }


  function updateGlobalMap() {
    var max = (currentIndicator.id.indexOf('access')>-1) ? 100 : d3.max(nationalData, function(d) { return +d[currentIndicator.id]; })
    colorScale = d3.scaleLinear().domain([0, max]).range(['beige', 'red']);

    mapsvg.selectAll('.map-regions')
      .attr("fill", function(d) {
        var val = -1;
        var clr = '#F2F2EF';
        if (isHRP(d.properties.ISO_A3)){
          var country = nationalData.filter(c => c['#country+code'] == d.properties.ISO_A3);
          val = country[0][currentIndicator.id]; 
        }
        if (currentIndicator.id==='#severity+type') {
          switch(val) {
            case 'Low':
              clr = '#FE9181'
              break;
            case 'Medium':
              clr = '#FA5A43'
              break;
            case 'High':
              clr = '#921401'
              break;
            case 'Very High':
              clr = '#620D00'
              break;
            default:
              clr = '#F2F2EF'
          }
        }
        else {
          clr = (val<0 || val=='') ? '#F2F2EF' : colorScale(val);
        }

        return clr;
      });
  }

  function resetMap() {
    mapsvg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.scale(1));

    $('#country-map').empty();
    $('.menu-indicators').show();
    $('.menu h2').html('Global');
  }

  function selectCountry(d) {
    $('.menu-indicators').hide();
    $('.menu h2').html('<a href="#">< Back to Global View</a>');
    getCountryData(d.properties.ISO_A3);

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

  function createMapTooltip(country_code, country_name){
    var country = nationalData.filter(c => c['#country+code'] == country_code);
    var val = (isNaN(country[0][currentIndicator.id])) ? country[0][currentIndicator.id] : numFormat(country[0][currentIndicator.id]);

    var w = $('.tooltip').outerWidth();
    var h = ($('.tooltip-inner').outerHeight() <= 0) ? 80 : $('.tooltip-inner').outerHeight() + 20;
    tooltip.select('div').html("<label class='h3 label-header'>" + country_name + "</label>"+ currentIndicator.name + ": " + val + "<br/>");
    tooltip
      .style('height', h + 'px')
      .style('left', (d3.event.pageX - w/2) + 'px')
      .style('top', (d3.event.pageY - h - 15) + 'px')
      .style('text-align', 'left')
      .style('opacity', 1);
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
  /*********************/


  /************************/
  /*** HELPER FUNCTIONS ***/
  /************************/
  // function resetViz() {
  //   selectedCountries = [];
  //   $('.panel').find('h2 span').html('');
  //   $('.key-figure').find('.cases').html(totalCases);
  //   $('.key-figure').find('.deaths').html(totalDeaths);
  //   $('.key-figure').find('.locations').html(cumulativeData.length);
    
  //   updateTimeseries(timeseriesData);

  //   $('.count-marker').removeClass('selected');
  // }

  // function createLink(type) {
  //   $('.link').find('a').attr('href', type.link);
  //   $('.link').find('span').html(type.text);
  // }

  // function createKeyFigure(target, title, className, value) {
  //   var targetDiv = $(target);
  //   return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div><p class='date small'><span>"+ date +"</span></p></div></div></div>");
  // }

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
    let MIXPANEL_TOKEN = window.location.hostname==='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  getData();
  //initTracking();
});