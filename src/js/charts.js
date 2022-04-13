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
  const chartWidth = viewportWidth - $('.country-panel').width() - 150;
  const chartHeight = 280;
  let colorArray = eventColorRange;

  var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: (isMobile) ? 60 : 0,
      top: 10,
      left: (isMobile) ? 30 : 35,
      right: (isMobile) ? 140 : 200
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
        padding: { 
          top: (isMobile) ? 20 : 50, 
          bottom: 0 
        },
        tick: { 
          outer: false,
          //format: d3.format('d')
        }
      }
    },
    legend: {
      position: (isMobile) ? 'inset' : 'right',      
      inset: {
          anchor: 'top-right',
          x: -20,
          y: 200,
          step: 2
      }
    },
    transition: { duration: 300 },
    tooltip: {
      contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
        let date = new Date(d[0].x);
        let total = 0;
        let html = `<table><thead><tr><th colspan="2">${moment(date).format('MMM D, YYYY')}</th></tr><thead>`;
        d.forEach(function(event, index) {
          total += event.value;
          html += `<tr><td><span class='key' style='background-color: ${color(d[index].id)}'></span>${event.name}</td><td>${event.value}</td></tr>`;
        });
        html += `<tr><td><b>Total</b></td><td><b>${total}</b></td></tr></table>`;
        return html;
      }
    },
    onrendered: function() {
      $('.trendseries-chart').show();
    }
  });

  countryTimeseriesChart = chart;
  createSource($('#chart-view .source-container'), '#date+latest+acled');
}


function updateTimeseries(selected) {
  let filteredData = (selected!='All') ? acledData.filter((d) => d['#adm1+code'] == selected) : acledData;
  let data = formatData(filteredData);
  $('.trendseries-title').find('.num').html(numFormat(filteredData.length));

  if (filteredData.length<=0) {
    $('.trendseries-chart').hide();
  }
  else {
    countryTimeseriesChart.load({
      columns: data,
      unload: ['Battles', 'Explosions/Remote violence', 'Riots', 'Violence against civilians']
    });
  }
}
