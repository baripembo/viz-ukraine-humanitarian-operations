function createBarChart(data, type) {
  var barColor = (type=='Cases') ? '#007CE1' : '#000';
  var maxVal = d3.max(data, function(d) { return +d.max; })
  var barHeight = 25;
  var barPadding = 20;
  var margin = {top: 0, right: 40, bottom: 30, left: 50},
      width = 300,
      height = 90;
  
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
}

function initTimeseries(data) {
  var timeseriesArray = formatTimeseriesData(data);
  createTimeSeries(timeseriesArray);
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

var timeseriesChart;
function createTimeSeries(array) {
	timeseriesChart = c3.generate({
    size: {
      height: 240
    },
    padding: {
      top: 10,
      left: 35,
      right: 16
    },
    bindto: '.timeseries-chart',
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
        pattern: ['#1ebfb3', '#f2645a', '#007ce1', '#9c27b0', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf']
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
          count: 8,
				  format: '%-m/%-d/%y',
          outer: false
				}
			},
			y: {
				min: 0,
				padding: { top:0, bottom:0 },
        tick: { 
          outer: false
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

  createTimeseriesLegend();
}


function createTimeseriesLegend() {
  var names = [];
  timeseriesChart.data.shown().forEach(function(d) {
    names.push(d.id)
  });

  //custom legend
  d3.select('.timeseries-chart').insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      d3.select(this).select('span').style('background-color', timeseriesChart.color(id));
    })
    .on('mouseover', function(id) {
      timeseriesChart.focus(id);
    })
    .on('mouseout', function(id) {
      timeseriesChart.revert();
    });
}

function updateTimeseries(data, selected) {
  var updatedData = (selected != undefined) ? data.filter((country) => selected.includes(country['Country Code'])) : data;
  var timeseriesArray = formatTimeseriesData(updatedData);

  //load new data
  timeseriesChart.load({
    columns: timeseriesArray,
    unload: true,
    done: function() {
      $('.timeseries-legend').remove();
      createTimeseriesLegend();
    }
  });
}

