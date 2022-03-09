function vizTrack(view, content) {
  mpTrack(view, content);
  gaTrack('viz interaction', 'switch viz', 'oad covid-19 / '+view, content);
}

function mpTrack(view, content) {
  //mixpanel event
  mixpanel.track('viz interaction', {
    'page title': document.title,
    'embedded in': window.location.href,
    'action': 'switch viz',
    'viz type': 'ukr data explorer',
    'current view': view,
    'content': content
  });
}

function gaTrack(eventCategory, eventAction, eventLabel, type) {
  ga('send', 'event', eventCategory, eventAction, eventLabel, {
    'dimension2': type,
    hitCallback: function() {
      console.log('Finishing sending click event to GA')
    }
  });
}

function getMonth(m) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[m];
}

function compare(a, b) {
  const keyA = a.key.toLowerCase();
  const keyB = b.key.toLowerCase();

  let comparison = 0;
  if (keyA > keyB) {
    comparison = 1;
  } else if (keyA < keyB) {
    comparison = -1;
  }
  return comparison;
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 0.9, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", + lineHeight + "em").text(word);
      }
    }
  });
}

function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}

function formatValue(val) {
  var format = d3.format('$.3s');
  var value;
  if (!isVal(val)) {
    value = 'NA';
  }
  else {
    value = (isNaN(val) || val==0) ? val : format(val).replace(/G/, 'B');
  }
  return value;
}

function roundUp(x, limit) {
  return Math.ceil(x/limit)*limit;
}

function isVal(value) {
  return (value===undefined || value===null || value==='') ? false : true;
}

function regionMatch(region) {
  var match = false;
  var regions = region.split('|');
  for (var region of regions) {
    if (currentRegion=='' || region==currentRegion) {
      match = true;
      break;
    }
  }
  return match;
}

function hasGamData(data, indicator) {
  var hasGAM = false;
  if (indicator=='cases')
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined) ? true : false;
  else if (indicator=='deaths')
    hasGAM = (data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  else
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined || data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  return hasGAM;
}

function getGamText(data, indicator) {
  var gmText = '**Gender-Age Marker:<br>';
  for (var i=0;i<5;i++) {
    var pct = (data['#value+'+ indicator + '+funding+gm'+ i +'+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+funding+gm'+ i +'+total+usd'] / data['#value+'+ indicator + '+funding+total+usd']) : '0%';
    gmText += '['+i+']: ' + pct;
    gmText += ', ';
  }
  gmText += '[NA]: ';
  gmText += (data['#value+'+ indicator + '+funding+gmempty+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+funding+gmempty+total+usd'] / data['#value+'+ indicator +'+funding+total+usd']) : '0%';
  return gmText;
}

function getBeneficiaryText(data) {
  var beneficiaryText = 'Beneficiary breakdown:<br>';
  beneficiaryText += (data['#affected+cbpf+funding+men']!=undefined) ? percentFormat(data['#affected+cbpf+funding+men'] / data['#affected+cbpf+funding+total']) + ' Male, ' : '0% Male, ';
  beneficiaryText += (data['#affected+cbpf+funding+women']!=undefined) ? percentFormat(data['#affected+cbpf+funding+women'] / data['#affected+cbpf+funding+total']) + ' Female, ' : '0% Female, ';
  beneficiaryText += (data['#affected+boys+cbpf+funding']!=undefined) ? percentFormat(data['#affected+boys+cbpf+funding'] / data['#affected+cbpf+funding+total']) + ' Boys, ' : '0% Boys, ';
  beneficiaryText += (data['#affected+cbpf+funding+girls']!=undefined) ? percentFormat(data['#affected+cbpf+funding+girls'] / data['#affected+cbpf+funding+total']) + ' Girls' : '0% Girls';
  return beneficiaryText;
}

function createFootnote(target, indicator, text) {
  var indicatorName = (indicator==undefined) ? '' : indicator;
  var className = (indicatorName=='') ? 'footnote' : 'footnote footnote-indicator';
  var footnote = $('<p class="'+ className +'" data-indicator="'+ indicatorName +'">'+ truncateString(text, 65) +' <a href="#" class="expand">MORE</a></p>');
  $(target).append(footnote);
  footnote.click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(truncateString(text, 65) + ' <a href="#" class="expand">MORE</a>');
    }
    else {
      $(this).html(text + ' <a href="#" class="collapse">LESS</a>');
    }
  });
}

//regional id/name list
const regionalList = [
  {id: 'HRPs', name: 'Humanitarian Response Plan Countries'},
  {id: 'ROAP', name: 'Asia and the Pacific'},
  {id: 'ROCCA', name: 'Eastern Europe'},
  {id: 'ROLAC', name: 'Latin America and the Caribbean'},
  {id: 'ROMENA', name: 'Middle East and North Africa'},
  {id: 'ROSEA', name: 'Southern and Eastern Africa'},
  {id: 'ROWCA', name: 'West and Central Africa'}
];

//25 HRP country codes and raster ids
const countryCodeList = {
  AFG: '8oeer8pw',
  BDI: '85uxb0dw',
  BFA: '489tayev',
  CAF: '6stu6e7d',
  CMR: '6v09q3l9',
  COD: '70s1gowk',
  COL: 'awxirkoh',
  ETH: '8l382re2',
  GTM: '3cyria8u',
  HND: '8kvvnawe',
  HTI: '4in4ae66',
  IRQ: '079oa80i',
  LBY: '0o4l8ysb',
  MLI: '17y8a20i',
  MMR: '7wk9p4wu',
  MOZ: '5jojox7h',
  NER: '9gbs4a2a',
  NGA: '3ceksugh',
  //PAK: '94y0veay',
  PSE: '1emy37d7',
  SDN: 'a2zw3leb',
  SOM: '3s7xeitz',
  SSD: '3556pb27',
  SLV: '77ydes06',
  SYR: '2qt39dhl',
  TCD: 'd6tya3am',
  UKR: '8lye0x4r',//'adkwa0bw',
  VEN: '9vcajdlr',
  YEM: '3m20d1v8',
  //ZWE: '1ry8x8ul'
};

