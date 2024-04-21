////////////////////
///
///
///   georoutefind.html
///     - geojsonPathFinder.min.js
///     - ghGeoRouteBroadcast.js
///     - ghGeoRouteFind.js
///    -- 
///
///
///
///
///


var MapR = null;
var GH_REV = '5.1';

var LineWidth = 4;
var PolylineColor = new Array(
    '#0000FF', '#800000',  '#000080', '#800080',
    '#008080', '#808000' , '#008000' , '#FF00FF' ,
    '#00FF00' , '#FF0000' , '#00FFFF', '#FFFF00' );

var PolylineColorCnt = 0;
var PolylineColorLen = PolylineColor.length;

//
// MAP base layer
//
var GH_LMAP_LAYER0_R = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
});
var GH_LMAP_LAYER1_R = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});
var GH_LMAP_LAYER2_R = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
});


/////////////////////

var LoadData = {
    "file" : null,
    "geojson" : null
};

var StationData = {
    "file" : null,
    "marker" : [],
    "json" : null
};

var LineRoute = {};

var LineRouteOverlapPoints = [];
var SelectedLineRoute = [];
var GeometryLabel = ['_A','_B','_C','_D','_E','_F','_G','_H','_I','_J','_K','_L','_M','_N','_O','_P','_Q','_R','_S','_T','_U','_V','_W','_X','_Y','_Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT','AU','AV','AW','AX','AY','AZ','BA','BB','BC','BD','BE','BF','BG','BH','BI','BJ','BK','BL','BM','BN','BO','BP','BQ','BR','BS','BT','BU','BV','BW','BX','BY','BZ'];

var StationDialog = null;
var SimpleMarkerControl = null;

var StationDetectDistance = 100; // [m]

/////////////////////

L.Marker.prototype.setTitle = function (title) {
    if (this._icon) {
	this._icon.title = title;
    }
    this.options.title = title;
};
L.Marker.prototype.getTitle = function () {
    if (this._icon) {
	return this._icon.title;
    } else {
	return this.options.title;
    }
};
L.Marker.prototype.setPointType = function (type) {
    this.options.pointtype = type;
};
L.Marker.prototype.getPointType = function (type) {
    if (this.options.pointtype) {
	return this.options.pointtype;
    } else {
	return "station";
    }
};
L.Marker.prototype.setPointRange = function (range) {
    // unit [m] 5,30,100...
    this.options.pointrange = range;
};
L.Marker.prototype.getPointRange = function (range) {
    if (this.options.pointrange) {
	return parseInt(this.options.pointrange,10);
    } else {
	return StationDetectDistance;
    }
};

function ghChangeSyncMaps( flag ) {
    if ( flag ) {
	regist_map_end_event();
    } else {
	unregist_map_end_event();
    }
    var data = { issync: flag, center: null , zoom: null }; 
    ghBroadcastMapSync(data);
}

////////////////////////////////
function ghInitMaterializeUI() {

    $('#gh_linedatamodal').modal();

    $( '#gh_synccheck').change(function(){
	ghChangeSyncMaps( $(this).is(':checked') );
    });
    
    $('#gh_aboutmodal').modal();
    $('#gh_routemodal').modal();
    $('#gh_geometrydownloadmodal').modal();
    
}

function ghShowCoordinates (e) {
    alert(e.latlng);
}
function ghCenterMap (e) {
    MapR.panTo(e.latlng);
}
function ghZoomIn (e) {
    MapR.zoomIn();
}
function ghZoomOut (e) {
    MapR.zoomOut();
}
function ghZoomIn2 (e) {
    MapR.zoomIn();
    setTimeout(ghZoomIn,400);
}
function ghZoomOut2 (e) {
    MapR.zoomOut();
    setTimeout(ghZoomOut,400);
}

