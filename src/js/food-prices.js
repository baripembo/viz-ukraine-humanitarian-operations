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


