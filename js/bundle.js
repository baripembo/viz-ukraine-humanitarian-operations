window.$ = window.jQuery = require('jquery');
var bbox = require('@turf/bbox');
var turfHelpers = require('@turf/helpers');
/*******************************/
/*** COVID PROJECTIONS CHART ***/
/*******************************/
function createProjectionsChart(data, type) {
  data.forEach(function(item, index) {
    if (!isVal(item.min) || !isVal(item.max))
      data.splice(index, 1);
  });

  var barColor = (type=='Cases') ? '#007CE1' : '#000';
  var maxVal = d3.max(data, function(d) { return +d.max; })
  var barHeight = 25;
  var barPadding = 20;
  var margin = {top: 0, right: 50, bottom: 30, left: 50},
      width = 336,
      height = (barHeight + barPadding) * data.length;
  
  x = d3.scaleLinear()
    .domain([0, maxVal])
    .range([0, width - margin.left - margin.right]);

  // set the ranges
  y = d3.scaleBand().range([0, height]);
  y.domain(data.map(function(d) { return d.model; }));
            
  var div = '.projections-'+ type.toLowerCase();
  var svg = d3.select(div).append('svg')
      .attr('width', width)
      .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // add the y axis
  svg.append('g')
    .attr('transform', 'translate(0, 0)')
    .call(d3.axisLeft(y)
      .tickSizeOuter(0))

  // add the x axis
  svg.append('g')
    .attr('transform', 'translate(0, '+height+')')
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .ticks(5, 's'));

  // append bars
  bars = svg.selectAll('.bar')
      .data(data)
    .enter().append('g')
      .attr('class', 'bar-container')
      .attr('transform', function(d, i) { return 'translate(' + x(d.min) + ', ' + (y(d.model)+10) + ')'; });

  bars.append('rect')
    .attr('class', 'bar')
    .attr('fill', barColor)
    .attr('height', barHeight)
    .attr('width', function(d) {
      var w = x(d.max) - x(d.min);
      if (w<0) w = 0;
      return w;
    });

  // add min/max labels
  bars.append('text')
    .attr('class', 'label-num')
    .attr('x', function(d) {
      return x(d.max) - x(d.min) + 4;
    })
    .attr('y', function(d) { return barHeight/2 + 4; })
    .text(function (d) {
      return d3.format('.3s')(d.max);
    });

  bars.append('text')
    .attr('class', 'label-num')
    .attr('text-anchor', 'end')
    .attr('x', -4)
    .attr('y', function(d) { return barHeight/2 + 4; })
    .text(function (d) {
      return d3.format('.3s')(d.min);
    });

  //source
  if (type=='Deaths') {
    var projectionsDiv = $('.projections .panel-inner');
    var date = new Date();
    projectionsDiv.append('<p class="small source"></p>');
    data.forEach(function(d) {
      var source = getSource('#affected+killed+min+'+ d.model.toLowerCase());
      var sourceDate = new Date(source['#date']);
      if (sourceDate.getTime()!=date.getTime()) {
        date = sourceDate;
        projectionsDiv.find('.source').append(' <span class="date">'+ dateFormat(date) +'</span>');
      }
      projectionsDiv.find('.source').append(' | '+ d.model +': <a href="'+ source['#meta+url'] +'" class="dataURL" target="_blank" rel="noopener">DATA</a>');
    });
  }
}

/*****************************************/
/*** COVID TRENDSERIES CHART FUNCTIONS ***/
/*****************************************/
function initTrendseries(countryCode) {
  //cases chart
  var casesArray = formatTrendseriesData(countryCode, 'infected');
  var latestVal = casesArray[casesArray.length-1]['weekly_new'];
  var latestCumulativeVal = casesArray[casesArray.length-1]['weekly_cumulative'];
  $('.cases-title').html('<h6>Weekly Number of New Cases</h6><div class="num">'+numFormat(latestVal)+'</div><div>Number of Cumulative Cases: <span class="cumulativeNum">'+numFormat(latestCumulativeVal)+'</span></div>');
  createTrendseries(casesArray, '.cases-trend-chart');

  //deaths chart
  var deathsArray = formatTrendseriesData(countryCode, 'killed');
  var latestDeathVal = deathsArray[deathsArray.length-1]['weekly_new'];
  var latestCumulativeDeathVal = deathsArray[deathsArray.length-1]['weekly_cumulative'];
  $('.deaths-title').html('<h6>Weekly Number of New Deaths</h6><div class="num">'+numFormat(latestDeathVal)+'</div><div>Number of Cumulative Deaths: <span class="cumulativeDeathNum">'+numFormat(latestCumulativeDeathVal)+'</span></div>');
  createTrendseries(deathsArray, '.deaths-trend-chart');
}

function formatTrendseriesData(countryCode, indicator) {
  var startDate = new Date(2020,2,1);//start chart at march 1, 2020
  var trendArray = [];
  var dataArray = Object.entries(covidTrendData);
  dataArray.forEach(function(d) {
    var valueArray = d[1];
    if (d[0]==countryCode) {
      valueArray.forEach(function(val) {
        var obj = {};
        var date = new Date(val['#date+reported']);
        var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

        if (utcDate>=startDate) {
          obj['date'] = utcDate;
          obj['weekly_new'] = +val['#affected+'+indicator+'+new+weekly'];
          obj['new_per_capita'] = +val['#affected+'+indicator+'+new+per100000+weekly'];
          obj['weekly_trend'] = +val['#affected+'+indicator+'+new+change+weekly'];
          obj['weekly_trend_pct'] = +val['#affected+'+indicator+'+new+pct+weekly'];
          obj['weekly_cumulative'] = + val['#affected+'+indicator+'+cumulative+weekly'];
          trendArray.push(obj);
        }
      });
    }
  });
  return trendArray;
}

var casesTrendChart, deathsTrendChart = '';
var casesTrendArray = [];
var deathsTrendArray = [];
function createTrendseries(array, div) {
  var chartWidth = viewportWidth - $('.secondary-panel').width() - 75;
  var chartHeight = 200;
  var colorArray = ['#F8B1AD'];
  var isCases = (div.indexOf('cases')>-1) ? true : false;
  //var maxVal = d3.max(array, function(d) { return +d.weekly_new; });

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 35,
      right: 30
    },
    bindto: div,
    data: {
      type: 'bar',
      json: array,
      keys: {
        x: 'date',
        value: ['weekly_new']
      }
    },
    color: {
      pattern: colorArray
    },
    axis: {
      x: {
        type: 'timeseries',
        tick: {
          outer: false,
          format: function(d) {
            var date = chartDateFormat(d);
            return date;
          }
        }
      },
      y: {
        min: 0,
        padding: { top:0, bottom:0 },
        tick: {
          outer: false,
          format: function(d) {
            return (d<10) ? d : shortenNumFormat(d);
          }
        }
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      contents: function(d, defaultTitleFormat, defaultValueFormat, color) {
        var indicator = (isCases) ? 'Cases' : 'Deaths';
        var currentArray = (isCases) ? casesTrendArray : deathsTrendArray;
        var index = d[0].index;
        var content = '<table class="trendseries-tooltip">';
        content += '<thead><th colspan="2">' + defaultTitleFormat(d[0].x) + '</th></thead>';
        content += '<tr><td>Weekly Number of New '+indicator+'</td><td>' + numFormat(currentArray[index]['weekly_new']) + '</td></tr>';
        content += '<tr><td>New '+indicator+' per 100,000</td><td>' + d3.format('.1f')(currentArray[index]['new_per_capita']) + '</td></tr>';
        content += '<tr><td>Weekly Trend</td><td>' + numFormat(currentArray[index]['weekly_trend']) + '</td></tr>';
        content += '<tr><td>Weekly Trend in %</td><td>' + percentFormat(currentArray[index]['weekly_trend_pct']) + '</td></tr>';
        content += '<tr><td>Number of Cumulative '+indicator+'</td><td>' + numFormat(currentArray[index]['weekly_cumulative']) + '</td></tr>';
        content += '</table>';
        return content;
      }
    },
    transition: { duration: 500 }
  });

  //save references to trend charts
  if (isCases) {
    casesTrendChart = chart;
    casesTrendArray = array;
  }
  else {
    deathsTrendChart = chart;
    deathsTrendArray = array;
  }
}

function updateTrendseries(countryCode) {
  casesTrendArray = formatTrendseriesData(countryCode, 'infected');
  var latestVal = casesTrendArray[casesTrendArray.length-1]['weekly_new'];
  var latestCumulativeVal = casesTrendArray[casesTrendArray.length-1]['weekly_cumulative'];
  $('.cases-title').find('.num').html(numFormat(latestVal));
  $('.cases-title').find('.cumulativeNum').html(numFormat(latestCumulativeVal));
  casesTrendChart.load({
    json: casesTrendArray,
    keys: {
      x: 'date',
      value: ['weekly_new']
    }
  });
  
  deathsTrendArray = formatTrendseriesData(countryCode, 'killed');
  var latestDeathVal = deathsTrendArray[deathsTrendArray.length-1]['weekly_new'];
  var latestCumulativeDeathVal = deathsTrendArray[deathsTrendArray.length-1]['weekly_cumulative'];
  $('.deaths-title').find('.num').html(numFormat(latestDeathVal));
  $('.deaths-title').find('.cumulativeDeathNum').html(numFormat(latestCumulativeDeathVal));
  deathsTrendChart.load({
    json: deathsTrendArray,
    keys: {
      x: 'date',
      value: ['weekly_new']
    }
  });
}

