function setKeyFigures() {
	var secondaryPanel = $('.secondary-panel');
	var secondaryPanelSource = $('.secondary-panel .source-container');
	secondaryPanel.find('.figures, .source-container, .ranking-chart').empty();
	secondaryPanel.find('.source-container').show();

	//title
	secondaryPanel.find('.secondary-panel-title').html(currentIndicator.title);

	//source
	var indicator = currentIndicator.id;
	if (indicator=='#affected+inneed+pct') indicator = '#affected+inneed';
	if (indicator=='#event+year+todate+num') indicator = '#access-data';
	createSource(secondaryPanelSource, indicator);

	//set global stats
	var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	var globalFigures = '<b>Global COVID-19 Figures:</b><br>'+ d3.format('.3s')(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths';
	
	//show global vax stat only on covax layer
	if (currentIndicator.id=='#targeted+doses+delivered+pct' && worldData['#capacity+doses+administered+total']!=undefined) {
		var totalAdministeredVal = d3.format('.3s')(worldData['#capacity+doses+administered+total']).replace(/G/,"B");
		globalFigures += '<br><br><b>Global vaccines administered: '+ totalAdministeredVal +'</b>';
	}
	
	//print global stats
	secondaryPanel.find('.global-figures').html(globalFigures);

	//if on covax layer, show HRP data by default
	currentRegion = (currentIndicator.id=='#targeted+doses+delivered+pct' && (currentRegion=='' || currentRegion=='HRPs')) ? 'HRPs' : d3.select('.region-select').node().value;

	//get regional data
	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = d;
			}
		});
	}

	//tally countries with data
	var totalCountries = 0;
	nationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#severity+inform+type' || currentIndicator.id=='#impact+type') {
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
		var affectedPIN = (data[indicator]==undefined) ? 0 : (d3.format('.4s'))(data[indicator]);
		if (currentRegion=='') {
			//global stats
			affectedPIN = (d3.format('.4s'))(data['#affected+inneed']);
			totalCountries =  data['#meta+countries+inneed+num'];
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', affectedPIN);
	}
	//vaccine rollout
	else if (currentIndicator.id=='#targeted+doses+delivered+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'COVAX Allocations Round 4 – 9 (Number of Doses)', '', data['#capacity+doses+forecast+covax']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+forecast+covax']));
		var covaxDelivered = data['#capacity+doses+delivered+covax'];
		covaxDelivered = (covaxDelivered > 0) ? shortenNumFormat(covaxDelivered) : covaxDelivered;
		createKeyFigure('.figures', 'COVAX Delivered (Number of Doses)', '', covaxDelivered);
		createKeyFigure('.figures', 'Other Delivered (Number of Doses)', '', data['#capacity+doses+delivered+others']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+delivered+others']));
		createKeyFigure('.figures', 'Total Delivered (Number of Doses)', '', data['#capacity+doses+delivered+total']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+delivered+total']));
		createKeyFigure('.figures', 'Total Administered (Number of Doses)', '', data['#capacity+doses+administered+total']==undefined ? 'NA' : shortenNumFormat(data['#capacity+doses+administered+total']));
	} 
	//IPC
	else if (currentIndicator.id=='#affected+food+p3plus+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var ipcTotal = (data['#affected+food+ipc+p3plus+num']==undefined) ? 0 : d3.format('.3s')(data['#affected+food+ipc+p3plus+num']);
		createKeyFigure('.figures', 'Total number of people in IPC 3+', '', ipcTotal);
	}
	//SAM
	else if (currentIndicator.id=='#affected+children+sam') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var samTotal = (data[indicator]==undefined) ? 0 : d3.format('.3s')(data[indicator]);
		createKeyFigure('.figures', 'Number of Admissions', '', samTotal);
	}
	//access severity
	else if (currentIndicator.id=='#event+year+todate+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#event+year+todate+num']!=undefined) createKeyFigure('.figures', 'Total Violent Security Incidents Against Aid Workers since Jan 2020', '', data['#event+year+todate+num']);
		if (data['#access+visas+pct']!=undefined) createKeyFigure('.figures', 'Average of Visas Pending or Denied', '', percentFormat(data['#access+visas+pct']));
		if (data['#access+travel+pct']!=undefined) createKeyFigure('.figures', 'Average of Travel Authorizations Denied', '', percentFormat(data['#access+travel+pct']));
		if (data['#activity+cerf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CERF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cerf+project+insecurity+pct']));
		if (data['#activity+cbpf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CBPF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cbpf+project+insecurity+pct']));
	}
	//school closures
	else if (currentIndicator.id=='#impact+type') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var affectedLearners = (data['#affected+learners']==undefined) ? 0 : d3.format('.3s')(data['#affected+learners']);
		var affectedLearnersPct = (data['#affected+learners+pct']==undefined) ? '0%' : percentFormat(data['#affected+learners+pct']);
		var statusClosed = (data['#status+country+closed']==undefined) ? 0 : data['#status+country+closed'];
		createKeyFigure('.figures', 'Number of Affected Learners', '', affectedLearners);
		createKeyFigure('.figures', 'Percentage of Affected Learners in GHO countries', '', affectedLearnersPct);
		createKeyFigure('.figures', 'Number of Country-Wide Closures', '', statusClosed);
	} 
	//immunizations
	else if (currentIndicator.id=='#vaccination+postponed+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		var postponedNum = (data[indicator]==undefined) ? 0 : data[indicator];
		createKeyFigure('.figures', 'Total number of immunization campaigns postponed due to COVID', '', postponedNum);
	}
	//vaccine financing
	else if (currentIndicator.id=='#value+financing+approved') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Approved Funding (World Bank and GAVI)', '', formatValue(data['#value+financing+approved']));
		createKeyFigure('.figures', 'GAVI CDS (Early Access / Approved)', '', formatValue(data['#value+financing+gavi+approved']));
		createKeyFigure('.figures', 'GAVI CDS (Early Access / Disbursed)', '', formatValue(data['#value+financing+gavi+disbursed']));
		createKeyFigure('.figures', 'World Bank (Approved)', '', formatValue(data['#value+financing+worldbank+approved']));
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		var numCountries = 0;
		nationalData.forEach(function(d) {
			if (regionMatch(d['#region+name'])) {
				numCountries++;
			}
		});
		createKeyFigure('.figures', 'Number of Countries', '', numCountries);
		createKeyFigure('.figures', 'Total Funding Required (GHO 2021)', '', formatValue(data['#value+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'Total Funding Level', '', percentFormat(data['#value+funding+hrp+pct']));
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+funding+total+usd') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#value+cerf+contributions+total+usd']!=undefined) createKeyFigure('.figures', 'Total Contribution', '', formatValue(data['#value+cerf+contributions+total+usd']));
		createKeyFigure('.figures', 'Total CERF Funding 2021', 'total-funding', formatValue(data['#value+cerf+funding+total+usd']));
		if (data['#value+cerf+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cerf');
			$('.figures .key-figure .inner .total-funding').append('<div class="small">'+ gmText +'</div>');
		}
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+funding+total+usd') {
		//num countries
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#value+cbpf+contributions+total+usd']!=undefined) createKeyFigure('.figures', 'Total Contribution', '', formatValue(data['#value+cbpf+contributions+total+usd']));
		createKeyFigure('.figures', 'Total CBPF Funding 2021', 'total-funding', formatValue(data['#value+cbpf+funding+total+usd']));
		
		//gam
		if (data['#value+cbpf+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cbpf');
			$('.figures .key-figure .inner .total-funding').append('<div class="small">'+ gmText +'</div>');
		}

		//beneficieries
		if (data['#affected+cbpf+funding+total'] > 0) {
			var beneficiaryText = getBeneficiaryText(data);
			$('.figures .key-figure .inner').append('<div class="small">'+ beneficiaryText +'</div>');
		}

	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Funding', '', formatValue(data['#value+ifi+total']));
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
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));

		var covidGlobal = (currentRegion!='') ? covidTrendData[currentRegion] : covidTrendData.GHO;
		var weeklyCases = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+weekly'] : 0;
		var weeklyDeaths = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+killed+new+weekly'] : 0;
		var weeklyTrend = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+pct+weekly']*100 : 0;
		
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
	      var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']*100};
	      pctArray.push(obj);
	    });
			createSparkline(pctArray, '.secondary-panel .cases-trend');
	    //createTrendBarChart(pctArray, '.secondary-panel .cases-trend');
		}
	}
	else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
		//num countries
		createKeyFigure('.figures', 'Number of Countries with Sex-disaggregated data', '', totalCountries);

		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	$('.ranking-container').show();
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
  var isGlobal = ($('.content').hasClass('country-view')) ? false : true;
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}