function event_end_map(e) {
    var z = MapR.getZoom();
    var c = MapR.getCenter();
    var flag =  $('input[name="mapsync"]').prop('checked');
    var data = { issync: flag, center: c , zoom: z }; 
    ghBroadcastMapSync(data);
}
function regist_map_end_event() {
    MapR.on('zoomend', event_end_map );
    MapR.on('moveend', event_end_map );
}
function unregist_map_end_event() {
    MapR.off('zoomend', event_end_map );
    MapR.off('moveend', event_end_map );
}
function ghInitMaps() {

    //
    // MAP initialize
    //

    MapR = L.map('gh_jsonmap',{
	contextmenu: true,
	contextmenuWidth: 140,
	contextmenuItems: [{
	    text: 'Show coordinates',
	    callback: ghShowCoordinates
	}, {
	    text: 'Center map here',
	    callback: ghCenterMap
	}, '-', {
	    text: 'Zoom in',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn
	}, {
	    text: 'Zoom out',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut
	}, {
	    text: 'Zoom in x2',
	    icon: 'libs/img/zoom-in.png',
	    callback: ghZoomIn2
	}, {
	    text: 'Zoom out x2',
	    icon: 'libs/img/zoom-out.png',
	    callback: ghZoomOut2
	}]

    }).setView([39.74739, -10], 3);

    L.control.scale().addTo(MapR);
    //
    // Leaflet.GeometryUtil-0.9.3.zip
    // Leaflet.Snap-0.0.5.zip
    // Leaflet.draw-0.4.14.zip
    //
    //
    //  https://github.com/makinacorpus/Leaflet.Snap
    //
    //

    // MAP control
    //
    MapR.addControl(new L.Control.Layers({
	'OSM':GH_LMAP_LAYER0_R,
	'Esri地図':GH_LMAP_LAYER1_R,
	'Esri写真':GH_LMAP_LAYER2_R
    }, {},{position:'topright'}));
    GH_LMAP_LAYER0_R.addTo(MapR);

    StationDialog = L.control.dialog({size:[300,180]})
    .setContent("<p>Hello! Welcome to your nice new dialog box!</p>")
    .addTo(MapR);
    StationDialog.close();

    SimpleMarkerControl = new L.Control.SimpleMarkers({marker_draggable: true,add_marker_callback:ghAddStationMarker});
    MapR.addControl(SimpleMarkerControl);

}


///////////////////////////////////////


function ghOnclickStationDialogOK(idx) {
    var title = $( "#gh_stationname" ).val();
    var type = $("input[name='point_type']:checked").val();
    var range = $("input[name='point_range']:checked").val();
    StationData.marker[idx].setTitle(title);
    StationData.marker[idx].setPointType(type);
    StationData.marker[idx].setPointRange(range);    
    StationDialog.close();
}

function ghShowStationMarkerDialog(ev) {
    var title = StationData.marker[ev.target.idx].getTitle();
    var type = StationData.marker[ev.target.idx].getPointType();
    var range = StationData.marker[ev.target.idx].getPointRange();
    if ( type == "station" ) {
	var typestation = "checked";
	var typepassing = "";
    } else {
	var typestation = "";
	var typepassing = "checked";
    }
    if ( range == 5 ) {
	var range5 = "checked";
	var range30 = "";
	var range100 = "";
    } else if ( range == 30 ) {
	var range5 = "";
	var range30 = "checked";
	var range100 = "";
    } else {
	var range5 = "";
	var range30 = "";
	var range100 = "checked";
    }
    var txt = "<label><input name=\"point_type\" value=\"station\" type=\"radio\" " + typestation + "/><span>Station</span></label>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;";
    txt += "<label><input name=\"point_type\" value=\"passing\" type=\"radio\" " + typepassing + "/><span>Passing</span></label><BR>";
    txt += "<input type=\"text\" size=\"32\" id=\"gh_stationname\" value=\"" + title + "\">";

    txt += "<label><input name=\"point_range\" value=\"5\" type=\"radio\" " + range5 + "/><span>5m</span></label>&nbsp;&nbsp;&nbsp;";
    txt += "<label><input name=\"point_range\" value=\"30\" type=\"radio\" " + range30 + "/><span>30m</span></label>&nbsp;&nbsp;&nbsp;";
    txt += "<label><input name=\"point_range\" value=\"100\" type=\"radio\" " + range100 + "/><span>100m</span></label><BR>";

    txt += "<button id=\"button100\" onclick=\"ghOnclickStationDialogOK(" + ev.target.idx + ")\">OK</button>";
    StationDialog.setContent(txt);
    StationDialog.open();
}
function ghAddStationMarker(m) {
    m.on('click', ghShowStationMarkerDialog ) ;
    m.idx = StationData.marker.length;
    m.options.title = 'default_'+m.idx;
    StationData.marker.push(m);
}

function ghBaseName(str) {
   var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
   return base;
}

function ghUploadStationJSON( data ) {

    StationData.marker = [];
    
    var files = data.files;
    var reader = new FileReader();
    StationData.file = escape(files[0].name);
    reader.readAsText(files[0]);
    reader.onload = function(e) {
        StationData.json = JSON.parse(e.target.result);

	var stations = StationData.json.stations;

	for (var i = 0; i < stations.length ; i++) {
            var latlng = new L.latLng(stations[i][1],stations[i][0]);
            var m = SimpleMarkerControl.onMapNoClickAddMarker(latlng);
	    m.on('click', ghShowStationMarkerDialog ) ;
	    m.idx = StationData.marker.length;
	    m.setTitle(stations[i][2]);
	    m.setPointType(stations[i][3]);
	    m.setPointRange(stations[i][4]);
	    m.setTooltipContent(stations[i][3]);	    
	    StationData.marker.push(m);
	}
    } 

}

