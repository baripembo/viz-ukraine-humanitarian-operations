/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div, size) {
  var width = 65;
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
  createTimeSeries(refugeeTimeseriesData, div);
}

function createTimeSeries(array, div) {
  var chartWidth = 336;
  var chartHeight = (isMobile) ? 180 : 240;
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

  countryTimeseriesChart = chart;
  createSource($('.refugees-timeseries'), '#affected+refugees');
}


function updateTimeseries(selected) {
  var maxValue = d3.max(countryTimeseriesChart.data(selected)[0].values, function(d) { return +d.value; });

  countryTimeseriesChart.axis.max(maxValue*1.6);
  countryTimeseriesChart.focus(selected);
  $('.country-timeseries-chart .c3-chart-lines .c3-line').css('stroke', '#999');
  $('.country-timeseries-chart .c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');
  $('.refugees-timeseries').show();
}
