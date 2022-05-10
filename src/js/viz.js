var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var chartDateFormat = d3.utcFormat("%-m/%-d/%y");
var colorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D'];
var populationColorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D', '#238443', '#005A32'];
var eventColorRange = ['#EEB598','#CE7C7F','#60A2A4','#91C4B7'];
var idpColorRange = ['#D1E3EA','#BBD1E6','#ADBCE3','#B2B3E0','#A99BC6'];
var orgsRange = ['#d5efe6','#c5e1db','#91c4bb','#81aaa4','#6b8883'];
var foodBasketScale = ['Negative (<0%)', 'Normal (0-3%)', 'Moderate (3-10%)', 'High (10-25%)', 'Severe (>25%)'];
var frameworkColorRange = ['#FDEADA', '#FCD5B3', '#FAC08E', '#E46C25', '#984922'];
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var regionBoundaryData, regionalData, nationalData, subnationalDataByCountry, secondaryNationalData, dataByCountry, colorScale, viewportWidth, viewportHeight, currentRegion = '';
var countryTimeseriesChart = '';
var mapLoaded = false;
var dataLoaded = false;
var viewInitialized = false;
var isMobile = false;
var zoomLevel = 1.4;
var minZoom = 4;

var globalCountryList = [];
var currentCountryIndicator = {};
var currentCountry = {};

