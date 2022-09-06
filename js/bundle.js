window.$ = window.jQuery = require('jquery');
var bbox = require('@turf/bbox');
var turfHelpers = require('@turf/helpers');
/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div, size) {
  var width = (isMobile) ? 30 : 60;
  var height = 20;
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);
  var parseDate = d3.timeParse("%Y-%m-%d");
  var line = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); })
    .curve(d3.curveBasis);

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain(d3.extent(data, function(d) { return d.value; }));

  var svg = d3.select(div)
    .append('svg')
    .attr('class', 'sparkline')
    .attr('width', width)
    .attr('height', height+5)
    .append('g')
      .attr('transform', 'translate(0,4)');
    
  svg.append('path')
   .datum(data)
   .attr('class', 'sparkline')
   .attr('d', line);
}


/****************************************/
/*** TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  let formattedData = formatData(data);
  $('.trendseries-title').html('<h6>Total Number of Conflict Events</h6><div class="num">'+numFormat(data.length)+'</div>');
  createTimeSeries(formattedData, div);
}

let eventsArray;
function formatData(data) {
  let events = d3.nest()
    .key(function(d) { return d['#event+type']; })
    .key(function(d) { return d['#date+occurred']; })
    .rollup(function(leaves) { return leaves.length; })
    .entries(data);
  events.sort((a, b) => (a.key > b.key) ? 1 : -1);

  let dates = [... new Set(acledData.map((d) => d['#date+occurred']))];
  let totals = [];

  eventsArray = [];
  events.forEach(function(event) {
    let array = [];
    dates.forEach(function(date, index) {
      let val = 0;
      event.values.forEach(function(e) {
        if (e.key==date)
          val = e.value;
      });
      totals[index] = (totals[index]==undefined) ? val : totals[index]+val; //save aggregate of all events per day
      array.push(val); //save each event per day
    });
    array.reverse();
    array.unshift(event.key);
    eventsArray.push(array);
  });

  //format for c3
  dates.unshift('x');
  totals.unshift('All');
  return {series: [dates, totals], events: eventsArray};
}


function createTimeSeries(data, div) {
  const chartWidth = viewportWidth - $('.country-panel').width() - 100;
  const chartHeight = 280;
  let colorArray = ['#F8B1AD'];

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: (isMobile) ? 60 : 0,
      top: 10,
      left: (isMobile) ? 30 : 35,
      right: (isMobile) ? 200 : 200
    },
    bindto: div,
    data: {
      x: 'x',
      columns: data.series,
      type: 'bar'
    },
    bar: {
        width: {
            ratio: 0.5
        }
    },
    color: {
      pattern: colorArray
    },
    point: { show: false },
    grid: {
      y: {
        show: true
      }
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: { 
          outer: false
        }
      },
      y: {
        min: 0,
        padding: { 
          top: (isMobile) ? 20 : 50, 
          bottom: 0 
        },
        tick: { 
          outer: false,
          //format: d3.format('d')
          format: function(d) {
            if (Math.floor(d) != d){
              return;
            }
            return d;
          }
        }
      }
    },
    legend: {
      show: false
    },
    transition: { duration: 500 },
    tooltip: {
      contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
        let events = eventsArray;
        let id = d[0].index + 1;
        let date = new Date(d[0].x);
        let total = 0;
        let html = `<table><thead><tr><th colspan="2">${moment(date).format('MMM D, YYYY')}</th></tr><thead>`;
        for (var i=0; i<=events.length-1; i++) {
          if (events[i][id]>0) {
            html += `<tr><td>${events[i][0]}</td><td>${events[i][id]}</td></tr>`;
            total += events[i][id];
          }
        };
        html += `<tr><td><b>Total</b></td><td><b>${total}</b></td></tr></table>`;
        return html;
      }
    }
  });

  countryTimeseriesChart = chart;
  createSource($('#chart-view .source-container'), '#date+latest+acled');
}


function updateTimeseries(selected) {
  let filteredData = (selected!='All') ? acledData.filter((d) => d['#adm1+code'] == selected) : acledData;
  let data = formatData(filteredData);
  eventsArray = data.events;
  $('.trendseries-title').find('.num').html(numFormat(filteredData.length));

  if (filteredData.length<=0)
    $('.trendseries-chart').hide();
  else 
    $('.trendseries-chart').show();

  countryTimeseriesChart.load({
    columns: data.series
  });
}


/***************************/
/*** PIE CHART FUNCTIONS ***/
/***************************/
function createPieChart(data, div) {
  let requirement = data[0];
  let funded = data[1];
  let fundedPercent = funded/requirement;

  let width = (isMobile) ? 25 : 30
      height = width
      margin = 1

  let radius = Math.min(width, height)/2 - margin

  let svg = d3.select(div)
    .append('svg')
      .attr('class', 'pie-chart')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', `translate(${width/2}, ${height/2})`);

  let dataArray = {a: fundedPercent, b: 1-fundedPercent};

  let color = d3.scaleOrdinal()
    .domain(data)
    .range(['#418FDE', '#DFDFDF'])

  let pie = d3.pie()
    .value(function(d) { return d.value; }).sort(null);
  let formatData = pie(d3.entries(dataArray));

  svg
    .selectAll('g')
    .data(formatData)
    .enter()
    .append('path')
    .attr('d', d3.arc()
      .innerRadius(0)
      .outerRadius(radius)
    )
    .attr('fill', function(d){ return( color(d.data.key)) })
    .style('stroke-width', 0)
}


/*************************/
/*** RANKING BAR CHART ***/
/*************************/
var rankingX, rankingY, rankingBars, rankingData, rankingBarHeight, valueFormat;
function createRankingChart() {
  //reset
  //$('.ranking-container').removeClass('covid ranking-vaccine ranking-vaccine-financing ranking-inform');

  //set title
  var rankingTitle = $('.menu-indicators').find('.selected').attr('data-legend') + ' by Country';
  // if (currentIndicator.id=='#impact+type') rankingTitle = 'Total duration of full and partial school closures (in weeks)';
  // if (currentIndicator.id=='#severity+inform+type') rankingTitle = 'INFORM Severity Index Trend (last 3 months) by Country';
  $('.secondary-panel .ranking-title').text(rankingTitle);

  var indicator;
  switch(currentIndicator.id) {
    case '#severity+inform+type':
      indicator = '#severity+inform+num';
      break;
    case '#impact+type':
      indicator = '#impact+full_partial+weeks';
      break;
    case '#food-prices':
      indicator = '#indicator+foodbasket+change+pct+val';
      break;
    case '#severity+overall+num':
      indicator = '#severity+overall+num';
      break;
    default:
      indicator = currentIndicator.id;
  }

  //switch ranking dropdown based on layer
  if (currentIndicator.id=='#severity+inform+type') {
    $('.ranking-container').addClass('ranking-inform');
    $('.ranking-select').val(indicator);
  }
  else if (currentIndicator.id=='#severity+overall+num') {
    $('.ranking-container').addClass('ranking-framework');
    $('.ranking-select').val(indicator);
  }
  else {
    $('.ranking-select').val('descending');
  }

  //format data
  rankingData = formatRankingData(indicator, '');

  var valueMax = d3.max(rankingData, function(d) { return +d.value; });
  valueFormat = d3.format(',.0f');
  if (indicator.indexOf('pct')>-1 || indicator.indexOf('ratio')>-1) {
    valueFormat = (currentIndicator.id=='#value+gdp+ifi+pct') ? d3.format('.2%') : percentFormat;
  }
  if (indicator=='#severity+inform+num') {
    valueFormat = d3.format(',.2r');;
  }

  //draw chart
  rankingBarHeight = 13;
  var barPadding = 9;

  //determine height available for chart
  var availSpace = viewportHeight - $('.ranking-chart').position().top - 40;
  var numRows = Math.floor(availSpace/(rankingBarHeight+barPadding));
  var rankingChartHeight = ((rankingBarHeight+barPadding) * numRows) + 14;
  $('.ranking-chart').css('height', rankingChartHeight);

  var margin = {top: 0, right: 70, bottom: 15, left: 100},
      width = $('.secondary-panel').width() - margin.left - margin.right,
      height = (rankingBarHeight + barPadding) * rankingData.length;

  var svg = d3.select('.ranking-chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  rankingX = d3.scaleLinear()
    .range([0, width])
    .domain([0, valueMax]);

  rankingY = d3.scaleBand()
    .range([0, height])
    .domain(rankingData.map(function (d) {
      return d.key;
    }));

  var yAxis = d3.axisLeft(rankingY)
    .tickSize(0);

  var gy = svg.append('g')
    .attr('class', 'y axis')
    .call(yAxis)

  rankingBars = svg.selectAll('.bar')
    .data(rankingData)
    .enter().append('g')
    .attr('class', 'bar-container')
    .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });

  //append rects
  rankingBars.append('rect')
    .attr('class', 'bar')
    .attr('height', rankingBarHeight)
    .attr('width', function (d) {
      return (d.value<=0) ? 0 : rankingX(d.value);
    });

  //add country names
  rankingBars.append('text')
    .attr('class', 'name')
    .attr('x', -3)
    .attr('y', 9)
    .text(function (d) {
      return truncateString(d.key, 15);
    })
    .append('svg:title')
    .text(function(d) { return d.key; });

  //add a value label to the right of each bar
  rankingBars.append('text')
    .attr('class', 'label')
    .attr('y', 9)
    .attr('x', function (d) {
      var xpos = (d.value<=0) ? 0 : rankingX(d.value);
      return xpos + 3;
    })
    .text(function (d) {
      return d.value;
    });
}

