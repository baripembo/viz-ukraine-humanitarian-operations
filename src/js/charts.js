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

function formatData(data) {
  let events = d3.nest()
    .key(function(d) { return d['#event+type']; })
    .key(function(d) { return d['#date+occurred']; })
    .rollup(function(leaves) { return leaves.length; })
    .entries(data);
  events.sort((a, b) => (a.key > b.key) ? 1 : -1);

  let dates = [... new Set(acledData.map((d) => d['#date+occurred']))];

  let dataArray = [];
  events.forEach(function(event) {
    let array = [];
    array.push(event.key);
    dates.forEach(function(date) {
      let val = 0;
      event.values.forEach(function(e) {
        if (e.key==date)
          val = e.value;
      });
      array.push(val);
    });
    dataArray.push(array);
  });
  dates.unshift('x');
  dataArray.unshift(dates);
  return dataArray;
}


function createTimeSeries(data, div) {
  var chartWidth = viewportWidth - $('.country-panel').width() - 150;
  var chartHeight = (isMobile) ? 180 : 280;
  var colorArray = eventColorRange;

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 35,
      right: 200
    },
    bindto: div,
    data: {
      x: 'x',
      columns: data,
      type: 'spline'
    },
    color: {
      pattern: colorArray
    },
    // spline: {
    //   interpolation: {
    //     type: 'cardinal'
    //   }
    // },
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
          //format: shortenNumFormat
        }
      }
    },
    legend: {
      position: 'right'
    },
    transition: { duration: 300 },
    // tooltip: {
    //   grouped: false,
    //   format: {
    //     title: function (d) { 
    //       let date = new Date(d);
    //       return moment(d).format('M/D/YY');
    //     },
    //     value: function (value, ratio, id) {
    //       return numFormat(value);
    //     }
    //   }
    // }
  });

  countryTimeseriesChart = chart;
  createSource($('#chart-view .source-container'), '#date+latest+acled');
}


function updateTimeseries(selected) {
  let filteredData = (selected!='All') ? acledData.filter((d) => d['#adm1+name'] == 'Donetsk') : acledData;
  let data = formatData(filteredData);
  $('.trendseries-title').find('.num').html(numFormat(filteredData.length));

  countryTimeseriesChart.load({
    columns: data,
    unload: ['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians']
  });
}