/****************************************/
/*** COVID TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  //var timeseriesArray = formatTimeseriesData(data);
  //createTimeSeries(timeseriesArray, div);
  createTimeSeries2(refugeeTimeseriesData, div);
}

function formatTimeseriesData(data) {
  var dateSet = new Set();
  var timeseriesArray = [];
  var dataArray = Object.entries(data);
  dataArray.forEach(function(d) {
    var countryArray = [];
    if (d[0]=='Venezuela (Bolivarian Republic of)') d[0] = 'Venezuela';
    countryArray.push(d[0])
    var valueArray = d[1].reverse();
    valueArray.forEach(function(val) {
      dateSet.add(val['#date+reported']);
      var value = val['#affected+infected'];
      countryArray.push(value)
    });
    timeseriesArray.push(countryArray);
  });

  var dateArray = ['x'];
  dateSet.forEach(function(d) {
    var date = new Date(d);
    var startDate = new Date(2020,2,1);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    
    //start chart at march 1
    if (utcDate>=startDate) {
      dateArray.push(utcDate);
    }
  });

  timeseriesArray.unshift(dateArray);
  return timeseriesArray;
}

function createTimeSeries(array, div) {
  var chartWidth = 336;
  var chartHeight = 240;
  var colorArray = ['#999'];

  //filter HRP countries for country timeseries
  var hrpList = [];
  hrpData.forEach(function(d) {
    hrpList.push(d['#country+name']);
  });
  var hrpArray = array.filter((row) => hrpList.includes(row[0]));
  hrpArray.unshift(array[0]);
  array = hrpArray;

  //get date values for x axis labels
  var dateSet = new Set();
  array[0].forEach(function(d, i) {
    if (i>0 && d.getDate()==1) {
      dateSet.add(d);
    }
  });
  var dateArray = [...dateSet];

	var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 35,
      right: 30
    },
    bindto: div,
    title: {
  		text: 'Number of Confirmed Cases Over Time',
  		position: 'upper-left',
		},
		data: {
			x: 'x',
			columns: array,
      type: 'spline'
		},
    color: {
      pattern: colorArray
    },
    spline: {
      interpolation: {
        type: 'basis'
      }
    },
    point: { show: false },
		axis: {
			x: {
				type: 'timeseries',
				tick: {
          outer: false,
          values: dateArray,
          format: function(d, i) {
            var date = chartDateFormat(d);
            date = (d.getMonth()%3==0) ? date : '';
            return date;
          }
				}
			},
			y: {
        //type: 'log',
				min: 0,
				padding: { top:0, bottom:0 },
        tick: { 
          outer: false,
          format: shortenNumFormat
        }
			}
		},
    legend: {
      show: false,
      position: 'inset',
      inset: {
        anchor: 'top-left',
        x: 10,
        y: 0,
        step: 8
      }
    },
		tooltip: { grouped: false },
    transition: { duration: 300 }
	});

  createTimeseriesLegend(chart);
  countryTimeseriesChart = chart;
  createSource($('.cases-timeseries'), '#affected+infected');
}

function createTimeSeries2(array, div) {
  var chartWidth = 336;
  var chartHeight = 240;
  var colorArray = ['#999'];

  let dateArr = ['x'];
  let refugeeArr = ['Ukraine'];
    for (let val of array) {
    let d = moment(val['#affected+date+refugees'], ['YYYY-MM-DD']);
    let date = new Date(d.year(), d.month(), d.date());
    dateArr.push(date);
    refugeeArr.push(val['#affected+refugees']);
  }
  let data = [dateArr, refugeeArr];

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 35,
      right: 30
    },
    bindto: div,
    title: {
      text: 'Refugee Arrivals from Ukraine Over Time',
      position: 'upper-left',
    },
    data: {
      x: 'x',
      columns: data,
      type: 'spline'
    },
    color: {
      pattern: colorArray
    },
    spline: {
      interpolation: {
        type: 'basis'
      }
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
        padding: { top: 0, bottom: 0 },
        tick: { 
          outer: false,
          format: shortenNumFormat
        }
      }
    },
    legend: {
      show: false
    },
    transition: { duration: 300 },
    tooltip: {
      grouped: false,
      format: {
        title: function (d) { 
          let date = new Date(d);
          return moment(d).format('M/D/YY');
        },
        value: function (value, ratio, id) {
          return numFormat(value);
        }
      }
    }
  });

  // createTimeseriesLegend(chart);
  countryTimeseriesChart = chart;
  createSource($('.refugees-timeseries'), '#affected+refugees');
}


function createTimeseriesLegend(chart, country) {
  var element = $(chart.element).attr('class');
  var names = [];
  chart.data.shown().forEach(function(d) {
    if (d.id==country || country==undefined)
      names.push(d.id)
  });

  //custom legend
  d3.select(chart.element).insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      var color = '#007CE1';
      d3.select(this).select('span').style('background-color', color);
    })
}

function updateTimeseries(selected) {
  var maxValue = d3.max(countryTimeseriesChart.data(selected)[0].values, function(d) { return +d.value; });
  if (selected=='Venezuela (Bolivarian Republic of)') selected = 'Venezuela';

  countryTimeseriesChart.axis.max(maxValue*1.6);
  countryTimeseriesChart.focus(selected);
  $('.country-timeseries-chart .c3-chart-lines .c3-line').css('stroke', '#999');
  $('.country-timeseries-chart .c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');
  $('.refugees-timeseries').show();

  $('.country-timeseries-chart .timeseries-legend').remove();
  createTimeseriesLegend(countryTimeseriesChart, selected);
}


/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div, size) {
  var width = (div.indexOf('secondary')>-1) ? $(div).width() - 130 : $(div).width() - 6;
  var height = (size=='large') ? 25 : 15;
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

/*****************************/
/*** COVID TREND BAR CHART ***/
/*****************************/
function createTrendBarChart(data, div) {
  var total = data.length;
  var barMargin = 1;
  var barWidth = ($(div).width() - 130) / total - barMargin;
  var width = (barWidth+barMargin) * data.length;
  var height = 20;
  var parseDate = d3.timeParse("%Y-%m-%d");

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });
  var min = d3.min(data, function(d) { return d.value; });
  var max = d3.max(data, function(d) { return d.value; });

  var x = d3.scaleTime()
    .domain([data[0].date, data[total-1].date])
    .range([0, width]);

  // set the ranges
  var y = d3.scaleLinear()
    .domain(d3.extent(data, function(d) { return d.value; }))
    .range([height, 0]);

  var svg = d3.select(div)
    .append('svg')
    .attr('width', width+barWidth)
    .attr('height', height)
    .append('g')
      .attr('x', 0)
      .attr('transform', 'translate(0,0)');

  // append bars
  var bars = svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(d) {
      return x(d.date);
    })
    .attr('y', function(d, i) { 
      return (d.value>0) ? y(d.value) : y(0);
    })
    .attr('fill', function(d) {
      return (d.value>0) ? '#F2645B' : '#BFBFBF';
    })
    .attr('height', function(d) { return Math.abs(y(d.value) - y(0)); })
    .attr('width', barWidth);
}


/*************************/
/*** RANKING BAR CHART ***/
/*************************/
var rankingX, rankingY, rankingBars, rankingData, rankingBarHeight, valueFormat;
function createRankingChart() {
  //reset
  $('.ranking-container').removeClass('covid ranking-vaccine ranking-vaccine-financing ranking-inform');

  //set title
  var rankingTitle = $('.menu-indicators').find('.selected').attr('data-legend') + ' by Country';
  if (currentIndicator.id=='#impact+type') rankingTitle = 'Total duration of full and partial school closures (in weeks)';
  if (currentIndicator.id=='#severity+inform+type') rankingTitle = 'INFORM Severity Index Trend (last 3 months) by Country';
  $('.secondary-panel .ranking-title').text(rankingTitle);

  var indicator;
  switch(currentIndicator.id) {
    case '#severity+inform+type':
      indicator = '#severity+inform+num';
      break;
    case '#targeted+doses+delivered+pct':
      indicator = '#capacity+doses+delivered+total';
      break;
    case '#impact+type':
      indicator = '#impact+full_partial+weeks';
      break;
    case '#immunization-campaigns':
      indicator = '#vaccination+postponed+num';
      break;
    case '#food-prices':
      indicator = '#indicator+foodbasket+change+pct';
      break;
    default:
      indicator = currentIndicator.id;
  }

  //switch ranking dropdown based on layer
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.ranking-container').addClass('covid');
    $('.ranking-select').val('#affected+infected+new+per100000+weekly');
  }
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    $('.ranking-container').addClass('ranking-vaccine');
    $('.ranking-select').val(indicator);
  }
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    $('.ranking-chart').append('<p>Sort by:</p>');
  }
  else if (currentIndicator.id=='#value+financing+approved') {
    $('.ranking-container').addClass('ranking-vaccine-financing');
    $('.ranking-select').val(indicator);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
    $('.ranking-container').addClass('ranking-inform');
    $('.ranking-select').val(indicator);
  }
  else {
    $('.ranking-select').val('descending');
  }

  //format data
  rankingData = formatRankingData(indicator, d3.select('#vaccineSortingSelect').node().value);

  var valueMax = d3.max(rankingData, function(d) { return +d.value; });
  valueFormat = d3.format(',.0f');
  if (indicator.indexOf('funding')>-1 || indicator.indexOf('gdp')>-1) {
    valueFormat = formatValue;
    rankingData.reverse();
    $('.ranking-select').val('ascending');
  }
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
      return valueFormat(d.value);
    });
}

function formatRankingData(indicator, sorter) {
  var isCovaxLayer = (indicator.indexOf('#capacity+doses')>-1) ? true : false;
  if (isCovaxLayer) {
    if (sorter==undefined) sorter = '#country+name';
    if (sorter=='#country+name') {
      var rankingByCountry = d3.nest()
        .key(function(d) {
          if (regionMatch(d['#region+name'])) return d[sorter]; 
        })
        .rollup(function(v) {
          if (regionMatch(v[0]['#region+name'])) return v[0][indicator];
        })
        .entries(nationalData);
    }
    else {
      //aggregate vax data by funder
      var funderObject = {};
      for (var i=0; i<nationalData.length; i++) {
        if (regionMatch(nationalData[i]['#region+name'])) {
          if (nationalData[i]['#meta+vaccine+funder']!=undefined && nationalData[i]['#capacity+vaccine+doses']!=undefined) {          
            var funders = nationalData[i]['#meta+vaccine+funder'].split('|');
            var doses = nationalData[i]['#capacity+vaccine+doses'].split('|');
            funders.forEach(function(funder, index) {
              funderObject[funder] = (funderObject[funder]==undefined) ? +doses[index] : funderObject[funder] + +doses[index];
            });
          }
        }
      }

      //format aggregated vax data for ranking chart
      var rankingByCountry = [];
      for (const [funder, doses] of Object.entries(funderObject)) {
        rankingByCountry.push({key: funder, value: doses});        
      }
    }
  }
  else if (currentIndicator.id == '#severity+inform+type') {
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
      .entries(nationalData);
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
        return valueFormat(d.value);
      });
  }
}

/**********************************/
/*** COMPARISON PANEL FUNCTIONS ***/
/**********************************/
var comparisonHeaders = [];
function createComparison(object) {
  var country = object[0];
  if (!comparisonList.includes(country['#country+name']) && comparisonList.length<5) {  
    var val = object[0][currentIndicator.id];
    var content = '';

    //COVID layer
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      if (val!='No Data') {
        comparisonHeaders = ['Comparison','Weekly # of New Cases per 100,000','Weekly # of New Cases','Weekly # of New Deaths','Weekly Trend','Daily Tests per 1000','Positive Test Rate', ''];
        var data = [
          country['#country+name'],
          d3.format('.1f')(country['#affected+infected+new+per100000+weekly']),
          numFormat(country['#affected+infected+new+weekly']),
          numFormat(country['#affected+killed+new+weekly']),
          percentFormat(country['#covid+trend+pct']),
          (country['#affected+tested+avg+per1000']==undefined) ? 'No Data' : parseFloat(country['#affected+tested+avg+per1000']).toFixed(2),
          (country['#affected+tested+positive+pct']==undefined) ? 'No Data' : percentFormat(country['#affected+tested+positive+pct'])
        ];

        $('.comparison-panel .message').hide();

        //add table headers
        if ($('.comparison-table').children().length<1) {
          content += '<thead>';
          comparisonHeaders.forEach(function(header, index) {
            content += '<td>' + header + '</td>';
          });
          content += '</thead>';

          //create all 5 empty slots
          for (var i=0;i<5;i++) {
            content += '<tr><td colspan="'+comparisonHeaders.length+'">–</td></tr>'
          }
          $('.comparison-table').append(content);
        }

        //fill in next table row
        addRow(data);
      }
    }    
  }

  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    //show comparison panel and close secondary panel    
    $('.comparison-panel').addClass('expand').show();
    toggleSecondaryPanel(null, 'close');
  }
}

