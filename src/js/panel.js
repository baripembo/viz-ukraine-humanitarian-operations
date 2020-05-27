/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry][0];

  //timeseries
  updateTimeseries(timeseriesData, data['#country+code']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name']);

  //covid
  var covidDiv = $('.country-panel .covid .panel-inner');
  covidDiv.children().remove();  
  createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: numFormat(data['#affected+infected']), indicator: '#affected+infected'});
  createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});

  //projections
  var projectionsDiv = $('.country-panel .projections .panel-inner');
  projectionsDiv.children().remove();  
  projectionsDiv.append('<h6>COVID-19 Projections</h6><div class="bar-chart projections-cases"><p class="chart-title">Cases</p></div>');
  var cases = [{model: 'Imperial', min: data['#affected+cases+imperial+infected+min'], max: data['#affected+cases+imperial+infected+max']},
               {model: 'LSHTM', min: data['#affected+cases+infected+lshtm+min'], max: data['#affected+cases+infected+lshtm+max']}];
  createBarChart(cases, 'Cases');
  
  projectionsDiv.append('<div class="bar-chart projections-deaths"><p class="chart-title">Deaths</p></div>');
  var deaths = [{model: 'Imperial', min: data['#affected+deaths+imperial+min'], max: data['#affected+deaths+imperial+max']},
                {model: 'LSHTM', min: data['#affected+deaths+lshtm+min'], max: data['#affected+deaths+lshtm+max']}];
  createBarChart(deaths, 'Deaths');

  //hrp
  var hrpDiv = $('.country-panel .hrp .panel-inner');
  hrpDiv.children().remove();  
  //HRP requirement, HRP funding level, COVID-19 GHRP requirement, COVID-19 GHRP allocation, CERF COVID-19 allocation, CBPF COVID allocation
  //createFigure(hrpDiv, {className: 'pin', title: 'Number of People in Need', stat: shortenNumFormat(data['#affected+inneed']), indicator: '#affected+inneed'});
  createFigure(hrpDiv, {className: 'funding-required', title: 'HRP requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: '#value+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: percentFormat(data['#value+funding+hrp+pct']), indicator: '#value+covid+funding+hrp+pct'});
  createFigure(hrpDiv, {className: 'funding-covid-required', title: 'COVID-19 GHRP requirement', stat: formatValue(data['#value+covid+funding+hrp+required+usd']), indicator: '#value+covid+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-allocation', title: 'COVID-19 GHRP allocation', stat: formatValue(data['#value+covid+funding+hrp+total+usd']), indicator: '#value+covid+funding+hrp+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cerf-allocation', title: 'CERF COVID-19 allocation', stat: formatValue(data['#value+cerf+covid+funding+total+usd']), indicator: '#value+cerf+covid+funding+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cbpf-allocation', title: 'CBPF COVID allocation', stat: formatValue(data['#value+cbpf+covid+funding+total+usd']), indicator: '#value+cbpf+covid+funding+total+usd'});

  //inform
  var informDiv = $('.country-panel .inform .panel-inner');
  informDiv.children().remove();  
  createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+num'], indicator: '#severity+num'});
  createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+type'], indicator: '#severity+num'});

  //school
  var schoolDiv = $('.country-panel .schools .panel-inner');
  schoolDiv.children().remove();  
  createFigure(schoolDiv, {className: 'school', stat: data['#impact+type'], indicator: '#impact+type'});

  //access -- fix this logic
  var accessDiv = $('.country-panel .humanitarian-access .panel-inner');
  accessDiv.children().remove();  
  const keys = Object.keys(data);
  var constraintsCount = 0;
  var impactCount = 0;
  var phrase = ['Restriction of movements INTO the country ', 'Restriction of movements WITHIN the country '];
  keys.forEach(function(key, index) {
    if (key.indexOf('constraints_')>-1) constraintsCount++;
    if (key.indexOf('impact_')>-1) impactCount++;
  });
  var headerCount = 0;
  var text = '';
  for (var i=1; i<=constraintsCount; i++) {
    var key = '#access+constraints_'+i;
    if (accessLabels[key].indexOf(phrase[0])>-1) {
      text = accessLabels[key].replace(phrase[0],'');
      if (headerCount==0) {
        accessDiv.append('<h6 class="access-title">'+ phrase[0] +'</h6>');
        headerCount++;
      }
    }
    else if (accessLabels[key].indexOf(phrase[1])>-1) {
      text = accessLabels[key].replace(phrase[1],'');
      if (headerCount==1) {
        accessDiv.append('<h6 class="access-title">'+ phrase[1] +'</h6>');
        headerCount++;
      }
    }
    else {
      text = accessLabels[key];
      if (headerCount==2) {
        accessDiv.append('<h6 class="access-title"></h6>');
        headerCount++;
      }
    }
    var content = '<div class="access-row">';
    content += (data[key]==1) ? '<div class="access-icon yes">YES</div>' : '<div class="access-icon">NO</div>';
    content += '<div>'+ text +'</div></div>';
    accessDiv.append(content);
  }
  accessDiv.append('<h6 class="access-title">What is the impact of COVID-19 related measures on the response?</h6>');
  for (var j=1; j<=impactCount; j++) {
    var key = '#access+impact_'+j;
    var content = '<div class="access-row">';
    content += (data[key]==j) ? '<div class="access-icon yes">YES</div>' : '<div class="access-icon">NO</div>';
    content += '<div>'+ accessLabels[key] +'</div></div>';
    accessDiv.append(content);
  }
  createSource(accessDiv, '#access+constraints+pct');
}


function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  createSource(divInner, obj.indicator);
}

function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = dateFormat(new Date(sourceObj['#date']));
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceObj['#meta+source'] +'</span> | <a href="'+ sourceObj['#meta+url'] +'" class="dataURL" target="_blank">DATA</a></p>');
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = dateFormat(new Date(sourceObj['#date']));
  div.find('.date').text(date);
  div.find('.source-name').text(sourceObj['#meta+source']);
  div.find('.dataURL').attr('href', sourceObj['#meta+url']);
}

function getSource(indicator) {
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name'] == indicator) {
      obj = item;
    }
  });
  return obj;
}


