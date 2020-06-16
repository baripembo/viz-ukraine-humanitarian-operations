function setGlobalFigures() {
	var globalFigures = $('.global-figures');
	globalFigures.find('.figures, .source').empty();
	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		globalFigures.find('h2').text('People in Need');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numPINCountries);
		createSource(globalFigures, '#affected+inneed');
	}
	//funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		globalFigures.find('h2').text('Humanitarian Funding Overview');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Funding Required', '', formatValue(worldData['#value+funding+required+usd']));
		createKeyFigure('.figures', 'GHRP Requirement (COVID-19)', '', formatValue(worldData['#value+covid+funding+ghrp+required+usd']));
		createKeyFigure('.figures', 'Funding Coverage', '', percentFormat(worldData['#value+funding+pct']));
		createKeyFigure('.figures', 'Countries Affected', '', nationalData.length);
		createSource(globalFigures, '#value+funding+required+usd');
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CERF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(worldData['#value+cerf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCERFCountries);
		createSource(globalFigures, '#value+cerf+covid+funding+total+usd');
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CBPF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(worldData['#value+cbpf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCBPFCountries);
		createSource(globalFigures, '#value+cbpf+covid+funding+total+usd');
	}
	//IFI
	else if (currentIndicator.id=='#value+ifi+percap') {
		globalFigures.find('h2').text('IFI Financing Overview');
		createKeyFigure('.figures', 'Total Funding (IMF/World Bank)', '', formatValue(worldData['#value+ifi+global']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numIFICountries);
		createSource(globalFigures, '#value+ifi+percap');
	}
	else {	
		//global figures
		var totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
		var totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
		globalFigures.find('h2').text('COVID-19 Pandemic in '+ nationalData.length +' GHRP Locations');
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', numFormat(totalDeaths));

		var covidGlobal = covidTrendData.H63;
		var casesPerCapita = covidGlobal[covidGlobal.length-1].weekly_new_cases_per_ht;
		var weeklyTrend = covidGlobal[covidGlobal.length-1].weekly_pc_change;
		createKeyFigure('.figures', 'Weekly number of new cases per 100,000 people', 'cases-capita', casesPerCapita.toFixed(0));

		var sparklineArray = [];
		covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_cases_per_ht};
      sparklineArray.push(obj);
    });
		createSparkline(sparklineArray, '.global-figures .cases-capita');

		createKeyFigure('.figures', 'Weekly trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(0) + '%');

    var pctArray = [];
    covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_pc_change};
      pctArray.push(obj);
    });
    createTrendBarChart(pctArray, '.global-figures .cases-trend');

		createSource(globalFigures, '#affected+infected');
	}
}

function createKeyFigure(target, title, className, value) {
  var targetDiv = $(target);
  return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div></div></div></div>");
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank">DATA</a></p>');
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
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}