function addRow(data) {
  var index = comparisonList.length;
  var row = $('.comparison-table tbody').children().eq(index);
  row.empty()
  data.forEach(function(d, index) {
    var content = '';
    if (index==0)
       content = '<td title="'+ d +'">'+ d + '</td>';
    else
      content = '<td>'+ d + '</td>';
    row.append(content);
  });
  row.append('<td><div class="row-close-btn"><i class="humanitarianicons-Exit-Cancel"></i></div></td>');
  
  comparisonList.push(data[0])

  //close button event handler
  $('.row-close-btn').unbind().on('click', removeRow);
}

function removeRow(e) {
  var row = $(e.currentTarget).parent().parent()[0];
  var index = $(row).index();
  comparisonList.splice(index, 1);
  $(row).remove();

  //replace with empty row
  var emptyRow = '<tr><td colspan="'+comparisonHeaders.length+'">–</td></tr>';
  $('.comparison-table').append(emptyRow);
}

function resetComparison() {
  $('.comparison-panel').removeClass('expand').hide();
  $('.comparison-panel .message').show();
  $('.comparison-table').empty();
  comparisonList = [];
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
  ga('send', 'event', eventCategory, eventAction, eventLabel, {
    'dimension2': type,
    hitCallback: function() {
      console.log('Finishing sending click event to GA')
    }
  });
}

function getMonth(m) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[m];
}

function compare(a, b) {
  const keyA = a.key.toLowerCase();
  const keyB = b.key.toLowerCase();

  let comparison = 0;
  if (keyA > keyB) {
    comparison = 1;
  } else if (keyA < keyB) {
    comparison = -1;
  }
  return comparison;
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 0.9, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", + lineHeight + "em").text(word);
      }
    }
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

function regionMatch(region) {
  var match = false;
  var regions = region.split('|');
  for (var region of regions) {
    if (currentRegion=='' || region==currentRegion) {
      match = true;
      break;
    }
  }
  return match;
}

function hasGamData(data, indicator) {
  var hasGAM = false;
  if (indicator=='cases')
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined) ? true : false;
  else if (indicator=='deaths')
    hasGAM = (data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  else
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined || data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  return hasGAM;
}

function getGamText(data, indicator) {
  var gmText = '**Gender-Age Marker:<br>';
  for (var i=0;i<5;i++) {
    var pct = (data['#value+'+ indicator + '+funding+gm'+ i +'+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+funding+gm'+ i +'+total+usd'] / data['#value+'+ indicator + '+funding+total+usd']) : '0%';
    gmText += '['+i+']: ' + pct;
    gmText += ', ';
  }
  gmText += '[NA]: ';
  gmText += (data['#value+'+ indicator + '+funding+gmempty+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+funding+gmempty+total+usd'] / data['#value+'+ indicator +'+funding+total+usd']) : '0%';
  return gmText;
}

function getBeneficiaryText(data) {
  var beneficiaryText = 'Beneficiary breakdown:<br>';
  beneficiaryText += (data['#affected+cbpf+funding+men']!=undefined) ? percentFormat(data['#affected+cbpf+funding+men'] / data['#affected+cbpf+funding+total']) + ' Male, ' : '0% Male, ';
  beneficiaryText += (data['#affected+cbpf+funding+women']!=undefined) ? percentFormat(data['#affected+cbpf+funding+women'] / data['#affected+cbpf+funding+total']) + ' Female, ' : '0% Female, ';
  beneficiaryText += (data['#affected+boys+cbpf+funding']!=undefined) ? percentFormat(data['#affected+boys+cbpf+funding'] / data['#affected+cbpf+funding+total']) + ' Boys, ' : '0% Boys, ';
  beneficiaryText += (data['#affected+cbpf+funding+girls']!=undefined) ? percentFormat(data['#affected+cbpf+funding+girls'] / data['#affected+cbpf+funding+total']) + ' Girls' : '0% Girls';
  return beneficiaryText;
}

function createFootnote(target, indicator, text) {
  var indicatorName = (indicator==undefined) ? '' : indicator;
  var className = (indicatorName=='') ? 'footnote' : 'footnote footnote-indicator';
  var footnote = $('<p class="'+ className +'" data-indicator="'+ indicatorName +'">'+ truncateString(text, 65) +' <a href="#" class="expand">MORE</a></p>');
  $(target).append(footnote);
  footnote.click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(truncateString(text, 65) + ' <a href="#" class="expand">MORE</a>');
    }
    else {
      $(this).html(text + ' <a href="#" class="collapse">LESS</a>');
    }
  });
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

//25 HRP country codes and raster ids
const countryCodeList = {
  AFG: '8oeer8pw',
  BDI: '85uxb0dw',
  BFA: '489tayev',
  CAF: '6stu6e7d',
  CMR: '6v09q3l9',
  COD: '70s1gowk',
  COL: 'awxirkoh',
  ETH: '8l382re2',
  GTM: '3cyria8u',
  HND: '8kvvnawe',
  HTI: '4in4ae66',
  IRQ: '079oa80i',
  LBY: '0o4l8ysb',
  MLI: '17y8a20i',
  MMR: '7wk9p4wu',
  MOZ: '5jojox7h',
  NER: '9gbs4a2a',
  NGA: '3ceksugh',
  //PAK: '94y0veay',
  PSE: '1emy37d7',
  SDN: 'a2zw3leb',
  SOM: '3s7xeitz',
  SSD: '3556pb27',
  SLV: '77ydes06',
  SYR: '2qt39dhl',
  TCD: 'd6tya3am',
  UKR: '8lye0x4r',//'adkwa0bw',
  VEN: '9vcajdlr',
  YEM: '3m20d1v8',
  //ZWE: '1ry8x8ul'
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
	if (indicator=='#event+year+todate+num') indicator = '#access-data';
	createSource(secondaryPanelSource, indicator);

	//set global stats
	var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	var globalFigures = '<b>Global COVID-19 Figures:</b><br>'+ d3.format('.3s')(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths';
	
	//show global vax stat only on covax layer
	if (currentIndicator.id=='#targeted+doses+delivered+pct' && worldData['#capacity+doses+administered+total']!=undefined) {
		var totalAdministeredVal = d3.format('.3s')(worldData['#capacity+doses+administered+total']).replace(/G/,"B");
		globalFigures += '<br><br><b>Global vaccines administered: '+ totalAdministeredVal +'</b>';
	}
	
	//print global stats
	secondaryPanel.find('.global-figures').html(globalFigures);

	//if on covax layer, show HRP data by default
	currentRegion = (currentIndicator.id=='#targeted+doses+delivered+pct' && (currentRegion=='' || currentRegion=='HRPs')) ? 'HRPs' : d3.select('.region-select').node().value;

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
	nationalData.forEach(function(d) {
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
	//vaccine rollout
	else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'COVAX Allocations Round 4 – 9 (Number of Doses)', '', data['#capacity+doses+forecast+covax']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+forecast+covax']));
		var covaxDelivered = data['#capacity+doses+delivered+covax'];
		covaxDelivered = (covaxDelivered > 0) ? shortenNumFormat(covaxDelivered) : covaxDelivered;
		createKeyFigure('.figures', 'COVAX Delivered (Number of Doses)', '', covaxDelivered);
		createKeyFigure('.figures', 'Other Delivered (Number of Doses)', '', data['#capacity+doses+delivered+others']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+delivered+others']));
		createKeyFigure('.figures', 'Total Delivered (Number of Doses)', '', data['#capacity+doses+delivered+total']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+delivered+total']));
		createKeyFigure('.figures', 'Total Administered (Number of Doses)', '', data['#capacity+doses+administered+total']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+administered+total']));
	} 
	//IPC
	else if (currentIndicator.id=='#affected+food+p3plus+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var ipcTotal = (data['#affected+food+ipc+p3plus+num']==undefined) ? 0 : d3.format('.3s')(data['#affected+food+ipc+p3plus+num']);
		createKeyFigure('.figures', 'Total number of people in IPC 3+', '', ipcTotal);
	}
	//SAM
	else if (currentIndicator.id=='#affected+children+sam') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var samTotal = (data[indicator]==undefined) ? 0 : d3.format('.3s')(data[indicator]);
		createKeyFigure('.figures', 'Number of Admissions', '', samTotal);
	}
	//access severity
	else if (currentIndicator.id=='#event+year+todate+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#event+year+todate+num']!=undefined) createKeyFigure('.figures', 'Total Violent Security Incidents Against Aid Workers since Jan 2020', '', data['#event+year+todate+num']);
		if (data['#access+visas+pct']!=undefined) createKeyFigure('.figures', 'Average of Visas Pending or Denied', '', percentFormat(data['#access+visas+pct']));
		if (data['#access+travel+pct']!=undefined) createKeyFigure('.figures', 'Average of Travel Authorizations Denied', '', percentFormat(data['#access+travel+pct']));
		if (data['#activity+cerf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CERF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cerf+project+insecurity+pct']));
		if (data['#activity+cbpf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CBPF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cbpf+project+insecurity+pct']));
	}
	//school closures
	else if (currentIndicator.id=='#impact+type') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var affectedLearners = (data['#affected+learners']==undefined) ? 0 : d3.format('.3s')(data['#affected+learners']);
		var affectedLearnersPct = (data['#affected+learners+pct']==undefined) ? '0%' : percentFormat(data['#affected+learners+pct']);
		var statusClosed = (data['#status+country+closed']==undefined) ? 0 : data['#status+country+closed'];
		createKeyFigure('.figures', 'Number of Affected Learners', '', affectedLearners);
		createKeyFigure('.figures', 'Percentage of Affected Learners in GHO countries', '', affectedLearnersPct);
		createKeyFigure('.figures', 'Number of Country-Wide Closures', '', statusClosed);
	} 
	//immunizations
	else if (currentIndicator.id=='#vaccination+postponed+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var postponedNum = (data[indicator]==undefined) ? 0 : data[indicator];
		createKeyFigure('.figures', 'Total number of immunization campaigns postponed due to COVID', '', postponedNum);
	}
	//vaccine financing
	else if (currentIndicator.id=='#value+financing+approved') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Approved Funding (World Bank and GAVI)', '', formatValue(data['#value+financing+approved']));
		createKeyFigure('.figures', 'GAVI CDS (Early Access / Approved)', '', formatValue(data['#value+financing+gavi+earlyaccess+approved']));
		createKeyFigure('.figures', 'GAVI CDS (Needs Based / Approved)', '', formatValue(data['#value+financing+gavi+needs+approved']));
		createKeyFigure('.figures', 'GAVI CDS (Early Access / Disbursed)', '', formatValue(data['#value+financing+gavi+earlyaccess+disbursed']));
		createKeyFigure('.figures', 'GAVI CDS (Needs Based / Disbursed)', '', formatValue(data['#value+financing+gavi+needs+disbursed']));
		createKeyFigure('.figures', 'World Bank (Approved)', '', formatValue(data['#value+financing+worldbank+approved']));
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		var numCountries = 0;
		nationalData.forEach(function(d) {
			if (regionMatch(d['#region+name'])) {
				numCountries++;
			}
		});
		createKeyFigure('.figures', 'Number of Countries', '', numCountries);
		createKeyFigure('.figures', 'Total Funding Required (GHO 2022)', '', formatValue(data['#value+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'Total Funding Level', '', percentFormat(data['#value+funding+hrp+pct']));
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+funding+total+usd') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#value+cerf+contributions+total+usd']!=undefined) createKeyFigure('.figures', 'Total Contribution', '', formatValue(data['#value+cerf+contributions+total+usd']));
		createKeyFigure('.figures', 'Total CERF Funding 2022', 'total-funding', formatValue(data['#value+cerf+funding+total+usd']));
		if (data['#value+cerf+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cerf');
			$('.figures .key-figure .inner .total-funding').append('<div class="small">'+ gmText +'</div>');
		}
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+funding+total+usd') {
		//num countries
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#value+cbpf+contributions+total+usd']!=undefined) createKeyFigure('.figures', 'Total Contribution', '', formatValue(data['#value+cbpf+contributions+total+usd']));
		createKeyFigure('.figures', 'Total CBPF Funding 2022', 'total-funding', formatValue(data['#value+cbpf+funding+total+usd']));
		
		//gam
		if (data['#value+cbpf+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cbpf');
			$('.figures .key-figure .inner .total-funding').append('<div class="small">'+ gmText +'</div>');
		}

		//beneficieries
		if (data['#affected+cbpf+funding+total'] > 0) {
			var beneficiaryText = getBeneficiaryText(data);
			$('.figures .key-figure .inner').append('<div class="small">'+ beneficiaryText +'</div>');
		}

	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Funding', '', formatValue(data['#value+ifi+total']));
	}
	//covid figures
	else if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));

		var covidGlobal = (currentRegion!='') ? covidTrendData[currentRegion] : covidTrendData.GHO;
		var weeklyCases = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+weekly'] : 0;
		var weeklyDeaths = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+killed+new+weekly'] : 0;
		var weeklyTrend = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+pct+weekly']*100 : 0;
		
		if (covidGlobal!=undefined) {
			//weekly new cases
			createKeyFigure('.figures', 'Weekly Number of New Cases', 'weekly-cases', shortenNumFormat(weeklyCases));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      	var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
	     	sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-cases');

			//weekly new deaths
			createKeyFigure('.figures', 'Weekly Number of New Deaths', 'weekly-deaths', shortenNumFormat(weeklyDeaths));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
	      sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-deaths');

			//weekly trend
			createKeyFigure('.figures', 'Weekly Trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
	    var pctArray = [];
	    covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']*100};
	      pctArray.push(obj);
	    });
			createSparkline(pctArray, '.secondary-panel .cases-trend');
	    //createTrendBarChart(pctArray, '.secondary-panel .cases-trend');
		}
	}
	else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
		//num countries
		createKeyFigure('.figures', 'Number of Countries with Sex-disaggregated data', '', totalCountries);

		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));
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
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
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


