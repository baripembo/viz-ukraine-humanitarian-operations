var adm0_lookup = {
	"155": "Mali",
	"50": "Chad",
	"181": "Niger",
	"182": "Nigeria",
	"42": "Burkina Faso",
	"263": "Venezuela",
	"57": "Colombia",
	"70001": "South Sudan",
	"40764": "Sudan",
	"254": "Ukraine",
	"1": "Afghanistan",
	"171": "Myanmar",
	"269": "Yemen",
	"238": "Syrian Arab Republic",
	"118": "Iraq",
	"145": "Libya",
	"226": "Somalia",
	"79": "Ethiopia",
	"68": "Democratic Republic of the Congo",
	"271": "Zimbabwe",
	"45": "Cameroon",
	"49": "Central African Republic",
	"43": "Burundi",
	"108": "Haiti",
	"999": "State of Palestine"
}

function getCountryNameByID(adm0_id) {
	return adm0_lookup[adm0_id];
}

function getCountryIDByName(adm0_name) {
	const entries = Object.entries(adm0_lookup)
	for (const [id, name] of entries) {
  	if (name==adm0_name) return id;
	}
}