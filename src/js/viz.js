var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var vaccinationColorRange = ['#F2645A','#EEEEEE'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var foodPricesColor = '#007CE1';
var travelColor = '#F2645A';//'#6EB4ED'
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var worldData, nationalData, subnationalData, vaccinationData, timeseriesData, covidTrendData, dataByCountry, colorScale = '';
var mapLoaded = false;
var dataLoaded = false;

var currentIndicator = {};
var currentCountryIndicator = {};
var popDataByCountry = {};
var currentCountry = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')) ? true : false;
  //console.log(prod);
  
  var timeseriesPath = 'https://proxy.hxlstandard.org/api/data-preview.csv?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS%2Fpub%3Fgid%3D1253093254%26single%3Dtrue%26output%3Dcsv';
  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA';
  var minWidth = 1000;
  var viewportWidth = (window.innerWidth<minWidth) ? minWidth - $('.content-left').innerWidth() : window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select('.tooltip');


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.global-figures').height(viewportHeight-40);
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('.content-right').css('min-width', viewportWidth);
    if (viewportHeight<696) $('.map-legend.country').height(viewportHeight - parseInt($('.map-legend.country').css('top')) - 60);

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/ckb843tjb46fy1ilaw49redy7/static/-25,6,2/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }
  
    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/master/out.json'),
      d3.csv(timeseriesPath),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/pa-COVID-trend-analysis/master/hrp_covid_weekly_trend.json')
    ]).then(function(data) {
      console.log('Data loaded')
      $('.loader span').text('Initializing map...');

      //parse data
      var allData = data[0];
      timeseriesData = data[1];
      covidTrendData = data[2];
      worldData = allData.world_data[0];
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      sourcesData = allData.sources_data;
      vaccinationData = allData.vaccination_campaigns_data;

      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      })

      //group population data by country    
      popDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .rollup(function(v) { return d3.sum(v, function(d) { return d['#population']; }); })
        .object(subnationalData);

      //init tally counts
      worldData.numPINCountries = 0;
      worldData.numCERFCountries = 0;
      worldData.numCBPFCountries = 0;
      worldData.numIFICountries = 0;

      //parse national data
      nationalData.forEach(function(item) {
        //normalize counry names
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
        if (item['#country+name']=='Bolivia (Plurinational State of)') item['#country+name'] = 'Bolivia';

        //calculate and inject PIN percentage
        item['#affected+inneed+pct'] = (item['#affected+inneed']=='' || popDataByCountry[item['#country+code']]==undefined) ? '' : item['#affected+inneed']/popDataByCountry[item['#country+code']];

        //tally countries with funding and pin data
        if (isVal(item['#affected+inneed'])) worldData.numPINCountries++;
        if (isVal(item['#value+cerf+covid+funding+total+usd'])) worldData.numCERFCountries++;
        if (isVal(item['#value+cbpf+covid+funding+total+usd'])) worldData.numCBPFCountries++;
        if (isVal(item['#value+gdp+ifi+pct'])) worldData.numIFICountries++;

        //store covid trend data
        var covidByCountry = covidTrendData[item['#country+code']];
        item['#covid+trend+pct'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1].weekly_new_cases_pc_change/100;
        item['#covid+cases+per+capita'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1].weekly_new_cases_per_ht;
      })

      //group national data by country -- drives country panel    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
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
      //console.log(subnationalData)

      dataLoaded = true;
      if (mapLoaded==true) displayMap();

      initView();
    });
  }

  function initView() {
    //create country select
    var hrpData = nationalData.filter((row) => countryCodeList.includes(row['#country+code']));
    var countrySelect = d3.select('.country-select')
      .selectAll('option')
      .data(hrpData)
      .enter().append('option')
        .text(function(d) { return d['#country+name']; })
        .attr('value', function (d) { return d['#country+code']; });

    //insert default option    
    $('.country-select').prepend('<option value="">View Country Page</option>');
    $('.country-select').val($('.country-select option:first').val());

    //drawGlobalMap();
    initTimeseries(timeseriesData, '.country-timeseries-chart');
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.menu h2').html('<a href="#">< Back to Global View</a>');
    $('.country-panel').scrollTop(0);
    $('.country-panel').show();
    $('#foodSecurity').prop('checked', true);
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