function formatRankingData(indicator, sorter) {
  var isCovaxLayer = (indicator.indexOf('#capacity+doses')>-1) ? true : false;
  if (currentIndicator.id == '#severity+inform+type') {
    var rankingByCountry = d3.nest()
      .key(function(d) {
        if (regionMatch(d['#region+name'])) return d['#country+name']; 
      })
      .rollup(function(v) {
        if (regionMatch(v[0]['#region+name'])) {
          if (indicator == '#severity+inform+num' || v[0]['#severity+inform+trend'] == indicator.toLowerCase()) 
            return v[0]['#severity+inform+num'];
        }
      })
      .entries(nationalData);
  }
  else {  
    var rankingByCountry = d3.nest()
      .key(function(d) {
        if (regionMatch(d['#region+name'])) return d['#country+name']; 
      })
      .rollup(function(v) {
        if (regionMatch(v[0]['#region+name'])) return v[0][indicator];
      })
      .entries(secondaryNationalData);
  }

  var data = rankingByCountry.filter(function(item) {
    return isVal(item.value) && !isNaN(item.value);
  });
  data.sort(function(a, b){ return d3.descending(+a.value, +b.value); });
  return data;
}

function updateRankingChart(sortMode, secondarySortMode) {
  if (sortMode=='ascending' || sortMode=='descending') {
    //sort the chart
    rankingData.sort(function(a, b){
      if (sortMode=='ascending')
        return d3.ascending(+a.value, +b.value); 
      else
        return d3.descending(+a.value, +b.value);
    });
    rankingY.domain(rankingData.map(function (d) { return d.key; }));
    rankingBars.transition()
      .duration(400)
      .attr('transform', function(d, i) { 
        return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; 
      });
  }
  else {
    //empty and redraw chart with new indicator
    $('.secondary-panel').find('.ranking-chart').empty();

    rankingData = formatRankingData(sortMode, secondarySortMode);
    rankingData.sort(function(a, b){
       return d3.descending(+a.value, +b.value);
    });

    if (rankingData.length<1) {
      $('.ranking-chart').append('<p>No Data</p>');
      $('.ranking-chart > p').css('text-align', 'center');
    }

    var valueMax = d3.max(rankingData, function(d) { return +d.value; });
    valueFormat = (sortMode.indexOf('pct')>-1) ? d3.format('.2%') : d3.format(',.0f');

    //draw chart
    rankingBarHeight = 13;
    var barPadding = 9;

    //determine height available for chart
    var availSpace = viewportHeight - $('.ranking-chart').position().top - 40;
    var numRows = Math.floor(availSpace/(rankingBarHeight+barPadding));
    var rankingChartHeight = ((rankingBarHeight+barPadding) * numRows) + 14;
    $('.ranking-chart').css('height', rankingChartHeight);

    var margin = {top: 0, right: 70, bottom: 15, left: 100},
        width = $('.secondary-panel').width() - margin.left - margin.right,
        height = (rankingBarHeight + barPadding) * rankingData.length;

    var svg = d3.select('.ranking-chart').append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    rankingX = d3.scaleLinear()
      .range([0, width])
      .domain([0, valueMax]);

    rankingY = d3.scaleBand()
      .range([0, height])
      .domain(rankingData.map(function (d) {
        return d.key;
      }));

    var yAxis = d3.axisLeft(rankingY)
      .tickSize(0);

    var gy = svg.append('g')
      .attr('class', 'y axis')
      .call(yAxis)

    rankingBars = svg.selectAll('.bar')
      .data(rankingData)
      .enter().append('g')
      .attr('class', 'bar-container')
      .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });

    //append rects
    rankingBars.append('rect')
      .attr('class', 'bar')
      .attr('height', rankingBarHeight)
      .transition()
        .duration(400)
      .attr('width', function (d) {
        return (d.value<=0) ? 0 : rankingX(d.value);
      });

    //add country names
    rankingBars.append('text')
      .attr('class', 'name')
      .attr('x', -3)
      .attr('y', 9)
      .text(function (d) {
        return truncateString(d.key, 15);
      })

    //add a value label to the right of each bar
    rankingBars.append('text')
      .attr('class', 'label')
      .attr('y', 9)
      .attr('x', function (d) {
        var xpos = (d.value<=0) ? 0 : rankingX(d.value);
        return xpos + 3;
      })
      .text(function (d) {
        if (sortMode.indexOf('pct')>-1 && d.value>1) d.value = 1;
        return d.value;
      });
  }
}


let countriesLookup = {}
getCountryIDs();

$('.modal-bg-overlay, .modal-close-btn').on('click', closeModal);

function getCountryNameByID(adm0_id) {
  return foodPricesCountries[adm0_id];
}

function getCountryIDByName(adm0_name) {
  const entries = Object.entries(foodPricesCountries)
  for (const [id, name] of entries) {
    if (name==adm0_name) return id;
  }
}

function resetModal() {
	$('#header, #charts, .modal-subnav').empty();
  $('.modal-loader').show();
}

function closeModal() {
	$('.modal-bg-overlay').fadeOut();
	$('.modal').fadeOut();
}

function openModal(country_code, country_name) {
	resetModal();
	$('.modal-bg-overlay').fadeIn();
	$('.modal').fadeIn();

  countryURL = countriesLookup[country_code];
  initCountry(country_code,country_name,countryURL);
}

function initCountry(adm0_code,adm0_name,adm0_URL){
  getProductsByCountryID(adm0_code,adm0_name,adm0_URL);
}

function getCountryIDs() { 
  let countryDataURL = 'https://data.humdata.org/dataset/31579af5-3895-4002-9ee3-c50857480785/resource/0f2ef8c4-353f-4af1-af97-9e48562ad5b1/download/wfp_countries_global.csv'
  let proxyURL = 'https://proxy.hxlstandard.org/data.json?dest=data_edit&strip-headers=on&url='+countryDataURL

  $.ajax({
    type: 'GET',
    dataType: 'json',
    url: proxyURL,
    success: function(data) {
      data = hxlProxyToJSON(data);
      data.forEach(function(d){
        countriesLookup[d['#country+code']] =  d['#country+url'];
      });
    }
  });  
}

function getProductsByCountryID(adm0_code,adm0_name,adm0_URL){
  let hxlProxyURL = 'https://proxy.hxlstandard.org/data.json?dest=data_edit&filter01=count&count-tags01=%23item%2Bname%2C%23date%2Citem%2Bunit&count-type01-01=average&count-pattern01-01=%23value&count-header01-01=Count&count-column01-01=%23value%2Baverage&filter02=sort&sort-tags02=%23item%2Bname%2C%23item%2Bunit&strip-headers=on&url='+adm0_URL;

  $.ajax({
    type: 'GET',
    dataType: 'json',
    url: hxlProxyURL,
    success: function(data) {
      $('.modal-loader').hide();
      data = hxlProxyToJSON(data,false);
      generateSparklines(data,adm0_code,adm0_name,adm0_URL);
    }
  });     
}


function getProductDataByCountryID(adm0_URL,cm_id,um_id,adm0_name,adm1_name,mkt_name){
  let hxlProxyURL = 'https://proxy.hxlstandard.org/data.json?dest=data_edit&filter01=select&select-query01-01=%23item%2Bname%3D'+encodeURIComponent(cm_id)+'&filter02=select&select-query02-01=%23item%2Bunit%3D'+encodeURIComponent(um_id)+'&filter03=cut&cut-include-tags03=%23date%2C%23adm1%2C%23adm2%2C%23loc%2C%23value&filter04=sort&sort-tags04=%23date&strip-headers=on&url='+encodeURIComponent(adm0_URL);
  $.ajax({
    type: 'GET',
    dataType: 'json',
    url: hxlProxyURL,
    success: function(data) {
      data = hxlProxyToJSON(data);
      var cf = crossfilterData(data);

      if(adm1_name===''){
        generateChartView(cf,adm0_name,cm_id,um_id,adm0_URL); 
      } else if (mkt_name===''){
        generateADMChartView(cf,adm1_name,cm_name,um_name,adm0_name,adm0_code,adm0_URL);  
      } else {
        cf.byAdm1.filter(adm1_name);
        generateMktChartView(cf,mkt_name,cm_name,um_name,adm0_name,adm0_code,adm1_name,adm0_URL); 
      }
    }
  });    
}

function hxlProxyToJSON(input,headers){
  var output = [];
  var keys=[]
  input.forEach(function(e,i){
    if(i==0){
      e.forEach(function(e2,i2){
        var parts = e2.split('+');
        var key = parts[0]
        if(parts.length>1){
          var atts = parts.splice(1,parts.length);
          atts.sort();                    
          atts.forEach(function(att){
            key +='+'+att
          });
        }
        keys.push(key);
      });
    } else {
      var row = {};
      e.forEach(function(e2,i2){
        row[keys[i2]] = e2;
      });
      output.push(row);
    }
  });
  return output;
}

