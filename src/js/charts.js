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
  var margin = {top: 0, right: 40, bottom: 30, left: 50},
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
      var source = getSource('#affected+deaths+'+ d.model.toLowerCase() +'+min');
      var sourceDate = new Date(source['#date']);
      if (sourceDate.getTime()!=date.getTime()) {
        date = sourceDate;
        projectionsDiv.find('.source').append(' <span class="date">'+ dateFormat(date) +'</span>');
      }
      projectionsDiv.find('.source').append(' | '+ d.model +': <a href="'+ source['#meta+url'] +'" class="dataURL" target="_blank">DATA</a>');
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
  //group the data by country
  var groupByCountry = d3.nest()
    .key(function(d){ return d['Country']; })
    .key(function(d) { return d['Date']; })
    .entries(data);
  groupByCountry.sort(compare);

  //group the data by date
  var groupByDate = d3.nest()
    .key(function(d){ return d['Date']; })
    .entries(data);

  var dateArray = ['x'];
  groupByDate.forEach(function(d) {
    var date = new Date(d.key);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    dateArray.push(utcDate);
  });

  var timeseriesArray = [];
  timeseriesArray.push(dateArray);

  groupByCountry.forEach(function(country, index) {
    var arr = [country.key];
    var val = 0;
    groupByDate.forEach(function(d) {
      country.values.forEach(function(e) {
        if (d.key == e.key) {
          val = e.values[0]['confirmed cases'];
        }
      });
      arr.push(val);
    });
    timeseriesArray.push(arr);
  });

  return timeseriesArray;
}

var countryTimeseriesChart;
function createTimeSeries(array, div) {
	var chart = c3.generate({
    size: {
      width: 336,
      height: 240
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 30,
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
      type: 'spline',
      color: function() {
        return '#999';
      }
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
          count: 5,
          format: '%b %d, %Y',
          outer: false
				}
			},
			y: {
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

  var lastUpdated = new Date(Math.max.apply(null, timeseriesData.map(function(e) {
    return new Date(e.Date);
  })));

  if (div=='.country-timeseries-chart') {
    countryTimeseriesChart = chart;
    $('.cases-timeseries').append('<p class="small"><span class="date">'+ dateFormat(lastUpdated) +'</span> | <span class="source-name">WHO</span> | <a href="https://data.humdata.org/dataset/coronavirus-covid-19-cases-and-deaths" class="dataURL" target="_blank">DATA</a></p>');
  }
  createTimeseriesLegend(chart, div);
}


function createTimeseriesLegend(chart, div, country) {
  var names = [];
  chart.data.shown().forEach(function(d) {
    if (d.id==country)
      names.push(d.id)
  });

  //custom legend
  d3.select(div).insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      d3.select(this).select('span').style('background-color', '#007CE1');
    })
    .on('mouseover', function(id) {
      chart.focus(id);
    })
    .on('mouseout', function(id) {
      //chart.revert();
    });
}

function updateTimeseries(data, selected) {
  if (selected=='Syrian Arab Republic') selected = 'Syria';
  if (selected=='Venezuela (Bolivarian Republic of)') selected = 'Venezuela';

  countryTimeseriesChart.focus(selected);
  $('.c3-chart-lines .c3-line').css('stroke', '#999');
  $('.c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');

  $('.country-timeseries-chart .timeseries-legend').remove();
  createTimeseriesLegend(countryTimeseriesChart, '.country-timeseries-chart', selected);
}


