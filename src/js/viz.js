var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var populationColorRange = ['#FFE281','#FDB96D','#FA9059','#F27253','#E9554D'];
var accessColorRange = ['#79B89A','#F6B98E','#C74B4F'];
var oxfordColorRange = ['#ffffd9','#c7e9b4','#41b6c4','#225ea8','#172976'];
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var regionBoundaryData, regionalData, worldData, nationalData, subnationalData, subnationalDataByCountry, vaccinationData, timeseriesData, covidTrendData, dataByCountry, countriesByRegion, colorScale, viewportWidth, viewportHeight, currentRegion = '';
var globalTimeseriesChart, countryTimeseriesChart = '';
var mapLoaded = false;
var dataLoaded = false;
var viewInitialized = false;
var zoomLevel = 1.4;

var hrpData = [];
var currentIndicator = {};
var currentCountryIndicator = {};
var currentCountry = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  //console.log(prod);

  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2hnbWs5NzkxMXh2MnNvcmF6dXIxMWE0In0.0GfmJoEJyWFQ5UzNxl2WgA';
  var tooltip = d3.select('.tooltip');
  var minWidth = 1000;
  viewportWidth = (window.innerWidth<minWidth) ? minWidth - $('.content-left').innerWidth() : window.innerWidth - $('.content-left').innerWidth();
  viewportHeight = window.innerHeight;


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.secondary-panel').height(viewportHeight-40);
    $('.content').width(viewportWidth + $('.content-left').innerWidth());
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('#chart-view').height(viewportHeight - $('.tab-menubar').height());
    $('.country-panel .panel-content').height(viewportHeight - $('.country-panel .panel-content').position().top);
    $('.map-legend.global, .map-legend.country').css('max-height', viewportHeight - 200);
    if (viewportHeight<696) {
      zoomLevel = 1.4;
    }

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/ckb843tjb46fy1ilaw49redy7/static/-25,0,'+zoomLevel+'/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }

    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/master/out.json'),
      d3.json('data/ocha-regions-bbox.geojson')
    ]).then(function(data) {
      console.log('Data loaded');
      $('.loader span').text('Initializing map...');

      //parse data
      var allData = data[0];
      worldData = allData.world_data[0];
      regionBoundaryData = data[1].features;
      timeseriesData = allData.covid_series_data;
      regionalData = allData.regional_data;
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      sourcesData = allData.sources_data;
      covidTrendData = allData.who_covid_data;
      vaccinationData = allData.vaccination_campaigns_data;
      
      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      });

      //parse national data
      nationalData.forEach(function(item) {
        //normalize country names
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
        if (item['#country+name']=='Bolivia (Plurinational State of)') item['#country+name'] = 'Bolivia';

        //hardcode CBPF val for Turkey
        if (item['#country+code']=='TUR') item['#value+cbpf+covid+funding+total+usd'] = 23000000;

        //calculate and inject PIN percentage
        item['#affected+inneed+pct'] = (item['#affected+inneed']=='' || item['#population']=='') ? '' : item['#affected+inneed']/item['#population'];
        
        //store covid trend data
        var covidByCountry = covidTrendData[item['#country+code']];
        item['#covid+trend+pct'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+pct+weekly']/100;
        item['#affected+infected+new+per100000+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+per100000+weekly'];
        item['#affected+infected+new+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+weekly'];
        item['#affected+killed+new+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+killed+new+weekly'];
        item['#covid+total+cases+per+capita'] = (item['#affected+infected'] / item['#population']) * 100000;

        //create cases by gender indicator
        item['#affected+infected+sex+new+avg+per100000'] = (item['#affected+infected+m+pct']!=undefined || item['#affected+f+infected+pct']!=undefined) ? item['#affected+infected+new+per100000+weekly'] : null;
        
        //consolidate IPC data
        if (item['#affected+food+ipc+analysed+pct'] || item['#affected+ch+food+analysed+pct']) {
          item['#affected+food+analysed+pct'] = (item['#affected+food+ipc+analysed+pct']) ? item['#affected+food+ipc+analysed+pct'] : item['#affected+ch+food+analysed+pct'];
        }
        if (item['#affected+food+ipc+p3+pct'] || item['#affected+ch+food+p3+pct']) {
          item['#affected+food+p3+pct'] = (item['#affected+food+ipc+p3+pct']) ? item['#affected+food+ipc+p3+pct'] : item['#affected+ch+food+p3+pct'];
        }
        if (item['#affected+food+ipc+p3plus+pct'] || item['#affected+ch+food+p3plus+pct']) {
          item['#affected+food+p3plus+pct'] = (item['#affected+food+ipc+p3plus+pct']) ? item['#affected+food+ipc+p3plus+pct'] : item['#affected+ch+food+p3plus+pct'];
          //item['#ipc-source'] = (item['#affected+food+ipc+p3plus+pct']) ? '#affected+food+ipc+p3plus+pct' : '#affected+ch+food+p3plus+pct';
        }
        if (item['#affected+food+ipc+p4+pct'] || item['#affected+ch+food+p4+pct']) {
          item['#affected+food+p4+pct'] = (item['#affected+food+ipc+p4+pct']) ? item['#affected+food+ipc+p4+pct'] : item['#affected+ch+food+p4+pct'];
        }
        if (item['#affected+food+ipc+p5+pct'] || item['#affected+ch+food+p5+pct']) {
          item['#affected+food+p5+pct'] = (item['#affected+food+ipc+p5+pct']) ? item['#affected+food+ipc+p5+pct'] : item['#affected+ch+food+p5+pct'];
        }
        if (item['#affected+food+ipc+analysed+num'] || item['#affected+ch+food+analysed+num']) {
          item['#affected+food+analysed+num'] = (item['#affected+food+ipc+analysed+num']) ? item['#affected+food+ipc+analysed+num'] : item['#affected+ch+food+analysed+num'];
        }
      });

      //group national data by country -- drives country panel    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      //consolidate subnational IPC data
      subnationalDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .entries(subnationalData);
      subnationalDataByCountry.forEach(function(country) {
        var index = 0;
        var isEmpty = false;
        //check first two data points to choose btwn IPC and CH datasets
        for (var i=0; i<2; i++) {
          var val = country.values[i]['#affected+food+ipc+p3plus+pct'];
          if (i==0 && (!isVal(val) || isNaN(val))) {
            isEmpty = true;
          }
          if (i==1 && isEmpty && isVal(val) && !isNaN(val)) {
            isEmpty = false;
          }
        }
        country['#ipc+source'] = (isEmpty) ? '#affected+ch+food+p3plus+pct' : '#affected+food+ipc+p3plus+pct';
      });

      //group countries by region    
      countriesByRegion = d3.nest()
        .key(function(d) { return d['#region+name']; })
        .object(nationalData);

      //group vaccination data by country    
      vaccinationDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .entries(vaccinationData);

      //format dates and set overall status
      vaccinationDataByCountry.forEach(function(country) {
        var postponed = 'On Track';
        var isPostponed = false;
        country.values.forEach(function(campaign) {
          var d = moment(campaign['#date+start'], ['YYYY-MM','MM/DD/YYYY']);
          var date = new Date(d.year(), d.month(), d.date());
          campaign['#date+start'] = (isNaN(date.getTime())) ? campaign['#date+start'] : getMonth(date.getMonth()) + ' ' + date.getFullYear();
          if (campaign['#status+name'].toLowerCase().indexOf('unknown')>-1 && !isPostponed) postponed = 'Unknown';
          if (campaign['#status+name'].toLowerCase().indexOf('postponed')>-1) {
            isPostponed = true;
            postponed = 'Postponed / May postpone';
          }
        });

        nationalData.forEach(function(item) {
          if (item['#country+code'] == country.key) item['#vaccination-campaigns'] = postponed;
        });
      });

      //console.log(nationalData)
      //console.log(covidTrendData)

      dataLoaded = true;
      if (mapLoaded==true) displayMap();
      initView();
    });
  }

  function initView() {
    //create regional select
    $('.region-select').empty();
    var regionalSelect = d3.select('.region-select')
      .selectAll('option')
      .data(regionalList)
      .enter().append('option')
        .text(function(d) { return d.name; })
        .attr('value', function (d) { return d.id; });
    //insert default option    
    $('.region-select').prepend('<option value="">All Regions</option>');
    $('.region-select').val($('.region-select option:first').val());

    //create country select
    var countryArray = Object.keys(countryCodeList);
    hrpData = nationalData.filter((row) => countryArray.includes(row['#country+code']));
    hrpData.sort(function(a, b){
      return d3.ascending(a['#country+name'].toLowerCase(), b['#country+name'].toLowerCase());
    })
    var countrySelect = d3.select('.country-select')
      .selectAll('option')
      .data(hrpData)
      .enter().append('option')
        .text(function(d) { return d['#country+name']; })
        .attr('value', function (d) { return d['#country+code']; });
    //insert default option    
    $('.country-select').prepend('<option value="">View Country Page</option>');
    $('.country-select').val($('.country-select option:first').val());

    //create tab events
    $('.tab-menubar .tab-button').on('click', function() {
      $('.tab-button').removeClass('active');
      $(this).addClass('active');
      if ($(this).data('id')=='chart-view') {
        $('#chart-view').show();
      }
      else {
        $('#chart-view').hide();
      }
      mpTrack($(this).data('id'), currentIndicator.name);
    });

    //set daily download date
    var today = new Date();
    $('.download-link .today-date').text(dateFormat(today));
    $('.download-daily').on('click', function() {  
      mixpanel.track('link click', {
        'embedded in': window.location.href,
        'destination url': $(this).attr('href'),
        'link type': 'download report',
        'page title': document.title
      });
    });

    //track monthly pdf download
    $('.download-monthly').on('click', function() {  
      mixpanel.track('link click', {
        'embedded in': window.location.href,
        'destination url': $(this).attr('href'),
        'link type': 'download report',
        'page title': document.title
      });
    });

    //load timeseries for global view 
    createSource($('#chart-view .source-container'), '#affected+infected');
    initTimeseries(timeseriesData, '.global-timeseries-chart');

    //load timeseries for country view 
    initTimeseries(timeseriesData, '.country-timeseries-chart');

    //check map loaded status
    if (mapLoaded==true && viewInitialized==false)
      deepLinkCountryView();

    viewInitialized = true;
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.country-panel').scrollTop(0);
    $('#population').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();
  }


  function initTracking() {
    //initialize mixpanel
    var MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  init();
  initTracking();
});