var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = 'polbnda_int_uncs-6zgtye';
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/cl0cqcpm4002014utgdbhcn4q',
    center: [-25, 0],
    minZoom: 3,
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
  $('#global-map, .country-select, .map-legend, .tab-menubar').css('opacity', 1);

  //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
    $('.tab-menubar, #chart-view, .comparison-panel').css('left', $('.secondary-panel').outerWidth());
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
      // case 'adm0-fills':
      //   globalLayer = layer.id;

      //   map.setFeatureState(
      //     { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
      //     { hover: false }
      //   );
      //   break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        map.setLayoutProperty(globalLabelLayer, 'visibility', 'none');
        break;
      case 'adm0-centroids':
        globalMarkerLayer = layer.id;
        map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-fills':
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
        break;
      case 'adm1-label':
        countryLabelLayer = layer.id;
        map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        map.setLayoutProperty(countryMarkerLayer, 'visibility', 'none');
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
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

  //country select event
  // d3.select('.country-select').on('change',function(e) {
  //   var selected = d3.select('.country-select').node().value;
  //   if (selected=='') {
  //     resetMap();
  //   }
  //   else {        
  //     currentCountry.code = selected;
  //     currentCountry.name = d3.select('.country-select option:checked').text();

  //     //find matched features and zoom to country
  //     var selectedFeatures = matchMapFeatures(currentCountry.code);
  //     selectCountry(selectedFeatures);
  //   }
  // });

  //init global and country layers
  //initGlobalLayer();
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
  //var location = window.location.search;
  //deep link to country view
  //if (location.indexOf('?c=')>-1) {
    var countryCode = 'UKR';//location.split('c=')[1].toUpperCase();
    if (countryCodeList.hasOwnProperty(countryCode)) {    
    //   $('.country-select').val(countryCode);
      currentCountry.code = countryCode;
      currentCountry.name = 'Ukraine';//d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
  //}
  //deep link to specific layer in global view
  // if (location.indexOf('?layer=')>-1) {
  //   var layer = location.split('layer=')[1];
  //   var menuItem = $('.menu-indicators').find('li[data-layer="'+layer+'"]');
  //   menuItem = (menuItem.length<1) ? $('.menu-indicators').find('li[data-layer="covid-19_cases_and_deaths"]') : menuItem;
  //   selectLayer(menuItem);

  //   //show/hide comparison table
  //   if (layer=='covid-19_cases_and_deaths' || layer=='')
  //     $('.comparison-panel').show();
  //   else 
  //     $('.comparison-panel').hide();
  // }
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
  //menu events
  // $('.menu-indicators li').on('click', function() {
  //   selectLayer(this);

  //   //reset any deep links
  //   var layer = $(this).attr('data-layer');
  //   var location = (layer==undefined) ? window.location.pathname : window.location.pathname+'?layer='+layer;
  //   window.history.replaceState(null, null, location);

  //   //handle comparison list
  //   if (currentIndicator.id=='#affected+infected+new+per100000+weekly') $('.comparison-panel').show();
  //   else resetComparison();
  // });

  // //global figures close button
  // $('.secondary-panel .close-btn').on('click', function() {
  //   var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
  //   toggleSecondaryPanel(currentBtn);
  // });

  // //comparison panel close button
  // $('.comparison-panel .panel-close-btn').on('click', function() {
  //   $('.comparison-panel').hide();
  // });

  // //ranking select event
  // d3.selectAll('.ranking-select').on('change',function(e) {
  //   var selected = d3.select(this).node().value;
  //   if (selected!='') {  
  //     //show/hide vaccine sort select if Total Delivered is selected
  //     if (selected=='#capacity+doses+delivered+total') {
  //       $('.vaccine-sorting-container').show();
  //       updateRankingChart(selected, d3.select('#vaccineSortingSelect').node().value);
  //     }
  //     else {
  //       $('.vaccine-sorting-container').hide();
  //       updateRankingChart(selected);
  //     }
  //   }
  // });

  // //rank sorting select event (only on COVAX layer)
  // d3.selectAll('.sorting-select').on('change',function(e) {
  //   var selected = d3.select(this).node().value;
  //   if (selected!='') {
  //     updateRankingChart(d3.select('#vaccineRankingSelect').node().value, selected);
  //   }
  // });

  // //chart view trendseries select event
  // d3.select('.trendseries-select').on('change',function(e) {
  //   var selected = d3.select('.trendseries-select').node().value;
  //   updateTrendseries(selected);
  // });

  // //region select event
  // d3.select('.region-select').on('change',function(e) {
  //   currentRegion = d3.select('.region-select').node().value;
  //   if (currentRegion=='') {
  //     resetMap();
  //   }
  //   else {        
  //     selectRegion();
  //   }
  // });

  // //country select event
  // d3.select('.country-select').on('change',function(e) {
  //   var selected = d3.select('.country-select').node().value;
  //   if (selected=='') {
  //     resetMap();
  //   }
  //   else {        
  //     currentCountry.code = selected;
  //     currentCountry.name = d3.select('.country-select option:checked').text();

  //     //find matched features and zoom to country
  //     var selectedFeatures = matchMapFeatures(currentCountry.code);
  //     selectCountry(selectedFeatures);
  //   }
  // });
  
  // //back to global event
  // $('.backtoGlobal').on('click', function() {
  //   resetMap();
  //   window.history.replaceState(null, null, window.location.pathname);
  // });

  //country panel indicator select event
  // d3.select('.indicator-select').on('change',function(e) {
  //   var selected = d3.select('.indicator-select').node().value;
  //   if (selected!='') {
  //     var container = $('.panel-content');
  //     var section = $('.'+selected);
  //     container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop()}, 300);
  //   }
  // });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
    vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);
  });
}

//set global layer view
// function selectLayer(menuItem) {
//   $('.menu-indicators li').removeClass('selected');
//   $('.menu-indicators li div').removeClass('expand');
//   $(menuItem).addClass('selected');
//   if (currentIndicator.id==$(menuItem).attr('data-id')) {
//     toggleSecondaryPanel(menuItem);
//   }
//   else {
//     currentIndicator = {id: $(menuItem).attr('data-id'), name: $(menuItem).attr('data-legend'), title: $(menuItem).text()};
//     toggleSecondaryPanel(menuItem, 'open');

//     //set food prices view
//     if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
//       closeModal();
//     }
//     //reset vaccine sorting select
//     if (currentIndicator.id!='#targeted+doses+delivered+pct') {
//       $('.vaccine-sorting-container').show();
//     }

//     vizTrack('wrl', $(menuItem).find('div').text());
//     updateGlobalLayer();
//   }

//   //handle tab views
//   if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
//     $('.content').addClass('tab-view');
//     $('.tab-menubar').show();
//   }
//   else {
//     $('.content').removeClass('tab-view');
//     $('.tab-menubar').hide();
//     $('#chart-view').hide();
//   }
// }


// function toggleSecondaryPanel(currentBtn, state) {
//   var width = $('.secondary-panel').outerWidth();
//   var pos = $('.secondary-panel').position().left;
//   var newPos = (pos<0) ? 0 : -width;
//   if (state=='open') { newPos = 0; }
//   if (state=='close') { newPos = -width; }
//   var newTabPos = (newPos==0) ? width : 0;
  
