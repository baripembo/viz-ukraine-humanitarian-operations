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
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugee arrivals from Ukraine', stat: shortenNumFormat(+ukrKeyFigures['#affected+refugees']), indicator: ''});
  createFigure(refugeesDiv, {className: 'pin', title: 'People in Need', stat: shortenNumFormat(+ukrKeyFigures['#affected+inneed+total']), indicator: ''});
  createFigure(refugeesDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: ukrKeyFigures['#affected+killed'], indicator: ''});
  createFigure(refugeesDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: ukrKeyFigures['#affected+injured'], indicator: ''});
  refugeesDiv.find('.figure-inner').append(`<p class="small source"><span class="date">${lastUpdate}</span> | <span class="source-name">UNHCR</span> | <a href="https://data.humdata.org/dataset/ukraine-refugee-situation" class="dataURL" target="_blank" rel="noopener">DATA</a></p>`);
  
  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-flash-required', title: 'Flash Appeal Requirement', stat: formatValue(ukrKeyFigures['#value+appeal+funding+required+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-flash-allocation', title: 'Flash Appeal Funding', stat: formatValue(ukrKeyFigures['#value+appeal+funding+total+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-required', title: 'HRP Requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-allocation', title: 'HRP Funding', stat: formatValue(data['#value+funding+hrp+total+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(ukrKeyFigures['#value+funding+regional+required+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(ukrKeyFigures['#value+funding+regional+total+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-cerf-required', title: 'CERF Contribution', stat: formatValue(ukrKeyFigures['#value+cerf+contribution+funding+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-cerf-allocation', title: 'CERF Allocation', stat: formatValue(ukrKeyFigures['#value+allocation+cerf+funding+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'Humanitarian Fund Contribution', stat: formatValue(ukrKeyFigures['#value+contribution+funding+ukr+usd']), indicator: ''});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(ukrKeyFigures['#value+funding+total+ukr+usd']), indicator: ''});
  fundingDiv.find('.figure-inner').append(`<p class="small source"><span class="date">${lastUpdate}</span> | <span class="source-name">OCHA</span> | <a href="https://data.humdata.org/dataset/ukraine-key-figures-2022 " class="dataURL" target="_blank" rel="noopener">DATA</a></p>`);
  // createFigure(hrpDiv, {className: 'funding-appeal-required', title: `${data['#value+funding+other+plan_name']} Requirement`, stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  // createFigure(hrpDiv, {className: 'funding-appeal-allocation', title: `${data['#value+funding+other+plan_name']} Funding`, stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  // createFigure(hrpDiv, {className: 'funding-cerf-allocation', title: 'CERF Allocation 2022', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  // createFigure(hrpDiv, {className: 'funding-cbpf-allocation', title: 'CBPF Allocation 2022', stat: formatValue(data['#value+cbpf+funding+total+usd']), indicator: '#value+cbpf+funding+total+usd'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}
