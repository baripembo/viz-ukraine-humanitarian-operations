function setKeyFigures() {
	var secondaryPanel = $('.secondary-panel');
	var secondaryPanelSource = $('.secondary-panel .source-container');
	secondaryPanel.find('.figures, .source-container, .ranking-chart').empty();
	secondaryPanel.find('.source-container').show();

	//source
	var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;
	createSource(secondaryPanelSource, indicator);

	//global stats
	var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	secondaryPanel.find('.global-figures').html('<b>Global COVID-19 Figures:</b><br>'+ shortenNumFormat(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths');

	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = d;
			}
		});
	}

	var totalCountries = 0;
	nationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#access+visas+pct' || currentIndicator.id=='#severity+inform+type') {
				if (val!=undefined)
					totalCountries++;
			}
			else {
				if (isVal(val) && !isNaN(val)) {
					totalCountries++;
				}
			}
		}
	});

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		// var totalPIN = d3.sum(nationalData, function(d) {
		// 	if (regionMatch(d['#region+name'])) {
		// 		return +d['#affected+inneed']; 
		// 	}
		// });
		//hardcoding PIN to match OCHA data
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', '431M');//(d3.format('.4s'))(totalPIN)
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//access severity
	else if (currentIndicator.id=='#access+visas+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Average of all countries visas pending', '', 'XX');
		createKeyFigure('.figures', 'Average of all countries travel authorizations', '', 'XX');
		createKeyFigure('.figures', 'Total incidents in 2020', '', 'XX');
		createKeyFigure('.figures', 'Average of CERF projects affected', '', 'XX');
		createKeyFigure('.figures', 'Average of CBPF projects affected', '', 'XX');
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		var numCountries = 0;
		nationalData.forEach(function(d) {
			if (regionMatch(d['#region+name'])) {
				numCountries++;
			}
		});
		createKeyFigure('.figures', 'Total Funding Required (including COVID-19 GHRP)', '', formatValue(data['#value+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'Total Funding Level', '', percentFormat(data['#value+funding+hrp+pct']));
		createKeyFigure('.figures', 'COVID-19 GHRP Requirement', '', formatValue(data['#value+covid+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'COVID-19 GHRP Funding Level', '', percentFormat(data['#value+covid+funding+hrp+pct']));
		createKeyFigure('.figures', 'Number of Countries', '', numCountries);
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(data['#value+cerf+covid+funding+total+usd']));
		if (data['#value+cerf+covid+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cerf');
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(data['#value+cbpf+covid+funding+total+usd']));
		
		//gam
		if (data['#value+cbpf+covid+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cbpf');
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}

		//beneficieries
		if (data['#affected+cbpf+covid+funding+total'] > 0) {
			var beneficiaryText = getBeneficiaryText(data);
			$('.figures .key-figure .inner').append('<div class="small">'+ beneficiaryText +'</div>');
		}

		//num countries
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Total Funding', '', formatValue(data['#value+ifi+total']));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//covid figures
	else if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));

		var covidGlobal = (currentRegion!='') ? covidTrendData[currentRegion] : covidTrendData.H63;
		var weeklyCases = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+weekly'] : 0;
		var weeklyDeaths = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+killed+new+weekly'] : 0;
		var weeklyTrend = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+pct+weekly'] : 0;
		
		if (covidGlobal!=undefined) {
			//weekly new cases
			createKeyFigure('.figures', 'Weekly Number of New Cases', 'weekly-cases', shortenNumFormat(weeklyCases));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      	var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
	     	sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-cases');

			//weekly new deaths
			createKeyFigure('.figures', 'Weekly Number of New Deaths', 'weekly-deaths', shortenNumFormat(weeklyDeaths));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
	      sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-deaths');

			//weekly trend
			createKeyFigure('.figures', 'Weekly Trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
	    var pctArray = [];
	    covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']};
	      pctArray.push(obj);
	    });
			createSparkline(pctArray, '.secondary-panel .cases-trend');
	    //createTrendBarChart(pctArray, '.secondary-panel .cases-trend');
		}
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	if (currentIndicator.id!='#access+visas+pct') {
		$('.ranking-container').show();
		createRankingChart();
	}
	else {
		$('.ranking-container').hide();
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
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
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
	if (indicator=='#affected+food+p3plus+pct') indicator = '#affected+food+ipc+p3plus+pct';
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}

