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

/****************************************/
/*** COVID TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  var timeseriesArray = formatTimeseriesData(data);
  createTimeSeries(timeseriesArray, div);
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
  var isGlobal = (div.indexOf('global')>-1) ? true : false;
  var chartWidth = (isGlobal) ? viewportWidth - $('.secondary-panel').width() - 75 : 336;
  var chartHeight = (isGlobal) ? $(div).parent().height()-200 : 240;
  var colorArray = (isGlobal) ? 
    ['#1ebfb3', '#f2645a', '#007ce1', '#9c27b0', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'] :
    ['#999'];

  //filter HRP countries for country timeseries
  if (!isGlobal) {
    var hrpList = [];
    hrpData.forEach(function(d) {
      hrpList.push(d['#country+name']);
    });
    var hrpArray = array.filter((row) => hrpList.includes(row[0]));
    hrpArray.unshift(array[0]);
    array = hrpArray;
  }

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
            var date = dateFormat(d);
            if (!isGlobal) {
              //display every third month for country view
              date = (d.getMonth()%3==0) ? date : '';
            }
            else {
              //display every other month for global view
              date = (d.getMonth()%2==0) ? date : '';
            }
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

  if (isGlobal) {
    globalTimeseriesChart = chart;
  }
  else {
    countryTimeseriesChart = chart;
    createSource($('.cases-timeseries'), '#affected+infected');
  }
}


function createTimeseriesLegend(chart, country) {
  var element = $(chart.element).attr('class');
  var isGlobal = (element.indexOf('global')>-1) ? true : false;
  if (isGlobal && $('.timeseries-legend').length>0) {
    $('.global-timeseries-chart .timeseries-legend').remove();
  }
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
      var color = (isGlobal) ? chart.color(id) : '#007CE1';
      d3.select(this).select('span').style('background-color', color);
    })
    .on('mouseover', function(id) {
      if (isGlobal) chart.focus(id);
    })
    .on('mouseout', function(id) {
      if (isGlobal) chart.revert();
    });

  //set max height for legend
  if (isGlobal) {
    var chartHeight = $(chart.element).parent().height()-200;
    var itemHeight = 18;
    var numItems = Math.round((chartHeight-160)/itemHeight);
    var availSpace = itemHeight*numItems;
    $('.global-timeseries-chart .timeseries-legend').css('max-height', availSpace);
  }
}

function updateTimeseries(selected) {
  var maxValue = d3.max(countryTimeseriesChart.data(selected)[0].values, function(d) { return +d.value; });
  if (selected=='Venezuela (Bolivarian Republic of)') selected = 'Venezuela';

  countryTimeseriesChart.axis.max(maxValue*2);
  countryTimeseriesChart.focus(selected);
  $('.country-timeseries-chart .c3-chart-lines .c3-line').css('stroke', '#999');
  $('.country-timeseries-chart .c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');

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
  $('.ranking-container').removeClass('covid');
  $('.ranking-container').removeClass('ranking-vaccine');

  //set title
  var rankingTitle = (currentIndicator.id=='#impact+type') ? 'Total Number of Affected Learners' : $('.menu-indicators').find('.selected').attr('data-legend') + ' by Country'
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
      indicator = '#population+learners';
      break;
    case '#immunization-campaigns':
      indicator = '#vaccination+num+ratio';
      break;
    case '#food-prices':
      indicator = '#value+food+num+ratio';
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
  else {
    $('.ranking-select').val('descending');
  }

  //format data
  rankingData = formatRankingData(indicator);

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
      return (d.value<0) ? 0 : rankingX(d.value);
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
      return rankingX(d.value) + 3;
    })
    .text(function (d) {
      return valueFormat(d.value);
    });
}

function formatRankingData(indicator) {
  var rankingByCountry = d3.nest()
    .key(function(d) {
      if (regionMatch(d['#region+name'])) return d['#country+name']; 
    })
    .rollup(function(v) {
      if (regionMatch(v[0]['#region+name'])) return v[0][indicator];
    })
    .entries(nationalData);

  var data = rankingByCountry.filter(function(item) {
    return isVal(item.value) && !isNaN(item.value);
  });
  data.sort(function(a, b){ return d3.descending(+a.value, +b.value); });
  return data;
}

function updateRankingChart(sortMode) {
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

    rankingData = formatRankingData(sortMode);
    rankingData.sort(function(a, b){
       return d3.descending(+a.value, +b.value);
    });

    if (rankingData.length<1) {
      $('.ranking-chart').append('<p>No Doses Delivered</p>');
      $('.ranking-chart > p').css('text-align', 'center');
    }

    var valueMax = d3.max(rankingData, function(d) { return +d.value; });
    valueFormat = d3.format(',.0f');

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
        return (d.value<0) ? 0 : rankingX(d.value);
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
        return rankingX(d.value) + 3;
      })
      .text(function (d) {
        return valueFormat(d.value);
      });
  }
}