function __onPolylineClick (e) {
    var name = e.target.getTooltip()._content;
    var lay =  e.target.getLayers();
    var color =  lay[0].options.color;
    var geojsonfilename = LoadData.file;
    var outfilename = geojsonfilename + "_" + name ;
    
    if (LineRoute[name]) {
        $('#gh_lineid').html(name); 
        $('#gh_linecolor').css("color",color);
        $('#gh_linedatamodal').modal('open');	
    } else {
        console.log("Wrong NOT line data");                
    }

};


function ghFindRoute(id,points) {

    if ( ( typeof LineRoute[id] ) != 'undefined' ) {

        // Already Exist.,.
	if ( MapR.hasLayer(LineRoute[id].layer) ) {
            MapR.removeLayer(LineRoute[id].layer);
	}
        LineRoute[id].layer = null;
        LineRoute[id] = null;
        delete LineRoute[id];
    }

    LineRoute[id] = {
        "points" : points,
	"color" : PolylineColor[PolylineColorCnt%PolylineColorLen],
        "searchpath" : [],
        "layer" : null,
        "geojson" : null
    };
    PolylineColorCnt++;

    LineRoute[id].geojson = ghGetPath(id,LoadData.geojson,LineRoute[id].points);
    if ( LineRoute[id].geojson == null ) {
        LineRoute[id].layer = null;
        LineRoute[id] = null;
        delete LineRoute[id];
    } else {
        
	var content = id;
        LineRoute[id].layer = L.geoJSON(LineRoute[id].geojson);
        LineRoute[id].layer.bindTooltip(content);
        LineRoute[id].layer.setStyle({"color": LineRoute[id].color });
        LineRoute[id].layer.on('click', __onPolylineClick);
        LineRoute[id].layer.addTo(MapR);
        alert( id + " route founded");        
    }
}
function ghUpdateRouteList(name) {
    $("#pathroutelist").empty();
    for ( var key in LineRoute ) {
	var ret = "";
        ret += "<li><label><input type=\"checkbox\" name=\"gh_routelistcheck\" value=\"" + key + "\"><span>" + key + "</span>";
        ret += "&nbsp;&nbsp;<span style=\"color:" +  LineRoute[key].color + "\">■■■■■■■■■■■■■■■■■</span></label></li>";
	$('#pathroutelist').append(ret);
    }

}
function ghDuplicateCheckLatLng(ary,point) {
    for (var i = 0; i < ary.length; i++) {
	var aa = ary[i];
	if ( aa[0] == point[0] && aa[1] == point[1] ) {
	    return true;
	}
    }
    return false;
}
function ghFragmentRoute() {

    for (var i = 0,ilen = LineRouteOverlapPoints.length; i < ilen; i++) {
	MapR.removeLayer(LineRouteOverlapPoints[i]);
    }
    LineRouteOverlapPoints = [];
    
    SelectedLineRoute = [];
    $('input:checkbox[name="gh_routelistcheck"]:checked').each(function() {
	SelectedLineRoute.push($(this).val());
    });

    var isonly = false;
    if ( SelectedLineRoute.length < 2 ) {
	if ( SelectedLineRoute.length < 1 ) {
	    // NOP
	    alert("you need Check line ");
	    return;
	} else {
	    // NOP	alert("Cannot Fragmentation ");
	    SelectedLineRoute.push(SelectedLineRoute[0]);
	    isonly = true;
	    // Same line push
	}
    } 

    var pointary = []; 
    for (var i = 0; i < SelectedLineRoute.length ; i++) {
	for (var j = i+1; j < SelectedLineRoute.length ; j++) {
	    var overlapping = turf.lineOverlap(
		LineRoute[SelectedLineRoute[i]].geojson,
		LineRoute[SelectedLineRoute[j]].geojson );

	    PathFinder.meta.featureEach(overlapping, function (currentFeature, featureIndex) {
		//console.log(currentFeature);
		var coords = PathFinder.invariant.getCoords(currentFeature);

		if ( ghDuplicateCheckLatLng(pointary,coords[0]) ) {
		    //  SKIP
		    // NOP
		} else {
		    pointary.push(coords[0]);
		}
		if ( ghDuplicateCheckLatLng(pointary,coords[coords.length-1]) ) {
		    //  SKIP
		    // NOP
		} else {
		    pointary.push(coords[coords.length-1]);
		}
	    });
	}
    }

    //  Show Marker for each fragment
    for (var i = 0; i < pointary.length ; i++) {
        var latlng = new L.latLng(pointary[i][1],pointary[i][0]);
        var cm = L.circleMarker(latlng, {
            color: '#03a9f4',
            weight: 3,
            opacity: 0.9,
            fillColor: '#FFFFFF',
            fillOpacity: 0.3,
            radius: 10
        }).addTo(MapR);
	cm.bindPopup( ghCircleMarkerPopup(i) );
	LineRouteOverlapPoints.push(cm);
    }

    var outfilename = ghBaseName(LoadData.file) + ".wayjson";
    $('#gh_geometryfilename').val(outfilename);

    if ( isonly ) {
	// Delete last data
	SelectedLineRoute.pop();
    }

    // Not Open
    // Open Download Modal
    //$('#gh_geometrydownloadmodal').modal('open');    
}
function ghCircleMarkerPopup(id) {

    var txt = "ID " + id + "<BR>";
    txt += "<label><input type=\"checkbox\" class=\"filled-in\" id=\"gh_circlemarkerdeletecheckbox\" value=\"" + id + "\"><span>Delete this point</span>&nbsp;&nbsp;</label><BR>";
    txt += "<a href=\"javascript:ghOnclickCircleMarkerDelete(" + id + ");\">OK</a>";
    return txt;

}
function ghOnclickCircleMarkerDelete(id) {
    LineRouteOverlapPoints[id].closePopup();

    var check = $( '#gh_circlemarkerdeletecheckbox').is(':checked');
    if ( check ) {
	MapR.removeLayer(LineRouteOverlapPoints[id]);
	LineRouteOverlapPoints.splice(id,1);
	for (var i = 0,ilen=LineRouteOverlapPoints.length; i < ilen; i++) {
	    LineRouteOverlapPoints[i].bindPopup( ghCircleMarkerPopup(i) );
	}
    } 

}
function ghCheckOverlapPositionBK(start,coord) {
    for (var i = 0,ilen=LineRouteOverlapPoints.length; i < ilen; i++) {
	var v = LineRouteOverlapPoints[i].getLatLng();
	if ( coord[0] == v.lng && coord[1] == v.lat ) {
	    if ( start[0] == v.lng && start[1] == v.lat ) {
		// NOP
	    } else {
		//console.log(v);
		return true;
	    }
	}
    }
    return false;
}
function ghCheckOverlapPosition(coord) {
    for (var i = 0,ilen=LineRouteOverlapPoints.length; i < ilen; i++) {
	var v = LineRouteOverlapPoints[i].getLatLng();
	if ( coord[0] == v.lng && coord[1] == v.lat ) {
	    return true;
	}
    }
    return false;
}

