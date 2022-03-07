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
  
  //data updated
  let lastUpdate = moment(ukrKeyFigures['#date'], ['MM-DD-YYYY']).format('ll');

  //refugees
  var refugeesDiv = $('.country-panel .refugees .panel-inner');
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugee arrivals from Ukraine', stat: shortenNumFormat(data['#affected+ind']), indicator: '#affected+ind'});
  createFigure(refugeesDiv, {className: 'pin', title: 'People in Need', stat: shortenNumFormat(data['#inneed+ind']), indicator: '#inneed+ind'});
  createFigure(refugeesDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: ukrKeyFigures['#affected+killed'], indicator: ''});
  createFigure(refugeesDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: ukrKeyFigures['#affected+injured'], indicator: ''});
  
  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-flash-required', title: 'Flash Appeal Requirement', stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  createFigure(fundingDiv, {className: 'funding-flash-allocation', title: 'Flash Appeal Funding', stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(regionalData['#value+funding+rrp+required+usd']), indicator: '#value+funding+rrp+required+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(regionalData['#value+funding+rrp+total+usd']), indicator: '#value+funding+rrp+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'CERF Allocation', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(data['#value+funding+uhf+usd']), indicator: '#value+funding+uhf+usd'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}