function generateSparklines(results,adm0_code,adm0_name,adm0_URL){
    var targetHeader = '#header';
    var targetDiv = '#charts';
    var numProd = 0;
    var curProd = '';
    var curUnit = '';
    var topMonth = 0;

    var minYear = results[0]['#date'].split('-')[0];
    var headerHtml = '<h5>'+adm0_name+' Food Market Prices – since '+ minYear +' <span class="source small"><a href="" target="_blank" rel="noopener">DATA</a></span></h5>';
    $(targetHeader).html(headerHtml);

    var country_name = adm0_name.replace(/\s+/g, '-').toLowerCase();
    $(targetHeader).find('.source a').attr('href', 'https://data.humdata.org/dataset/wfp-food-prices-for-'+country_name);

    var html='<div class="chart-container">';
    results.forEach(function(d,i){
      year = parseInt(d['#date'].substr(0,4));
      month = parseInt(d['#date'].substr(5,7));
      results[i].monthValue = year*12+month*1;
      if(year*12+month*1>topMonth) {
          topMonth = year*12+month*1;
      }
      if(d['#item+name']!==curProd || d['#item+unit']!==curUnit){
          numProd++;
          curProd = d['#item+name'];
          curUnit = d['#item+unit'];
          if(numProd>1 && numProd%4===1){
              html+= '</div><div class="chart-container">';
          }
          html+='<div id="product_' + numProd + '" dataItem="'+d['#item+name']+'" dataUnit="'+d['#item+unit']+'" class="productsparkline col-xs-3"><p>' + d['#item+name'] + ' per ' + d['#item+unit'] + '</p></div>';
      }
    });

    html+='</div>';
    
    $(targetDiv).html(html);
    var curProd = '';
    var curUnit = '';
    var data=[];
    numProd = 0;
    results.forEach(function(d){
      if(d['#item+name']!==curProd || d['#item+unit']!==curUnit){
        if(data!==[]){
          generateSparkline(numProd,data,topMonth);
          $('#product_' + numProd).on('click',function(){
            let product = $(this).attr('dataitem');
            let unit = $(this).attr('dataunit');
            getProductDataByCountryID(adm0_URL,product,unit,adm0_name,'','');
          });
        }
        numProd++
        data = [];
        curProd = d['#item+name'];
        curUnit = d['#item+unit'];
      }
      var datum = {y:d['#value+average'],x:d.monthValue};
      data.push(datum);
    });
    generateSparkline(numProd,data,topMonth);
    $('#product_' + numProd).on('click',function(){
      let product = $(this).attr('dataitem');
      let unit = $(this).attr('dataunit');
      getProductDataByCountryID(adm0_URL,product,unit,adm0_name,'','');
    });
}

function generateSparkline(numProd,data,topMonth){
  data = data.sort(function(a,b){
    return a.monthValue - b.monthValue;
  });
  var svg = d3.select('#product_'+numProd).append('svg').attr('width',$('#product_'+numProd).width()).attr('height', '50px');
  var x = d3.scaleLinear().domain([2010*12,topMonth]).range([0, $('#product_'+numProd).width()]);
  var y = d3.scaleLinear().domain([d3.max(data,function(d){return d.y;})*1.1,0]).range([0, 50]);

  var line = d3.line()
    .x(function(d) {
      return x(d.x);
    })
    .y(function(d) {
      return y(d.y);
    });
      
  var yearLine = d3.line()
    .x(function(d) {
      return x(d.x);
    })
    .y(function(d) {
      return d.y;
    });        
  
  for(i=0;i<25;i++){
    if((2010+i)*12<topMonth){
      var dataLine=[{
        x:(2010+i)*12,
        y:0
      },{
        x:(2010+i)*12,
        y:50
      }];
      svg.append('path').attr('d', yearLine(dataLine)).attr('class', 'sparkyearline');
    }
  }
  svg.append('path').attr('d', line(data)).attr('class', 'sparkline');
}

function crossfilterData(data){
  data.forEach(function(e){
    e.date = new Date(e.mp_year, e.month_num-1, 1);
  });
  
  var cf = crossfilter(data);
  cf.byDate = cf.dimension(function(d){return d['#date'];});
  cf.byAdm1 = cf.dimension(function(d){ return d['#adm1+name'];});
  cf.byMkt = cf.dimension(function(d){return d['#loc+market+name'];});
  
  cf.groupByDateSum = cf.byDate.group().reduceSum(function(d) {return d['#value'];});
  cf.groupByDateCount = cf.byDate.group();
  cf.groupByAdm1Sum = cf.byAdm1.group().reduceSum(function(d) {return d['#value'];});
  cf.groupByAdm1Count = cf.byAdm1.group();
  cf.groupByMktSum = cf.byMkt.group().reduceSum(function(d) {return d['#value'];});
  cf.groupByMktCount = cf.byMkt.group();
  return cf;
}

function generateChartView(cf,adm0,prod,unit,adm0_url){
  var targetDiv = '#charts';
  var targetHeader = '#header';

  curLevel = 'adm0';
  
  cf.byDate.filterAll();
  cf.byAdm1.filterAll(); 
  cf.byMkt.filterAll();    
  
  var title = 'Price of ' + prod + ' per ' + unit + ' in '+adm0;
  var html = '<h4>'+title+'</h4><p>';
  
  html +='<a id="adm0link" href="">'+adm0+'</a> > ' + prod + '</p>';
 	$('.modal-subnav').html(html);
  $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
  $('#adm0link').click(function(event){
    event.preventDefault();
    initCountry(adm0_url,adm0,adm0_url);
  });

  generateBarChart(getAVG(cf.groupByAdm1Sum.all(),cf.groupByAdm1Count.all()),cf,prod,unit,adm0,'','',adm0_url);
  generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function generateADMChartView(cf,adm1,prod,unit,adm0,adm0_code,adm0_url){
  var targetDiv = '#charts';
  curLevel = 'adm1';
  var title = 'Price of ' + prod + ' per ' + unit + ' in '+adm1;    
  var html = '<h4>'+title+'</h4><p>';
  
  html +='<a id="adm0link" href="">'+adm0+'</a> > <a id="prodlink" href="">' + prod + '</a> > ' + adm1 + '</p>';
  $('.modal-subnav').html(html);
  $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
  
  $('#adm0link').click(function(event){
    event.preventDefault();
    initCountry(adm0_code,adm0,adm0_url);
  });
  
  $('#prodlink').click(function(event){
    event.preventDefault();
    generateChartView(cf,adm0,prod,unit,adm0_code);
  });

  cf.byDate.filterAll();
  cf.byMkt.filterAll();
  cf.byAdm1.filter(adm1);    
  generateBarChart(getAVG(cf.groupByMktSum.all(),cf.groupByMktCount.all()),cf,prod,unit,adm0,adm0_code,adm1,adm0_url);
  generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function generateMktChartView(cf,mkt,prod,unit,adm0,adm0_code,adm1,adm0_url){
  var targetDiv = '#charts';
  var targetHeader = '#header';
  
  curLevel = 'mkt';
  
  var title = 'Price of ' + prod + ' per ' + unit + ' in '+mkt;
  var html = '<h4>'+title+'</h4><p>';
  html +='<a id="adm0link" href="">'+adm0+'</a> > <a id="prodlink" href="">' + prod + '</a> > <a id="adm1link" href="">' + adm1 + '</a> > ' + mkt + '</p>';
  $('.modal-subnav').html(html);
  $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
  
  $('#adm0link').click(function(event){
      event.preventDefault();
      initCountry(adm0_code,adm0,adm0_url);
  });
  
  $('#prodlink').click(function(event){
      event.preventDefault();
      generateChartView(cf,adm0,prod,unit,adm0_code,adm0_url);
  });
  
  $('#adm1link').click(function(event){
      event.preventDefault();
      generateADMChartView(cf,adm1,prod,unit,adm0,adm0_code,adm0_url);
  });     

  cf.byDate.filterAll();
  cf.byMkt.filter(mkt);    
  
  generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function getAVG(sum,count){
  var data =[];
  sum.forEach(function(e,i){
    var value=0;
    if(count[i].value!==0){
      value = e.value/count[i].value;
      data.push({key:e.key,value:value});
    }
  });

  return data;    
}

function generateTimeCharts(data,cf,title){
    //$('#nav_chart').html('<p>Select a portion of the chart below to zoom in the data.</p><p><span id="brush6" class="setbrush">Last 6 months</span><span id="brush12" class="setbrush">1 year</span><span id="brush60" class="setbrush">5 years</span></p>');

    // $('#brush6').click(function(){
    //     setBrushExtent(data,6);
    // });
    // $('#brush12').click(function(){
    //     setBrushExtent(data,12);
    // });
    // $('#brush60').click(function(){
    //     setBrushExtent(data,60);
    // });

    var margin = {top: 10, right: 20, bottom: 20, left: 60},
        width = $('#nav_chart').width() - margin.left - margin.right,
        height = 175 - margin.top - 10 - margin.bottom,
        height2 = 50 - margin.top - margin.bottom;

    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom().scale(x).ticks(5),
        xAxis2 = d3.axisBottom().scale(x2).ticks(5),
        yAxis = d3.axisLeft().scale(y).ticks(5);

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];        

    // var brush = d3.brushX()
    //     .extent([[0, 0], [width, height]])
    //     //.x(x2)        
    //     .on("brush", brushed)
    //     .on("end", function(){
    //     		//cf.byDate.filterRange(brush.empty() ? x2.domain() : brush.extent());
    //         //var dates = brush.empty() ? x2.domain() : brush.extent();
    //     		var selection = d3.event.selection;
    //         cf.byDate.filterRange(selection===null ? x2.domain() : selection);
    //         var dates = selection===null ? x2.domain() : selection;
    //         var dateFormatted = monthNames[dates[0].getMonth()] +" " + dates[0].getFullYear() + " - " +  monthNames[dates[1].getMonth()] +" " + dates[1].getFullYear();
    
    //         $("#dateextent").html("Average Price for period " + dateFormatted);
    //         if(curLevel === "adm0"){
    //             transitionBarChart(getAVG(cf.groupByAdm1Sum.all(),cf.groupByAdm1Count.all()));
    //         }
    //         if(curLevel === "adm1"){
    //             transitionBarChart(getAVG(cf.groupByMktSum.all(),cf.groupByMktCount.all()));
    //         }                        
    //     });

    //convert date values to date objects
    data.forEach(function(d){
      d.key = new Date(d.key);
    });
        
    var area = d3.area()
        .x(function(d,i) { return x(d.key); })
        .y0(height)
        .y1(function(d,i) { return y(d.value); });

    var area2 = d3.area()
        .x(function(d) { return x2(d.key); })
        .y0(height2)
        .y1(function(d) { return y2(d.value); });

    var main_chart = d3.select("#main_chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top+10 + margin.bottom);

    main_chart.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = main_chart.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + (margin.top+10) + ")");

    // var nav_chart = d3.select("#nav_chart").append("svg")
    //     .attr("width", width + margin.left + margin.right)
    //     .attr("height", height2 + margin.top + margin.bottom);

    // var context = nav_chart.append("g")
    //     .attr("class", "context")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data.map(function(d) { return d.key; })));
    y.domain([0, d3.max(data.map(function(d) { return d.value; }))]);
    x2.domain(x.domain());
    y2.domain(y.domain());
    
    var price = main_chart.append("g")
       .attr("class", "pricelabel")
       .style("display", "none");

      price.append("circle")
          .attr("cy",10)
          .attr("r", 4)
          .attr("fill","#ffffff")
          .attr("stroke","#6fbfff");

      price.append("text")
          .attr("x", 9)
          .attr("dy", ".35em")
          .attr("class","wfplabel");    

    var bisectDate = d3.bisector(function(d) { return d.key; }).left;

    focus.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("d", area)
      .on("mouseover", function() { price.style("display", null); })
      .on("mouseout", function() { price.style("display", "none"); })
      .on("mousemove",function(d){
          var x0 = x.invert(d3.mouse(this)[0]),
              i = bisectDate(data, x0),
              d0 = data[i - 1],
              d1 = data[i],
              d = x0 - d0.key > d1.key - x0 ? d1 : d0;
          price.attr("transform", "translate(" + (x(d.key)+margin.left) + "," + (y(d.value)+margin.top) + ")");
          var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
          var m_names = new Array('Jan', 'Feb', 'Mar', 
              'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 
              'Oct', 'Nov', 'Dec'); 
          var date = m_names[d.key.getMonth()] + '-' + d.key.getFullYear();
          price.select("text").text(date+": "+value);
      });

    var linedata = [];
    
    data.forEach(function(e){
      linedata.push([{x:e.key,y:0},{x:e.key,y:e.value}]);
    });

    var line = d3.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });

    focus.append("g")
        .selectAll(".line")
        .data(linedata)
        .enter().append("path")
        .attr("class", "priceline")
        .attr("d", line)
        .attr("stroke","#6fbfff")
        .attr("clip-path", "url(#clip)")
        .on("mouseover", function() { price.style("display", null); })
        .on("mouseout", function() { price.style("display", "none"); })
        .on("mousemove",function(d){
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.key > d1.key - x0 ? d1 : d0;
            price.attr("transform", "translate(" + (x(d.key)+margin.left) + "," + (y(d.value)+margin.top) + ")");
            var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
            var m_names = new Array('Jan', 'Feb', 'Mar', 
                'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 
                'Oct', 'Nov', 'Dec'); 
            var date = m_names[d.key.getMonth()] + '-' + d.key.getFullYear();
            price.select("text").text(date+": "+value);
        });

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);
  
    main_chart.append("text")
        .attr("class", "y wfplabel ylabel")
        .attr("text-anchor", "end")
        .attr("y", 0)
        .attr("x",-30)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Price in local currency");
  
    $('#main_chart').append('<a id="mainchartdownload" href="">Download Data</a>');
    $('#mainchartdownload').click(function(event){
      event.preventDefault();
      downloadData(data,'Date',title);
    });
}