//    LineRouteOverlapPoints = [];
//    SelectedLineRoute = [];
//
//    var LineRoute = {};
//     LineRoute[ SelectedLineRoute[i] ]
//
var segmentlines = [];
var segmentlineidx = 0;
var segmentpos = [];
async function ghGeometryRoutePreDownload() {

    var outfilename = $('#gh_geometryfilename').val();
    var linedirection = $('input[name="gh_linedirection"]:checked').val();
	
    segmentlines = [];
    segmentlineidx = 0;
    
    //  For each routes
    for (var sid = 0,sidlen=SelectedLineRoute.length ; sid < sidlen; sid++) {
	var route = LineRoute[ SelectedLineRoute[sid] ];
	var stationarray = ghGetNearestFeatureStation( SelectedLineRoute[sid] );
	
	//  For routes paths
	var coord_prev = null;
	var coord_current = null;
	for (var cnt = 0,cntlen=route.searchpath.length; cnt < cntlen; cnt++) {
	    
	    // Initial data
	    if ( cnt == 0 ) {

		coord_prev = route.searchpath[cnt].path[0];
		segmentlines[segmentlineidx] = {
		    name : SelectedLineRoute[sid],
		    routecnt : sid,
		    dupid : -1,
		    label : GeometryLabel[segmentlineidx%GeometryLabel.length],
		    startpoint : coord_prev,
		    midpoint : [],
		    midid : -1,
		    endpoint : [],
		    coords: [],
		    stations: [],
		    props: [],
		}
		segmentlines[segmentlineidx].coords.push(coord_prev);
		segmentlines[segmentlineidx].stations.push({});
	    }

            var spathlength  = route.searchpath[cnt].path.length;
            for (var i = 1; i < spathlength; i++) {

		coord_current = route.searchpath[cnt].path[i];
		// coord -> longitude, latitude position (each in decimal degrees)
		//  coord = [ lng, lat ];
    
		var from = PathFinder.helpers.point(coord_prev);
		var to = PathFinder.helpers.point(coord_current);
		
		var station = ghCheckStationPosition(from,to,stationarray);
		if ( station.point == null ) {
		    //  NOP
		    segmentlines[segmentlineidx].coords.push(coord_current);
		    segmentlines[segmentlineidx].stations.push({});
		} else {
		    segmentlines[segmentlineidx].coords.push(station.point.geometry.coordinates);
		    segmentlines[segmentlineidx].stations.push({
			"name" : station.name,
			"type" : station.type
		    });
		    
		    //  Split for station point
		    segmentlines[segmentlineidx].coords.push(coord_current);
		    segmentlines[segmentlineidx].stations.push({});
		}

		//
		//  Check Segment
		//

		var overlappoint = ghCheckOverlapPosition(coord_current);
		if ( overlappoint ) {

		    //       segmentlines[segmentlineidx]  finished
		    //var slen = i - Math.floor(i/2.0);
		    var slen = i - Math.floor(segmentlines[segmentlineidx].coords.length/4.0);
		    if ( slen < 0 ) slen = i;
		    segmentlines[segmentlineidx].midpoint = route.searchpath[cnt].path[slen];
		    segmentlines[segmentlineidx].midid = slen;
		    segmentlines[segmentlineidx].endpoint = coord_current;

		    segmentlineidx++;

		    if ( i == spathlength -1 && cnt == cntlen - 1 ) {
			// NOP last data  , No data after 
		    } else {
			//       segmentlines[segmentlineidx]  starts
			segmentlines[segmentlineidx] = {
			    name : SelectedLineRoute[sid],
			    routecnt : sid,
			    dupid : -1,
			    label : GeometryLabel[segmentlineidx%GeometryLabel.length],
			    startpoint : coord_current,
			    midpoint : [],
			    midid : -1,
			    endpoint : [],
			    coords: [],
			    stations: [],
			    props: [],
			};
			segmentlines[segmentlineidx].coords.push(coord_current);
			segmentlines[segmentlineidx].stations.push({});
		    }
		} else {
		    // Route last segment 
		    if ( i == spathlength -1 && cnt == cntlen - 1 ) {
			// last data  , No data after
			//var slen = i - Math.floor(i/2.0);
			var slen = i - Math.floor(segmentlines[segmentlineidx].coords.length/4.0);
			if ( slen < 0 ) slen = i;
			segmentlines[segmentlineidx].midpoint = route.searchpath[cnt].path[slen];
			segmentlines[segmentlineidx].midid = slen;
			segmentlines[segmentlineidx].endpoint = coord_current;
			segmentlineidx++;
		    } 

		}
		coord_prev = coord_current;
	    }
	}
	console.log("Finish each route OK " + SelectedLineRoute[sid] + " " + sid + " " + segmentlineidx);
    }
    console.log("Fragmentation OK " + segmentlineidx);
    //console.log(segmentlines);

    //  Check Same Segment
    for (var i = 0 ; i < segmentlineidx; i++) {
	var start_i = segmentlines[i].startpoint;
	var mid_i = segmentlines[i].midpoint;
	var end_i = segmentlines[i].endpoint;
	var points_i = segmentlines[i].coords.length;
	for (var j = i+1 ; j < segmentlineidx; j++) {
	    if ( segmentlines[j].dupid < 0 ) {
		var start_j = segmentlines[j].startpoint;
		var mid_j = segmentlines[j].midpoint;
		var end_j = segmentlines[j].endpoint;
		var points_j = segmentlines[j].coords.length;
		if ( start_i[0] == start_j[0] && start_i[1] == start_j[1]
		     && mid_i[0] == mid_j[0] && mid_i[1] == mid_j[1]
		     && end_i[0] == end_j[0] && end_i[1] == end_j[1]
		     && points_i == points_j ) {
		    segmentlines[j].dupid = i;
		    segmentlines[j].label = segmentlines[i].label;
		    //segmentlines[j].coords = []; //  initialize
		    segmentlines[j].stations = []; //  initialize
		    console.log("Delete segment " + j + " same as " + i + " " + segmentlines[i].label );
		} else {
		    // NOP
		    //console.log("Compare segment " + i + " " + segmentlines[i].label  +  " , "  + j + " " + segmentlines[i].label  );
		}
	    }

	}
    }

    console.log("Duplication Check OK");
    
    //  Add Prop and Cartesian position array for Cesium Height
    segmentpos = [];
    for (var i = 0 ; i < segmentlineidx; i++) {
	if ( segmentlines[i].dupid < 0 ) {
	    var coordary = segmentlines[i].coords;
	    var stationary = segmentlines[i].stations;
	    for (var j = 0, jlen = coordary.length-1 ; j < jlen; j++) {
		//var from = PathFinder.helpers.point(coordary[j]);
		//var to = PathFinder.helpers.point(coordary[j+1]);
		var prop = ghGetGeoJSONproperty(LoadData.geojson,coordary[j],coordary[j+1]);
		if ( ( typeof stationary[j+1].name ) != 'undefined' ) {
		    // Station here prop points change
		    if ( prop == "NOP" ) {
			prop = ghGetGeoJSONproperty(LoadData.geojson,coordary[j],coordary[j+2]);
		    }
		} else {
		    // NOP
		}
		if ( ( typeof stationary[j].name ) != 'undefined' ) {
		    // Station here prop points change
		    if ( prop == "NOP" ) {
			prop = ghGetGeoJSONproperty(LoadData.geojson,coordary[j-1],coordary[j+1]);
		    }
		} else {
		    // NOP
		}
		segmentlines[i].props.push(prop);

		var lat = coordary[j][1];
		var lng = coordary[j][0];
		cartpos = new Cesium.Cartographic.fromDegrees(parseFloat(lng), parseFloat(lat));
		segmentpos.push(cartpos);
	    }
	    // Last point
	    var lat = coordary[jlen][1];
	    var lng = coordary[jlen][0];
	    cartpos = new Cesium.Cartographic.fromDegrees(parseFloat(lng), parseFloat(lat));
	    segmentpos.push(cartpos);
	}
    }
//    var terrain = new Cesium.createWorldTerrain({
//	requestWaterMask: false,
//	requestVertexNormals : false
//    });
//    console.log("Terrain Data OK");
    
    // Obsolete
    //    var promise = Cesium.sampleTerrainMostDetailed( terrain, segmentpos );
    //    Cesium.when(promise, function(upos) {
    //	console.log("Terrain height data loaded");
    //	ghGeometryRouteDownload(upos);
    //    });

    // https://cesium.com/learn/cesiumjs/ref-doc/global.html?classFilter=sample#sampleTerrainMostDetailed
    const terrainProvider = await Cesium.createWorldTerrainAsync();
    const updatedPositions = await Cesium.sampleTerrainMostDetailed( terrainProvider, segmentpos );
    ghGeometryRouteDownload(updatedPositions);
    
}

