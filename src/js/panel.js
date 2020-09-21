/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name']);

  //covid
  var covidDiv = $('.country-panel .covid .panel-inner');
  covidDiv.children().remove();  
  createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: numFormat(data['#affected+infected']), indicator: '#affected+infected'});
  createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});
  var covidData = covidTrendData[currentCountry.code];
  var weeklyCases = covidData[covidData.length-1]['#affected+infected+new+weekly'];
  var weeklyDeaths = covidData[covidData.length-1]['#affected+killed+new+weekly'];
  createFigure(covidDiv, {className: 'weekly-cases', title: 'Weekly Number of New Cases', stat: numFormat(weeklyCases), indicator: '#affected+killed'});
  createFigure(covidDiv, {className: 'weekly-deaths', title: 'Weekly Number of New Deaths', stat: numFormat(weeklyDeaths), indicator: '#affected+killed'});

  //projections
  var projectionsDiv = $('.country-panel .projections .panel-inner');
  projectionsDiv.children().remove();  
  projectionsDiv.append('<h6>COVID-19 Projections</h6><div class="bar-chart projections-cases"><p class="chart-title">Cases</p></div>');
  var cases = [{model: 'Imperial', min: data['#affected+infected+min+imperial'], max: data['#affected+infected+max+imperial']},
               {model: 'LSHTM', min: data['#affected+infected+min+lshtm'], max: data['#affected+infected+max+lshtm']}];
  createProjectionsChart(cases, 'Cases');
  
  projectionsDiv.append('<div class="bar-chart projections-deaths"><p class="chart-title">Deaths</p></div>');
  var deaths = [{model: 'Imperial', min: data['#affected+killed+min+imperial'], max: data['#affected+killed+max+imperial']},
                {model: 'LSHTM', min: data['#affected+killed+min+lshtm'], max: data['#affected+killed+max+lshtm']}];
  createProjectionsChart(deaths, 'Deaths');

  //hrp
  var hrpDiv = $('.country-panel .hrp .panel-inner');
  hrpDiv.children().remove();
  createFigure(hrpDiv, {className: 'funding-required', title: 'HRP Requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: '#value+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: percentFormat(data['#value+funding+hrp+pct']), indicator: '#value+covid+funding+hrp+pct'});
  createFigure(hrpDiv, {className: 'funding-covid-required', title: 'HRP Requirement for COVID-19 GHRP', stat: formatValue(data['#value+covid+funding+hrp+required+usd']), indicator: '#value+covid+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-allocation', title: 'HRP Allocation for COVID-19 GHRP', stat: formatValue(data['#value+covid+funding+hrp+total+usd']), indicator: '#value+covid+funding+hrp+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cerf-allocation', title: 'CERF COVID-19 Allocation', stat: formatValue(data['#value+cerf+covid+funding+total+usd']), indicator: '#value+cerf+covid+funding+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cbpf-allocation', title: 'CBPF COVID Allocation', stat: formatValue(data['#value+cbpf+covid+funding+total+usd']), indicator: '#value+cbpf+covid+funding+total+usd'});

  //inform
  var informDiv = $('.country-panel .inform .panel-inner');
  informDiv.children().remove();  
  createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+inform+num'], indicator: '#severity+inform+num'});
  createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+inform+type'], indicator: '#severity+inform+num'});

  //school
  var schoolDiv = $('.country-panel .schools .panel-inner');
  schoolDiv.children().remove();  
  createFigure(schoolDiv, {className: 'school', stat: data['#impact+type'], indicator: '#impact+type'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  createSource(divInner, obj.indicator);
}