function downloadData(data,name,title){
    var csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += title+'\n\n';
    csvContent += name+',Price\n';
    var m_names = new Array('January', 'February', 'March', 
    'April', 'May', 'June', 'July', 'August', 'September', 
    'October', 'November', 'December');    
    data.forEach(function(e, index){
     if(name==='Date'){
         var key = m_names[e.key.getMonth()] + '-' + e.key.getFullYear();
     } else {
         var key = e.key;
     }
         
     var dataString = key+','+e.value;
     csvContent += index < data.length ? dataString+ '\n' : dataString;
    });
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'data.csv');
    link.click();
}

function generateBarChart(data,cf,prod,unit,adm0,adm0_code,adm1,adm0_url){
  data.forEach(function(e){
    if(e.key.length>14){
      e.display = e.key.substring(0,14)+"...";
    } else {
      e.display = e.key;
    }
  });
  $('#drilldown_chart').html('<p>Click a bar on the chart below to explore data for that area. <span id="dateextent"></span></p>');
  var margin = {top: 20, right: 60, bottom: 60, left: 60},
      width = $("#drilldown_chart").width() - margin.left - margin.right,
      height =  135 - margin.top - margin.bottom;
  
  var x = d3.scaleBand()
      .rangeRound([0, width]);

  var y = d3.scaleLinear()
      .range([0,height]); 

  var xAxis = d3.axisBottom()
      .scale(x);

  var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(3);
  
  x.domain(data.map(function(d) {return d.display; }));
  y.domain([d3.max(data.map(function(d) { return d.value; })),0]);
  
  var svg = d3.select("#drilldown_chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  svg.append("g")
    .attr("class", "x axis xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)
    .selectAll("text")  
      .style("text-anchor", "start")
      .attr("transform", function(d) {
        return "rotate(30)"; 
      });

  svg.append("g")
    .attr("class", "y axis yaxis")
    .call(yAxis);

  var price = svg.append("g")
    .attr("class", "barpricelabel");

    price.append("text")
      .attr("dy", ".35em")
      .style("text-anchor", "middle")
      .attr("class","wfplabel")

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect") 
    .attr("x", function(d,i) { return x(d.display); })
    .attr("width", x.bandwidth()-1)
    .attr("y", function(d){
      return y(d.value);        
    })
    .attr("height", function(d) {
      return height-y(d.value);
    })
    .attr("class","bar")
    .on("mouseover", function(d) {
      price.style("display", null);
      var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
      price.attr("transform", "translate(" + (x(d.display)+(x.bandwidth()-1)/2) + "," + (y(d.value)-10) + ")");
      price.select("text").text(value);
    })
    .on("mouseout", function() { 
      price.style("display", "none");
    })    
    .on("click",function(d){
      if(curLevel === "adm1"){generateMktChartView(cf,d.key,prod,unit,adm0,adm0_code,adm1,adm0_url);};
      if(curLevel === "adm0"){generateADMChartView(cf,d.key,prod,unit,adm0,adm0_code,adm0_url);};
    });
}

function transitionBarChart(data){
    data.forEach(function(e){
      if(e.key.length>14){
        e.display = e.key.substring(0,14)+"...";
      } else {
        e.display = e.key;
      }
    });   
    
    var margin = {top: 10, right: 60, bottom: 60, left: 60},
        width = $("#drilldown_chart").width() - margin.left - margin.right,
        height =  130 - margin.top - margin.bottom;
    
    var x = d3.scaleBand()
        .rangeRound([0, width]);

    var y = d3.scaleLinear()
        .range([0,height]);

    
    x.domain(data.map(function(d) {return d.display; }));
    y.domain([d3.max(data.map(function(d) { return d.value; })),0]);
    
    var xAxis = d3.axisBottom()
      .scale(x);

    var yAxis = d3.axisLeft()
      .scale(y)
      .ticks(3);    
    
    d3.selectAll(".yaxis")
      .transition().duration(200)
      .call(yAxis);

    d3.selectAll(".xaxis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")  
        .style("text-anchor", "start")
        .attr("transform", function(d) {
          return "rotate(30)";
    }); 
        
    var count = data.length;
    
    var svg = d3.select("#drilldown_chart").selectAll("rect")
      .attr("x", function(d,i) { return x(d.display); })
      .attr("width", x.bandwidth()-1)
      .attr("y", function(d){
        return y(d.value);        
      })
      .attr("height", function(d,i) {
        if(i>=count){
          return 0;
        } else {
          return height-y(d.value);
        }
      }).on("mouseover", function(d) {
        var price = d3.select(".barpricelabel");
        price.style("display", null);
        var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
        price.attr("transform", "translate(" + (x(d.display)+(x.bandwidth()-1)/2) + "," + (y(d.value)-10) + ")");
        price.select("text").text(value);
      });
            
    var svg = d3.select("#drilldown_chart").selectAll("rect").data(data)
      .transition().duration(200)  
        .attr("x", function(d,i) { return x(d.display); })
        .attr("width", x.bandwidth()-1)
        .attr("y", function(d){
          return y(d.value);        
        })
        .attr("height", function(d) {
          return height-y(d.value);
        });         
}



function vizTrack(view, content) {
  mpTrack(view, content);
  gaTrack('viz interaction', 'switch viz', 'ukr data explorer / '+view, content);
}

function mpTrack(view, content) {
  //mixpanel event
  mixpanel.track('viz interaction', {
    'page title': document.title,
    'embedded in': window.location.href,
    'action': 'switch viz',
    'viz type': 'ukr data explorer',
    'current view': view,
    'content': content
  });
}

function gaTrack(eventCategory, eventAction, eventLabel, type) {
  dataLayer.push({
    'event': eventCategory,
    'label': eventAction,
    'type': eventLabel
  });
}


function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}


function formatValue(val) {
  var format = d3.format('$.3s');
  var value;
  if (!isVal(val)) {
    value = 'NA';
  }
  else {
    value = (isNaN(val) || val==0) ? val : format(val).replace(/G/, 'B');
  }
  return value;
}


function roundUp(x, limit) {
  return Math.ceil(x/limit)*limit;
}


function isVal(value) {
  return (value===undefined || value===null || value==='') ? false : true;
}

function randomNumber(min, max) { 
  return Math.random() * (max - min) + min;
}

function regionMatch(region) {
  // var match = false;
  // var regions = region.split('|');
  // for (var region of regions) {
  //   if (currentRegion=='' || region==currentRegion) {
  //     match = true;
  //     break;
  //   }
  // }
  // return match;
  return true;
}


//regional id/name list
const regionalList = [
  {id: 'HRPs', name: 'Humanitarian Response Plan Countries'},
  {id: 'ROAP', name: 'Asia and the Pacific'},
  {id: 'ROCCA', name: 'Eastern Europe'},
  {id: 'ROLAC', name: 'Latin America and the Caribbean'},
  {id: 'ROMENA', name: 'Middle East and North Africa'},
  {id: 'ROSEA', name: 'Southern and Eastern Africa'},
  {id: 'ROWCA', name: 'West and Central Africa'}
];


function createFootnote(target, indicator, text) {
  var indicatorName = (indicator==undefined) ? '' : indicator;
  var className = (indicatorName=='') ? 'footnote' : 'footnote footnote-indicator';
  var footnote = $(`<p class='${className}' data-indicator='${indicatorName}'>${truncateString(text, 65)}<a href='#' class='expand'>MORE</a></p>`);
  $(target).append(footnote);
  footnote.click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(`${truncateString(text, 65)}<a href='#' class='expand'>MORE</a>`);
    }
    else {
      $(this).html(`${text}<a href='#' class='collapse'>LESS</a>`);
    }
  });
}