var refugeeTimeseriesData, refugeeCountData, casualtiesTimeseriesData, borderCrossingData, acledData, locationData, hostilityData, refugeeLineData, cleanedCoords, idpGeoJson, humIcons, countryData = '';

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  //console.log(prod);

  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJjbDA5cWZmNjAwZzAyM3BtZ3U3OXNldW1hIn0.Tcs909e7BLLnpWBjM6tuvw';
  var tooltip = d3.select('.tooltip');
  var minWidth = 1000;
  viewportWidth = (window.innerWidth<minWidth) ? minWidth : window.innerWidth;
  viewportHeight = window.innerHeight;


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
      isMobile = true;
      minZoom = 1;
      zoomLevel = 3;
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.content').width(viewportWidth);
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('.country-panel .panel-content').height(viewportHeight - $('.country-panel .panel-content').position().top);
    $('.map-legend.country').css('max-height', viewportHeight - 200);
    if (viewportHeight<696) {
      zoomLevel = 1.4;
    }
    $('#chart-view').height(viewportHeight-$('.tab-menubar').outerHeight()-30);

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/cl0cqcpm4002014utgdbhcn4q/static/-25,0,2/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }

    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/all.json'),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/UKR_Border_Crossings.geojson'),
      d3.json('data/ee-regions-bbox.geojson'),
      d3.json('data/ukr_refugee_lines.geojson'),
      d3.json('data/wrl_ukr_capp.geojson'),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-ukraine-viz/main/UKR_Hostilities.geojson'),
      d3.json('data/macro-region.geojson'),
      d3.json('data/country.geojson'),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/master/out.json')
    ]).then(function(data) {
      console.log('Data loaded');
      $('.loader span').text('Initializing map...');


      //parse data
      var allData = data[0];
      regionalData = allData.regional_data[0];
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      refugeeTimeseriesData = allData.refugees_series_data;
      acledData = allData.fatalities_data;
      sourcesData = allData.sources_data;
      idpMacroData = allData.idps_macro_data;
      casualtiesTimeseriesData = allData.timeseries_casualties_data;

      borderCrossingData = data[1];
      regionBoundaryData = data[2].features;
      refugeeLineData = data[3];
      locationData = data[4];
      hostilityData = data[5];
      idpGeoJson = data[6];
      countryData = data[7];
      worldData = data[8].world_data[0];

      secondaryNationalData = allData.secondary_national_data;
            
      //process acled data
      acledData.forEach(function(event) {
        event['#coords'] = [+event['#geo+lon'], +event['#geo+lat']];
      });

      //group by coords
      let coordGroups = d3.nest()
        .key(function(d) { return d['#coords']; })
        .entries(acledData);

      //nudge dots with duplicate coords
      cleanedCoords = [];
      coordGroups.forEach(function(coords) {
        if (coords.values.length>1)
          coords.values.forEach(function(c) {
            let origCoord = turf.point(c['#coords']);
            let bearing = randomNumber(-180, 180); //randomly scatter around origin
            let distance = randomNumber(2, 8); //randomly scatter by 2-8km from origin
            let newCoord = turf.destination(origCoord, distance, bearing);
            c['#coords'] = newCoord.geometry.coordinates;
            cleanedCoords.push(c);
          });
        else {
          cleanedCoords.push(coords.values[0]);
        }
      });


      //remove duplicate towns from location data if it exists in hostility data
      locationData.features = locationData.features.filter(locationObj => hostilityData.features.every(function(hostilityObj) {
        let isDuplicate = (locationObj.properties.TYPE!='TERRITORY') ? locationObj.properties.CAPITAL !== hostilityObj.properties.NAME : true;
        return isDuplicate;
      }));
      

      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
      });

      //parse national data
      nationalData.forEach(function(item) {
        //normalize country names
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
        if (item['#country+name']=='Bolivia (Plurinational State of)') item['#country+name'] = 'Bolivia';

        //calculate and inject PIN percentage
        item['#affected+inneed+pct'] = (item['#affected+inneed']=='' || item['#population']=='') ? '' : item['#affected+inneed']/item['#population'];

        //determine food basket category
        let foodBasketPct = +item['#indicator+foodbasket+change+pct']*100;
        let foodBasketCategory = '';
        if (foodBasketPct<=0)
          foodBasketCategory = foodBasketScale[0];
        else if (foodBasketPct>0 && foodBasketPct<=3)
          foodBasketCategory = foodBasketScale[1];
        else if (foodBasketPct>3 && foodBasketPct<=10)
          foodBasketCategory = foodBasketScale[2];
        else if (foodBasketPct>10 && foodBasketPct<=25)
          foodBasketCategory = foodBasketScale[3];
        else if (foodBasketPct>25)
          foodBasketCategory = foodBasketScale[4];
        else
          foodBasketCategory = null;
        item['#indicator+foodbasket+change+category'] = foodBasketCategory;

        //select CH vs IPC data
        var ipcParams = ['+analysed+num','+p3+num','+p3plus+num','+p4+num','+p5+num']
        var ipcPrefix = '#affected+food+ipc';
        var chPrefix = '#affected+ch+food';
        ipcParams.forEach(function(param) {
          if (item[ipcPrefix+param] || item[chPrefix+param]) {
            item['#affected+food'+param] = (item[chPrefix+param]) ? item[chPrefix+param] : item[ipcPrefix+param];
          }
        });

        //keep global list of countries
        globalCountryList.push({
          'name': item['#country+name'],
          'code': item['#country+code']
        });
        globalCountryList.sort(function(a,b) {
          return (a.name < b.name) ? -1 : (a.name > b.name) ? 1 : 0;
        });
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
        var ipcEmpty = false;
        var chEmpty = false;
        //check first two data points to choose btwn IPC and CH datasets
        for (var i=0; i<2; i++) {
          var ipcVal = country.values[i]['#affected+food+ipc+p3plus+num'];
          var chVal = country.values[i]['#affected+ch+food+p3plus+num'];
          if (i==0 && (!isVal(ipcVal) || isNaN(ipcVal))) {
            ipcEmpty = true;
          }
          if (i==1 && ipcEmpty && isVal(ipcVal) && !isNaN(ipcVal)) {
            ipcEmpty = false;
          }
          if (i==0 && (!isVal(chVal) || isNaN(chVal))) {
            chEmpty = true;
          }
          if (i==1 && chEmpty && isVal(chVal) && !isNaN(chVal)) {
            chEmpty = false;
          }
        }
        //default to ipc source if both ipc and ch are empty
        country['#ipc+source'] = (!ipcEmpty || chEmpty && ipcEmpty) ? '#affected+food+ipc+p3plus+num' : '#affected+ch+food+p3plus+num';

        //exception for CAF, should default to ch
        if (country.key=='CAF' && !chEmpty) country['#ipc+source'] = '#affected+ch+food+p3plus+num';
      });

      //group countries by region    
      countriesByRegion = d3.nest()
        .key(function(d) { return d['#region+name']; })
        .object(nationalData);


      //map humanitarian icons to sector clusters
      humIcons = {
        'Camp Coordination & Camp Management': 'humanitarianicons-Coordination',
        'Coordination and Common Services': 'humanitarianicons-Coordination',
        'Education': 'humanitarianicons-Education',
        'Emergency Telecommunications': 'humanitarianicons-Emergency-Telecommunications',
        'Food Security and Livelihoods': 'humanitarianicons-Food-Security',
        'Health': 'humanitarianicons-Health',
        'Multi-purpose Cash': 'humanitarianicons-Fund',
        'Nutrition': 'fa-solid fa-person-breastfeeding',
        'Protection': 'humanitarianicons-Protection',
        'Shelter/NFI': 'humanitarianicons-Shelter',
        'WASH': 'humanitarianicons-Water-Sanitation-and-Hygiene',
      };


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

    //load timeseries for country view 
    initTimeseries(acledData, '.trendseries-chart');

    //check map loaded status
    if (mapLoaded==true && viewInitialized==false)
      deepLinkView();

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
      vizTrack($(this).data('id'), currentCountryIndicator.name);
    });

    //create chart view country select
    $('.trendseries-select').append($('<option value="All">All Oblasts</option>')); 
    var trendseriesSelect = d3.select('.trendseries-select')
      .selectAll('option')
      .data(subnationalData)
      .enter().append('option')
        .text(function(d) {
          let name = (d['#adm1+code']=='UA80') ? d['#adm1+name'] + ' (city)' : d['#adm1+name'];
          return name; 
        })
        .attr('value', function (d) { return d['#adm1+code']; });

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