/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div) {
  var width = 75;
  var height = 24;
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
      .attr('transform', 'translate(0,0)');
    
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
  var barWidth = 3;//width/total - barMargin;
  var width = (barWidth+barMargin) * data.length;
  var height = 24;
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
var rankingY, rankingBars, rankingData, rankingBarHeight;
function createRankingChart() {
  // if (currentIndicator.id=='#severity+access+category') {
  //   var chart = $('.ranking-chart');
  //   //set title
  //   $('.global-figures .ranking-container').addClass('access-severity');
  //   $('.global-figures .ranking-title').text( $('.menu-indicators').find('.selected').attr('data-legend'));

  //   //format data
  //   var rankingByCategory = d3.nest()
  //     .key(function(d) {
  //       if (regionMatch(d['#region+name'])) return d['#severity+access+category+num']; 
  //     })
  //     .key(function(d) {
  //       if (regionMatch(d['#region+name'])) return d['#severity+access+num+score']; 
  //     })
  //     .sortKeys((a, b) => d3.descending(+a, +b))
  //     .entries(nationalData)
  //     .sort(function(a, b) { return d3.descending(+a.key, +b.key); });

  //   //create category lists
  //   rankingByCategory.forEach(function(category) {
  //     if (category.key!='-1' && category.key!='undefined') {
  //       var categoryName;
  //       switch(category.key) {
  //         case '2':
  //           categoryName = 'High';
  //           break;
  //         case '1':
  //           categoryName = 'Medium';
  //           break;
  //         case '0':
  //           categoryName = 'Low';
  //           break;
  //         default:
  //           categoryName = '';
  //       }
  //       chart.append('<label class="access-category '+ categoryName.toLowerCase() +'">'+ categoryName +'</label>');
  //       var listClass = categoryName.toLowerCase() + '-list';
  //       chart.append('<ul class="'+ listClass +'"></ul>');
  //       category.values.forEach(function(level) {
  //         level.values.forEach(function(country) {
  //           chart.find('.'+listClass).append('<li>'+ country['#country+name'] +'</li>')
  //         });
  //       });
  //     }
  //   });
  // }
  // else {
    //set title
    $('.global-figures .ranking-container').removeClass('access-severity');
    $('.global-figures .ranking-title').text( $('.menu-indicators').find('.selected').attr('data-legend') + ' by country' );

    var indicator;
    switch(currentIndicator.id) {
      case '#severity+type':
        indicator = '#severity+num';
        break;
      case '#vaccination-campaigns':
        indicator = '#vaccination+num+ratio';
        break;
      case '#food-prices':
        indicator = '#value+food+num+ratio';
        break;
      default:
        indicator = currentIndicator.id;
    }

    //format data
    var rankingByCountry = d3.nest()
      .key(function(d) {
        if (regionMatch(d['#region+name'])) return d['#country+name']; 
      })
      .rollup(function(v) {
        if (regionMatch(v[0]['#region+name'])) return v[0][indicator]; 
      })
      .entries(nationalData);

    rankingData = rankingByCountry.filter(function(item) { 
      return isVal(item.value) && !isNaN(item.value);
    });
    rankingData.sort(function(a, b){ return d3.descending(+a.value, +b.value); });

    var valueMax = d3.max(rankingData, function(d) { return +d.value; });
    var valueFormat = d3.format(',.2r');
    $('.ranking-select').val('descending');
    if (indicator.indexOf('funding')>-1 || indicator.indexOf('gdp')>-1) {
      valueFormat = formatValue;
      rankingData.reverse();
      $('.ranking-select').val('ascending');
    }
    if (indicator.indexOf('pct')>-1 || indicator.indexOf('ratio')>-1) {
      valueFormat = percentFormat;
    }

    //draw chart
    rankingBarHeight = 13;
    var barPadding = 9;

    //determine height available for chart
    var availSpace = viewportHeight - $('.ranking-chart').position().top - 40;
    var numRows = Math.floor(availSpace/(rankingBarHeight+barPadding));
    var rankingChartHeight = ((rankingBarHeight+barPadding) * numRows) + 14;
    $('.ranking-chart').css('height', rankingChartHeight);

    var margin = {top: 0, right: 45, bottom: 15, left: 100},
        width = $('.global-figures').width() - margin.left - margin.right,
        height = (rankingBarHeight + barPadding) * rankingData.length;

    var svg = d3.select('.ranking-chart').append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    var x = d3.scaleLinear()
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
        return x(d.value);
      });

    //add country names
    rankingBars.append('text')
      .attr('class', 'name')
      .attr('x', -3)
      .attr('y', 9)
      .text(function (d) {
        return truncateString(d.key, 15);
        //return d.key;
      })
      //.call(wrap, 100);

    //add a value label to the right of each bar
    rankingBars.append('text')
      .attr('class', 'label')
      .attr('y', 9)
      .attr('x', function (d) {
        return x(d.value) + 3;
      })
      .text(function (d) {
        return valueFormat(d.value);
      });
  //}
}

function updateRankingChart(sortMode) {
  rankingData.sort(function(a, b){
    if (sortMode=='ascending')
      return d3.ascending(+a.value, +b.value); 
    else
      return d3.descending(+a.value, +b.value);
  });

  rankingY.domain(rankingData.map(function(d) { return d.key; }));
  rankingBars.transition()
    .duration(400)
    .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });
}