function getCurvedLine(start, end) {
  const radius = turf.rhumbDistance(start, end);
  const midpoint = turf.midpoint(start, end);
  const bearing = turf.rhumbBearing(start, end) - 89; // <-- not 90˚
  const origin = turf.rhumbDestination(midpoint, radius, bearing);

  const curvedLine = turf.lineArc(
    origin,
    turf.distance(origin, start),
    turf.bearing(origin, end),
    turf.bearing(origin, start),
    { steps: 128 }
  );

  return { line: curvedLine, bearing: bearing };
}


//country codes and raster ids
const countryCodeList = {
  UKR: '5rg490nv'
};


function setKeyFigures() {
	var secondaryPanel = $('.secondary-panel');
	var secondaryPanelSource = $('.secondary-panel .source-container');
	secondaryPanel.find('.figures, .source-container, .ranking-chart').empty();
	secondaryPanel.find('.source-container').show();

	//title
	secondaryPanel.find('.secondary-panel-title').html(currentIndicator.title);

	//source
	var indicator = currentIndicator.id;
	if (indicator=='#affected+inneed+pct') indicator = '#affected+inneed';
	createSource(secondaryPanelSource, indicator);

	//set global stats
	// var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	// var globalFigures = '<b>Global COVID-19 Figures:</b><br>'+ d3.format('.3s')(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths';
	
	// //show global vax stat only on covax layer
	// if (currentIndicator.id=='#targeted+doses+delivered+pct' && worldData['#capacity+doses+administered+total']!=undefined) {
	// 	var totalAdministeredVal = d3.format('.3s')(worldData['#capacity+doses+administered+total']).replace(/G/,"B");
	// 	globalFigures += '<br><br><b>Global vaccines administered: '+ totalAdministeredVal +'</b>';
	// }
	
	//print global stats
	//secondaryPanel.find('.global-figures').html(globalFigures);

	//if on covax layer, show HRP data by default
	//currentRegion = (currentRegion=='HRPs') ? 'HRPs' : d3.select('.region-select').node().value;

	//get regional data
	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = d;
			}
		});
	}

	//tally countries with data
	var totalCountries = 0;
	secondaryNationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
				if (val!=undefined)
					totalCountries++;
			}
			else {
				if (isVal(val) && !isNaN(val)) {
					totalCountries++;
				}
			}
		}
	});

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		var affectedPIN = (data[indicator]==undefined) ? 0 : (d3.format('.4s'))(data[indicator]);
		if (currentRegion=='') {
			//global stats
			affectedPIN = (d3.format('.4s'))(data['#affected+inneed']);
			totalCountries =  data['#meta+countries+inneed+num'];
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', affectedPIN);
	}
	//IPC
	else if (currentIndicator.id=='#affected+food+p3plus+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var ipcTotal = (data['#affected+food+ipc+p3plus+num']==undefined) ? 0 : d3.format('.3s')(data['#affected+food+ipc+p3plus+num']);
		createKeyFigure('.figures', 'Total number of people in IPC 3+', '', ipcTotal);
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	$('.ranking-container').show();
	createRankingChart();
}

function createKeyFigure(target, title, className, value) {
  var targetDiv = $(target);
  return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div></div></div></div>");
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
// function createSource(div, indicator) {
//   var sourceObj = getSource(indicator);
//   var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
//   var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
//   var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
//   div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
// }

// function updateSource(div, indicator) {
//   var sourceObj = getSource(indicator);
//   var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
//   var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
//   var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
//   div.find('.date').text(date);
//   div.find('.source-name').text(sourceName);
//   div.find('.dataURL').attr('href', sourceURL);
// }

// function getSource(indicator) {
//   var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
//   var obj = {};
//   sourcesData.forEach(function(item) {
//     if (item['#indicator+name']==indicator) {
//       obj = item;
//     }
//   });
//   return obj;
// }


let map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, secondaryGlobalLayer, tooltip, markerScale, countryMarkerScale;
let globalLayers = [];
let countryLayers = [];
let adm0SourceLayer = 'polbnda_int_uncs-6zgtye';
let hoveredStateId = null;

function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/cl0cqcpm4002014utgdbhcn4q/draft',
    center: [-25, 0],
    minZoom: minZoom,
    zoom: zoomLevel,
    attributionControl: false
  });

  map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
     .addControl(new mapboxgl.AttributionControl(), 'bottom-right');

  map.on('load', function() {
    console.log('Map loaded')
    
    mapLoaded = true;
    if (dataLoaded==true) displayMap();
  });
}

function displayMap() {
  console.log('Display map');

  //remove loader and show vis
  $('.loader, #static-map').remove();
  $('#global-map, .map-legend').css('opacity', 1);

    //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
    //$('.tab-menubar, #chart-view, .comparison-panel').css('left', $('.secondary-panel').outerWidth());
    $('.secondary-panel').animate({
      left: 0
    }, 200);
  }

  //set initial indicator
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected').attr('data-legend'), title: $('.menu-indicators').find('.selected').text()};

  //init element events
  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      case 'adm0-fills':
        globalLayer = layer.id;
        globalLayers.push(layer.id);

        map.setFeatureState(
          { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
          { hover: false }
        );
        break;
      case 'secondary-adm0-fills':
        secondaryGlobalLayer = layer.id;
        globalLayers.push(layer.id);
        map.setLayoutProperty(secondaryGlobalLayer, 'visibility', 'none');
        break;
      case 'secondary-adm0-label':
        secondaryGlobalLabelLayer = layer.id;
        globalLayers.push(layer.id);
        map.setLayoutProperty(secondaryGlobalLabelLayer, 'visibility', 'none');
        break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        //globalLayers.push(layer.id);
        //map.setLayoutProperty(globalLabelLayer, 'visibility', 'none');
        break;
      // case 'adm0-centroids':
      //   globalMarkerLayer = layer.id;
      //   globalLayers.push(layer.id);
      //   map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
      //   break;
      case 'adm1-fills':
        countryLayer = layer.id;
        countryLayers.push(layer.id);
        break;
      case 'adm1-label':
        countryLabelLayer = layer.id;
        countryLayers.push(layer.id);
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        countryLayers.push(layer.id);
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        countryLayers.push(layer.id);
        break;
      default:
        //do nothing
    }
  });

  mapFeatures = map.queryRenderedFeatures();

  //load pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    var raster = countryCodeList[country_code];
    if (raster!='') {
      map.addSource(id+'-pop-tileset', {
        type: 'raster',
        url: 'mapbox://humdata.'+raster
      });

      map.addLayer(
        {
          id: id+'-popdensity',
          type: 'raster',
          source: {
            type: 'raster',
            tiles: ['https://api.mapbox.com/v4/humdata.'+raster+'/{z}/{x}/{y}.png?access_token='+mapboxgl.accessToken],
          }
        },
        countryBoundaryLayer
      );

      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }
  });

  //init global and country layers
  initGlobalLayer();
  initCountryLayer();

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkView();

  //create tooltip
  tooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'map-tooltip'
  });
}

function deepLinkView() {
  //deep link to specific layer 
  let location = window.location.search;
  if (location.indexOf('?layer=')>-1) {
    let param = location.split('layer=')[1];
    if (param=='global') {
      resetMap();
    }
    else {
      setCountry();
      let layer = $('.map-legend.country').find('input[data-layer="'+param+'"]');
      selectLayer(layer);
    }
  }
  else {
    setCountry();
  }
}

function setCountry() {
  let countryCode = 'UKR';
  if (countryCodeList.hasOwnProperty(countryCode)) {
    currentCountry.code = countryCode;
    currentCountry.name = 'Ukraine';

    //find matched features and zoom to country
    let selectedFeatures = matchMapFeatures(currentCountry.code);
    selectCountry(selectedFeatures);
  }

  //deep link to specific layer 
  let location = window.location.search;
  if (location.indexOf('?layer=')>-1) {
    let param = location.split('layer=')[1];
    let layer = $('.map-legend.country').find('input[data-layer="'+param+'"]');
    selectLayer(layer);
  }
}