function ghGeometryRouteDownload(updatepos) {
    var outfilename = $('#gh_geometryfilename').val();
    var delimiter = "\n"; 

    var updateposidx = 0;
    var prev_height = 0.0;
    var current_height = 0.0;
    var geometrylist = [];
    for (var i = 0 ; i < segmentlineidx; i++) {

	if ( segmentlines[i].dupid < 0 ) {
	    var coordary = segmentlines[i].coords;
	    var propsary = segmentlines[i].props;
	    var stationary = segmentlines[i].stations;
	    var geofilename = ghBaseName(outfilename) + segmentlines[i].name + segmentlines[i].label;
	    geometrylist.push({
		label: segmentlines[i].label,
	        file : geofilename,
		csv : []
	    });

	    var dd = new Date();
	    var result = "#T,datetime:" + dd.toString() + delimiter;
	    for (var j = 0, jlen = coordary.length ; j < jlen; j++) {

		// Height Check
		if ( ( typeof updatepos[updateposidx].height ) != 'undefined' ) {
		    current_height = updatepos[updateposidx].height;
		    prev_height = updatepos[updateposidx].height;
		} else {
		    current_height = prev_height;
		}
		
		if ( ( typeof stationary[j].name ) != 'undefined' ) {
		    var stp = "N";
		    if ( stationary[j].type == "station" ) {
			stp = "B";
		    } else {
			stp = "V";
		    }
		    // Stop type
		    result += Cesium.Math.toDegrees(updatepos[updateposidx].latitude).toFixed(6) + "," + Cesium.Math.toDegrees(updatepos[updateposidx].longitude).toFixed(6) + "," + current_height.toFixed(6) + "," + stationary[j].name + "," + stp + delimiter;
		} else {
		    // Line
		    result += Cesium.Math.toDegrees(updatepos[updateposidx].latitude).toFixed(6) + "," + Cesium.Math.toDegrees(updatepos[updateposidx].longitude).toFixed(6) + "," + current_height.toFixed(6) + ",x," + segmentlines[i].label + delimiter;
		}
		if ( j == jlen -1 ) {
		    //  No property
		} else {
		    // Property Check
		    result += "#P," + ghConvertProperty(propsary[j],"simple") + delimiter;
		}
		
		updateposidx++;
	    }

	    geometrylist[geometrylist.length-1].csv = result.split(delimiter);
	    
	}
    }

    //console.log(geometrylist);
	
    // For output
    $( "#geodata" ).val("");
    outfilename = $('#gh_geometryfilename').val();
    var today = new Date();
    var output = {
	"property": {
            "rev" : GH_REV,
            "timestamp" : today.toUTCString(),
        },
	"file" : outfilename,
	"geometry" : [],
	"csv" : [],
	"route" : {}
    }
    for (var j = 0 ,jlen = geometrylist.length; j < jlen; j++) {
	output.geometry.push( geometrylist[j].file );
	output.csv.push( geometrylist[j].csv );
    };
    var name = "NON";
    for (var i = 0 ; i < segmentlineidx; i++) {
	if ( name != segmentlines[i].name ) {
	    name = segmentlines[i].name;
	    output.route[name] = [];
	} else {
	    // NOP
	}
	var c = 0;
	for (var j = 0 ,jlen = geometrylist.length; j < jlen; j++) {
	    if ( geometrylist[j].label == segmentlines[i].label ) {
		c = j;
		break;
	    }
	};
	output.route[name].push(c);
    }

    var out = JSON.stringify(output);
    // for debug
    //$( "#geodata" ).val(out);

    var download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(out));
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();
    
}


