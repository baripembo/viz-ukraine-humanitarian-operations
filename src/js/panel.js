/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  //updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name'] + ' Data Explorer');

   //black sea grain initiative key figures
  var grainDiv = $('.country-panel .grain .panel-inner');
  createFigure(grainDiv, {className: 'voyages', title: 'Number of Outbound Voyages', stat: data['#indicator+voyages+num'], indicator: '#indicator+voyages+num'});
  createFigure(grainDiv, {className: 'tonnage', title: 'Tonnage of Commodities', stat: shortenNumFormat(data['#indicator+commodities+num']), indicator: '#indicator+commodities+num'});

  //humanitarian impact key figures
  var refugeesDiv = $('.country-panel .refugees .panel-inner');
  createFigure(refugeesDiv, {className: 'refugees', title: 'Refugees from Ukraine recorded across Europe (total)', stat: shortenNumFormat(regionalData['#affected+refugees']), indicator: '#affected+refugees'});
  createFigure(refugeesDiv, {className: 'idps', title: 'Internally Displaced People (estimated)', stat: shortenNumFormat(data['#affected+idps']), indicator: '#affected+idps'});
  createFigure(refugeesDiv, {className: 'casualties-killed', title: 'Civilian Casualties - Killed', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});
  createFigure(refugeesDiv, {className: 'casualties-injured', title: 'Civilian Casualties - Injured', stat: numFormat(data['#affected+injured']), indicator: '#affected+injured'});
  createFigure(refugeesDiv, {className: 'people-reached', title: 'People reached within Ukraine (total)', stat: shortenNumFormat(data['#reached+ind']), indicator: '#reached+ind'});
  createFigure(refugeesDiv, {className: 'orgs', title: 'Humanitarian orgs present within Ukraine (total)', stat: numFormat(data['#org+count+num']), indicator: '#org+count+num'});
  createFigure(refugeesDiv, {className: 'attacks-health', title: 'Attacks on Health Care', stat: numFormat(data['#indicator+attacks+healthcare+num']), indicator: '#indicator+attacks+healthcare+num'});
  createFigure(refugeesDiv, {className: 'attacks-education', title: 'Attacks on Education Facilities', stat: numFormat(data['#indicator+attacks+education+num']), indicator: '#indicator+attacks+education+num'});

  //refugee sparkline
  var sparklineArray = [];
  refugeeTimeseriesData.forEach(function(d) {
    var obj = {date: d['#affected+date+refugees'], value: d['#affected+refugees']};
    sparklineArray.push(obj);
  });

  if ($('.figure.refugees .stat .sparkline').length<=0) createSparkline(sparklineArray, '.figure.refugees .stat');

  //casualty sparklines
  let killedArray = [];
  let injuredArray = [];
  casualtiesTimeseriesData.forEach(function(d) {
    let killedObj = {date: d['#date'], value: d['#affected+killed']};
    killedArray.push(killedObj);

    let injuredObj = {date: d['#date'], value: d['#affected+injured']};
    injuredArray.push(injuredObj);
  });
  createSparkline(killedArray, '.figure.casualties-killed .stat');
  createSparkline(injuredArray, '.figure.casualties-injured .stat');


  //funding
  var fundingDiv = $('.country-panel .funding .panel-inner');
  fundingDiv.children().remove();
  createFigure(fundingDiv, {className: 'funding-flash-required', title: 'Flash Appeal Requirement', stat: formatValue(data['#value+funding+other+required+usd']), indicator: '#value+funding+other+required+usd'});
  createFigure(fundingDiv, {className: 'funding-flash-allocation', title: 'Flash Appeal Funding', stat: formatValue(data['#value+funding+other+total+usd']), indicator: '#value+funding+other+total+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-required', title: 'Regional Refugee Response Plan Requirement', stat: formatValue(regionalData['#value+funding+rrp+required+usd']), indicator: '#value+funding+rrp+required+usd'});
  createFigure(fundingDiv, {className: 'funding-regional-allocation', title: 'Regional Refugee Response Plan Funding', stat: formatValue(regionalData['#value+funding+rrp+total+usd']), indicator: '#value+funding+rrp+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-required', title: 'CERF Allocation', stat: formatValue(data['#value+cerf+funding+total+usd']), indicator: '#value+cerf+funding+total+usd'});
  createFigure(fundingDiv, {className: 'funding-humanitarian-allocation', title: 'Humanitarian Fund Allocation', stat: formatValue(data['#value+funding+uhf+usd']), indicator: '#value+funding+uhf+usd'});


  createPieChart([data['#value+funding+other+required+usd'], data['#value+funding+other+total+usd']], '.figure.funding-flash-required .stat');
  createPieChart([regionalData['#value+funding+rrp+required+usd'], regionalData['#value+funding+rrp+total+usd']], '.figure.funding-regional-required .stat');
}



function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  if (obj.indicator!='')
    createSource(divInner, obj.indicator);
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));

  //format date for acled source
  if (indicator=='#date+latest+acled') {
    sourceObj['#date+start'] = getSource('#date+start+conflict')['#date'];
    let startDate = new Date(sourceObj['#date+start']);
    date = `${d3.utcFormat("%b %d")(startDate)} - ${date}`;
  }
  //dont show data link for hostilities, sent to undefined
  if (indicator=='#event+loc') {
    sourceObj['#meta+url'] = undefined;
  }

  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  let sourceContent = `<p class='small source'><span class='date'>${date}</span> | <span class='source-name'>${sourceName}</span>`;
  if (sourceURL!=='#') sourceContent += ` | <a href='${sourceURL}' class='dataURL' target='_blank' rel='noopener'>DATA</a>`;
  sourceContent += `</p>`;
  div.append(sourceContent);
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.find('.date').text(date);
  div.find('.source-name').text(sourceName);
  div.find('.dataURL').attr('href', sourceURL);
}

function getSource(indicator) {
  var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}