//   $('.secondary-panel').animate({
//     left: newPos
//   }, 200, function() {
//     var div = $(currentBtn).find('div');
//     if ($('.secondary-panel').position().left==0) {
//       div.addClass('expand');
//     }
//     else {
//       div.removeClass('expand');
//     }
//   });

//   $('.tab-menubar, #chart-view, .comparison-panel').animate({
//     left: newTabPos
//   }, 200);
// }


// function selectRegion() {
//   console.log('selectRegion')
//   var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
//   var offset = 50;
//   map.fitBounds(regionFeature[0].bbox, {
//     padding: {top: offset, right: $('.map-legend').outerWidth()+offset, bottom: offset, left: $('.secondary-panel').outerWidth()+offset},
//     linear: true
//   });

//   vizTrack(currentRegion, currentIndicator.name);
//   updateGlobalLayer();
// }

function selectCountry(features) {
  //set first country indicator
  $('#population').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);
  $('.indicator-select').val('');

  updateCountryLayer();
  // map.setLayoutProperty(globalLayer, 'visibility', 'none');
  // map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  var target = bbox.default(turfHelpers.featureCollection(features));
  var offset = 50;
  map.fitBounds(regionBoundaryData[0].bbox, {
    offset: [ 0, -25],
    padding: {right: $('.map-legend.country').outerWidth()+offset, bottom: offset, left: ($('.country-panel').outerWidth() - $('.content-left').outerWidth()) - offset},
    linear: true
  });

  map.once('moveend', initCountryView);
  //vizTrack(`main ${currentCountry.code} view`, currentCountryIndicator.name);

  //append country code to url
  //window.history.replaceState(null, null, '?c='+currentCountry.code);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function handleGlobalEvents(layer) {
  map.on('mouseenter', globalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#indicator+foodbasket+change+pct') {
      var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
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
     
  map.on('mouseleave', globalLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  map.on('click', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
    var target;
    features.forEach(function(feature) {
      if (feature.sourceLayer==adm0SourceLayer)
        target = feature;
    });
    if (target!=null) {
      currentCountry.code = target.properties.ISO_3;
      currentCountry.name = (target.properties.Terr_Name=='CuraÃ§ao') ? 'Curaçao' : target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        var country = nationalData.filter(c => c['#country+code'] == currentCountry.code);

        createComparison(country)
     
        if (currentIndicator.id=='#indicator+foodbasket+change+pct' && country[0]['#indicator+foodbasket+change+pct']!=undefined) {
          openModal(currentCountry.code, currentCountry.name);
        }
      }
    }
  });
}


function initGlobalLayer() {
  //create log scale for circle markers
  var maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
  markerScale = d3.scaleSqrt()
    .domain([1, maxCases])
    .range([2, 15]);
  
  //color scale
  colorScale = getGlobalLegendScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val==null) ? colorNoData : colorScale(val);
    expression.push(d['#country+code'], color);

    //covid markers
    var covidVal = d['#affected+infected'];
    var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
    expressionMarkers.push(d['#country+code'], size);
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);
  
  //set properties
  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setPaintProperty(globalMarkerLayer, 'circle-stroke-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  map.setPaintProperty(globalMarkerLayer, 'circle-translate', [0,-7]);

  //define mouse events
  handleGlobalEvents();

  //global figures
  setKeyFigures();
}


function updateGlobalLayer() {
  setKeyFigures();

  //color scales
  colorScale = getGlobalLegendScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct' || currentIndicator.id=='#value+funding+hrp+pct') ? '#E7E4E6' : '#FFF';

  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  //data join
  var countryList = [];
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#affected+infected+new+weekly') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
        if (val<0) val = 0; //hotfix for negative values
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
        if (isVal(val)) {
          color = (val==0) ? '#DDD' : colorScale(val);
        }
        else {
          color = colorNoData;
        }
      }
      else {
        color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
      }
      expression.push(d['#country+code'], color);

      //covid markers
      var covidVal = d['#affected+infected'];
      var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
      expressionMarkers.push(d['#country+code'], size);

      //create country list for global timeseries chart
      countryList.push(d['#country+name']);
    }
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  setGlobalLegend(colorScale);
}

