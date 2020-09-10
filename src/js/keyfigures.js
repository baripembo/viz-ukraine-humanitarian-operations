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
				data = d;
			}
		});
	}

	var totalCountries = 0;
	nationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#severity+access+category' || currentIndicator.id=='#severity+inform+type') {
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
		var totalPIN = d3.sum(nationalData, function(d) {
			if (regionMatch(d['#region+name'])) {
				return +d['#affected+inneed']; 
			}
		});
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//access security
	else if (currentIndicator.id=='#severity+access+category') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var accessLabels = ['Top Access Constraints into Country','Top Access Constraints within Country','Top Impacts','Countries with Existing Mitigation Measures'];
		var accessTags = ['#access+constraints+into','#access+constraints+within','#access+impact','#access+mitigation'];
		var content;
		accessTags.forEach(function(tag, index) {
			var descArr = (data[tag+'+desc']!=undefined) ? data[tag+'+desc'].split('|') : [];
			var pctArr = (data[tag+'+pct']!=undefined) ? data[tag+'+pct'].split('|') : [];
			content = '<h6>'+ accessLabels[index] +'</h6><ul class="access-figures">';
			pctArr.forEach(function(item, index) {
				if (tag=='#access+mitigation') {
					content += '<li><div class="pct">'+ Math.round(item*100)+'%' + '</div><div class="desc">Yes</div></li>';
					content += '<li><div class="pct">'+ Math.round((1-item)*100)+'%' + '</div><div class="desc">No</div></li>';
				}
				else {
					content += '<li><div class="pct">'+ Math.round(item*100)+'%' + '</div><div class="desc">' + descArr[index] +'</div></li>';
				}
			})
			content += '</ul>';
			$('.figures').append(content);
		});
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
			var gmText = '**Gender age marker: ';
			gmText += '[NA]: ';
			gmText += (data['#value+cerf+covid+funding+gmempty+total+usd']!=undefined) ? percentFormat(data['#value+cerf+covid+funding+gmempty+total+usd'] / data['#value+cerf+covid+funding+total+usd']) : '0%';
			gmText += ', ';
			for (var i=0;i<5;i++) {
				var pct = (data['#value+cerf+covid+funding+gm'+ i +'+total+usd']!=undefined) ? percentFormat(data['#value+cerf+covid+funding+gm'+ i +'+total+usd'] / data['#value+cerf+covid+funding+total+usd']) : '0%';
				gmText += '['+i+']: ' + pct;
				if (i<4) gmText += ', ';
			}
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(data['#value+cbpf+covid+funding+total+usd']));
		
		//gam
		if (data['#value+cbpf+covid+funding+total+usd'] > 0) {
			var gmText = '**Gender age marker: ';
			gmText += '[NA]: ';
	    gmText += (data['#value+cbpf+covid+funding+gmempty+total+usd']!=undefined) ? percentFormat(data['#value+cbpf+covid+funding+gmempty+total+usd'] / data['#value+cbpf+covid+funding+total+usd']) : '0%';
	    gmText += ', ';
			for (var i=0;i<5;i++) {
				var pct = (data['#value+cbpf+covid+funding+gm'+ i +'+total+usd']!=undefined) ? percentFormat(data['#value+cbpf+covid+funding+gm'+ i +'+total+usd'] / data['#value+cbpf+covid+funding+total+usd']) : '0%';
				gmText += '['+i+']: ' + pct;
				if (i<4) gmText += ', ';
			}
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}

		//beneficieries
		if (data['#affected+cbpf+covid+funding+total'] > 0) {
			var beneficiaryText = 'Beneficiary breakdown: ';
			beneficiaryText += (data['#affected+cbpf+covid+funding+men']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+men'] / data['#affected+cbpf+covid+funding+total']) + ' Male, ' : '0% Male, ';
			beneficiaryText += (data['#affected+cbpf+covid+funding+women']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+women'] / data['#affected+cbpf+covid+funding+total']) + ' Female, ' : '0% Female, ';
			beneficiaryText += (data['#affected+boys+cbpf+covid+funding']!=undefined) ? percentFormat(data['#affected+boys+cbpf+covid+funding'] / data['#affected+cbpf+covid+funding+total']) + ' Boys, ' : '0% Boys, ';
			beneficiaryText += (data['#affected+cbpf+covid+funding+girls']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+girls'] / data['#affected+cbpf+covid+funding+total']) + ' Girls' : '0% Girls';
			$('.figures .key-figure .inner').append('<div class="small">'+ beneficiaryText +'</div>');
		}

		//num countries
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Total Funding (IMF/World Bank)', '', formatValue(data['#value+ifi+total']));
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//covid figures
	else if (currentIndicator.id=='#covid+cases+per+capita') {
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
		var weeklyCases = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1].weekly_new_cases : 0;
		var weeklyDeaths = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1].weekly_new_deaths : 0;
		var weeklyTrend = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1].weekly_new_cases_pc_change : 0;
		
		if (covidGlobal!=undefined) {
			//weekly new cases
			createKeyFigure('.figures', 'Weekly Number of New Cases', 'weekly-cases', shortenNumFormat(weeklyCases));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      	var obj = {date: d.Date_reported, value: d.weekly_new_cases};
	     	sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.global-figures .weekly-cases');

			//weekly new deaths
			createKeyFigure('.figures', 'Weekly Number of New Deaths', 'weekly-deaths', shortenNumFormat(weeklyDeaths));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      var obj = {date: d.Date_reported, value: d.weekly_new_deaths};
	      sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.global-figures .weekly-deaths');

			//weekly trend
			createKeyFigure('.figures', 'Weekly Trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
	    var pctArray = [];
	    covidGlobal.forEach(function(d) {
	      var obj = {date: d.Date_reported, value: d.weekly_new_cases_pc_change};
	      pctArray.push(obj);
	    });
	    createTrendBarChart(pctArray, '.global-figures .cases-trend');
		}
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	if (currentIndicator.id!='#severity+access+category') {
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
	if (indicator=='#severity+access+category') indicator = '#severity+access+category+num';
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}