function selectLayer(layer) {
  layer.prop('checked', true);
  currentCountryIndicator = {id: layer.val(), name: layer.parent().text()};
  updateCountryLayer();
  vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);

  //reset any deep links
  let layerID = layer.attr('data-layer');
  let location = (layerID==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layerID;
  window.history.replaceState(null, null, location);
}

function selectLayer(layer) {
  layer.prop('checked', true);
  currentCountryIndicator = {id: layer.val(), name: layer.parent().text()};
  updateCountryLayer();
  vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);

  //reset any deep links
  let layerID = layer.attr('data-layer');
  let location = (layerID==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layerID;
  window.history.replaceState(null, null, location);
}

function matchMapFeatures(country_code) {
  //loop through mapFeatures to find matches to currentCountry.code
  var selectedFeatures = [];
  mapFeatures.forEach(function(feature) {
    if (feature.sourceLayer==adm0SourceLayer && feature.properties.ISO_3==currentCountry.code) {
      selectedFeatures.push(feature)
    }
  });
  return selectedFeatures;
}

function createEvents() {
  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    selectLayer(selected);
  });

  //chart view trendseries select event
  d3.select('.trendseries-select').on('change',function(e) {
    var selected = d3.select('.trendseries-select').node().value;
    updateTimeseries(selected);
    if (currentCountry.code!==undefined && selected!==undefined)
      vizTrack(`chart ${currentCountry.code} view`, selected);
  });

  //switch view event
  $('#btn-switch-view').on('click', function() {
    resetMap();
  });
}

function selectCountry(features) {
  //set first country indicator
  $('#affected+idps').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);

  updateCountryLayer();
  toggleLayers([countryMarkerLayer, countryLabelLayer, countryBoundaryLayer], 'visible');

  let target = bbox.default(turfHelpers.featureCollection(features));
  let mapPadding = (isMobile) ?
    {
      right: -100,
      left: -200,
      bottom: 0
    } :
    { 
      right: $('.map-legend.country').outerWidth()+65,
      left: $('.country-panel').outerWidth()-80,
      bottom: 50
    };
  map.fitBounds(regionBoundaryData[0].bbox, {
    offset: [0, -25] ,
    padding: {right: mapPadding.right, bottom: mapPadding.bottom, left: mapPadding.left},
    linear: true
  });

  map.once('moveend', initCountryView);
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.country-panel').scrollTop(0);
  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  initIDPLayer();
  initBorderCrossingLayer();
  initHostilityLayer();
  initLocationLabels();
  initAcledLayer();
  initRefugeeLayer();

  //mouse events
  map.on('mouseenter', countryLayer, onMouseEnter);
  map.on('mouseleave', countryLayer, onMouseLeave);
  map.on('mousemove', countryLayer, function(e) {  
    if (currentCountryIndicator.id!='#acled+events') {
      var f = map.queryRenderedFeatures(e.point)[0];
      if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_EN==currentCountry.name) {
        map.getCanvas().style.cursor = 'pointer';
        if (f.layer.id!='hostilities-layer') createCountryMapTooltip(f.properties.ADM1_EN, f.properties.ADM1_PCODE, e.point);
        tooltip
          .addTo(map)
          .setLngLat(e.lngLat);
      }
      else {
        if (f.layer.id!='hostilities-layer' && f.layer.id!='country-labels' && f.layer.id!='adm1-label' && f.layer.id!='town-dots') {
          map.getCanvas().style.cursor = '';
          tooltip.remove();
        }
        else {
          tooltip
            .addTo(map)
            .setLngLat(e.lngLat);
        } 
      }
    }
  });    
}


function initIDPLayer() {
  const max = d3.max(idpMacroData, function(d) { return +d['#affected+idps']; });
  const colorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);

  //match macro region features with idp data
  idpGeoJson.features.forEach(function(f) {
    let prop = f.properties;
    idpMacroData.forEach(function(d) {
      if (prop.ADM1_EN!=='') {
        if (prop.ADM1_EN.toLowerCase()==d['#region+macro+name'].toLowerCase()) {
          prop.idpPresence = d['#affected+idps'];
          prop.color = colorScale(d['#affected+idps']);
        }
      }
      else {
        prop.idpPresence = '';
        prop.color = '#FFF';
      }
    });
  });

  map.addSource('macro-region-data', {
    type: 'geojson',
    data: idpGeoJson
  });

  map.addLayer({
    id: 'macro-regions',
    source: 'macro-region-data',
    type: 'fill',
    paint: {
      'fill-color': ['get', 'color'],
      'fill-outline-color': '#E0E0E0'
    }
  }, globalLabelLayer);

  countryLayers.push('macro-regions')

  //mouse events
  map.on('mouseenter', 'macro-regions', onMouseEnter);
  map.on('mouseleave', 'macro-regions', onMouseLeave);
  map.on('mousemove', 'macro-regions', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const macroRegion = e.features[0].properties.ADM1_EN;
    const content = (macroRegion=='') ? 'IDP Estimate:<div class="stat">No Data</div>' : `<h2>${macroRegion} Region</h2>IDP Estimate:<div class="stat">${numFormat(e.features[0].properties.idpPresence)}</div>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initBorderCrossingLayer() {
  map.addSource('border-crossings', {
    type: 'geojson',
    data: borderCrossingData,
    generateId: true 
  });
  map.addLayer({
    id: 'border-crossings-layer',
    type: 'symbol',
    source: 'border-crossings',
    layout: {
      'icon-image': 'marker-border-crossing',
      'icon-size': 0.6,
      'icon-allow-overlap': isMobile ? false : true
    }
  });

  countryLayers.push('border-crossings-layer')

  //mouse events
  map.on('mouseenter', 'border-crossings-layer', onMouseEnter);
  map.on('mouseleave', 'border-crossings-layer', onMouseLeave);
  map.on('mousemove', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const content = `Border Crossing:<h2>${e.features[0].properties['Name - Eng']}</h2>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initLocationLabels() {
  //surrounding country data
  map.addSource('country-data', {
    type: 'geojson',
    data: countryData,
    generateId: true 
  });

  //country labels
  map.addLayer({
    id: 'country-labels',
    type: 'symbol',
    source: 'country-data',
    layout: {
      'text-field': [
        'format',
        ['upcase', ['get', 'CNTRY']]
      ],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-allow-overlap': true,
      'text-letter-spacing': 0.3
    },
    paint: {
      'text-color': '#666',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });


  //town/capital data
  map.addSource('location-data', {
    type: 'geojson',
    data: locationData,
    generateId: true 
  });

  //towm markers
  map.addLayer({
    id: 'town-dots',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'ADMIN 1'],
    layout: {
      'icon-image': 'marker-town',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 1],
      'icon-allow-overlap': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.4
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);


  //capital markers
  map.addLayer({
    id: 'marker-capital',
    type: 'symbol',
    source: 'location-data',
    filter: ['==', 'TYPE', 'TERRITORY'],
    layout: {
      'icon-image': 'marker-capital',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 0.9],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.7,
      'text-allow-overlap': true,
      'text-ignore-placement': true
    },
    paint: {
      'text-color': '#888',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);

  countryLayers.push(...['country-labels', 'town-dots', 'marker-capital']);
}


function initHostilityLayer() {
  //add hostilty markers
  map.addSource('hostility-data', {
    type: 'geojson',
    data: hostilityData,
    generateId: true 
  });
  map.addLayer({
    id: 'hostilities-layer',
    type: 'symbol',
    source: 'hostility-data',
    layout: {
      'icon-image': 'marker-hostility',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1.5, 6, 1.8],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
      'text-field': ["get", "NAME"],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 4, 12],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.7
    },
    paint: {
      'text-color': '#000',
      'text-halo-color': '#EEE',
      'text-halo-width': 1,
      'text-halo-blur': 1,
    }
  });

  countryLayers.push('hostilities-layer');
}


function initAcledLayer() {
  let maxCount = d3.max(cleanedCoords, function(d) { return +d['#affected+killed']; });
  let dotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([4, 16]);

  //get unique event types
  let acledEvents = [...new Set(cleanedCoords.map(d => d['#event+type']))];
  
  //build expression for event dot circles
  let eventTypeColorScale = ['match', ['get', 'event_type']];
  for (const [index, event] of acledEvents.sort().entries()) {
    eventTypeColorScale.push(event);
    eventTypeColorScale.push(eventColorRange[index]);
  }
  eventTypeColorScale.push('#666');

  let events = [];
  for (let e of cleanedCoords) {
    events.push({
      'type': 'Feature',
      'properties': {
        'adm1': e['#adm1+name'],
        'adm3': e['#adm3+name'],
        'event_type': e['#event+type'],
        'date': e['#date+occurred'],
        'fatalities': e['#affected+killed'],
        'notes': e['#description'],
        'iconSize': dotScale(e['#affected+killed'])
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': e['#coords']
      } 
    })
  }
  let eventsGeoJson = {
    'type': 'FeatureCollection',
    'features': events
  };
  map.addSource('acled', {
    type: 'geojson',
    data: eventsGeoJson,
    generateId: true 
  });

  map.addLayer({
    id: 'acled-dots',
    type: 'circle',
    source: 'acled',
    paint: {
      'circle-color': eventTypeColorScale,
      'circle-stroke-color': eventTypeColorScale,
      'circle-opacity': 0.5,
      'circle-radius': ['get', 'iconSize'],
      'circle-stroke-width': 1,
    }
  });

  countryLayers.push('acled-dots');
  map.setLayoutProperty('acled-dots', 'visibility', 'none');


  //acled events mouse events
  map.on('mouseenter', 'acled-dots', onMouseEnter);
  map.on('mouseleave', 'acled-dots', onMouseLeave);
  map.on('mousemove', 'acled-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    let prop = e.features[0].properties;
    let date = new Date(prop.date);
    let content = `<span class='small'>${moment(date).format('MMM D, YYYY')}</span>`;
    content += `<h2>${prop.event_type}</h2>`;
    content += `<p>${prop.notes}</p>`;
    content += `<p>Fatalities: ${prop.fatalities}</p>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
}


function initRefugeeLayer() {
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeLineScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([2, 20]);

  let refugeeIconScale = d3.scaleLinear()
    .domain([1, maxCount])
    .range([0.25, 1]);

  //draw directional curved arrows
  for (let d of refugeeLineData.features) {
    const iso = d.properties.ISO_3;
    const start = d.geometry.coordinates[0];
    const end = d.geometry.coordinates[1];

    const curve = getCurvedLine(start, end);
    const bearing = curve.bearing;

    map.addSource(`route-${iso}`, {
      'type': 'geojson',
      'lineMetrics': true,
      'data': curve.line
    });

    //draw line
    map.addLayer({
      'id': `line-${iso}`,
      'type': 'line',
      'source': `route-${iso}`,
      'paint': {
        'line-color': '#0072BC',
        'line-opacity': 0.8,
        'line-width': refugeeLineScale(dataByCountry[iso][0]['#affected+refugees']),
        'line-gradient': [
          'interpolate',
          ['linear'],
          ['line-progress'],
          0, "rgba(0, 114, 188, 1)",
          1, "rgba(0, 114, 188, 0.2)"
        ]
      }
    });

    countryLayers.push(`line-${iso}`);

    //get geo for arrow head and label
    map.addSource(`point-${iso}`, {
      'type': 'geojson',
      'data': {
        'type': 'FeatureCollection',
        'features': [
          {
            'type': 'Feature',
            'geometry': {
              'type': 'Point',
              'coordinates': end
            }
          }
        ]
      }
    });

    //attach arrow head
    map.addLayer({
      id: `arrow-${iso}`,
      type: 'symbol',
      source: `point-${iso}`,
      layout: {
        'icon-image': 'marker-arrowhead-blue',
        'icon-size': refugeeIconScale(dataByCountry[iso][0]['#affected+refugees']),
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-rotate': bearing+68,
        'icon-offset': [1, -20.5]
      },
      paint: {
        'icon-color': '#0072BC',
        'icon-opacity': 0.8
      }
    });

    countryLayers.push(`arrow-${iso}`);


    //mouse events
    map.on('mouseenter', `arrow-${iso}`, onMouseEnter);
    map.on('mouseleave', `arrow-${iso}`, onMouseLeave);
    map.on('mousemove', `arrow-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });


    map.on('mouseenter', `line-${iso}`, onMouseEnter);
    map.on('mouseleave', `line-${iso}`, onMouseLeave);
    map.on('mousemove', `line-${iso}`, function(e) {
      map.getCanvas().style.cursor = 'pointer';
      let content = `<h2>${dataByCountry[iso][0]['#country+name']}</h2>`;
      content += `Number of Refugees from Ukraine:<br>`;
      content += `<span class="stat">${numFormat(dataByCountry[iso][0]['#affected+refugees'])}</span>`;
      tooltip.setHTML(content);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    });
  }
}