function getGlobalLegendScale() {
  //get min/max
  var min = d3.min(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id]; 
  });
  var max = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id];
  });

  if (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) max = 1;
  
  if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') max = 0;
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') max = 0.2;
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
    var data = [];
    nationalData.forEach(function(d) {
      if (d[currentIndicator.id]!=null && regionMatch(d['#region+name']))
        data.push(d[currentIndicator.id]);
    })
    if (data.length==1)
      scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
    else
      scale = d3.scaleQuantile().domain(data).range(colorRange);
  }
  else if (currentIndicator.id=='#vaccination+postponed+num') {
    //set the max to at least 5
    max = (max>5) ? max : 5;
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#indicator+foodbasket+change+pct') {
    scale = d3.scaleQuantize().domain([min, max]).range(colorRange);
  }
  else if (currentIndicator.id=='#impact+type') {
    scale = d3.scaleOrdinal().domain(['Fully open', 'Partially open', 'Closed due to COVID-19', 'Academic break']).range(schoolClosureColorRange);
  }
  else if (currentIndicator.id=='#severity+stringency+num') {
    scale = d3.scaleQuantize().domain([0, 100]).range(oxfordColorRange);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id.indexOf('funding')>-1 || currentIndicator.id.indexOf('financing')>-1) {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, max]).range(reverseRange);
  }
  else if (currentIndicator.id=='#value+gdp+ifi+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleThreshold()
      .domain([ .01, .02, .03, .05, .05 ])
      .range(reverseRange);
  }
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleThreshold()
      .domain([ 0.03, 0.05, 0.1, 0.15 ])
      .range(colorRange);
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

    //covid positive testing footnote
    createFootnote('.map-legend.global', '#affected+infected+new+per100000+weekly', 'Positive Testing Rate: This is the daily positive rate, given as a rolling 7-day average. According WHO, a positive rate of less than 5% is one indicator that the pandemic may be under control in a country.');
    //vaccine footnote
    createFootnote('.map-legend.global', '#targeted+doses+delivered+pct', 'Note: Data refers to doses delivered to country not administered to people. Only countries with a Humanitarian Response Plan are included');
    //pin footnote
    createFootnote('.map-legend.global', '#affected+inneed+pct', 'The Total Number of People in Need figure corresponds to 28 HRPs, 7 Regional Appeals, Madagascar\'s Flash Appeal and Lebanon\'s ERP. Population percentages greater than 100% include refugees, migrants, and/or asylum seekers');
    //vacc footnote
    createFootnote('.map-legend.global', '#vaccination+postponed+num', 'Methodology: Information about interrupted immunization campaigns contains both official and unofficial information sources. The country ranking has been determined by calculating the ratio of total number of postponed campaigns and total immunization campaigns. Note: data collection is ongoing and may not reflect all the campaigns in every country.');
    //food prices footnote
    createFootnote('.map-legend.global', '#indicator+foodbasket+change+pct', 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.');
    //oxford footnote
    createFootnote('.map-legend.global', '#severity+stringency+num', 'Note: This is a composite measure based on nine response indicators including school closures, workplace closures, and travel bans, rescaled to a value from 0 to 100 (100 = strictest)');
    //CERF footnote
    createFootnote('.map-legend.global', '#value+cerf+funding+total+usd', 'The Total CERF Funding 2022 figure refers to the Global CERF Allocations, including some non-GHO locations which are not listed on this dashboard.');
    //CBPF footnote
    createFootnote('.map-legend.global', '#value+cbpf+funding+total+usd', 'The Total CBPF Funding 2022 figure refers to the Global CBPF Allocations, including some non-GHO locations which are not listed on this dashboard.');
    //access footnote
    // createFootnote('.map-legend.global', '#event+year+todate+num', '1. Access data is collected by OCHA and is based on information provided by humanitarian partners. 2. CERF and CBPF access data is collected by OCHA at country level and includes all projects affected by security incidents, access constraints or other bureaucratic impediments. 3. In order to ensure coherence and consistency in the analysis of security incidents, a single source of information has been used (AWSD). OCHA acknowledges that other sources of information are available at country level to complement the security analysis.');


    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 Cases</h4>');
    createSource($('.map-legend.global'), '#affected+infected');

    var markersvg = div.append('svg')
      .attr('height', '55px')
      .attr('class', 'casesScale');
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

    //gender disaggregation footnote
    // $('.map-legend.global').append('<h4><i class="humanitarianicons-User"></i> (On hover) COVID-19 Sex-Disaggregated Data Tracker</h4>');
    // createSource($('.map-legend.global'), '#affected+killed+m+pct');
    createFootnote('.map-legend.global', '#affected+infected+sex+new+avg+per100000', '*Distribution of COVID19 cases and deaths by gender are taken from Global Health 50/50 COVID-19 <a href="https://data.humdata.org/organization/global-health-50-50" target="_blank" rel="noopener">Sex-disaggregated Data Tracker</a>. Figures refer to the last date where sex-disaggregated data was available and in some cases the gender distribution may only refer to a portion of total cases or deaths. These proportions are intended to be used to understand the breakdown of cases and deaths by gender and not to monitor overall numbers per country. Definitions of COVID-19 cases and deaths recorded may vary by country.');

    //GAM footnote
    var gamText = '**Gender-Age Marker:<br>0- Does not systematically link programming actions<br>1- Unlikely to contribute to gender equality (no gender equality measure and no age consideration)<br>2- Unlikely to contribute to gender equality (no gender equality measure but includes age consideration)<br>3- Likely to contribute to gender equality, but without attention to age groups<br>4- Likely to contribute to gender equality, including across age groups';
    createFootnote('.map-legend.global', '#value+cerf+covid+funding+total+usd', gamText);
    createFootnote('.map-legend.global', '#value+cbpf+covid+funding+total+usd', gamText);

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

    var legend;
    if (currentIndicator.id=='#value+gdp+ifi+pct' || currentIndicator.id=='#targeted+doses+delivered+pct') {
      var legendFormat = d3.format('.0%');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale)
        .labels(d3.legendHelpers.thresholdLabels)
        //.useClass(true);
    }
    else {
      var legendFormat = (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) ? d3.format('.0%') : shortenNumFormat;
      if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') legendFormat = d3.format('.1f');
      if (currentIndicator.id=='#vaccination+postponed+num') legendFormat = numFormat;
      
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
  // var specialKey = $('.map-legend.global .special-key');
  // specialKey.hide();
  if (currentIndicator.id=='#affected+inneed+pct') {
    noDataKey.find('.label').text('Refugee/IDP data only');
    noDataKey.find('rect').css('fill', '#E7E4E6');

    createSource($('.map-legend.global .source-secondary'), '#affected+refugees');
    createSource($('.map-legend.global .source-secondary'), '#affected+displaced');
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    noDataKey.find('.label').text('Other response plans');
    noDataKey.find('rect').css('fill', '#E7E4E6');
  }
  else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
    noDataKey.find('.label').text('Not Included');
    noDataKey.find('rect').css('fill', '#F2F2EF');

    // specialKey.css('display', 'block');
    // specialKey.find('.label').text('Allocations');
    // specialKey.find('rect').css('fill', '#DDD');
  }
  else {
    noDataKey.find('.label').text('No Data');
    noDataKey.find('rect').css('fill', '#FFF');
  }

  //show/hide footnotes
  $('.footnote-indicator').hide();
  $('.footnote-indicator[data-indicator="'+ currentIndicator.id +'"]').show();

  //cases
  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  d3.select('.casesScale .cell:nth-child(2) .label').text(numFormat(maxCases));
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
  var clrRange = (currentCountryIndicator.id=='#population') ? populationColorRange : colorRange;
  var countryColorScale = (currentCountryIndicator.id=='#population') ? d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(clrRange) : d3.scaleQuantize().domain([0, 1]).range(clrRange);
  createCountryLegend(countryColorScale);


  //add border crossing markers
  map.loadImage('assets/marker-crossing.png', (error, image) => {
    if (error) throw error;
    map.addImage('crossing', image);
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
        'icon-image': 'crossing',
        'icon-size': 0.6,
        'icon-allow-overlap': true
      }
    });
  });

   //refugee count data
  let refugeeCounts = [];
  let maxCount = d3.max(nationalData, function(d) { return +d['#affected+refugees']; });
  let refugeeDotScale = d3.scaleSqrt()
    .domain([1, maxCount])
    .range([5, 45]);

  let countries = {'Slovakia': 'SVK', 'Hungary': 'HUN', 'Poland': 'POL', 'Romania': 'ROU', 'Belarus': 'BLR', 'Republic of Moldova': 'MDA', 'Russian Federation': 'RUS'};
  for (let val of refugeeCountData) {
    let code = countries[val.geomaster_name];
    let count = dataByCountry[code][0]['#affected+refugees'];
    refugeeCounts.push({
      'type': 'Feature',
      'properties': {
        'country': val.geomaster_name,
        'count': count,
        'iconSize': refugeeDotScale(count)
      },
      'geometry': { 
        'type': 'Point', 
        'coordinates': [ val.centroid_lon, val.centroid_lat ] 
      } 
    })
  }
  let refugeeCountGeoJson = {
    'type': 'FeatureCollection',
    'features': refugeeCounts
  };
  map.addSource('refugee-counts', {
    type: 'geojson',
    data: refugeeCountGeoJson,
    generateId: true 
  });

  //add refugee country labels
  map.addLayer({
    id: 'refugee-counts-labels',
    type: 'symbol',
    source: 'refugee-counts',
    layout: {
      'text-field': [
        'format',
        ['upcase', ['get', 'country']]
      ],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-allow-overlap': true
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#EEEEEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  });

  //add refugee dots
  map.addLayer({
    id: 'refugee-counts-dots',
    type: 'circle',
    source: 'refugee-counts',
    paint: {
      'circle-color': '#418FDE',
      'circle-opacity': 0.5,
      "circle-radius": ["get", "iconSize"]
    }
  });


  //add hostilty markers
  map.loadImage('assets/marker-hostility.png', (error, image) => {
    if (error) throw error;
    map.addImage('hostility', image);
    map.addSource('hostility-data', {
      type: 'geojson',
      data: 'data/hostilities.geojson',
      generateId: true 
    });
    map.addLayer({
      id: 'hostilities-layer',
      type: 'symbol',
      source: 'hostility-data',
      layout: {
        'icon-image': 'hostility',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 1.2, 6, 1.8],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'text-field': ["get", "NAME"],
        'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 0, 10, 4, 12],
        'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-radial-offset': 0.7
      },
      paint: {
        'text-color': '#000000',
        'text-halo-color': '#EEEEEE',
        'text-halo-width': 1,
        'text-halo-blur': 1,
      }
    });
  });


  //add town circles, capital icons, and textlabels
  map.addSource('town-data', {
    type: 'geojson',
    data: 'data/wrl_ukr_capp.geojson',
    generateId: true 
  });
  map.addLayer({
    id: 'town-dots',
    type: 'circle',
    source: 'town-data',
    filter: ['==', 'TYPE', 'ADMIN 1'],
    paint: {
      'circle-color': '#777777',
      'circle-radius': 3
    }
  });

  map.loadImage('assets/marker-capital.png', (error, image) => {
    if (error) throw error;
    map.addImage('capital', image);
    map.addLayer({
      id: 'capital-dots',
      type: 'symbol',
      source: 'town-data',
      filter: ['==', 'TYPE', 'TERRITORY'],
      layout: {
        'icon-image': 'capital',
        'icon-size': ['interpolate', ['linear'], ['zoom'], 0, 0.5, 4, 0.9],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    }, globalLabelLayer);
  });

  map.addLayer({
    id: 'town-labels',
    type: 'symbol',
    source: 'town-data',
    layout: {
      'text-field': ['get', 'CAPITAL'],
      'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 12, 4, 14],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': [
        'match',
        ['get', 'TYPE'],
        'TERRITORY',
        0.7,
        'ADMIN 1',
        0.4,
        0.5
      ]
    },
    paint: {
      'text-color': '#888888',
      'text-halo-color': '#EEEEEE',
      'text-halo-width': 1,
      'text-halo-blur': 1
    }
  }, globalLabelLayer);



  //mouse events
  map.on('mouseenter', countryLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });

  map.on('mousemove', countryLayer, function(e) {
    var f = map.queryRenderedFeatures(e.point)[0];
    if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_EN==currentCountry.name) {
      map.getCanvas().style.cursor = 'pointer';
      createCountryMapTooltip(f.properties.ADM1_EN, f.properties.ADM1_PCODE);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    }
    else {
      map.getCanvas().style.cursor = '';
      tooltip.remove();
    }
  });
     
  map.on('mouseleave', countryLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });


  //refugee dots mouse events
  map.on('mouseenter', 'refugee-counts-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });
  map.on('mousemove', 'refugee-counts-dots', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const content = `<h2>${e.features[0].properties.country}</h2>Refugees arrivals from Ukraine: <div class='stat'>${numFormat(e.features[0].properties.count)}</div>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseleave', 'refugee-counts-dots', function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  //border crossing mouse events
  map.on('mouseenter', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });
  map.on('mousemove', 'border-crossings-layer', function(e) {
    map.getCanvas().style.cursor = 'pointer';
    const content = `Border Crossing:<h2>${e.features[0].properties['Name - English']}</h2></div>`;
    tooltip.setHTML(content);
    tooltip
      .addTo(map)
      .setLngLat(e.lngLat);
  });
  map.on('mouseleave', 'border-crossings-layer', function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

}

function updateCountryLayer() {
  colorNoData = '#FFF';
  if (currentCountryIndicator.id=='#affected+food+ipc+p3plus+num') currentCountryIndicator.id = getIPCDataSource();
  $('.map-legend.country .legend-container').removeClass('no-data');

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num' || currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 10);

  //color scale
  var clrRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#vaccination+postponed+num':
      clrRange = immunizationColorRange;
      break;
    default:
      clrRange = colorRange;
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);


  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || !isVal(val) || isNaN(val)) ? colorNoData : countryColorScale(val);

      //turn off choropleth for population layer
      color = (currentCountryIndicator.id=='#population') ? colorDefault : color;

      layerOpacity = 1;
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

  //hide color scale if no data
  if (max!=undefined && max>0) {
    if (currentCountryIndicator.id=='#population') {
      $('.map-legend.country .legend-container').addClass('population');
      countryColorScale = d3.scaleOrdinal().domain(['<1', '1-2', '2-5', '5-10', '10-25', '25-50', '>50']).range(clrRange)
    }
    else {
      $('.map-legend.country .legend-container').removeClass('population');
    }
    updateCountryLegend(countryColorScale);
  }
  else {
    $('.map-legend.country .legend-container').addClass('no-data');
  }
}

function getIPCDataSource() {
  var source = '';
  subnationalDataByCountry.forEach(function(d) {
    if (d.key==currentCountry.code) {
      source = d['#ipc+source'];
    }
  });
  return source;
}

function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}

function createCountryLegend(scale) {
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .refugee-arrivals-source'), '#affected+refugees');
  createSource($('.map-legend.country .border-crossing-source'), '#geojson');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');

  let title = (currentCountryIndicator.id=='#population') ? 'Population Density (people per sq km)' : 'Number of Health Facilities';
  $('.legend-title').html(title);

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .scale(scale);

  var div = d3.select('.map-legend.country .legend-scale  ');
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  // //no data
  // var nodata = div.append('svg')
  //   .attr('class', 'no-data-key');

  // nodata.append('rect')
  //   .attr('width', 15)
  //   .attr('height', 15);

  // nodata.append('text')
  //   .attr('class', 'label')
  //   .text('No Data');

  //boundaries disclaimer
  createFootnote('.map-legend.country', '', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}

function updateCountryLegend(scale) {
  var legendFormat, legendTitle;
  if (currentCountryIndicator.id=='#population') {
    legendFormat = shortenNumFormat;
    legendTitle = 'Population Density (people per sq km)';
  }
  else {
    legendFormat = d3.format('.0f');
    legendTitle = 'Number of Health Facilities';
  }

  $('.map-legend.country .legend-title').html(legendTitle);

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
var lastHovered = '';
function createMapTooltip(country_code, country_name, point) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  if (country[0]!=undefined) {
      var val = country[0][currentIndicator.id];

      //format content for tooltip
      if (lastHovered!=country_code) {
        //set formats for value
        if (isVal(val)) {
          if (currentIndicator.id.indexOf('pct')>-1) {
            if (currentIndicator.id=='#value+gdp+ifi+pct' || currentIndicator.id=='#targeted+doses+delivered+pct') {
              if (isNaN(val))
                val = 'No Data'
              else
                val = (val==0) ? '0%' : d3.format('.2%')(val);
            }
            else
              val = (isNaN(val)) ? 'No Data' : percentFormat(val);
          }
          if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
          if (currentIndicator.id.indexOf('funding+total')>-1) val = formatValue(val);
        }
        else {
          val = 'No Data';
        }

        //format content for display
        var content = '<h2>'+ country_name +'</h2>';

        //COVID layer
        if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
          if (val!='No Data') {
            content += '<div class="stat-container covid-cases-per-capita"><div class="stat-title">'+ currentIndicator.name +':</div><div class="stat">' + d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) + '</div><div class="sparkline-container"></div></div>';

            content += '<div class="stat-container condensed-stat covid-cases"><div class="stat-title">Weekly Number of New Cases:</div><div class="stat">' + numFormat(country[0]['#affected+infected+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
            content += '<div class="stat-container condensed-stat covid-deaths"><div class="stat-title">Weekly Number of New Deaths:</div><div class="stat">' + numFormat(country[0]['#affected+killed+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
            content += '<div class="stat-container condensed-stat covid-pct"><div class="stat-title">Weekly Trend (new cases past week / prior week):</div><div class="stat">' + percentFormat(country[0]['#covid+trend+pct']) + '</div><div class="sparkline-container"></div></div>';

            //testing data
            var testingValPerCapita = (country[0]['#affected+tested+avg+per1000']==undefined) ? 'No Data' : parseFloat(country[0]['#affected+tested+avg+per1000']).toFixed(2);
            content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Daily Tests Per Thousand (7-day avg):</div><div class="stat">'+ testingValPerCapita +'</div></div>';
            var testingVal = (country[0]['#affected+tested+positive+pct']==undefined) ? 'No Data' : percentFormat(country[0]['#affected+tested+positive+pct']);
            content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Positive Test Rate (rolling 7-day avg):</div><div class="stat">'+ testingVal +'</div></div>';

          }
          else {
            content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
          }
        }
        //COVID by gender layer
        else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
          content += '<div class="table-display">';
          content += '<div class="table-row"><div>'+ currentIndicator.name +':</div><div>'+ d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) +'</div></div>';
          content += '</div>';

          //covid cases and deaths
          var numCases = (isVal(country[0]['#affected+infected'])) ? country[0]['#affected+infected'] : 'NA';
          var numDeaths = (isVal(country[0]['#affected+killed'])) ? country[0]['#affected+killed'] : 'NA';
          var casesMale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+infected+m+pct']) : 'No Data';
          var casesFemale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+f+infected+pct']) : 'No Data';
          var deathsMale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+killed+m+pct']) : 'No Data';
          var deathsFemale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+f+killed+pct']) : 'No Data';
          
          content += '<div class="table-display">';
          content += '<br><div class="table-row"><div>Total COVID-19 Cases:</div><div>' + numFormat(numCases) + '</div></div>';
          content += '<div class="table-row"><div>Female</div><div>'+ casesFemale + '</div></div>';
          content += '<div class="table-row"><div>Male</div><div>'+ casesMale + '</div></div>';
          content += '<br><div class="table-row"><div>Total COVID-19 Deaths:</div><div>' + numFormat(numDeaths) + '</div></div>';
          content += '<div class="table-row"><div>Female</div><div>'+ deathsFemale + '</div></div>';
          content += '<div class="table-row"><div>Male</div><div>'+ deathsMale + '</div></div>';
          content += '</div>';
        }
        //vaccine layer
        else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
          if (val!='No Data') {
            //allocated data
            var covaxAllocatedTotal = 0;
            if (country[0]['#capacity+doses+forecast+covax']!=undefined) covaxAllocatedTotal += country[0]['#capacity+doses+forecast+covax'];
            var allocatedArray = [{label: 'COVAX', value: covaxAllocatedTotal}];

            //delivered data
            var funderArray = (country[0]['#meta+vaccine+funder']!=undefined) ? country[0]['#meta+vaccine+funder'].split('|') : [];
            var producerArray = (country[0]['#meta+vaccine+producer']!=undefined) ? country[0]['#meta+vaccine+producer'].split('|') : [];
            var dosesArray = (country[0]['#capacity+vaccine+doses']!=undefined) ? country[0]['#capacity+vaccine+doses'].split('|') : [];
            var totalDelivered = (country[0]['#capacity+doses+delivered+total']!=undefined) ? country[0]['#capacity+doses+delivered+total'] : 0;

            content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
            content += '<div class="table-display layer-covax">';
            content += '<div class="table-row row-separator"><div>Allocated (doses)</div><div>'+ numFormat(covaxAllocatedTotal) +'</div></div>';
            allocatedArray.forEach(function(row, index) {
              if (row.value!=undefined) {
                content += '<div class="table-row"><div>'+ row.label +'</div><div>'+ numFormat(row.value) +'</div></div>';
              }
            });
            content += '<div class="table-row row-separator"><div>Delivered (doses)</div><div>'+ numFormat(totalDelivered) +'</div></div>';
            dosesArray.forEach(function(doses, index) {
              content += '<div class="table-row"><div>'+ funderArray[index];
              content += (producerArray[index] != '') ? ' – ' + producerArray[index] : '';
              content += '</div><div>'+ numFormat(doses) +'</div></div>';
            });
            content += '</div>';
          }
          else {
            content += currentIndicator.name + ':<div class="stat">Not Included</div>';
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
        //Access layer
        else if (currentIndicator.id=='#event+year+todate+num') {
          var tableArray = [{label: 'Violent Security Incidents Against Aid Workers since Jan 2020', value: '#event+year+todate+num'},
                            {label: '% of Visas Pending or Denied', value: '#access+visas+pct'},
                            {label: '% of Travel Authorizations Denied', value: '#access+travel+pct'},
                            {label: '% of CERF Projects Affected by Access Constraints', value: '#activity+cerf+project+insecurity+pct'},
                            {label: '% of CBPF Projects Affected by Access Constraints', value: '#activity+cbpf+project+insecurity+pct'},
                            {label: 'Status of Polio Vaccination Campaign', value: '#status+name'},
                            {label: 'Status of Schools', value: '#impact+type'}];
          content += '<div class="table-display">';
          tableArray.forEach(function(row) {
            var data = (country[0][row.value]==undefined || country[0][row.value]=='N/A') ? 'No Data' : country[0][row.value];
            var val = (row.label.indexOf('%')>-1 && !isNaN(data)) ? percentFormat(data) : data;
            var sourceObj = getSource(row.value);
            content += '<div class="table-row row-separator"><div>'+ row.label +':<div class="small">'+ sourceObj['#meta+source'] +'</div></div><div class="val">'+ val +'</div></div>';
          });
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
        //SAM layer
        else if (currentIndicator.id=='#affected+children+sam') {
          val = (val!='No Data') ? numFormat(val) : val;
          content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
        }
        //School closures layer
        else if (currentIndicator.id=='#impact+type') {
          content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
          var tableArray = [{label: 'Total duration of full and partial school closures (in weeks)', value: country[0]['#impact+full_partial+weeks']},
                            {label: 'Number of learners enrolled from pre-primary to upper-secondary education', value: country[0]['#population+learners+pre_primary_to_secondary']},
                            {label: 'Number of learners enrolled in tertiary education programmes', value: country[0]['#population+learners+tertiary']}];
          content += '<div class="table-display">';
          tableArray.forEach(function(row) {
            if (row.value!=undefined) content += '<div class="table-row row-separator"><div>'+ row.label +':</div><div>'+ numFormat(row.value) +'</div></div>';
          });
          content += '</div>';
        }
        //Immunization campaigns layer
        else if (currentIndicator.id=='#vaccination+postponed+num') {
          var vaccData = [];
          immunizationDataByCountry.forEach(function(country) {
            if (country.key==country_code) {
              vaccData = country.values;
            }
          });
          if (vaccData.length<1) {
            var content = '<h2>' + country_name + '</h2><div class="stat">No data</div>';
          }
          else {
            var content = '<h2>' + country_name + '</h2>';
            content += '<table class="immunization-table"><tr><th>Campaign Immunization:</th><th>Planned Start Date:</th><th>Status:</th></tr>';
            vaccData.forEach(function(row) {
              var className = (row['#status+name'].indexOf('Postponed COVID')>-1) ? 'covid-postpone' : '';
              content += '<tr class="'+className+'"><td>'+row['#service+name']+'</td><td>'+row['#date+start']+'</td><td>'+row['#status+name']+'</td></tr>';
            });
            content += '</table>';
          }
        }
        //INFORM layer
        else if (currentIndicator.id=='#severity+inform+type') {
          var numVal = (isVal(country[0]['#severity+inform+num'])) ? country[0]['#severity+inform+num'] : 'No Data';
          var informClass = country[0]['#severity+inform+type'];
          var informTrend = country[0]['#severity+inform+trend'];
          content += 'INFORM Severity Index: <div><span class="stat">' + numVal + '</span> <span class="subtext inline">(' + informClass + ' / ' + informTrend + ')</span></div>';
        }
        //Vaccine Financing layer
        else if (currentIndicator.id=='#value+financing+approved') {
          if (val!='No Data') {
            var gaviEarlyAccessDisbursed = (country[0]['#value+financing+gavi+earlyaccess+disbursed']!=undefined) ? country[0]['#value+financing+gavi+earlyaccess+disbursed'] : 0;
            var gaviNeedsDisbursed = (country[0]['#value+financing+gavi+needs+disbursed']!=undefined) ? country[0]['#value+financing+gavi+needs+disbursed'] : 0;
            var gaviEarlyAccessApproved = (country[0]['#value+financing+gavi+earlyaccess+approved']!=undefined) ? country[0]['#value+financing+gavi+earlyaccess+approved'] : 0;
            var gaviNeedsApproved = (country[0]['#value+financing+gavi+needs+approved']!=undefined) ? country[0]['#value+financing+gavi+needs+approved'] : 0;
            var wbApproved = (country[0]['#value+financing+worldbank+approved']!=undefined) ? country[0]['#value+financing+worldbank+approved'] : 0;

            content += currentIndicator.name + ':<div class="stat">' + formatValue(val) + '</div>';
            content += '<div class="table-display layer-covax">';
            content += '<div class="table-row row-separator"><div>Disbursed:</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Early Access)</div><div>'+ d3.format('$,')(gaviEarlyAccessDisbursed) +'</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Needs Based)</div><div>'+ d3.format('$,')(gaviNeedsDisbursed) +'</div></div>';

            content += '<div class="table-row row-separator"><div>Approved:</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Early Access)</div><div>'+ d3.format('$,')(gaviEarlyAccessApproved) +'</div></div>';
            content += '<div class="table-row"><div>GAVI CDS (Needs Based)</div><div>'+ d3.format('$,')(gaviNeedsApproved) +'</div></div>';
            content += '<div class="table-row"><div>World Bank</div><div>'+ d3.format('$,')(wbApproved) +'</div></div>';
            content += '</div>';
          }
          else {
            content += currentIndicator.name + ':<div class="stat">' + formatValue(val) + '</div>';
          }
        }
        //Humanitarian Funding Level layer
        else if (currentIndicator.id=='#value+funding+hrp+pct') {
          if (val!='No Data') {
            content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
            var tableArray = [{label: 'HRP Requirement', value: country[0]['#value+funding+hrp+required+usd']}];
            content += '<div class="table-display">';
            tableArray.forEach(function(row) {
              if (isVal(row.value)) {
                var value = (row.label=='HRP Funding Level for COVID-19 GHRP') ? percentFormat(row.value) : formatValue(row.value);
                content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ value +'</div></div>';
              }
            });
            content += '</div>';
          }
          else {
            if (isVal(country[0]['#value+funding+other+plan_name'])) {
              var planArray = country[0]['#value+funding+other+plan_name'].split('|');
              var planPctArray = (isVal(country[0]['#value+funding+other+pct'])) ? country[0]['#value+funding+other+pct'].split('|') : [0];
              var planRequiredArray = (isVal(country[0]['#value+funding+other+required+usd'])) ? country[0]['#value+funding+other+required+usd'].split('|') : [0];
              var planTotalArray = (isVal(country[0]['#value+funding+other+total+usd'])) ? country[0]['#value+funding+other+total+usd'].split('|') : [0];

              if (val!='No Data') content += '<br/>';
              planArray.forEach(function(plan, index) {
                content +=  plan +' Funding Level:<div class="stat">' + percentFormat(planPctArray[index]) + '</div>';
                content += '<div class="table-display">';
                content += '<div class="table-row"><div>Requirement:</div><div>'+ formatValue(planRequiredArray[index]) +'</div></div>';
                content += '<div class="table-row"><div>Total:</div><div>'+ formatValue(planTotalArray[index]) +'</div></div>';
                content += '</div>';
                if (planArray.length>1) content += '<br/>';
              });
            }
            else {
              content +=  currentIndicator.name + ':<div class="stat">N/A</div>';
            }
          }
        }
        //CERF
        else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
          content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
          if (val!='No Data') {
            if (country[0]['#value+cerf+covid+funding+total+usd'] > 0) {
              var gmText = getGamText(country[0], 'cerf');
              content += '<div class="gam">'+ gmText +'</div>';
            }
          }
        }
        //CBPF
        else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
          content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
          //hardcode value for CBPF Turkey
          if (country_code=='TUR') content+='<span>(Syria Cross Border HF)</span>';

          if (val!='No Data') {
            //gam
            if (country[0]['#value+cbpf+covid+funding+total+usd'] > 0) {
              var gmText = getGamText(country[0], 'cbpf');
              content += '<div class="gam small-pad">'+ gmText +'</div>';
            }

            //beneficieries
            if (country[0]['#affected+cbpf+covid+funding+total'] > 0) {
              var beneficiaryText = getBeneficiaryText(country[0]);
              content += '<div class="gam">'+ beneficiaryText +'</div>';
            }
          }
        }
        //IFI financing layer
        else if (currentIndicator.id=='#value+gdp+ifi+pct') {
          content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
          if (val!='No Data') {
            content += '<div class="table-display">';
            if (isVal(country[0]['#value+ifi+percap'])) content += '<div class="table-row"><div>Total IFI Funding per Capita:</div><div>'+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'</div></div>';
            if (isVal(country[0]['#value+ifi+total'])) content += '<div class="table-row"><div>Total Amount Combined:</div><div>'+ formatValue(country[0]['#value+ifi+total']) +'</div></div>';
            content += '</div>';

            if (parseFloat(val)>0) {
              content += '<div class="table-display subtext">Breakdown:';
              var fundingArray = ['adb','afdb','eib', 'ebrd', 'idb','ifc','imf','isdb','unmptf','wb'];
              fundingArray.forEach(function(fund) {
                var fundName = (fund=='wb') ? 'World Bank' : fund.toUpperCase(); 
                if (isVal(country[0]['#value+'+fund+'+total'])) content += '<div class="table-row"><div>'+ fundName +':</div><div>'+ formatValue(country[0]['#value+'+fund+'+total']) +'</div></div>';
              });
              content += '</div>';
            }
          }
        }
        //all other layers
        else {
          content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
        }

        //covid cases and deaths
        if (currentIndicator.id!='#affected+infected+sex+new+avg+per100000') {
          var numCases = (isVal(country[0]['#affected+infected'])) ? numFormat(country[0]['#affected+infected']) : 'NA';
          var numDeaths = (isVal(country[0]['#affected+killed'])) ? numFormat(country[0]['#affected+killed']) : 'NA';
          content += '<div class="cases-total">Total COVID-19 Cases: ' + numCases + '</div>';
          content += '<div class="deaths-total">Total COVID-19 Deaths: ' + numDeaths + '</div>';
        }

        //set content for tooltip
        tooltip.setHTML(content);

        //COVID cases layer charts -- inject this after divs are created in tooltip
        if ((currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') && val!='No Data' && val>0) {
          //weekly cases per capita sparkline
          var sparklineArray = [];
          covidTrendData[country_code].forEach(function(d) {
            var obj = {date: d['#date+reported'], value: d['#affected+infected+new+per100000+weekly']};
            sparklineArray.push(obj);
          });
          createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases-per-capita .sparkline-container', 'large');

          //weekly cases sparkline
          var sparklineArray = [];
          covidTrendData[country_code].forEach(function(d) {
            var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
            sparklineArray.push(obj);
          });
          createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases .sparkline-container');

          //weekly deaths sparkline
          var sparklineArray = [];
          covidTrendData[country_code].forEach(function(d) {
            var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
            sparklineArray.push(obj);
          });
          createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-deaths .sparkline-container');
          
          //weekly trend bar charts
          if (country[0]['#covid+trend+pct']!=undefined) {
            var pctArray = [];
            covidTrendData[country_code].forEach(function(d) {
              var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']*100};
              pctArray.push(obj);
            });
            createSparkline(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
            //createTrendBarChart(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
          }
        }
      }
      lastHovered = country_code;

      setTooltipPosition(point);
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


function createCountryMapTooltip(adm1_name, adm1_pcode) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+code']==adm1_pcode && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
    }
    else {
      val = 'No Data';
    }
    var content = `<h2>${adm1_name} Oblast</h2>${currentCountryIndicator.name}:<div class="stat">${val}</div>`;

    tooltip.setHTML(content);
  }
}


function resetMap() {
  if (currentCountry.code!=undefined) {
    var id = currentCountry.code.toLowerCase()
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  }
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-select').val('');

  //reset region
  if (currentRegion!='') {
    selectRegion();
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
  }
  else {
    updateGlobalLayer();

    map.flyTo({ 
      speed: 2,
      zoom: zoomLevel,
      center: [-25, 0] 
    });
    map.once('moveend', function() {
      map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    });
  }

  //reset tab view
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.content').addClass('tab-view');
  }
}


/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name'] + ' Data Explorer');

  //refugees
  var refugeesDiv = $('.country-panel .refugees .panel-inner');
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugee arrivals from Ukraine (total)', stat: shortenNumFormat(regionalData['#affected+refugees']), indicator: '#affected+refugees'});
  createFigure(refugeesDiv, {className: 'pin', title: 'People in Need (estimated)', stat: shortenNumFormat(data['#inneed+ind']), indicator: '#inneed+ind'});
  createFigure(refugeesDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: data['#affected+killed'], indicator: '#affected+killed'});
  createFigure(refugeesDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: data['#affected+injured'], indicator: '#affected+injured'});

  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-flash-required', title: 'Flash Appeal Requirement', stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  createFigure(fundingDiv, {className: 'funding-flash-allocation', title: 'Flash Appeal Funding', stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(regionalData['#value+funding+rrp+required+usd']), indicator: '#value+funding+rrp+required+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(regionalData['#value+funding+rrp+total+usd']), indicator: '#value+funding+rrp+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'CERF Allocation', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(data['#value+funding+uhf+usd']), indicator: '#value+funding+uhf+usd'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}

var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var chartDateFormat = d3.utcFormat("%-m/%-d/%y");
var colorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var populationColorRange = ['#F7FCB9', '#D9F0A3', '#ADDD8E', '#78C679', '#41AB5D', '#238443', '#005A32'];
var accessColorRange = ['#79B89A','#F6B98E','#C74B4F'];
var oxfordColorRange = ['#ffffd9','#c7e9b4','#41b6c4','#225ea8','#172976'];
var schoolClosureColorRange = ['#D8EEBF','#FFF5C2','#F6BDB9','#CCCCCC'];
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var regionBoundaryData, regionalData, worldData, nationalData, subnationalData, subnationalDataByCountry, immunizationData, timeseriesData, covidTrendData, dataByCountry, countriesByRegion, colorScale, viewportWidth, viewportHeight, currentRegion = '';
var countryTimeseriesChart = '';
var mapLoaded = false;
var dataLoaded = false;
var viewInitialized = false;
var zoomLevel = 1.4;

var hrpData = [];
var globalCountryList = [];
var comparisonList = [];
var currentIndicator = {};
var currentCountryIndicator = {};
var currentCountry = {};

var refugeeTimeseriesData, refugeeCountData, borderCrossingData = '';

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  //console.log(prod);

  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJjbDA5cWZmNjAwZzAyM3BtZ3U3OXNldW1hIn0.Tcs909e7BLLnpWBjM6tuvw';
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
    $('#chart-view').height(viewportHeight-$('.tab-menubar').outerHeight()-30);
    $('.country-panel .panel-content').height(viewportHeight - $('.country-panel .panel-content').position().top);
    $('.map-legend.global, .map-legend.country').css('max-height', viewportHeight - 200);
    if (viewportHeight<696) {
      zoomLevel = 1.4;
    }

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
      d3.json('data/refugees-count.json')
    ]).then(function(data) {
      console.log('Data loaded');
      $('.loader span').text('Initializing map...');


      //parse data
      var allData = data[0];
      regionalData = allData.regional_data[0];
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      refugeeTimeseriesData = allData.refugees_series_data;
      sourcesData = allData.sources_data;

      borderCrossingData = data[1];
      regionBoundaryData = data[2].features;
      refugeeCountData = data[3].data;
      
      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      });

      //parse national data
      nationalData.forEach(function(item) {
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

      //group countries by region    
      countriesByRegion = d3.nest()
        .key(function(d) { return d['#region+name']; })
        .object(nationalData);

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

    //create hrp country select
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

    //create chart view country select
    var trendseriesSelect = d3.select('.trendseries-select')
      .selectAll('option')
      .data(globalCountryList)
      .enter().append('option')
        .text(function(d) { 
          var name = (d.name=='oPt') ? 'Occupied Palestinian Territory' : d.name;
          return name; 
        })
        .attr('value', function (d) { return d.code; });

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
      vizTrack($(this).data('id'), currentIndicator.name);
    });

    //set daily download date
    var today = new Date();
    $('.download-link .today-date').text(dateFormat(today));
    $('.download-daily').on('click', function() {  
      //mixpanel event
      mixpanel.track('link click', {
        'embedded in': window.location.href,
        'destination url': $(this).attr('href'),
        'link type': 'download report',
        'page title': document.title
      });
    });

    //show/hide NEW label for monthly report
    sourcesData.forEach(function(item) {
      if (item['#indicator+name']=='#meta+monthly+report') {
        var today = new Date();
        var newDate = new Date(item['#date'])
        newDate.setDate(newDate.getDate() + 7) //leave NEW tag up for 1 week
        if (today > newDate)
          $('.download-monthly').find('label').hide()
        else
          $('.download-monthly').find('label').show()
      }
    })

    //track monthly pdf download
    $('.download-monthly').on('click', function() {  
      //mixpanel event
      mixpanel.track('link click', {
        'embedded in': window.location.href,
        'destination url': $(this).attr('href'),
        'link type': 'download report',
        'page title': document.title
      });
    });

    //load timeseries for country view 
    initTimeseries('', '.country-timeseries-chart');

    //check map loaded status
    if (mapLoaded==true && viewInitialized==false)
      deepLinkView();

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