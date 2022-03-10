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