function ghConvertProperty(prop,type) {
    if ( type == "raw" ) {
	return prop;
    }
    if ( prop == "NOP" ) {
	return "N";
    }
    var obj = JSON.parse(prop);
    var ret = "";
    if ( ( typeof obj.bridge ) != 'undefined' ) {
	if ( obj.bridge == "yes" ) {
	    ret += "bg=y:"
	}
    }
    if ( ( typeof obj.tunnel ) != 'undefined' ) {
	if ( obj.tunnel == "yes" ) {
	    ret += "tn=y:"
	}
    }
    if ( ( typeof obj.highspeed ) != 'undefined' ) {
	if ( obj.highspeed == "yes" ) {
	    ret += "hs=y:"
	}
    }
    if ( ( typeof obj.embankment ) != 'undefined' ) {
	if ( obj.embankment == "yes" ) {
	    ret += "em=y:"
	}
    }
    if ( ( typeof obj.gauge ) != 'undefined' ) {
	ret += "gu=" + parseInt(obj.gauge,10) + ":";
    }
    if ( ( typeof obj.maxspeed ) != 'undefined' ) {
	ret += "ms=" + parseInt(obj.maxspeed,10) + ":";
    }
    if ( ( typeof obj.layer ) != 'undefined' ) {
	ret += "ly=" + parseInt(obj.layer,10) + ":";
    }
    return ret;
}
function ghGetPath(name,geo,points) {

    var pathFinder = new PathFinder.PathFinder(geo,{ precision: 1e-5 });
    LineRoute[name].searchpath = [];
    var line = [];

    var loop = points.length;
    for (var cnt = 1; cnt < loop; cnt++) {
	//turf.point( [ Long , Lat ] );
	//turf.point( [ Keido , Ido ] );
	var startPoint = PathFinder.helpers.point(points[cnt-1]);
	var endPoint = PathFinder.helpers.point(points[cnt]);

	LineRoute[name].searchpath[cnt-1] = pathFinder.findPath(startPoint, endPoint);
	if ( LineRoute[name].searchpath[cnt-1] == null ) {
	    alert(name + " no route " + cnt + " / " + loop );
	    return null;
	}
	if ( LineRoute[name].searchpath[cnt-1].path.length < 2 ) {
	    alert(name + " Wrong Path length " + cnt + " / " + loop  + " length " + LineRoute[name].searchpath[cnt-1].path.length ) ;
	    return null;
	}
	line[cnt-1] = PathFinder.helpers.lineString(LineRoute[name].searchpath[cnt-1].path);
    }

    var collection = PathFinder.helpers.featureCollection(line);
    return collection;
}


