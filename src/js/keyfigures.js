function setGlobalFigures() {
	var globalFigures = $('.global-figures');
	var globalFiguresSource = $('.global-figures .source-container');
	globalFigures.find('.figures, .source-container, .ranking-chart').empty();

	//ranking chart
	createRankingChart();

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		createSource(globalFiguresSource, '#affected+inneed');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numPINCountries);
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		createSource(globalFiguresSource, '#value+funding+required+usd');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Funding Required', '', formatValue(worldData['#value+funding+required+usd']));
		createKeyFigure('.figures', 'GHRP Requirement (COVID-19)', '', formatValue(worldData['#value+covid+funding+ghrp+required+usd']));
		createKeyFigure('.figures', 'Funding Coverage', '', percentFormat(worldData['#value+funding+pct']));
		createKeyFigure('.figures', 'Countries Affected', '', nationalData.length);
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		createSource(globalFiguresSource, '#value+cerf+covid+funding+total+usd');
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(worldData['#value+cerf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCERFCountries);
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		createSource(globalFiguresSource, '#value+cbpf+covid+funding+total+usd');
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(worldData['#value+cbpf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCBPFCountries);
	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createSource(globalFiguresSource, '#value+gdp+ifi+pct');
		createKeyFigure('.figures', 'Total Funding (IMF/World Bank)', '', formatValue(worldData['#value+ifi+global']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numIFICountries);
	}
	else {	
		//global figures
		createSource(globalFiguresSource, '#affected+infected');

		var totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
		var totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', numFormat(totalDeaths));

		var covidGlobal = covidTrendData.H63;
		var casesPerCapita = covidGlobal[covidGlobal.length-1].weekly_new_cases_per_ht;
		
		//weekly new cases per capita
		var weeklyTrend = covidGlobal[covidGlobal.length-1].weekly_new_cases_pc_change;
		createKeyFigure('.figures', 'Weekly number of new cases per 100,000 people', 'cases-capita', casesPerCapita.toFixed(0));
		var sparklineArray = [];
		covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_cases_per_ht};
      sparklineArray.push(obj);
    });
		createSparkline(sparklineArray, '.global-figures .cases-capita');

		//weekly trend
		createKeyFigure('.figures', 'Weekly trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
    var pctArray = [];
    covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_cases_pc_change};
      pctArray.push(obj);
    });
    createTrendBarChart(pctArray, '.global-figures .cases-trend');
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

