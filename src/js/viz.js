var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.0%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var vaccinationColorRange = ['#F2645A','#EEEEEE'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var foodPricesColor = '#3B97E1';
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var nationalData, accessData, subnationalData, vaccinationData, timeseriesData, dataByCountry, totalCases, totalDeaths, maxCases, colorScale, currentCountry, currentCountryName = '';
  
var countryCodeList = [];
var currentIndicator = {};
var currentCountryIndicator = {};
var accessLabels = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1) ? true : false;
  console.log(prod);
  var isMobile = window.innerWidth<768? true : false;
  var nationalPath = (prod) ? 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv' : 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vTP8bQCTObeCb8j6binSiC0PmU_sCh6ZdfDnK9s28Pi89I-7DT_KhcVw-ZQTcWi4_VplTBBeMnP1d68%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';
  var subnationalPath = (prod) ? 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv' : 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vTP8bQCTObeCb8j6binSiC0PmU_sCh6ZdfDnK9s28Pi89I-7DT_KhcVw-ZQTcWi4_VplTBBeMnP1d68%2Fpub%3Fgid%3D433791951%26single%3Dtrue%26output%3Dcsv';
  //var accessPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k/pub?gid=0&single=true&output=csv';
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  var sourcesPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT9_g7AItbqJwDkPi55VyVhqOdB81c3FePhqAoFlIL9160mxqtqg-OofaoTZtdq39BATa37PYQ4813k%2Fpub%3Fgid%3D1837381168%26single%3Dtrue%26output%3Dcsv';
  var vaccinationPath = 'https://proxy.hxlstandard.org/data.objects.json?dest=data_edit&strip-headers=on&force=on&url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2Fe%2F2PACX-1vT8m53T3ITzFdJWWKkdRRVRjezgt6MeeU5c2tJWl9SNff7SYn3iJ9_7DZZ_tYSmYI67-vH7cqze1VE0%2Fpub%3Fgid%3D0%26single%3Dtrue%26output%3Dcsv';

  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA';

  var viewportWidth = window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select(".tooltip");


  function getData() {
    Promise.all([
      d3.json(nationalPath),
      d3.json(subnationalPath),
      d3.csv(timeseriesPath),
      d3.json(sourcesPath),
      d3.json(vaccinationPath)
      //d3.csv(accessPath),
    ]).then(function(data){
      //parse data
      nationalData = data[0];
      subnationalData = data[1];
      timeseriesData = data[2];
      sourcesData = data[3];
      vaccinationData = data[4];
      //accessData = data[5];

      //format data
      nationalData.forEach(function(item) {
        //create list of priority countries
        countryCodeList.push(item['#country+code']);

        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
      })

      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      })

      //filter for priority countries
      vaccinationData = vaccinationData.filter((row) => countryCodeList.includes(row['#country+code']));

      //parse out access labels
      //accessLabels = getAccessLabels(accessData[0]);

      //group national data by country    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      //group vaccination data by country    
      vaccinationDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .entries(vaccinationData);

      vaccinationDataByCountry.forEach(function(country) {
        var postponed = 'On Track';
        country.values.forEach(function(campaign) {
          var d = moment(campaign['#date+start'], ['YYYY-MM','MM/DD/YYYY']);
          var date = new Date(d.year(), d.month(), d.date());
          campaign['#date+start'] = (isNaN(date.getTime())) ? campaign['#date+start'] : getMonth(date.getMonth()) + ' ' + date.getFullYear();
          if (campaign['#status+name'].toLowerCase().indexOf('postponed')>-1) postponed = 'Postponed / May postpone';
        });

        nationalData.forEach(function(item) {
          if (item['#country+code'] == country.key) {
            item['#vaccination-campaign'] = postponed;
          }
        });
      });

      console.log(nationalData)
      console.log(subnationalData)

      initDisplay();
      initMap();
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
    $('.footnote').width(viewportWidth - $('.global-stats').innerWidth() - 20);

    //global stats
    maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
    totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
    totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
    createKeyFigure('.stats-priority', 'Total Confirmed Cases', 'cases', totalCases);
    createKeyFigure('.stats-priority', 'Total Confirmed Deaths', 'deaths', totalDeaths);
    createSource($('.global-stats'), '#affected+infected');

    //set food prices source
    createSource($('.food-prices-description'), '#food-prices');

    //menu events
    $('.menu-indicators li').on('click', function() {
      $('.menu-indicators li').removeClass('selected')
      $(this).addClass('selected');
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};

      //set food prices view
      if (currentIndicator.id=='#food-prices') {
        $('.content').addClass('food-prices-view');
      }
      else {
        $('.content').removeClass('food-prices-view');
        closeModal();
      }

      updateGlobalLayer();
    });
    currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected div').text()};
    
    //back to global event
    $('.country-menu h2').on('click', function() {
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

    //country legend radio events
    $('input[type="radio"]').click(function(){
      var selected = $('input[name="countryIndicators"]:checked');
      currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
      updateCountryLayer();
    });

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