function ghGetGeoJSONproperty(json,coord_a,coord_b) {
    var ret = "NOP";
    var flag = false;
    PathFinder.meta.featureEach(json, function (currentFeature, featureIndex) {
	prop = currentFeature.properties;
	var coord = currentFeature.geometry.coordinates;
	var coordlength  = coord.length;
	var flag_a = false;
	var flag_b = false;	
	for (var j = 0; j < coordlength; j++) {
	    var c = coord[j];
	    if ( coord_a[0] == c[0] && coord_a[1] == c[1] ) {
		flag_a = true;
	    }
	    if ( coord_b[0] == c[0] && coord_b[1] == c[1] ) {
		flag_b = true;
	    }
	    if ( flag_a && flag_b ) {
		ret = JSON.stringify(prop);
		return ret;
	    }
	}
	
    });
    return ret;
}
function ghUpdateStations() {
    
    if ( StationData.marker.length < 1 ) {
        alert("no station");
	return;
    }

    var result = [];

    for (var i = 0; i < StationData.marker.length; i++) {
	var m = StationData.marker[i];
	result.push([
            m.getLatLng().lng,
            m.getLatLng().lat,
            m.getTitle(),
            m.getPointType(),
	    m.getPointRange()
        ]);
    }
 
    ghBroadcastUpdateStations(result,-1);
    
}
function ghGetNearestFeatureStation(name) {
    // dis [m]
    // mindis [Km]

    var ret = [];
    for (var i = 0; i < StationData.marker.length; i++) {
	var m = StationData.marker[i];
	var point = PathFinder.helpers.point([m.getLatLng().lng,m.getLatLng().lat]);
	var mindis = m.getPointRange() / 1000; // [m] -> [Km]
	var mindata = null;
	var minfeature = null;
	PathFinder.meta.featureEach(LineRoute[name].geojson, function (currentFeature, featureIndex) {
	    var data = PathFinder.nearestPointOnLine.default(currentFeature,point, { units: 'kilometers'});
	    if ( data.properties.dist < mindis ) {
		mindis = data.properties.dist;
		mindata = data;
		minfeature = currentFeature;
	    }
	});

	//  0.01 = 10[m]
	//  0.007 = 7[m]
	if ( mindata != null ) {
	    var segment = null;
	    PathFinder.meta.segmentEach(minfeature, function (currentSegment, featureIndex, multiFeatureIndex, geometryIndex, segmentIndex) {
		if ( segmentIndex == mindata.properties.index ) {
		    segment = currentSegment;
		}
	    });

	    if ( segment != null ) ret.push([mindata,segment,point,m.getTitle(),m.getPointType(),m.getPointRange()]);
	}
	
    }

    return ret;
    
};