function updateCountryLayer() {
  colorNoData = '#F9F9F9';
  $('.no-data-key').hide();

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 100);

  //color scale
  var clrRange = colorRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#affected+idps':
      clrRange = idpColorRange;
      break;
    case '#org+count+num':
      clrRange = orgsRange;
    default:
      //
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  $('.map-legend.country').removeClass('population acled idps');
  if (currentCountryIndicator.id=='#population') {
    $('.map-legend.country').addClass('population');
    countryColorScale = d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(populationColorRange);
  }
  else if (currentCountryIndicator.id=='#acled+events') {
    $('.map-legend.country').addClass('acled');
    countryColorScale = d3.scaleOrdinal()
      .domain(['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians'])
      .range(eventColorRange);
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    $('.no-data-key').show();
    $('.map-legend.country').addClass('idps');

    let max = d3.max(idpGeoJson.features, function(d) { return +d.properties.idpPresence; });
    countryColorScale = d3.scaleQuantize().domain([0, max]).range(idpColorRange);
  }
  else if (currentCountryIndicator.id=='#org+count+num') {
    $('.no-data-key').show();
    //$('.map-legend.country').addClass('idps');
  }
  else {}

  updateCountryLegend(countryColorScale);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      layerOpacity = 1;
      color = (val<0 || !isVal(val) || isNaN(val)) ? colorNoData : countryColorScale(val);

      //turn off choropleth for population layer
      color = (currentCountryIndicator.id=='#population') ? colorDefault : color;
    }
    else {
      color = colorDefault;
      boundaryColor = '#E0E0E0';
      layerOpacity = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionBoundary.push(d['#adm1+code'], boundaryColor);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
  });
  //set expression defaults
  expression.push(colorDefault);
  expressionBoundary.push('#E0E0E0');
  expressionOpacity.push(0);

  //hide all pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    if (map.getLayer(id+'-popdensity'))
      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  });

  //set properties
  if (currentCountryIndicator.id=='#population') {
    var id = currentCountry.code.toLowerCase();
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'visible');
  }
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  //map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', '#C4C4C4');//expressionBoundary
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);


  //toggle layers
  if (currentCountryIndicator.id=='#acled+events') {
    resetLayers();
    map.setLayoutProperty('acled-dots', 'visibility', 'visible');
    toggleLayers(['border-crossings-layer', 'hostilities-layer'], 'none');
  }
  else if (currentCountryIndicator.id=='#affected+idps') {
    resetLayers();
    map.setLayoutProperty(countryLayer, 'visibility', 'none');
    map.setLayoutProperty('macro-regions', 'visibility', 'visible');
  }
  else {
    resetLayers();
  }
}


function resetLayers() {
  toggleLayers([countryLayer, 'border-crossings-layer', 'hostilities-layer'], 'visible');
  toggleLayers(['acled-dots', 'macro-regions'], 'none');
}


function createCountryLegend(scale) {
  //set data sources
  createSource($('.map-legend.country .idp-source'), '#affected+idps');
  createSource($('.map-legend.country .acled-source'), '#date+latest+acled');
  createSource($('.map-legend.country .orgs-source'), '#org+count+num');
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .hostilities-source'), '#event+loc');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  createSource($('.map-legend.country .refugee-arrivals-source'), '#affected+refugees');
  createSource($('.map-legend.country .border-crossing-source'), '#geojson');

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .scale(scale);

  var div = d3.select('.map-legend.country .legend-scale');
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  //no data
  var nodata = div.append('svg')
    .attr('class', 'no-data-key');

  nodata.append('rect')
    .attr('width', 15)
    .attr('height', 15);

  nodata.append('text')
    .attr('class', 'label')
    .text('No Data');

  //boundaries disclaimer
  createFootnote('.map-legend.country', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
    $('.legend-gradient').toggleClass('collapsed');
  });
}


function updateCountryLegend(scale) {
  //set format for legend format
  let legendFormat = (currentCountryIndicator.id=='#affected+idps' || currentCountryIndicator.id=='#population') ? shortenNumFormat : d3.format('.0f');

  //set legend title
  let legendTitle = $('input[name="countryIndicators"]:checked').attr('data-legend');
  $('.map-legend.country .legend-title').html(legendTitle);

  //update legend
  if (currentCountryIndicator.id=='#acled+events') {
    if (d3.selectAll('.legendCells-events').empty()) {
      var svg = d3.select('.map-legend.country .scale');
      svg.append("g")
        .attr("class", "legendCells-events")
        .attr("transform", "translate(6,10)");

      var legendOrdinal = d3.legendColor()
        .shape("path", d3.symbol().type(d3.symbolCircle).size(90)())
        .shapePadding(3)
        .scale(scale);

      svg.select(".legendCells-events")
        .call(legendOrdinal);
    }
  }
  else {
    var legend = d3.legendColor()
      .labelFormat(legendFormat)
      .cells(colorRange.length)
      .scale(scale);

    var g = d3.select('.map-legend.country .scale');
    g.call(legend);
  }
}


function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}


//mouse event/leave events
function onMouseEnter(e) {
  map.getCanvas().style.cursor = 'pointer';
  tooltip.addTo(map);
}
function onMouseLeave(e) {
  map.getCanvas().style.cursor = '';
  tooltip.remove();
}


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
function createCountryMapTooltip(adm1_name, adm1_pcode, point) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+code']==adm1_pcode && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];
    var label = currentCountryIndicator.name;

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
      if (currentCountryIndicator.id=='#affected+idps') val = numFormat(val);
      if (currentCountryIndicator.id=='#org+count+num') label = 'Humanitarian organizations present';
    }
    else {
      val = 'No Data';
    }

    let content = '';
    if (val!='No Data' && currentCountryIndicator.id=='#org+count+num') {
      //humanitarian presence layer
      let sectors = adm1[0]['#sector+cluster+names'].split(',').sort();
      content = `<h2>${adm1_name} Oblast</h2>`;
      content += `<div class="table-display layer-orgs">`;
      content += `<div class="table-row"><div>People reached:</div><div>${numFormat(adm1[0]['#reached+ind'])}</div></div>`;
      content += `<div class="table-row"><div>${label}:</div><div>${val}</div></div>`;
      content += `<div class="table-row row-separator"><div>Clusters present:</div><div>${sectors.length}</div></div>`;
      sectors.forEach(function(sector, index) {
        content += `<div class="table-row breakdown"><div><i class="${humIcons[sector]}"></i> ${sector}</div></div>`;
      });
      content += `</div>`;
    }
    else {
      content = `<h2>${adm1_name} Oblast</h2>${label}:<div class="stat">${val}</div>`;
    }

    tooltip.setHTML(content);
    //if (!isMobile) setTooltipPosition(point)
  }
}

