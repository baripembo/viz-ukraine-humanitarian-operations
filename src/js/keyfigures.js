function setGlobalFigures() {
	var globalFigures = $('.global-figures');
	var globalFiguresSource = $('.global-figures .source-container');
	globalFigures.find('.figures, .source-container, .ranking-chart').empty();
	globalFigures.find('.source-container').show();

	var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;
	createSource(globalFiguresSource, indicator);

	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = regionalData;
			}
		});
	}

	var totalCountries = 0;
	nationalData.forEach(function(d) {
		if (currentRegion=='' || d['#region+name']==currentRegion) {
			var val = d[currentIndicator.id];
			if (isVal(val) && !isNaN(val)) {
				totalCountries++;
			}
		}
	});

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		var totalPIN = d3.sum(nationalData, function(d) {
			if (currentRegion=='' || d['#region+name']==currentRegion) {
				return +d['#affected+inneed']; 
			}
		});
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		createKeyFigure('.figures', 'Total Funding Required', '', formatValue(data['#value+funding+required+usd']));
		createKeyFigure('.figures', 'GHRP Requirement (COVID-19)', '', formatValue(data['#value+covid+funding+ghrp+required+usd']));
		createKeyFigure('.figures', 'Funding Coverage', '', percentFormat(data['#value+funding+pct']));
		createKeyFigure('.figures', 'Countries Affected', '', totalCountries);
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(data['#value+cerf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(data['#value+cbpf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Total Funding (IMF/World Bank)', '', formatValue(data['#value+ifi+global']));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//covid figures
	else if (currentIndicator.id=='#covid+cases+per+capita') {
		var totalCases = d3.sum(nationalData, function(d) { 
			if (currentRegion=='' || d['#region+name']==currentRegion)
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (currentRegion=='' || d['#region+name']==currentRegion)
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));

		var covidGlobal = (currentRegion!='') ? covidTrendData[currentRegion] : covidTrendData.H63;
		var weeklyCases = covidGlobal[covidGlobal.length-1].weekly_new_cases;
		var weeklyDeaths = covidGlobal[covidGlobal.length-1].weekly_new_deaths;
		var weeklyTrend = covidGlobal[covidGlobal.length-1].weekly_new_cases_pc_change;
		
		//weekly new cases
		createKeyFigure('.figures', 'Weekly number of new cases', 'weekly-cases', shortenNumFormat(weeklyCases));
		var sparklineArray = [];
		covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_cases};
      sparklineArray.push(obj);
    });
		createSparkline(sparklineArray, '.global-figures .weekly-cases');

		//weekly new deaths
		createKeyFigure('.figures', 'Weekly number of new deaths', 'weekly-deaths', shortenNumFormat(weeklyDeaths));
		var sparklineArray = [];
		covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_deaths};
      sparklineArray.push(obj);
    });
		createSparkline(sparklineArray, '.global-figures .weekly-deaths');

		//weekly trend
		createKeyFigure('.figures', 'Weekly trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
    var pctArray = [];
    covidGlobal.forEach(function(d) {
      var obj = {date: d.date_epicrv, value: d.weekly_new_cases_pc_change};
      pctArray.push(obj);
    });
    createTrendBarChart(pctArray, '.global-figures .cases-trend');
	}
	else {
		//no global figures
	}

	//ranking chart
	createRankingChart();
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