function ghCheckStationPosition(from,to,array) {

    var ret = {
	"point" : null,
	"name" : "",
	"type" : ""	
    }
    for (var i = 0; i < array.length; i++) {
	var seg = array[i][1];
	var f0 = from.geometry.coordinates[0];
	var f1 = from.geometry.coordinates[1];
	var t0 = to.geometry.coordinates[0];
	var t1 = to.geometry.coordinates[1];
	if ( seg.geometry.coordinates[0][0] == f0 &&
	     seg.geometry.coordinates[0][1] == f1 &&
	     seg.geometry.coordinates[1][0] == t0 &&
	     seg.geometry.coordinates[1][1] == t1 ) {
	    ret.point = array[i][0];
	    ret.name = array[i][3];
	    ret.type = array[i][4];
	    return ret
	}
    }
    return ret;
    
};

function ghBroadcastSecondaryReceiveData(data) {

    if (data.type == 'INITCONNECTION_ACK') {
        if ( GH_BROADCAST.selfID < 0 ) {
            GH_BROADCAST.selfID = data.value.yourid;
	    console.log(GH_BROADCAST.selfID);
	    ghBroadcastReqGeoJSON();
        }
    } else if (data.type == 'GETGEOJSON_ACK') {
        var file = data.value.filename;
	if ( file == null ) {
	    // NOP
	} else {
	    if ( LoadData.file == file ) {
		// NOP same file
	    } else {
		LoadData.file = file;
		LoadData.geojson = JSON.parse(data.value.geojson);
	    }
            ghBroadcastReqStations();
	}
    } else if (data.type == 'GETSTATIONS_ACK') {
        var stations = data.value.array;
	for (var i = 0; i < stations.length ; i++) {
            var latlng = new L.latLng(stations[i][1],stations[i][0]);
            var m = SimpleMarkerControl.onMapNoClickAddMarker(latlng);
	    m.on('click', ghShowStationMarkerDialog ) ;
	    m.idx = StationData.marker.length;
	    m.setTitle(stations[i][2]);
	    m.setPointType(stations[i][3]);
	    m.setPointRange(stations[i][4]);	    
	    StationData.marker.push(m);
	}
        
    } else if (data.type == 'SENDROUTEPOINT') {
	if ( LoadData.file == null ) {
	    // NOP
	} else {
	    var points = data.value.routes;
            var name = data.value.name;
            $( '#gh_routename').html(name);
	    ghFindRoute(name,points);
	    ghUpdateRouteList(name);
	}
    } else if (data.type == 'MAPSYNC') {
	var flag = data.value.issync;
	if ( data.value.center == null ) {
	    var current = $('#gh_synccheck').is(':checked');
	    if ( flag != current ) {
		$( '#gh_synccheck').prop('checked', flag);
	    }
	} else {
	    if ( flag ) {
		unregist_map_end_event();
		let r = MapR.getCenter();
		let z = MapR.getZoom();
		//if ( r.distanceTo(data.value.center) > 5 ) {
		//MapR.setView(data.value.center,data.value.zoom);
		//}
		MapR.setView(data.value.center,z);
		setTimeout(regist_map_end_event, 400);
	    }
	}
    } else {


    }

}

if(window.BroadcastChannel){
    ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveData);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
}

function ghInitCesium() {

    // Your access token can be found at: https://cesium.com/ion/tokens.
    Cesium.Ion.defaultAccessToken = '___CESIUM_TOKEN___';
}


$(document).ready(function(){

    ghInitMaterializeUI();

    ghInitMaps();

    ghInitCesium();

    //ghAvoidOperation();

    ghBroadcastInitConnection();

});

