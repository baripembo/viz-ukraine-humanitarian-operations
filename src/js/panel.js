/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name'] + ' Data Explorer');
  
  //refugees
  var refugeesDiv = $('.country-panel .refugees .panel-inner');
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugee arrivals from Ukraine', stat: numFormat(1045459), indicator: ''});
  refugeesDiv.find('.figure-inner').append('<p class="small source"><span class="date">Mar 03, 2022</span> | <span class="source-name">UNHCR</span> | <a href="https://data.humdata.org/dataset/ukraine-refugee-situation" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
  
  //hrp
  var hrpDiv = $('.country-panel .hrp .panel-inner');
  hrpDiv.children().remove();
  createFigure(hrpDiv, {className: 'funding-required', title: 'HRP Requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: '#value+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-allocation', title: 'HRP Funding', stat: formatValue(data['#value+funding+hrp+total+usd']), indicator: '#value+funding+hrp+total+usd'});
  createFigure(hrpDiv, {className: 'funding-appeal-required', title: `${data['#value+funding+other+plan_name']} Requirement`, stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  createFigure(hrpDiv, {className: 'funding-appeal-allocation', title: `${data['#value+funding+other+plan_name']} Funding`, stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  createFigure(hrpDiv, {className: 'funding-cerf-allocation', title: 'CERF Allocation 2022', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(hrpDiv, {className: 'funding-cbpf-allocation', title: 'CBPF Allocation 2022', stat: formatValue(data['#value+cbpf+funding+total+usd']), indicator: '#value+cbpf+funding+total+usd'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}