function setTooltipPosition(point) {
  var tooltipWidth = $('.map-tooltip').width();
  var tooltipHeight = $('.map-tooltip').height();
  var anchorDirection = (point.x + tooltipWidth > viewportWidth) ? 'right' : 'left';
  var yOffset = 0;
  if (point.y + tooltipHeight/2 > viewportHeight) yOffset = viewportHeight - (point.y + tooltipHeight/2);
  if (point.y - tooltipHeight/2 < 0) yOffset = tooltipHeight/2 - point.y;
  var popupOffsets = {
    'right': [0, yOffset],
    'left': [0, yOffset]
  };
  tooltip.options.offset = popupOffsets;
  tooltip.options.anchor = anchorDirection;

  if (yOffset>0) {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-start');
    $('.mapboxgl-popup-tip').css('margin-top', point.y);
  }
  else if (yOffset<0)  {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-end');
    $('.mapboxgl-popup-tip').css('margin-bottom', viewportHeight-point.y-10);
  }
  else {
    $('.mapboxgl-popup-tip').css('align-self', 'center');
    $('.mapboxgl-popup-tip').css('margin-top', 0);
    $('.mapboxgl-popup-tip').css('margin-bottom', 0);
  }
}

function resetMap() {
  if ($('.content').hasClass('country-view')) {
    $('.content').removeClass('country-view');
    $('#btn-switch-view').html('Go to Ukraine View');

    //hide pop rasters
    if (currentCountry.code!=undefined) {
      var id = currentCountry.code.toLowerCase()
      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }

    //toggle btwn global and country map layers
    toggleLayers(globalLayers, 'visible');
    toggleLayers(countryLayers, 'none');

    //reset region
    if (currentRegion!='') {
      selectRegion();
      map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    }
    else {
      updateGlobalLayer();

      minZoom = 1;
      map.setMinZoom(minZoom);

      map.flyTo({ 
        speed: 2,
        zoom: zoomLevel,
        center: [-10, 0] 
      });
      map.once('moveend', function() {
        map.setLayoutProperty(globalLayer, 'visibility', 'visible');
      });
    }

    window.history.replaceState(null, null, window.location.pathname+'?layer=global');
  }
  else {
    $('.content').addClass('country-view');
    $('#btn-switch-view').html('Go to Global View');

    minZoom = 4;
    map.setMinZoom(minZoom);
    
    //toggle btwn global and country map layers
    toggleLayers(globalLayers, 'none');
    toggleLayers(countryLayers, 'visible');

    //show default layer
    let layer = $('.map-legend.country').find('input[data-layer="humanitarian_operations"]');
    selectLayer(layer);

    setCountry();
  }
}

function toggleLayers(ids, state) {
  for (layers in ids) {
    map.setLayoutProperty(ids[layers], 'visibility', state);
  }
}


/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  //updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name'] + ' Data Explorer');

   //black sea grain initiative key figures
  var grainDiv = $('.country-panel .grain .panel-inner');
  createFigure(grainDiv, {className: 'voyages', title: 'Number of Voyages (Inbound/Outbound)', stat: data['#indicator+voyages+num'], indicator: '#indicator+voyages+num'});
  createFigure(grainDiv, {className: 'tonnage', title: 'Tonnage of Commodities', stat: shortenNumFormat(data['#indicator+commodities+num']), indicator: '#indicator+commodities+num'});

  //humanitarian impact key figures
  var refugeesDiv = $('.country-panel .refugees .panel-inner');
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugees from Ukraine recorded across Europe (total)', stat: shortenNumFormat(regionalData['#affected+refugees']), indicator: '#affected+refugees'});
  createFigure(refugeesDiv, {className: 'idps', title: 'Internally Displaced People (estimated)', stat: shortenNumFormat(data['#affected+idps']), indicator: '#affected+idps'});
  createFigure(refugeesDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});
  createFigure(refugeesDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: numFormat(data['#affected+injured']), indicator: '#affected+injured'});
  createFigure(refugeesDiv, {className: 'people-reached', title: 'People reached within Ukraine (total)', stat: shortenNumFormat(data['#reached+ind']), indicator: '#reached+ind'});
  createFigure(refugeesDiv, {className: 'orgs', title: 'Humanitarian orgs present within Ukraine (total)', stat: numFormat(data['#org+count+num']), indicator: '#org+count+num'});
  createFigure(refugeesDiv, {className: 'attacks-health', title: 'Attacks on Health Care', stat: numFormat(data['#indicator+attacks+healthcare+num']), indicator: '#indicator+attacks+healthcare+num'});
  createFigure(refugeesDiv, {className: 'attacks-education', title: 'Attacks on Education Facilities', stat: numFormat(data['#indicator+attacks+education+num']), indicator: '#indicator+attacks+education+num'});

  //refugee sparkline
  var sparklineArray = [];
  refugeeTimeseriesData.forEach(function(d) {
    var obj = {date: d['#affected+date+refugees'], value: d['#affected+refugees']};
    sparklineArray.push(obj);
  });

  if ($('.figure.refugees .stat .sparkline').length<=0) createSparkline(sparklineArray, '.figure.refugees .stat');

  //casualty sparklines
  let killedArray = [];
  let injuredArray = [];
  casualtiesTimeseriesData.forEach(function(d) {
    let killedObj = {date: d['#date'], value: d['#affected+killed']};
    killedArray.push(killedObj);

    let injuredObj = {date: d['#date'], value: d['#affected+injured']};
    injuredArray.push(injuredObj);
  });
  createSparkline(killedArray, '.figure.casualties-killed .stat');
  createSparkline(injuredArray, '.figure.casualties-injured .stat');


  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-flash-required', title: 'Flash Appeal Requirement', stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  createFigure(fundingDiv, {className: 'funding-flash-allocation', title: 'Flash Appeal Funding', stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(regionalData['#value+funding+rrp+required+usd']), indicator: '#value+funding+rrp+required+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(regionalData['#value+funding+rrp+total+usd']), indicator: '#value+funding+rrp+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'CERF Allocation', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(data['#value+funding+uhf+usd']), indicator: '#value+funding+uhf+usd'});


  createPieChart([data['#value+funding+other+required+usd'], data['#value+funding+other+total+usd']], '.figure.funding-flash-required .stat');
  createPieChart([regionalData['#value+funding+rrp+required+usd'], regionalData['#value+funding+rrp+total+usd']], '.figure.funding-regional-required .stat');
}



function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));

  //format date for acled source
  if (indicator=='#date+latest+acled') {
    sourceObj['#date+start'] = getSource('#date+start+conflict')['#date'];
    let startDate = new Date(sourceObj['#date+start']);
    date = `${d3.utcFormat("%b %d")(startDate)} - ${date}`;
  }
  //dont show data link for hostilities, sent to undefined
  if (indicator=='#event+loc') {
    sourceObj['#meta+url'] = undefined;
  }

  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  let sourceContent = `<p class='small source'><span class='date'>${date}</span> | <span class='source-name'>${sourceName}</span>`;
  if (sourceURL!=='#') sourceContent += ` | <a href='${sourceURL}' class='dataURL' target='_blank' rel='noopener'>DATA</a>`;
  sourceContent += `</p>`;
  div.append(sourceContent);
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.find('.date').text(date);
  div.find('.source-name').text(sourceName);
  div.find('.dataURL').attr('href', sourceURL);
}

function getSource(indicator) {
  var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}
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

  //ranking select event
  d3.selectAll('.ranking-select').on('change',function(e) {
    var selected = d3.select(this).node().value;
    if (selected!='') {
      updateRankingChart(selected);
    }
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
  else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') max = 0;
  else if (currentIndicator.id=='#severity+overall+num' || currentIndicator.id=='#impact+type') max = Math.ceil(max)+1;
  else max = max; //Math.ceil(max)+1

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
  else if (currentIndicator.id=='#severity+overall+num') {

    scale = d3.scaleThreshold()
      .domain([ 1, 2, 3, 4 ])
      .range(frameworkColorRange);

    //scale = d3.scaleOrdinal().domain(['<1', '1-2', '2-3', '3-4', '>5']).range(frameworkColorRange);
    //scale = d3.scaleQuantize().domain([0, max]).range(frameworkColorRange);
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
    var legend;

    if (currentIndicator.id=='#severity+overall+num') {
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale)
        .labels(d3.legendHelpers.thresholdLabels);
    }
    else {
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
        if (country[0]['#severity+debt+num']!=undefined) content += `<div class="table-row"><div>Debt Risk:</div><div>${country[0]['#severity+debt+num']}</div></div>`;
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

mapboxgl.baseApiUrl='https://data.humdata.org/mapbox';
mapboxgl.accessToken = 'cacheToken';

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  //console.log(prod);

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
    $('.map-legend.country').css('max-height', viewportHeight - 218);
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
        'Logistics': 'humanitarianicons-Logistics',
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