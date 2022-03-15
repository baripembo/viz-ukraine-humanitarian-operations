/****************************************/
/*** TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  createTimeSeries(refugeeTimeseriesData, div);
}

function createTimeSeries(array, div) {
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
