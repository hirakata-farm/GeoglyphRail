//
//
//
//   Geogplyph Rail  6.0
//     Material design and time editor
//
//   rail3m.html
//     |- ghLang.js
//     |- ghSpeedoMeter.js
//     |- turfRail.min.js
//     |- ghRail.js
//     |- ghRailVectorTile.js
//     |      |- ghRailVectorTileWorker.js ( thread )
//     |             |- turfVectorTileWorker.min.js
//     |
//     |- ghRailWeather.js
//     |- ghRailBroadcast.js  ( Communicate for ghRailTime.js )
//     |- ghRailUnitWorker.js ( thread ) 
//
//
//

'use strict';

const GH_REV = 'Revision 6.15';
const GH_DEBUG_CONSOLE = false;
var GH_LOCAL_CONSOLE = false;
//var GH_PHOTOREALISTIC_3DTILE = false;

// https://github.com/CesiumGS/cesium/issues/8959
//Cesium.ModelOutlineLoader.hasExtension = function() { return false; }

//////////////////////////////////
var GH_SPEED_METER = null;
var GH_SPEED_METER_PROP = null;
var GH_SPEED_CALC_PARAM = ( 60 * 60 * 0.84  ) /  1000;
//  speedometer unit [m/s] -> [Km/h] ,, 0.84 is adjust paramtter

const GH_DISTANCE_CONDITION = 3000.0; // Entity Distance Display Condition
var GH_TPV = [];   // Terrain Provider Array

//var GH_PICK_TGT = null; //undefined; // Picked Target Entity model
var GH_PICK_ENTITY = null;
var GH_TITLE_MARQUEE = null;
var GH_TITLE_MARQUEE_PROP = {
    "interval" : 60,                 //  Update check interval [sec]
    "previoustime" : null,
    "previousid" : 'nop'
}

var GH_TZ_OFFSET_MINUTES = 0; // minutes

var GH_USE_TUNNEL = false;
const GH_SET_POSITION_TO_LINESTRING = 8.0; // [m]
const GH_DISTANCE_TO_LINESTRING = 1.0; // [m]
const GH_TUNNEL_EDGE_METER = 32; // [m] 
const GH_TUNNEL_DEPTH = 12; // [m] under terrain default depth

//var GH_IS_RECIPROCAL = false; // Speed slower The reciprocal of 5 is 1/5

//////////////////////////////////
//
//  Main Component
//
var GH_V = null;  // Cesium Container Object
var GH_S = null;  // Cesium Container Scene
var GH_C = null;  // Cesium Container Clock model
var GH_A = null;  // Cesium Container Animation model
var GH_M = null;  // Leaflet Container Object
var GH_M_LAYER = []; // Leaflet Tile Layer
//var GH_M_AUTO_CENTER = false;



//////////////////////////////////////////
// Main Root Data Object
var GH_FIELD = null;
var GH_LINES = {};
var GH_UNIT_GEOM = {};
var GH_LOCOMOTIVE = {};
var GH_FIELDINDEX = {
    'file': 'fieldindex.json',
    'args' : null,
    'urilist' : [],
    'data' : null
}
function ghGetResourceUri(file) {
    if ( GH_FIELDINDEX.data ) {
	var idx = Math.floor(Math.random() * GH_FIELDINDEX.urilist.length);
	return GH_FIELDINDEX.urilist[idx] + file;
    } else {
	return file;
    }
}

const GH_BASE_CLOCK = new Date().toString();
var GH_CLOCK_INIT_TIMER = null;
var GH_CLOCK_UNIT_SCALE = 1.0; //  from arg param

//////////////////////////////////////////


//
//   Status variables
//
var GH_IS_PLAYING = false;
var GH_SHOW_TILEQUEUE = false;
var GH_SHOW_SPEEDOMETER = false;


const GH_3DTILE_NONE = -1;
const GH_3DTILE_PHOTOREALISTIC_GOOGLE = 2;
const GH_3DTILE_OSMBUILDING = 4;
const GH_3DTILE_OSMBUILDING_AND_TREE = 5;
const GH_3DTILE_NEXTZEN_BUILDING_ONLY = 8;
const GH_3DTILE_NEXTZEN_BUILDING_AND_TREE = 10;
const GH_3DTILE_OSMBUILDING_STYLE = 1; // see __osmBuildingsAsyncStyle_1

var GH_3DTILE = {
    'mode' : GH_3DTILE_NONE,
    'primitive' : null,
    'areaunit' : 400,  // square meter per unit  sampling 900 = 30m x 30m
    'interval' : 20,   // sec
    'previousupdate' : null
}
// lowpoly    'areaunit' : 256,  // square meter per unit  sampling 100 = 10m x 10m
// texture    'areaunit' : 512,  // square meter per unit  sampling 100 = 10m x 10m
// check interval 10 sec default

//var GH_SHOW_3DTILE = false;
//var GH_3DTILE_OSMBUILDING = null;  // OSM Building primitive
//var GH_USE_OSMBUILDING = false;
//var GH_USE_3DTILE_TEXTURE = false;

const GH_UNIT_TARGET_DISTANCE = 200; // unit [m] for extend train length target
//  <-  GH_UNIT_TARGET_DISTANCE -- unit -- GH_UNIT_TARGET_DISTANCE ->
//  <-                GH_UNIT_TARGET_DISTANCE * 2                  ->
const GH_UNIT_RENDERING_DISTANCE_SQUARED = 4500*4500;
const GH_UNIT_TARGET_DISTANCE_S = GH_UNIT_TARGET_DISTANCE * 1.9;
const GH_UNIT_TARGET_DISTANCE_L = GH_UNIT_TARGET_DISTANCE * 2.1;

var GH_UNIT_HEIGHT = {}
const GH_UNIT_TARGET_DISTANCE_SQUARED = GH_UNIT_TARGET_DISTANCE * GH_UNIT_TARGET_DISTANCE;
var GH_UNIT_HEIGHT_SIN = Math.sin( 4 * Math.PI / 180 ) ; //  4 deg

//  2D layer
var GH_LAYER = {
    "autocenter" : null,
    "polyline" : {}, // encoded polyline
    "train" : {},    // train marker
    "station" : {},    // station marker
    "camera" : {}    // camera marker
};

var GH_UNIT_WORKER = {
    'worker' : null,
    'uri' : '../js/ghRailUnitWorker.js',
    'ack' : false
};

var GH_MARKER_SIZE = { 'none' : -1 , 'thin' : 12, 'small' : 12, 'medium' : 24 , 'large' : 48 , 'bold' : 48 };
var GH_MARKER_PROP = {
    station : {
	url : '../images/lstationmarker.png',
	shadow : '../images/lstationmarkershadow.png',
	size : GH_MARKER_SIZE['medium']
    },
    train : {
	url : '../images/2dtrain.gif',
	shadow : '../images/2dtrain.gif',
	size : GH_MARKER_SIZE['medium']
    },
    camera : {
	url : '../images/3dcamera_icon.png',
	shadow : '../images/3dcamera_icon.png',
	size : GH_MARKER_SIZE['medium']
    }
}
const GH_POLYLINE_PROP = {
    color : '#708090',
    size : ( GH_MARKER_SIZE['medium'] / 4 ) |0,
    width : 6,
    opacity : 0.7
}


//
// Camera  definition
//
const GH_CAM_MODE_NONE = 0;
const GH_CAM_MODE_TRACKED = 1;
const GH_CAM_MODE_ABOVE = 2;

const GH_CAM_MODE_FRONT = 3;
const GH_CAM_MODE_RIGHT = 4;
const GH_CAM_MODE_LEFT = 5;
const GH_CAM_MODE_BACK = 6;

const GH_CAM_MODE_NORTH = 7;
const GH_CAM_MODE_NORTHEAST = 8;
const GH_CAM_MODE_NORTHWEST = 9;
const GH_CAM_MODE_EAST = 10;
const GH_CAM_MODE_SOUTH = 11;
const GH_CAM_MODE_SOUTHEAST = 12;
const GH_CAM_MODE_SOUTHWEST = 13;
const GH_CAM_MODE_WEST = 14;

var GH_CAM_MODE = GH_CAM_MODE_NONE;

var GH_CAM_DISTANCE = 40;
const GH_CAM_DISTANCE_MIN = 8;
var GH_CAM_ALT = 4;
const GH_CAM_ALT_MIN = 4;
const GH_CAM_EYE = 5;
var GH_IS_DRAGGING = false;
var GH_MOUSE_POSITION = {};
const GH_MOUSE_WHEEL_UNIT = -10; // (+|-) direction .. larger, change is little 
const GH_MOUSE_DRAG_UNIT = 300;  //  larger, change is little 
var GH_CAM_HOME_BUTTON = null ; // Cesium.BoundingSphere

var GH_CAM_QUATERNION = {
    'start' : null,
    'startangle' : null,
    'end' : null,
    'step' : 0.03,
    't' : 0.05,
    'max' : 1.0
}
//const GH_CAM_QUATERNION_ANGLE = 0.00001;
const GH_CAM_QUATERNION_ANGLE = 0.0000001;

var GH_IS_CAMERA_AUTOMODE  = false;
var GH_CAMERA_AUTOMODE = {
    "timer" : null,
    "interval" : 120000,
    "modemin" : GH_CAM_MODE_NORTH,
    "modemax" : GH_CAM_MODE_WEST,
    "current" : GH_CAM_MODE_WEST
}

function ghSetTimezoneOffset(timestr) {
    let str = timestr.split(":");
    let h = parseFloat(str[0]);
    let m = parseFloat(str[1]);
    GH_TZ_OFFSET_MINUTES = 60 * h + m;
}

var GH_PRIMITIVE_ID = [];

var GH_TRAIN_LABEL_Y_OFFSET = 20;

var GH_CONFIGFILE_JSON = null;
const GH_CONFIGFILE_URI = '//earth.geoglyph.info/rail/configure/';
const GH_SHARE_CGI = {
    'config' : "//earth.geoglyph.info/cgi/railconfigure.php",
    'captureimage' : "//earth.geoglyph.info/cgi/railcaptureimage.php",
    'captureprop' : "//earth.geoglyph.info/cgi/railcaptureprop.php"
}

var GH_CONFIGFILE_ID = 'XXXXXXXXXXXXXXXXXXX';
var GH_CAPTUREFILE_ID = 'XXXXXXXXXXXXXXXXXXX';

///////////////////////////////
//  Check Local Console
if ( location.hostname.match(/^192/) ) {
    GH_LOCAL_CONSOLE = true;
    console.log("use Local console mode.");
} else {
    GH_LOCAL_CONSOLE = false;
}

    
////////////////////////////////////////
//
//   Rain function
//
var GH_IS_RAIN = false;
const GH_RAIN_POINTS_BASE = 10;
var GH_RAIN_POINTS = 50;
var GH_IS_CLOUD= false;
var GH_WEATHER = {
    "rain" : null,
    "cloud" : null
}


function ghSetHeaderTilequeue(t) {
    $('#ghtilequeue').html(t);
}
function ghShowLoader(flag) {
    if ( flag ) {
    	$('#ghloader').addClass('active');
    } else {
    	$('#ghloader').removeClass('active');
    }
}
function ghCenterLeafletMap(pos) {
    var latlng = GH_V.scene.globe.ellipsoid.cartesianToCartographic(pos);
    if ( Cesium.defined( latlng ) ) {
	let p = new L.LatLng(Cesium.Math.toDegrees(latlng.latitude),Cesium.Math.toDegrees(latlng.longitude))
	GH_M.setView(p);
    }
}
function ghSetAutoCenterLeafletMap( flag ) {
    GH_LAYER.autocenter = flag;
}
function ghInitLeafletMap() {

    if ( ( typeof L ) === 'undefined' ) return;

    GH_M = L.map('ghLeafletContainer');
    GH_M_LAYER[0] = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	maxZoom: 19,
	attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    });
    GH_M_LAYER[1] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    GH_M_LAYER[2] = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: '&copy; <a href="https://www.arcgis.com/">Esri/ArcGIS</a> contributors'
    });
    var baseMaps = {
	'OpenStreetMap': GH_M_LAYER[0],
	'EsriStreetMap':GH_M_LAYER[1],
	'EsriImageryMap':GH_M_LAYER[2]
    }
    GH_M_LAYER[0].addTo(GH_M);
    L.control.layers(baseMaps, {},{position:'bottomleft'}).addTo(GH_M);

    GH_M.createPane('encodedpolyline');
    GH_M.getPane('encodedpolyline').style.zIndex = 450;

    // https://gist.github.com/rwoloszyn/e894c3105842a541e659f327292af9ca
    var autoCenterCheckbox = L.control({position: 'topright'});
    autoCenterCheckbox.onAdd = function (map) {
	var div = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control');
        div.innerHTML = '<label><input type="checkbox" id="ghmapcentercheckbox"/><span>center&nbsp;&nbsp;</span></label>';
        return div;
    };
    autoCenterCheckbox.addTo(GH_M);

    var places = [
	{
	    label: "train",
	    value: "train group",
	    items: [
		{ label: "Large", value: [ 'train','large'] },
		{ label: "Medium", value: ['train','medium'] },
		{ label: "Small", value: ['train','small'] }
	    ]
	},
	{
	    label: "track",
	    value: "track group",
	    items: [
		{ label: "Bold", value: ['track','bold'] },
		{ label: "Medium", value: ['track','medium'] },
		{ label: "Thin", value: ['track','thin'] },
		{ label: "Hide", value: ['track','none'] }
	    ]
	},
	{
	    label: "station",
	    value: "station group",
	    items: [
		{ label: "Large", value: ['station','large'] },
		{ label: "Medium", value: ['station','medium'] },
		{ label: "Small", value: ['station','small'] },
		{ label: "Hide", value: ['station','none'] }
	    ]
	}
    ];

    var mmenu = L.control.select({
	position: "topleft",
	id: "geoglyph-marker-select",
	selectedDefault: false,
	items: places,
	onSelect: function (data) {
	    ghSetLeafletLayerSize(data[0],data[1]);
	}
    }).addTo(GH_M);

    // Add-Hook
    GH_M.on('click',function(e) {
	if ( e.originalEvent.srcElement.id == 'ghLeafletContainer' ) mmenu.close();
    });

    GH_M.setView([51.505, -0.09], 2);

}

function ghOnClickPlayPauseButton() {

    if ( ( typeof $('.tooltipped')[0].M_Tooltip) === 'undefined' ) {
	// NOP Only once
	//$('.tooltipped').tooltip('close');
    } else {
	$('.tooltipped').tooltip('destroy');
    }
	
    var t = $('#ghplaybtntext').html();
    if ( t == "pause" ) {
        // Pause pressed 
        // change display to PLAY
	ghStopTitleMarquee();
	ghStopCesiumScene();
    } else {
        // Play pressed 
        // change display to PAUSE
	ghStartTitleMarquee();
	ghStartCesiumScene();
    }
    ghChangePlayPauseButton(GH_IS_PLAYING);
    
}


function ghClearSceneData() {
    if ( GH_MDL.road != null ) {
	GH_V.scene.primitives.remove(GH_MDL.road);
    }
    if ( GH_MDL.model != null ) {
	GH_V.entities.remove(GH_MDL.model);
    }
    if ( GH_MDL.startpole != null ) {
	GH_V.entities.remove(GH_MDL.startpole);
    }
    if ( GH_MDL.stoppole != null ) {
	GH_V.entities.remove(GH_MDL.stoppole);
    }
    if ( GH_LAYER.marker != null ) {
	GH_M.removeLayer(GH_LAYER.marker);
    }
    //if ( GH_MAP.hasLayer(GH_MAP.polyline) ) 
    if ( GH_LAYER.polyline != null ) {
	GH_M.removeLayer(GH_LAYER.polyline);
    }

    GH_ROUTE  = {
	duration : 0,
	start : null,
	stop : null,
	color3d : Cesium.Color.WHITE.withAlpha(0.4),
	width3d : 3,
	alpha3d : 0.3,
	point : [],
	property : null,
	position2d : [],
	type : 'Driving'
    }
    
    GH_MDL = {
	startpole : null,
	stoppole : null,
	road : null,
	model : null,
	name : 'cesiumground'
    };
    GH_LAYER = {
	polyline : null,
	marker : null
    };
    
    //GH_ROUTE_DATA = void 0; // undefined detection version
    //GH_ROUTE_DATA = null;
    //ghEnablePlayButton(false);
    //ghEnablePauseButton(false);
    
    $("input[name='objmodel']").val(["default"]); // model check default
    $("input[name='roadwidth']").val(3); // default road width
    $("input[name='roadopacity']").val(0.3); // default road width
    
    GH_V.scene.preRender.removeEventListener(ghUpdateCesiumScene);
}


function ghOnclickOpenTimePicker() {

    ghStopCesiumScene();
    ghStopTitleMarquee();
    ghChangePlayPauseButton(GH_IS_PLAYING);

    let dp = $('#timedescription').html();
    //var tt = $( '#gh_timepicker_input' ).val(); // for test
    let x = dp.split(":");
    let dt = x[0] + ":" + x[1];
    $( '#ghtimepicker_input' ).val(dt);
    
    $('#ghtimepicker_input').timepicker('open');

    let event = {
	type : 'dialogopen'
    }
    ghEventStatusDialog(event,null,'#ghclocktimebtn');
}

function ghInitInputForm() {

    $('#ghtimepicker_input').timepicker({twelveHour:false});
    $('#ghtimepicker_input' ).change( function () {
	ghSetTimePicker( $(this).val() , true );
	let event = {
	    type : 'dialogclose'
	}
	ghEventStatusDialog(event,null,'#ghclocktimebtn');
    } );

    $( '#ghmapcentercheckbox').change(function(){
	ghSetAutoCenterLeafletMap( $(this).is(':checked') );
    });

    //////////////////////    
    $( 'input[name="cesiummultiplier"]' ).change( function () {
	//var id = $(this).prop('id');
	ghSetCesiumMultiplier( $(this).val() );
    } );

    //////////////////////    
//    $('input[name="trainiconsize"]:radio').change(function(){
//        ghChangeLeafletTrainIconSize( $(this).val() );
//    });
//    $('input[name="trackpolylinesize"]:radio').change(function(){
//        ghChangeLeafletPolylineSize( $(this).val() );
//    });
//    $('input[name="bahnhoficonsize"]:radio').change(function(){
//        ghChangeLeafletBahnhofIconSize( $(this).val() );
//    });
//    $('input[name="cameraiconsize"]:radio').change(function(){
//        ghChangeLeafletCameraIconSize( $(this).val() );
//    });

    //////////////////////    
    

    //////////////////////
    $( 'input[name="cesiumquality"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumQuality( $(this).val() );
    } );
    $( 'input[name="cesiumtilecachesize"]' ).change( function () {
	//var id = $(this).prop('id');
	ghSetCesiumCacheSize( $(this).val() );
    } );

    $( '#frameratecheckbox').change(function(){
	ghShowCesiumFPS( $(this).is(':checked') );
    });
    
    $( '#tilequeuecheckbox').change(function(){
	ghShowCesiumTileQueue( $(this).is(':checked') );
    });
    $( '#speedmetercheckbox').change(function(){
	ghShowCesiumSpeedoMeter( $(this).is(':checked') );
    });
    $( '#lightingcheckbox').change(function(){
	ghEnableCesiumSunEffect( $(this).is(':checked') );
    });
    $( '#watercheckbox').change(function(){
	ghEnableCesiumWaterEffect( $(this).is(':checked') );
    });
//    $( '#terraincheckbox').change(function(){
//	ghEnableCesium3DTerrain( $(this).is(':checked') );
//    });
    $( '#tunnelcheckbox').change(function(){
	ghEnableCesiumTunnel( $(this).is(':checked') );
    });
//    $( '#speedvaluereciprocal').change(function(){
//	ghEnableCesiumMultiplierReciprocal( $(this).is(':checked') );
//    });
//    $( '#tile3dcheckbox').change(function(){
//	var flag = $(this).is(':checked');
//	ghEnableCesium3Dtile( flag );
//    });
    $('input[name="vectortile3d"]:radio').change(function(){
	ghEnableCesium3Dtile( parseFloat($(this).val()) );
    });

    //////////////////////////
    $( '#modellabelcheckbox').change(function(){
	ghSetCesiumModelLabelProperty( 'show' , $(this).is(':checked') , '#008000' );
    });
    $( 'input[name="modellabelscale"]' ).change( function () {
	ghSetCesiumModelLabelProperty( 'scale', false, $(this).val() );
    } );
    $( 'input[name="modellabelyoffset"]' ).change( function () {
	ghSetCesiumModelLabelProperty( 'yoffset' , false, $(this).val() );
    } );
    $( '#modellabelcolor').change(function(){
	ghSetCesiumModelLabelProperty( 'color', false, $(this).val() );
    });
//    $( 'input[name="cesiummodelscale"]' ).change( function () {
//	var id = $(this).prop('id');
//	ghSetCesiumModelScale( $(this).val() );
//    } );
    $( '#stationlabelcheckbox').change(function(){
	ghSetCesiumStationLabelProperty( 'show', $(this).is(':checked') , '#008000' );
    });
    $( 'input[name="stationlabelscale"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumStationLabelProperty( 'scale', false, $(this).val() );
    } );
    $( 'input[name="stationlabelyoffset"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumStationLabelProperty( 'yoffset' , false, $(this).val() );
	
	//  Change Y-Offset for label polyline
	ghUpdateCesiumStationLabelOffset(GH_V.clock.currentTime);
    } );
    $( '#stationlabelcolor').change(function(){
	ghSetCesiumStationLabelProperty( 'color', false, $(this).val() );
    });
    $( 'input[name="trackwidth"]' ).change( function () {
	var id = $(this).prop('id');
	ghSetCesiumTrackProperty( 'width', $(this).val() );
    } );
    $( '#trackcolor').change(function(){
	ghSetCesiumTrackProperty( 'color' , $(this).val() );
    });

    //////////////////////////
//    $( 'input[name="eyeoffsetheight"]' ).change( function () {
//	var id = $(this).prop('id');
//	ghSetCesiumPovOffset( $(this).val() );
//    } );
    $( '#autocameracheckbox').change(function(){
	ghEnableAutoCamera( $(this).is(':checked') );
    });
    $( 'input[name="autocameraminutes"]' ).change( function () {
	ghSetAutoCameraInterval( $(this).val() );
    } );
//    $('input[name="autocamerapattern"]:radio').change(function(){
        ////ghChangeLeafletTrainIconSize( $(this).val() );
	/// NOT YET
//    });

    $('input[name="cesiumweather"]:radio').change(function(){
	let radio = $(this).val();
    	let slider = $( '#rainslider').val();
	ghSetCesiumWeather( radio, slider );
    });
    $( 'input[name="raindensity"]' ).change( function () {
	let radio = "non";    
	$('input[name="cesiumweather"]').each(function(i){
            if ( $(this).is(':checked') ) {
		radio = $(this).attr('value');
            }
	});
	let slider = $( this ).val();
	ghSetCesiumWeather( radio, slider );
    });

    ////////////////////////////
//    $('input[name="trainaudio"]:radio').change(function(){
//        ghChangeTrainAudio( $(this).val() );
//    });

    ////////////////////////////
    $('input[name="viewpoint"]:radio').change(function(){
	ghOnClickViewpointButton( $(this).val() );
    });

    $( '#gh_downloadconfigdata').click(function(){
	ghDownloadConfigData();
    });

    $( '#gh_downloadcaptureimage').click(function(){
	ghDownloadCaptureImage();
    });

    $('#configsavebutton').on('click', function() {
	ghSaveConfigData();
    });

    $('#capturesavebutton').on('click', function() {
	ghSaveCaptureImage();
    });

    
    ////////  Tooltip for Play Button
    $('.tooltipped').tooltip({
	position:"top",
	html:"<i class=\"material-icons\">highlight</i>Play button<BR>Simulation start<BR><i class=\"medium material-icons\">keyboard_arrow_down</i>"
    });
    
    // show thums
    //  https://github.com/Dogfalo/materialize/issues/6036
    var array_of_dom_elements = document.querySelectorAll("input[type=range]");
    M.Range.init(array_of_dom_elements);

    //  inital input text
    M.updateTextFields();


}

function ghInitSpeedoMeter() {
    GH_SPEED_METER_PROP = {
	value : 0,
	prevpos : new Cesium.Cartesian3(0,0,0),
	prevtime : new Cesium.JulianDate()
    };  //   value = [ Meter / sec]
    
    GH_SPEED_METER = $("#ghspeedometer").ghSpeedoMeter({
        divFact:10,
        dangerLevel : 180,
        maxVal : 260,
        edgeRadius  : 64,
        indicatorRadius : 48,
        speedoNobeW          : 48,
        speedNobeH          : 3,
        indicatorNumbRadius : 32,
        speedPositionTxtWH  : 32,
        nobH : 2,
        nobW : 16,
        numbH  : 14,
        midNobH  : 1,
        minNobW : 8
    });
    $("#ghspeedometerposition").hide();
}
function __ghSetPickEntity(ent) {

    if ( ( typeof ent.model ) === 'undefined' ) {
	// Not model pick ( station ... )
	$('input:radio[name="viewpoint"]').prop('disabled', true);

	$('input:radio[name="viewpoint"][value="1"]').prop('disabled', false);
	//$('input:radio[name="viewpoint"][value="1"]').prop('checked', true);
	$('input:radio[name="viewpoint"][value="0"]').prop('disabled', false);
	$('input:radio[name="viewpoint"][value="0"]').prop('checked', true);
	GH_CAM_MODE = GH_CAM_MODE_TRACKED;
    } else {
	$('input:radio[name="viewpoint"]').prop('disabled', false);

	//$('input:radio[name="viewpoint"][value="1"]').prop('disabled', false);
	//$('input:radio[name="viewpoint"][value="1"]').prop('checked', true);
	//$('input:radio[name="viewpoint"][value="0"]').prop('disabled', false);
	//$('input:radio[name="viewpoint"][value="0"]').prop('checked', true);
	//$('input:radio[name="viewpoint"]').val([ type ]);
    }

    //  Change Entity
    GH_PICK_ENTITY = ent;

}

function ghInitCesiumViewer(domid) {

    GH_V = new Cesium.Viewer(domid,{
	animation : false,
	baseLayerPicker : false,
	fullscreenButton : false,
	geocoder : false,
	homeButton : true,
	infoBox : false,
	skyBox : false,
	sceneModePicker : false,
	selectionIndicator : true,
	timeline : true,
	navigationHelpButton : true,
	sceneMode : Cesium.SceneMode.SCENE3D,
	scene3DOnly : true,
	shadows : false,
	vrButton: false,
	requestRenderMode : true,
	terrainShadows : Cesium.ShadowMode.DISABLED,
	automaticallyTrackDataSourceClocks : true,
	contextOptions : {
            webgl : {
		powerPreference: 'high-performance'
            }
	}
    });
    // GH_V.baseLayer set up at  ghSetGooglePhotorealistic3D(flag)
    
    GH_TPV[0] = Cesium.Terrain.fromWorldTerrain({
	requestWaterMask: false,
	requestVertexNormals: true
    });
    GH_TPV[1] = Cesium.Terrain.fromWorldTerrain({
	requestWaterMask: true,
	requestVertexNormals: true
    });

    //GH_V.resolutionScale = Cesium.Math.clamp(val/100, 0.1, 1.0);
    //GH_V.resolutionScale = 1.0;  //   Default 1.0
    //GH_V.scene.globe.tileCacheSize = 500;  // Default 100

//    GH_S = GH_V.scene;
//    GH_S.globe.depthTestAgainstTerrain = true;
//    GH_S.globe.enableLighting = true;
//    GH_S.sun = new Cesium.Sun();

    GH_C = new Cesium.ClockViewModel(GH_V.clock);
    GH_A = new Cesium.AnimationViewModel(GH_C);
    GH_S = GH_V.scene;
    //GH_S.globe.show = false;  //  at ghSetGooglePhotorealistic3D(flag) 
    GH_S.globe.depthTestAgainstTerrain = true;
    ////GH_V.extend(Cesium.viewerCesiumInspectorMixin);
    
    //
    //  Rendering Slow Message
    //
//    GH_V.extend(Cesium.viewerPerformanceWatchdogMixin, {
//	lowFrameRateMessage : GH_WARN_MSG['tooslow']
//    }); 

    //
    // Show tile queue loading
    //
    GH_S.globe.tileLoadProgressEvent.addEventListener(ghTilequeueLoading);
    //GH_S.setTerrain( GH_TPV[0] );  //  at ghSetGooglePhotorealistic3D(flag) 

    ghRenameTimelineLabel();

    //
    // Timeline observe	 Ad-Hook
    //
    Cesium.knockout.getObservable(GH_C, 'shouldAnimate').subscribe(function(value) {
	// false when the clock is paused.
	if ( !value ) {
	    // Playing and Click Timeline -> stop 
	    ghStopCesiumScene();
	    ghStopTitleMarquee();
	    //ghChangePlayPauseButton(GH_IS_PLAYING);
	    ghChangePlayPauseButton(false);
	    ghUpdateStatusbarDatetime(null);
	} else {
	    // Stopping -> Click Play button
	    // NOP
	}
    });

    //
    // Cesium Screen Mouse Click
    //
    var act = new Cesium.ScreenSpaceEventHandler(GH_V.scene.canvas);
    act.setInputAction(
	function (evt) {
            var pick = GH_V.scene.pick(evt.position);
	    if ( Cesium.defined(pick) && Cesium.defined(pick.id) ) {
		if ( Cesium.defined(pick.id.position) ) {
		    __ghSetPickEntity(pick.id);
		    
		    //console.log(pick.id);
		    // pick.id is Entity Object , Not id text
		    // ^^^^^^^^^^^^^^^^^
		    //console.log( "PICK " + pick.id ); // Object
		    //console.log( "PICK " + pick.id.id );  10ES_S_9020_c_2 ...

		}
            }
	},
	Cesium.ScreenSpaceEventType.LEFT_CLICK
    );

    act.setInputAction(
	function (evt) {
	    // wheel up evt return 120
	    // wheel down evt return -120
	    let val = parseFloat(evt/GH_MOUSE_WHEEL_UNIT);
	    GH_CAM_DISTANCE = GH_CAM_DISTANCE + val;
	    if ( GH_CAM_DISTANCE < GH_CAM_DISTANCE_MIN ) GH_CAM_DISTANCE = GH_CAM_DISTANCE_MIN;
	},
	Cesium.ScreenSpaceEventType.WHEEL
    );

    // https://groups.google.com/g/cesium-dev/c/DTJ6TEN04U8
    act.setInputAction(
	function(click) {
	    if ( GH_CAM_MODE == GH_CAM_MODE_NONE
		 || GH_CAM_MODE == GH_CAM_MODE_TRACKED
		 || GH_CAM_MODE == GH_CAM_MODE_ABOVE ) {
		// NOP
	    } else {
		GH_IS_DRAGGING = true;
		GH_V.scene.screenSpaceCameraController.enableRotate = false;
		Cesium.Cartesian2.clone(click.position, GH_MOUSE_POSITION);
		//entity.position = mousePositionProperty;
	    }
        },
	Cesium.ScreenSpaceEventType.LEFT_DOWN
    );

    act.setInputAction(
	function(movement) {
            if (GH_IS_DRAGGING) {
		let currentpos = {};
		Cesium.Cartesian2.clone(movement.endPosition, currentpos);
		let val = parseFloat((currentpos.y-GH_MOUSE_POSITION.y)/GH_MOUSE_DRAG_UNIT);
		GH_CAM_ALT = GH_CAM_ALT + val;
		if ( GH_CAM_ALT < GH_CAM_ALT_MIN ) GH_CAM_ALT = GH_CAM_ALT_MIN;
            }
	},
	Cesium.ScreenSpaceEventType.MOUSE_MOVE
    );
    act.setInputAction(
	function(click) {
            if(GH_IS_DRAGGING) {
		GH_IS_DRAGGING = false;
		GH_V.scene.screenSpaceCameraController.enableRotate = true;
            }
	},
	Cesium.ScreenSpaceEventType.LEFT_UP
    );

}


function ghRenameTimelineLabel() {
    // Localize Timeline Label
    //https://cesium.com/blog/2018/03/21/czml-time-animation/
    GH_V.timeline.makeLabel = function (date) {
	var d = Cesium.JulianDate.addMinutes(date,GH_TZ_OFFSET_MINUTES, new Cesium.JulianDate());
	var gregorianDate = Cesium.JulianDate.toGregorianDate(d);
        //var year = gregorianDate.year;
        //var mon = gregorianDate.month;
	//var day = gregorianDate.day;
        //if ( day < 10 ) day = "0" + day;
        var hour = gregorianDate.hour;
        if ( hour < 10 ) hour = "0" + hour;
        var min = gregorianDate.minute;
        if ( min < 10 ) min = "0" + min;
        //return mon + "-" + day + "-" + year + " " + hour + ":" + min;
	return hour + ":" + min;
    }
}

function ghCreateIso8601str( base, val , offset ) {
    //  val = 5:23 
    let now = null;
    let year = null;
    let month = null;
    let day = null;
    if ( base == null ) {
	now = new Date(GH_BASE_CLOCK);
	year = now.getFullYear();
	month = now.getMonth() + 1;
	day = now.getDate();
    } else {
	now = Cesium.JulianDate.toGregorianDate(base);
	year = now.year;
	month = now.month;
	day = now.day;
    }
    let newtime = val.split(":");
//    const now = new Date();
//    let year = now.getFullYear();
//    let month = now.getMonth() + 1;
//    let day = now.getDate();

    if ( month < 10 ) month = "0" + month;
    if ( day < 10 ) day = "0" + day;
    
    let hour = parseFloat(newtime[0]);
    if ( hour < 10 ) hour = "0" + hour;

    let min = parseFloat(newtime[1]);
    if ( min < 10 ) min = "0" + min;

    let plusminus = "+";
    if ( offset < 0 )  {
	plusminus = "-";
    }
    let offhour = Math.floor(Math.abs(offset)/60);
    if ( offhour < 10 ) offhour = "0" + offhour;    
    let offmin = parseInt(Math.abs(offset)%60,10);
    if ( offmin < 10 ) offmin = "0" + offmin;
    
    let timestr = year + '-' + month + '-' + day + "T" + hour + ":" + min + ":00" + plusminus + offhour + ":" + offmin;
    //console.log(timestr);
    return timestr;
}

//function  ghInitCesiumClock() {
//    //Set bounds of our simulation time
//    if ( GH_ROUTE.duration == 0 ) return;
//    GH_V.clock.startTime = GH_ROUTE.start;
//    GH_V.clock.stopTime = GH_ROUTE.stop;
//    GH_V.clock.currentTime = GH_ROUTE.start;
////    GH_V.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
////    GH_V.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
//    GH_V.clock.multiplier = ghGetStatusbarMultiplier();
//    GH_V.timeline.updateFromClock();
//    GH_V.timeline.zoomTo(GH_ROUTE.start,GH_ROUTE.stop);
//    GH_V.timeline.resize();
//
////    GH_C.synchronize();
//    //  Cesium Timeline default Julian to Gregorian add timezone from UTC 
////    ghRenameTimelineLabel(); Move to InitCesiumViewer
//    
//    return;
//}	     

function ghGetModalInputTime( dom ) {

    var lt = $( dom ).val();

    var ret = lt.split(" ");
    var rtime = ret[0];
    var ampm = ret[1];

    var ret = rtime.split(":");
    var hour = parseInt(ret[0],10);
    var min = parseInt(ret[1],10);

    if ( ampm == "PM" ) {
	if ( hour == 12 ) {
	    hour = 12; // day common sense
	} else {
	    hour = hour + 12;
	}
    } else {
	// ampm == AM
	if ( hour == 12 ) {
	    hour = 0; // night common sense
	}
    }
    if ( hour > 23 ) {
	hour = hour - 24;
    }
    
    if ( min  > 59 ) {
	min = min % 60;
    }
    let res = hour + ":" + min ;
    //console.log(res);
    return res;
}


//
//  Bottom Speedmeter
//
function ghSetSpeedoMeter(t){
    if ( GH_SPEED_METER == null ) return 0;
    if ( !GH_SHOW_SPEEDOMETER ) return 1;

    if ( GH_PICK_ENTITY == null ) return 2;
    if ( ( typeof GH_PICK_ENTITY.model ) === 'undefined' ) return false;

    //console.log(GH_PICK_ENTITY.id);
    let pickid = GH_PICK_ENTITY.id.split('_'); // (trainid)_coach_(n)
    //let entityid = 'train_' + pickid[0] + '_mark';
    let entityid = 'train_' + pickid[0] + '_head';
    let e = __getDatasourceEntityByID( entityid );
    if ( e == null ) return 3;
    var po0 = new Cesium.Cartesian3();
    var po1 = new Cesium.Cartesian3();
    e.position.getValue(t,po0); // Current Position
    var t1 = Cesium.JulianDate.addSeconds(t, -1, new Cesium.JulianDate());
    e.position.getValue(t1,po1); // 1 second before Position

    var m = Cesium.Cartesian3.distance( po0, po1 ); // Meter / sec;
    var v = parseInt( m * GH_SPEED_CALC_PARAM,10); 
    //$('#gh_speedmeter').html(v+"Km/h");
    GH_SPEED_METER.changeValue(v);
    
    GH_SPEED_METER_PROP.prevpos = po0.clone();
    GH_SPEED_METER_PROP.prevtime = t.clone();

    // Dynamic 3D tile previous loading time
    //var presec = GH_3DTILE_AREA / m ;
    //if ( presec > 60 ) {
    //    GH_3DTILE_PRESEC = parseInt( presec , 10 );
    //} else {
    //    GH_3DTILE_PRESEC = 60;
    //}

    return 10;
}

function ghInitTimetableList() {
    $('#ghtimetablemodal_list').html("");    
}
function ghAppendTimetableList(key) {
    var str = "";
    var d = GH_LINES[key].description;
    str += '<label>';
    str += '<input name="timetableline" value="' + key + '" type="radio"/>';
    str += '<span>' + d + '<span>';
    str += '</label><BR><BR>';
    $('#ghtimetablemodal_list').append(str);
}
function ghCloseTimetableModal() {
    var val = $("input[name='timetableline']:checked").val();
    if ( ( typeof val ) == 'undefined' ) {
	return;
    }
    //console.log(val);
}

///////////////////////////////
function ghSetTimePicker( val , isautoplay  ) {

    let newtime = Cesium.JulianDate.fromIso8601( ghCreateIso8601str( GH_V.clock.currentTime , val, GH_TZ_OFFSET_MINUTES) );
    GH_V.clock.currentTime = newtime;
    GH_C.synchronize();
    GH_V.timeline.updateFromClock();
    //    //GH_V.timeline.resize();
    ghUpdateStatusbarDatetime(GH_V.clock.currentTime);
//    if ( isautoplay ) ghOnclickPlayButton();
};
function ghGetStatusbarMultiplier() {
    return parseFloat($('#ghcesiummultiplier').val());
}
function ghSetCesiumMultiplier( val ) {
    if ( GH_V == null ) return;
    if ( isNaN(val) ) return;
    let v = parseFloat(val);
    if ( v < -1 ) {
	v = -1 / ( v * GH_CLOCK_UNIT_SCALE );
    } else if ( v < 1 ) {
	v = 1;
    } else {
	v = v * GH_CLOCK_UNIT_SCALE ;
    }
    GH_V.clock.multiplier = v;
    //GH_V.clock.multiplier = parseFloat(val);
}
function ghSetCesiumQuality(val) {
    if ( GH_V == null ) return;
    GH_V.resolutionScale = Cesium.Math.clamp(val/100, 0.1, 1.0);
}
function ghSetCesiumCacheSize(val) {
    if ( GH_V == null ) return;
    GH_V.scene.globe.tileCacheSize = parseInt(val,10);    
}
function ghShowCesiumFPS(flag) {
    if ( GH_V == null ) return;
    GH_V.scene.debugShowFramesPerSecond = flag;
}
function ghShowCesiumTileQueue(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
        GH_SHOW_TILEQUEUE = true;
    } else {
        GH_SHOW_TILEQUEUE = false;
	ghSetHeaderTilequeue("");
    }
}
function ghShowCesiumSpeedoMeter(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_SHOW_SPEEDOMETER = true;
        $("#ghspeedometerposition").show(); 
    } else {
	GH_SHOW_SPEEDOMETER = false;
        $("#ghspeedometerposition").hide(); 
    }
}
function ghEnableCesiumSunEffect(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_S.globe.enableLighting = true;
	GH_S.sun = new Cesium.Sun();
        GH_V.shadows = true;
	GH_V.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
    } else {
	GH_S.globe.enableLighting = false;
	GH_S.sun = null; //undefined;
        GH_V.shadows = false;
	GH_V.terrainShadows = Cesium.ShadowMode.DISABLED;
    }
}
function ghEnableCesiumWaterEffect(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_S.globe.enableLighting = true;
	GH_S.sun = new Cesium.Sun();
        GH_V.shadows = true;
	GH_V.terrainShadows = Cesium.ShadowMode.RECEIVE_ONLY;
	if ( GH_3DTILE.mode != GH_3DTILE_PHOTOREALISTIC_GOOGLE ) GH_S.setTerrain( GH_TPV[1] );
    } else {
	GH_S.globe.enableLighting = false;
	GH_S.sun = null; //undefined;
        GH_V.shadows = false;
	GH_V.terrainShadows = Cesium.ShadowMode.DISABLED;
	if ( GH_3DTILE.mode != GH_3DTILE_PHOTOREALISTIC_GOOGLE ) GH_S.setTerrain( GH_TPV[0] );
    }
}
function ghEnableCesiumTunnel(flag) {
    if ( GH_V == null ) return;
    if ( flag ) {
	GH_USE_TUNNEL = true;
    } else {
	GH_USE_TUNNEL = false;
    }
}
//
// OSM building 
//
//  https://cesium.com/learn/cesiumjs/ref-doc/global.html?classFilter=osm#createOsmBuildingsAsync
//  https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileStyle.html?classFilter=Cesium3DTileStyle
//
//  https://cesium.com/platform/cesium-ion/content/cesium-osm-buildings/
//    https://wiki.openstreetmap.org/wiki/Key:shop
//    https://wiki.openstreetmap.org/wiki/Key:building
//
function ghSetupOSMBuildings(type) {
    if ( GH_3DTILE.mode == GH_3DTILE_OSMBUILDING || GH_3DTILE.mode == GH_3DTILE_OSMBUILDING_AND_TREE ) {
	if ( type == 1 ) {
	    __osmBuildingsAsyncStyle_1();
	} else if ( type == 2 ) {
	    __osmBuildingsAsyncStyle_2();
	} else {
	    __osmBuildingsAsync();
	}
    }

}
async function __osmBuildingsAsync() {
    try {
	GH_3DTILE.primitive = await Cesium.createOsmBuildingsAsync({
	    showOutline : false,
	    enableShowOutline : false
	});
	GH_V.scene.primitives.add(GH_3DTILE.primitive);
    } catch (error) {
	console.log(`Error creating tileset: ${error}`);
    }
}
async function __osmBuildingsAsyncStyle_1() {
    try {
	GH_3DTILE.primitive = await Cesium.createOsmBuildingsAsync({
	    showOutline : false,
	    enableShowOutline : false,
	    style: new Cesium.Cesium3DTileStyle({
		defines: {
		    material: "${feature['building:material']}"
		},
		color: {
		    conditions: [
			["${material} === null", "color('white', 0.9)"],
			["${material} === 'glass'", "color('skyblue', 0.5)"],
			["${material} === 'concrete'", "color('grey')"],
			["${material} === 'brick'", "color('indianred')"],
			["${material} === 'stone'", "color('lightslategrey')"],
			["${material} === 'metal'", "color('lightgrey')"],
			["${material} === 'steel'", "color('lightsteelblue')"],
			["true", "color('white', 0.95)"]
		    ]
		}
	    })
	});
	GH_V.scene.primitives.add(GH_3DTILE.primitive);
    } catch (error) {
	console.log(`Error creating tileset: ${error}`);
    }
}
async function __osmBuildingsAsyncStyle_2() {
    try {
	GH_3DTILE.primitive = await Cesium.createOsmBuildingsAsync({
	    showOutline : false,
	    enableShowOutline : false,
	    style: new Cesium.Cesium3DTileStyle({
		color: {
		    conditions: [
			["${feature['building']} === 'commercial'", "color('#778899')"],
			["${feature['building']} === 'industrial'", "color('#A9A9A9')"],
			["${feature['building']} === 'office'", "color('#B0C4DE')"],
			["${feature['building']} === 'supermarket'", "color('#AFEEEE')"],
			["${feature['building']} === 'hotel'", "color('#F0FFF0')"],
			["${feature['building']} === 'apartments'", "color('#F5DEB3')"],
			["${feature['building']} === 'house'", "color('#D2B48C')"],
			["${feature['building']} === 'cathedral'", "color('#4B0082')"],
			["${feature['building']} === 'chaperl'", "color('#9370DB')"],
			["${feature['building']} === 'civic'", "color('#BDB76B')"],
			["${feature['building']} === 'government'", "color('#EEE8AA')"],
			["${feature['building']} === 'hospital'", "color('#F5F5DC')"],
			["${feature['building']} === 'public'", "color('#808000')"],
			[true, "color('#ffffff')"]
		    ]
		}
	    })
	});
	GH_V.scene.primitives.add(GH_3DTILE.primitive);
    } catch (error) {
	console.log(`Error creating tileset: ${error}`);
    }
}
function ghEnableCesium3Dtile(type){
    if ( GH_V == null ) return;

    switch (type) {
    case GH_3DTILE_PHOTOREALISTIC_GOOGLE:
	GH_3DTILE.mode = GH_3DTILE_PHOTOREALISTIC_GOOGLE;
	// NOP
	break;
    case GH_3DTILE_OSMBUILDING:
	GH_3DTILE.mode = GH_3DTILE_OSMBUILDING;
	if ( GH_3DTILE.primitive == null ) {
	    ghSetupOSMBuildings(GH_3DTILE_OSMBUILDING_STYLE);
	} else {
	    // NOP
	}
	ghVectorTileFreeDataSource('all');
	break;
    case GH_3DTILE_OSMBUILDING_AND_TREE:
	GH_3DTILE.mode = GH_3DTILE_OSMBUILDING_AND_TREE;
	if ( GH_3DTILE.primitive == null ) {
	    ghSetupOSMBuildings(GH_3DTILE_OSMBUILDING_STYLE);
	} else {
	    // NOP
	}
	break;
    case GH_3DTILE_NEXTZEN_BUILDING_ONLY:
	GH_3DTILE.mode = GH_3DTILE_NEXTZEN_BUILDING_ONLY;
	if ( GH_3DTILE.primitive == null ) {
	    // NOP
	} else {
            GH_V.scene.primitives.remove(GH_3DTILE.primitive);
	    GH_3DTILE.primitive.destroy();
            GH_3DTILE.primitive = null ;
	}
	ghVectorTileFreeDataSource('all');
	break;
    case GH_3DTILE_NEXTZEN_BUILDING_AND_TREE:
	GH_3DTILE.mode = GH_3DTILE_NEXTZEN_BUILDING_AND_TREE;
	if ( GH_3DTILE.primitive == null ) {
	    // NOP
	} else {
            GH_V.scene.primitives.remove(GH_3DTILE.primitive);
	    GH_3DTILE.primitive.destroy();
            GH_3DTILE.primitive = null ;
	}
	ghVectorTileFreeDataSource('all');
	break;
    default:
	GH_3DTILE.mode = GH_3DTILE_NONE;
	if ( GH_3DTILE.primitive == null ) {
	    // NOP
	} else {
            GH_V.scene.primitives.remove(GH_3DTILE.primitive);
	    GH_3DTILE.primitive.destroy();
            GH_3DTILE.primitive = null ;
	}
	ghVectorTileFreeDataSource('all');
    }

}

function ghSetCesiumModelLabelProperty( type, flag , value ) {
    let str = value + "px Arial";
    let y = parseFloat(value);
    let col = '#008000';
    if ( str.match(/^#/) ) {
	col = new Cesium.Color.fromCssColorString( value );
    }
    for ( var i=0,len=GH_FIELD.units.length; i < len; i++ ) {
	let entity = GH_V.entities.getById( __ghGetCoachEntityKey( GH_FIELD.units[i].trainid,0) );
	if ( Cesium.defined( entity ) ) {
	    if ( entity.label ) {
		if ( type == 'show') {
		    entity.label.show = flag;
		} else if ( type == 'scale' ) {
		    entity.label.font = str;
		} else if ( type == 'yoffset' ) {
		    GH_TRAIN_LABEL_Y_OFFSET = y;
		    entity.label.eyeOffset = new Cesium.Cartesian3(0.0, y, 0.0);
		} else if ( type == 'color' ) {
		    entity.label.fillColor = col;
		} else {
		    // NOP
		}
	    }
	}
    }
}

function ghSetCesiumStationLabelProperty( type, flag , value) {
    let stations = GH_LAYER.station;
    let str = value + "px Arial";
    let y = parseFloat(value);
    let col = '#008000';
    if ( str.match(/^#/) ) {
	col = new Cesium.Color.fromCssColorString( value );
    }
    //let col = Cesium.Color.fromCssColorString( value );
    for(var key in stations ) {
	let id = 'station_' + key;
	let entity = GH_V.entities.getById( id );
	if ( Cesium.defined( entity ) ) {
	    if ( entity.label ) {
		if ( type == 'show') {
		    entity.label.show = flag;
		    entity.polyline.show = flag;
		} else if ( type == 'scale' ) {
		    entity.label.font = str;
		} else if ( type == 'yoffset' ) {
		    entity.label.eyeOffset = new Cesium.Cartesian3(0.0, y, 0.0);
		} else if ( type == 'color' ) {
		    entity.label.fillColor = col;
		    entity.polyline.material.color = col;
		} else {
		    // NOP
		}
	    }
	}
    }
}

var GH_STATION_LABEL_POSITION = [];
var GH_STATION_LABEL_ID = [];
var GH_STATION_LABEL_EYEOFFSET = [];
function ghUpdateCesiumStationLabelOffset(ct) {

    let flag = $( '#stationlabelcheckbox').is(':checked');
    if ( !flag ) return; // not show NOP

    GH_STATION_LABEL_ID = [];
    GH_STATION_LABEL_POSITION = [];
    GH_STATION_LABEL_EYEOFFSET = [];
    let stations = GH_LAYER.station;
    for(var key in stations ) {
	let id = 'station_' + key;
	let entity = GH_V.entities.getById( id );
	if ( Cesium.defined( entity ) ) {
	    if ( entity.label ) {
		GH_STATION_LABEL_ID.push(id);
		let cartesian = new Cesium.Cartesian3();
		entity.position.getValue(ct,cartesian);
		let latlng = GH_S.globe.ellipsoid.cartesianToCartographic(cartesian);
		//GH_STATION_LABEL_POSITION.push( Cesium.Cartographic.fromRadians(latlng.longitude,latlng.latitude)  );
		GH_STATION_LABEL_POSITION.push( latlng );

		entity.label.eyeOffset.getValue(ct,cartesian);
		GH_STATION_LABEL_EYEOFFSET.push (cartesian.y);
	    }
	}
    }

    if ( GH_STATION_LABEL_POSITION.length > 0 ) {
	var stationpromise = Cesium.sampleTerrainMostDetailed(GH_S.terrainProvider,GH_STATION_LABEL_POSITION, true);
	stationpromise.then(function(val){
	    ghPromiseStationLabel(val);
	});
    }
}
function ghPromiseStationLabel(posarray) {
    for (let i = 0; i < posarray.length; i++) {
	let entity = GH_V.entities.getById( GH_STATION_LABEL_ID[i] );
	let pos = posarray[i];
	let eyeoffset = GH_STATION_LABEL_EYEOFFSET[i];
	let y = pos.height + eyeoffset;
	entity.polyline.positions = Cesium.Cartesian3.fromRadiansArrayHeights([
	    pos.longitude,
	    pos.latitude,
	    y,
	    pos.longitude,
	    pos.latitude,
	    0
	]);
    }
}
function ghUpdateCesiumStationLabelOffsetObsolete(ct) {

    let flag = $( '#stationlabelcheckbox').is(':checked');
    if ( !flag ) return; // not show NOP

    let stations = GH_LAYER.station;
    for(var key in stations ) {
	let id = 'station_' + key;
	let entity = GH_V.entities.getById( id );
	if ( Cesium.defined( entity ) ) {
	    if ( entity.label ) {
		let cartesian = new Cesium.Cartesian3();
		entity.position.getValue(ct,cartesian);
		let latlng = GH_S.globe.ellipsoid.cartesianToCartographic(cartesian);
		let height = GH_S.globe.getHeight(latlng);
		entity.label.eyeOffset.getValue(ct,cartesian);
		if ( ! isNaN(height) ) {
		    let y = height + cartesian.y;
		    entity.polyline.positions = Cesium.Cartesian3.fromRadiansArrayHeights([
			latlng.longitude,
			latlng.latitude,
			y,
			latlng.longitude,
			latlng.latitude,
			0
		    ]);
		}
	    }
	}
    }
}

function ghSetCesiumTrackProperty(type, val) {
    let primitives = GH_V.scene.groundPrimitives._primitives;
    for ( var i=0,ilen=primitives.length; i < ilen; i++ ) {
	for ( var j=0,jlen=GH_PRIMITIVE_ID.length; j < jlen; j++ ) {
	    if ( primitives[i].geometryInstances ) {
		var attributes = primitives[i].getGeometryInstanceAttributes(GH_PRIMITIVE_ID[j]);
		if ( ( typeof attributes ) === 'undefined' ) {
		    // NOP
		} else {
		    if ( type == 'width' ) {
			// AdHook
			let uint8 = new Uint8Array(1);
			uint8[0] = val;
			attributes.width = uint8;
		    } else if ( type == 'color' ) {
			attributes.color = Cesium.ColorGeometryInstanceAttribute.toValue( Cesium.Color.fromCssColorString( val ) );
		    } else {
			// NOP
		    }
		}
	    } else {
		// NOP
	    }
	}
    }
}
function ghEnableAutoCamera(flag) {
    if ( flag ) {
	GH_IS_CAMERA_AUTOMODE  = true;
	if ( GH_CAMERA_AUTOMODE.timer == null ) { 
            GH_CAMERA_AUTOMODE.timer = setTimeout(ghSetAutoCameraTimer,GH_CAMERA_AUTOMODE.interval);
	}
    } else {
	GH_IS_CAMERA_AUTOMODE = false;
	if ( GH_CAMERA_AUTOMODE.timer != null ) { 
            clearTimeout(GH_CAMERA_AUTOMODE.timer);
	}
        GH_CAMERA_AUTOMODE.timer = null;
    }
}
function ghSetAutoCameraInterval(val) {
    GH_CAMERA_AUTOMODE.interval = parseFloat(val) * 60000; // mili-second
}
function __ghGetRandom(mmin,mmax) {
    return Math.floor( Math.random() * ( mmax - mmin ) ) + mmin;
}
function ghSetAutoCameraTimer() {
    let nextmode = __ghGetRandom(GH_CAMERA_AUTOMODE.modemin,GH_CAMERA_AUTOMODE.modemax);
    while( nextmode == GH_CAMERA_AUTOMODE.current ) {
	nextmode = __ghGetRandom(GH_CAMERA_AUTOMODE.modemin,GH_CAMERA_AUTOMODE.modemax);
    }
    $('input:radio[name="viewpoint"]').each(function(index) {
	if ( $(this).val() == nextmode ) {
	    $(this).prop('checked', true);
	} else {
	    $(this).prop('checked', false);
	}
    });
    ghOnClickViewpointButton(nextmode);
    GH_CAMERA_AUTOMODE.current = nextmode;
    if ( GH_CAMERA_AUTOMODE.timer != null ) {
	clearTimeout(GH_CAMERA_AUTOMODE.timer);
    }
    GH_CAMERA_AUTOMODE.timer = setTimeout(ghSetAutoCameraTimer,GH_CAMERA_AUTOMODE.interval);    
}

function ghSetCesiumWeather( val, v ) {
    // val = sunny or rain
    // v = rain density
    var audio = document.getElementById('audiorain');
    
    if ( val == "rain" ) {
        GH_IS_RAIN = true;    
        GH_IS_CLOUD = false;
	GH_RAIN_POINTS = v * GH_RAIN_POINTS_BASE;
        GH_V.scene.skyAtmosphere = new Cesium.SkyAtmosphere(Cesium.Ellipsoid.WGS84,"cloud");
	
    } else if ( val == "cloud" ) {
        GH_IS_RAIN = false;
        GH_IS_CLOUD = true;    
        GH_V.scene.skyAtmosphere = new Cesium.SkyAtmosphere(Cesium.Ellipsoid.WGS84,"cloud");
	if ( ! audio.paused ) audio.pause();
    } else {
        GH_IS_RAIN = false;
        GH_IS_CLOUD = false;
        GH_V.scene.skyAtmosphere = new Cesium.SkyAtmosphere(Cesium.Ellipsoid.WGS84,"default");
	if ( ! audio.paused ) audio.pause();
    	//GH_S.sun = null;
    	//delete GH_V.scene.sun;
    }
}

/////////////////////////////////////////////////////////

function ghCalcCameraFromBack(cartesian,matrix) {

    let posx = -1 * GH_CAM_DISTANCE ;
    let posy = 0.0;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(GH_CAM_DISTANCE,0, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;
    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(GH_CAM_ALT,0,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);
    
    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromBackRight(cartesian,matrix) {


    let posx = -0.7 * GH_CAM_DISTANCE ;
    let posy = -0.7 * GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0.7 * GH_CAM_DISTANCE,0.7 * GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;

    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0.7*GH_CAM_ALT,0.7*GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               
    
    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);
    
    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromBackLeft(cartesian,matrix) {


    let posx = -0.7 * GH_CAM_DISTANCE ;
    let posy = 0.7 * GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0.7 * GH_CAM_DISTANCE,-0.7 * GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;

    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0.7*GH_CAM_ALT,-0.7*GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);
    
    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromFront(cartesian,matrix) {

    let posx = 1 * GH_CAM_DISTANCE ;
    let posy = 0.0;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-GH_CAM_DISTANCE,0, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;
    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-GH_CAM_ALT,0,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);

    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromFrontRight(cartesian,matrix) {


    let posx = 0.7 * GH_CAM_DISTANCE ;
    let posy = -0.7 * GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-0.7*GH_CAM_DISTANCE,0.7*GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;
    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-0.7*GH_CAM_ALT,0.7*GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);

    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromFrontLeft(cartesian,matrix) {


    let posx = 0.7 * GH_CAM_DISTANCE ;
    let posy = 0.7 * GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-0.7*GH_CAM_DISTANCE,-0.7*GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;

    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(-0.7*GH_CAM_ALT,-0.7*GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);

    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromAbove(cartesian,matrix) {


    let posx = 0.0
    let posy = 0.0;
    let posz = GH_CAM_DISTANCE + GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    var dir_v = new Cesium.Cartesian3();
    var up_v = new Cesium.Cartesian3();
    let nz = new Cesium.Cartesian3();
    Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_Z,nz)
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nz,dir_v) ;
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_X,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);
    
    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromRight(cartesian,matrix) {

    let posx = 0.0
    let posy = -1 * GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0,GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;
    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0,GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos =  ghAdjustPitchHeightForTerrain(campos,cartesian,posz);

    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }

}
function ghCalcCameraFromLeft(cartesian,matrix) {

    let posx = 0.0
    let posy = GH_CAM_DISTANCE ;
    let posz = GH_CAM_ALT;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posz, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    let nv = new Cesium.Cartesian3();
    var dir_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0,-GH_CAM_DISTANCE, -GH_CAM_ALT, nv);
    Cesium.Cartesian3.normalize(nv, nv);
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,dir_v) ;
    var up_v = new Cesium.Cartesian3();
    Cesium.Cartesian3.fromElements(0,-GH_CAM_ALT,GH_CAM_DISTANCE, nv);
    Cesium.Cartesian3.normalize(nv, nv);    
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nv,up_v) ;               

    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posz);

    return {
	"cartesian" : ncampos.cartesian,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : ncampos.pitch,
	"pitchdir" : ncampos.pitchdir
    }


}

function ghCalcCameraToFront(cartesian,matrix) {

    let posalt = GH_CAM_EYE;
    //let posx = GH_CAM_DISTANCE;
    let posx = 13.0; // ???? depend on locomotive size
    let posy = 0.0;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posalt, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    var dir_v = new Cesium.Cartesian3();
    var up_v = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_X,dir_v) ;
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_Z,up_v) ;               

    //let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posalt);

//    return {
//	"cartesian" : ncampos.cartesian,
//	"orientation" : {
//	    "direction" : dir_v,
//	    "up" : up_v
//	},
//	"pitch" : ncampos.pitch,
//	"pitchdir" : ncampos.pitchdir
//    }
    return {
	"cartesian" : campos,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : 0.0,
	"pitchdir" : 0.0,
    }

    

}
function ghCalcCameraToRight(cartesian,matrix) {

    let posalt = GH_CAM_EYE;
    let posx = 0.0;
    //let posy = -1 * GH_CAM_DISTANCE;
    let posy = -5.0;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posalt, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    var dir_v = new Cesium.Cartesian3();
    var up_v = new Cesium.Cartesian3();
    let ny = new Cesium.Cartesian3();
    Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_Y,ny)
    Cesium.Matrix4.multiplyByPointAsVector(matrix,ny,dir_v) ;
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_Z,up_v) ;               

//    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posalt);
//    return {
//	"cartesian" : ncampos.cartesian,
//	"orientation" : {
//	    "direction" : dir_v,
//	    "up" : up_v
//	},
//	"pitch" : ncampos.pitch,
//	"pitchdir" : ncampos.pitchdir
//    }
    return {
	"cartesian" : campos,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : 0.0,
	"pitchdir" : 0.0,
    }


}
function ghCalcCameraToLeft(cartesian,matrix) {

    let posalt = GH_CAM_EYE;
    let posx = 0.0;
    //let posy = 1 * GH_CAM_DISTANCE;
    let posy = 5.0;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posalt, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    var dir_v = new Cesium.Cartesian3();
    var up_v = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_Y,dir_v) ;
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_Z,up_v) ;               

//    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posalt);
//    return {
//	"cartesian" : ncampos.cartesian,
//	"orientation" : {
//	    "direction" : dir_v,
//	    "up" : up_v
//	},
//	"pitch" : ncampos.pitch,
//	"pitchdir" : ncampos.pitchdir
//    }
    return {
	"cartesian" : campos,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : 0.0,
	"pitchdir" : 0.0,
    }

}

function ghCalcCameraToBack(cartesian,matrix) {

    let posalt = GH_CAM_EYE;
    //let posx = -1 * GH_CAM_DISTANCE;
    let posx = -1.0;
    let posy = 0.0;
    let lpos = new Cesium.Cartesian3(); // Local ideal position
    Cesium.Cartesian3.fromElements( posx, posy, posalt, lpos);

    var campos = new Cesium.Cartesian3();
    Cesium.Matrix4.multiplyByPoint( matrix , lpos , campos ) ;

    var dir_v = new Cesium.Cartesian3();
    var up_v = new Cesium.Cartesian3();
    let nx = new Cesium.Cartesian3();
    Cesium.Cartesian3.negate(Cesium.Cartesian3.UNIT_X,nx)
    Cesium.Matrix4.multiplyByPointAsVector(matrix,nx,dir_v) ;
    Cesium.Matrix4.multiplyByPointAsVector(matrix,Cesium.Cartesian3.UNIT_Z,up_v) ;               

//    let ncampos = ghAdjustPitchHeightForTerrain(campos,cartesian,posalt);
//    return {
//	"cartesian" : ncampos.cartesian,
//	"orientation" : {
//	    "direction" : dir_v,
//	    "up" : up_v
//	},
//	"pitch" : ncampos.pitch,
//	"pitchdir" : ncampos.pitchdir
//    }
    return {
	"cartesian" : campos,
	"orientation" : {
	    "direction" : dir_v,
	    "up" : up_v
	},
	"pitch" : 0.0,
	"pitchdir" : 0.0,
    }

}

function ghAdjustPitchHeightForTerrain(cam,model,h) {

    var cam_latlng = GH_V.scene.globe.ellipsoid.cartesianToCartographic(cam);
    if ( ! Cesium.defined( cam_latlng ) ) {
	return {
	    "cartesian" : cam,
	    "pitch" : 0.0,
	    "pitchdir" : 0.0
	}
    }
    
    let cam_terrain = 0;
    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
	cam_terrain = __sampleHeightsPhotorealisticGoogle3D(cam_latlng);
    } else {
	cam_terrain = GH_S.globe.getHeight(cam_latlng);
    }

    let newcam = null;
    let offset = 1.0;
    let newmodel = null;
    let model_latlng = GH_V.scene.globe.ellipsoid.cartesianToCartographic(model);
    if ( ! Cesium.defined( model_latlng ) ) {
	return {
	    "cartesian" : cam,
	    "pitch" : 0.0,
	    "pitchdir" : 0.0
	}
    }

    let model_terrain = 0;
    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
	model_terrain = __sampleHeightsPhotorealisticGoogle3D(model_latlng);
    } else {
	model_terrain = GH_S.globe.getHeight(model_latlng);
    }
    let hr = 0;
    if ( cam_latlng.height > cam_terrain + offset ) {
	if ( hr > 0 ) {
	    // Height Reference > Cesium.HeightReference.NONE 
	    let error_margin = h * 3;
	    let terrain_margin = Math.abs(model_latlng.height-model_terrain);
	    if ( terrain_margin < error_margin ) {
		return {
		    "cartesian" : cam,
		    "pitch" : 0.0,
		    "pitchdir" : 0.0
		}
	    } else {
		//  Height difference is too large
		newcam = new Cesium.Cartesian3.fromRadians(
		    cam_latlng.longitude,
		    cam_latlng.latitude,
		    model_terrain + h
		);
		
		newmodel = new Cesium.Cartesian3.fromRadians(
		    model_latlng.longitude,
		    model_latlng.latitude,
		    model_terrain
		);
		
		let c_m = new Cesium.Cartesian3();
		Cesium.Cartesian3.subtract(cam, model, c_m)
		let n_m = new Cesium.Cartesian3();
		Cesium.Cartesian3.subtract(newcam, newmodel, n_m)
	    
		if ( cam_latlng.height > model_terrain + h ) {
		    return {
			"cartesian" : newcam,
			"pitch" : Math.abs(Cesium.Cartesian3.angleBetween(n_m, c_m)),
			"pitchdir" : 1
		    }
		} else {
		    return {
			"cartesian" : newcam,
			"pitch" : Math.abs(Cesium.Cartesian3.angleBetween(n_m, c_m)),
			"pitchdir" : -1
		    }
		}
	    }
	} else {
	    return {
		"cartesian" : cam,
		"pitch" : 0.0,
		"pitchdir" : 0.0
	    }
	}
    } else {
	// underground
	newcam = new Cesium.Cartesian3.fromRadians(
	    cam_latlng.longitude,
	    cam_latlng.latitude,
	    cam_terrain + h
	);

	newmodel = new Cesium.Cartesian3.fromRadians(
	    model_latlng.longitude,
	    model_latlng.latitude,
	    model_terrain
	);
	
	let c_m = new Cesium.Cartesian3();
	Cesium.Cartesian3.subtract(cam, model, c_m);

	let n_m = new Cesium.Cartesian3();
	Cesium.Cartesian3.subtract(newcam, newmodel, n_m)

	//////////////////////////////  Normalized Error work around //////////////////////////////
	let n_m_len = Cesium.Cartesian3.magnitude(n_m);
	if ( isNaN(n_m_len) || n_m_len < 0.01  ) {
	    return {
		"cartesian" : newcam,
		"pitch" : 0.0,
		"pitchdir" : -1
	    }
	}
	//////////////////////////////  Normalized Error work around //////////////////////////////
	
	return {
	    "cartesian" : newcam,
	    "pitch" : Math.abs(Cesium.Cartesian3.angleBetween(n_m, c_m)),
	    "pitchdir" : -1
	}
	
    }
}

function ghSetHomeCameraPosition() {
    // https://stackoverflow.com/questions/28709007/how-to-set-the-default-view-location-cesium-1-6
    GH_V.homeButton.viewModel.command.beforeExecute.addEventListener(
	function(e) {
	    e.cancel = true;
	    GH_V.camera.flyToBoundingSphere(GH_CAM_HOME_BUTTON);
	    GH_CAM_MODE = GH_CAM_MODE_NONE;
	    if ( GH_V.trackedEntity != null ) GH_V.trackedEntity = null;
	    $('input:radio[name="viewpoint"][value="0"]').prop('checked', true);
	});
}
//
//
//   Local frame axis
//
//                     up
//                  
//                     +z     +y left
//                      |     /
//                      |    /
//                      |   /
//                      |  /
//                      | /
//                      |/
//   back  -x            ---------> +x front
//
//
//              right -y
//
//
//                      -z
//                     down
//
//

function ghSetViewpoint(ct) {

    if ( GH_PICK_ENTITY == null ) return;
    if ( ! Cesium.defined( GH_PICK_ENTITY.orientation ) ) return;

    //let cartesian = new Cesium.Cartesian3();
    let cartesian = GH_PICK_ENTITY.position.getValue(ct);
    if ( ! Cesium.defined( cartesian ) ) return;
    
//    let heightreference = null;
//    if ( GH_MDL.model.model ) {
//	heightreference = GH_MDL.model.model.heightReference.getValue();
//    }
    
    let modelMatrix = new Cesium.Matrix4();
    GH_PICK_ENTITY.computeModelMatrix(ct, modelMatrix) ;    

    let transform = new Cesium.Cartesian3();
    Cesium.Matrix4.getTranslation(modelMatrix, transform);
    
    var orientation = new Cesium.Quaternion();
    GH_PICK_ENTITY.orientation.getValue(ct,orientation);
    var orientationangle = Cesium.Quaternion.computeAngle(orientation);
    let diffangle = 0;
    //let diffangle = Math.abs(orientationangle - GH_MODEL_QUATERNION.startangle);
    //console.log(diffangle);
    //
    //  0.0000018
    //
    // 360 deg about 2.79072163
    //
    //  95 deg about 1.138585
    //
    
    if ( GH_CAM_QUATERNION.start == null ) {
	GH_CAM_QUATERNION.start = orientation.clone();
	GH_CAM_QUATERNION.startangle = orientationangle;
	GH_CAM_QUATERNION.end = null;
    } else {
	if ( GH_CAM_QUATERNION.end == null ) {
	    diffangle = Math.abs(orientationangle - GH_CAM_QUATERNION.startangle);
	    if ( diffangle > GH_CAM_QUATERNION_ANGLE ) {
		GH_CAM_QUATERNION.end = orientation.clone();
		Cesium.Quaternion.lerp(GH_CAM_QUATERNION.start, GH_CAM_QUATERNION.end, GH_CAM_QUATERNION.t,orientation);
		GH_CAM_QUATERNION.t = GH_CAM_QUATERNION.t + GH_CAM_QUATERNION.step;
	    } else {
		// Normal NOP
	    }
	} else {
	    //  on the way for rotation
	    if ( GH_CAM_QUATERNION.t < GH_CAM_QUATERNION.max ) {
		Cesium.Quaternion.lerp(GH_CAM_QUATERNION.start, GH_CAM_QUATERNION.end, GH_CAM_QUATERNION.t,orientation);
		GH_CAM_QUATERNION.t = GH_CAM_QUATERNION.t + GH_CAM_QUATERNION.step;
	    } else {
		// Finish nop
		GH_CAM_QUATERNION.end = null;
		GH_CAM_QUATERNION.t = GH_CAM_QUATERNION.step;
	    }
	}
    }
    let newMatrix = new Cesium.Matrix4();    
    Cesium.Matrix4.fromTranslationQuaternionRotationScale(
	transform,
	orientation,
	new Cesium.Cartesian3(1.0,1.0,1.0),
	newMatrix);

    //let eye = __getDefaultModelCameraHeight(GH_PICK_ENTITY.id);

    let pos = null;
    switch (GH_CAM_MODE) {
    case GH_CAM_MODE_SOUTH:
 	pos = ghCalcCameraFromBack(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_SOUTHEAST:
 	pos = ghCalcCameraFromBackRight(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_SOUTHWEST:
 	pos = ghCalcCameraFromBackLeft(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_NORTH:
 	pos = ghCalcCameraFromFront(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_NORTHEAST:
 	pos = ghCalcCameraFromFrontRight(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_NORTHWEST:
 	pos = ghCalcCameraFromFrontLeft(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_ABOVE:
	pos = ghCalcCameraFromAbove(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_EAST:
	pos = ghCalcCameraFromRight(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_WEST:
	pos = ghCalcCameraFromLeft(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_FRONT:
	pos = ghCalcCameraToFront(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_RIGHT:
	pos = ghCalcCameraToRight(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_LEFT:
	pos = ghCalcCameraToLeft(cartesian,newMatrix);
	break;
    case GH_CAM_MODE_BACK:
	pos = ghCalcCameraToBack(cartesian,newMatrix);
	break;
    default:
	pos = ghCalcCameraFromAbove(cartesian,newMatrix);
    }

    //////////////////////////////  Normalized Error work around //////////////////////////////
    //ellipsoid = defaultValue(ellipsoid, Ellipsoid.WGS84);
    //ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);
    //  -- https://github.com/CesiumGS/cesium/blob/1.104/packages/engine/Source/Core/Ellipsoid.js#L364
    //let poscheck = Cesium.Ellipsoid.WGS84.geodeticSurfaceNormal(pos.cartesian);
    let surf = new Cesium.Cartesian3();
    surf = Cesium.Cartesian3.multiplyComponents(pos.cartesian, Cesium.Ellipsoid.WGS84.oneOverRadiiSquared, surf);
    if ( isNaN( Cesium.Cartesian3.magnitude( surf ) ) ) return;
    //////////////////////////////  Normalized Error work around //////////////////////////////
    
    GH_V.camera.setView({
	destination: pos.cartesian,
	orientation : pos.orientation
    });

    // Pitsh Adjustment
    if ( pos.pitch == 0 ) {
	// NOP
    } else {
	if ( pos.pitchdir > 0 ) {
            GH_V.camera.lookUp(pos.pitch);
	} else {
            GH_V.camera.lookDown(pos.pitch);
	}
    }

    // Roll Adjustment
    if  ( GH_CAM_MODE == GH_CAM_MODE_NONE || GH_CAM_MODE == GH_CAM_MODE_ABOVE ) {
	// NOP
    } else {
        GH_V.camera.twistLeft(GH_V.camera.roll);
    }

    if ( GH_CAM_QUATERNION.end == null ) {
	GH_CAM_QUATERNION.start = orientation.clone();
	GH_CAM_QUATERNION.startangle = orientationangle;
    }
    
}

function ghChangePlayPauseButton(isplaying) {
    if ( isplaying ) {
	// Button Play -> pause
	$('#ghplaypauseicon').html("pause");
	$('#ghplaybtntext').html("pause");        
	$('#ghplaybtn').css("background-color","#b22222");     
    } else {
	// Button Pause -> Play
	$('#ghplaypauseicon').html("play_arrow");
	$('#ghplaybtntext').html("play");    
	$('#ghplaybtn').css("background-color","#26a69a");
    }
}

function ghStopCesiumScene() {
    if ( GH_IS_PLAYING ) {
	if ( GH_C.canAnimate && GH_C.shouldAnimate ) {
	    // pause command twice -> play start
	    // work around
	    GH_A.pauseViewModel.command();
	}
	GH_V.scene.preRender.removeEventListener(ghUpdateCesiumScene);
    } else {
	// NOP
    }
    GH_IS_PLAYING = false; // status pause
}
function ghStartCesiumScene() {
    if ( GH_IS_PLAYING ) {
	// NOP
    } else {
	GH_A.playForwardViewModel.command();
	GH_V.scene.preRender.addEventListener(ghUpdateCesiumScene);
    }
    GH_IS_PLAYING = true;  // status play
}

function ghUpdateStatusbarDatetime(t) {

    var d = null;
    if ( t == null ) {
	d = Cesium.JulianDate.addMinutes(GH_V.clock.currentTime,GH_TZ_OFFSET_MINUTES, new Cesium.JulianDate());
    } else {
	d = Cesium.JulianDate.addMinutes(t,GH_TZ_OFFSET_MINUTES, new Cesium.JulianDate());
    }
    var gregorianDate = Cesium.JulianDate.toGregorianDate(d);

//    var y = gregorianDate.year;
//    if ( y < 10 ) {
//	y = "000" + y;
//    } else if ( y < 100 ) {
//	y = "00" + y;    
//    } else if ( y < 1000 ) {
//	y = "0" + y;    
//    } else {
//	// NOP
//    }
//    var mo = gregorianDate.month;
//    if ( mo < 10 ) mo = "0" + mo;
//    var dy = gregorianDate.day;
//    if ( dy < 10 ) dy = "0" + dy;
//    var str =  mo + "-" + dy  + "-" + y  ;
//    $('#gh_datedescription').html(str);

    let h = gregorianDate.hour;
    if ( h < 10 ) h = "0" + h;

    let m = gregorianDate.minute;
    if ( m < 10 ) m = "0" + m;
    let s = gregorianDate.second;
    if ( s < 10 ) s = "0" + s;
    
    //var str =  h + ":" + m + ":" + s;
    let str =  h + ":" + m + ":" + s;
    $('#timedescription').html(str);

    ghCheckStopTimer(gregorianDate);
    
}
function ghCheckStopTimer(gregorian) {

    let status = $('#enablestoptimercheckbox').is(':checked');
    if ( status ) {
	let hhh =  $('#stoptimerhour').val();
	let mmm =  $('#stoptimermin').val();
	if ( gregorian.hour == hhh && gregorian.minute == mmm ) {
	    ghStopCesiumScene();
	    ghStopTitleMarquee();
	    ghChangePlayPauseButton(false);
	} else {
	    // NOP
	}
    } else {
	// NOP
    }

}

function ghCreateLeafletIcon(type,trainid) {
    // Default Station
    var icon = GH_MARKER_PROP.station.url;
    var icons = GH_MARKER_PROP.station.shadow;
    var h = GH_MARKER_PROP.station.size;
    var m = GH_FIELD.marker;
    if ( type == "train") {
	if ( GH_UNIT_GEOM[trainid] ) {
	    let fid = GH_UNIT_GEOM[trainid].fid;
	    m = GH_FIELD.units[ fid ].marker;
	    if ( m == "default" ) {
		m = GH_FIELD.marker;
	    } else {
		// NOP 
	    }
	} else {
	    m = GH_FIELD.marker;
	}
	icon = ghGetResourceUri(m);
        icons = null;
        h = GH_MARKER_PROP.train.size;
    }
    if ( type == "camera") {
        icon = GH_MARKER_PROP.camera.url;
        icons = null;
        h = GH_MARKER_PROP.camera.size;
    }

    var w = (h * 5 / 6)|0;
    var ih = h;
    var iw = ( w / 2 )|0;
    //var pw = -1 * ih;
    var ph = -1 * iw;
    return L.icon({
	iconUrl: icon,
	shadowUrl: icons,
	iconSize:     [w, h], // size of the icon
	shadowSize:   [w, h], // size of the shadow
	iconAnchor:   [iw, ih], // point of the icon which will correspond to marker's location
	shadowAnchor: [0, ih],  // the same for the shadow
	popupAnchor:  [0, ph] // point from which the popup should open relative to the iconAnchor
    });
}    

function ghMapTrainMarker(id,pos) {
    
    if ( ( typeof GH_LAYER.train[id] ) == 'undefined' ) {
	// create icon
	var mi = ghCreateLeafletIcon("train",id);
	if ( mi == null ) {
	    // NOP
	    return null;
	} else{
	    var marker = L.marker(pos, {icon: mi,title:id});
	    GH_LAYER.train[id] = marker;
//	    GH_LAYER.tmarker[id].on('click', function(e) {
//		ghPickLeafletData(this,'train',e);
//		ghOnclickLeafletMarker(e.target._myId,"train");
//	    });
	    GH_LAYER.train[id].addTo(GH_M);
	}
    } else {
	GH_LAYER.train[id].setLatLng(pos)
    }
}
function ghUnMapTrainMarker(id){
    if ( ( typeof GH_LAYER.train[id] ) == 'undefined' ) {
	// NOP
    } else {
	if ( GH_M.hasLayer(GH_LAYER.train[id]) ) {
	    GH_M.removeLayer(GH_LAYER.train[id]);
	}
	//delete GH_LAYER.tmarker[id];
    }
}



//function __ghGetPointAlongLine(line,meter) {
//    let cp = turf.invariant.getCoords( turf.lineSliceAlong.default(line,0,meter,{units: 'meters'}) );
//    // [ Lat , Lon ]
//    return [ cp[ cp.length-1][1], cp[cp.length-1][0]  ]
//}
function __ghClampTerrainCartesian(trainid,cartesian) {
    let mposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    let height = __ghGetTerrainHeight(trainid,mposc);
    mposc.height = height;
    return Cesium.Cartographic.toCartesian(mposc);
}

function __ghGetTerrainHeight(trainid,cartopos) {
    // cartopos = Cesium.Cartographic(longitude,latitude,height);
    //
    //GH_V.scene.globe.getHeight(current_carto)
    let height_org = 0;
    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
	height_org = __sampleHeightsPhotorealisticGoogle3D(cartopos);
    } else {
	height_org = GH_S.globe.getHeight(cartopos);
    }
    
    if ( GH_USE_TUNNEL ) {
	let lineprop = GH_UNIT_GEOM[trainid].lineprop;
	//GH_UNIT_GEOM[key].lineprop = [
	//    'linestring' ( geojson linestring )
	//    'level'
	//    'startpos'  [ lon , lat , alt  ]
	//    'exitos'  [ lon , lat , alt  ]
	//    'length'
        //  ]
	//
	let point = turf.helpers.point( [ Cesium.Math.toDegrees(cartopos.longitude), Cesium.Math.toDegrees(cartopos.latitude) ] );
	let propid = -1;
	let distance = 0;
	for (var i = 0,ilen=lineprop.length; i < ilen ; i++) {
	    distance = turf.pointToLineDistance.default( point, lineprop[i].linestring, {units: 'meters'});
	    if ( distance < GH_DISTANCE_TO_LINESTRING ) {
		propid = i;
		break;
	    } else {
		//if ( distance < GH_SET_POSITION_TO_LINESTRING ) {
		//    if ( lineprop[i].startpos ) {
		//	lineprop[i].startpos[2] = h;
		//    }
		//}
		// NOP
	    }
	}
	if ( propid < 0 ) {
	    return height_org;
	} else {
	    if ( lineprop[propid].level < 0 ) {
		// Tunnel
		let startp = turf.helpers.point( [ lineprop[propid].startpos[0], lineprop[propid].startpos[1] ] );
		let exitp = turf.helpers.point( [ lineprop[propid].exitpos[0], lineprop[propid].exitpos[1] ] );
		let startdis = turf.distance.default(point,startp ,{units: 'meters'});
		let exitdis = turf.distance.default(point,exitp ,{units: 'meters'});
		let depth = GH_TUNNEL_DEPTH;

		if ( startdis < GH_TUNNEL_EDGE_METER ) {
		    let startcart = new Cesium.Cartographic.fromDegrees([ lineprop[propid].startpos[0], lineprop[propid].startpos[1] ] );
		    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
			return __sampleHeightsPhotorealisticGoogle3D(startcart);
		    } else {
			return GH_S.globe.getHeight(startcart);
		    }
		} else if ( exitdis < GH_TUNNEL_EDGE_METER ) {
		    let exitcart = new Cesium.Cartographic.fromDegrees([ lineprop[propid].exitpos[0], lineprop[propid].exitpos[1] ] );
		    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
			return __sampleHeightsPhotorealisticGoogle3D(exitcart);
		    } else {
			return GH_S.globe.getHeight(exitcart);
		    }
		} else {
		    // NOP  default depth
		    return height_org - depth;
		}
	    } else {
		//if ( lineprop[propid].level > 0 )
		// Viaduct Bridge
		return height_org;
	    }
	}
    } else {
	return height_org;
    }
}

function __ghGetTerrainHeightSample(trainid,cartopos,prevcheckid) {
    // cartopos = Cesium.Cartographic(longitude,latitude,height);
    //
    //GH_V.scene.globe.getHeight(current_carto)
    let height_org = 0;
    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
	height_org = __sampleHeightsPhotorealisticGoogle3D(cartopos);
    } else {
	height_org = GH_S.globe.getHeight(cartopos);
    }
    let height_adj = height_org;
    
    ///////////////////////
    if ( prevcheckid != null ) {
	//if ( h != 0 ) cartopos.height = h;
	cartopos.height = height_org;
	let cartesian = Cesium.Cartographic.toCartesian(cartopos);
	let tid = trainid + prevcheckid;
	if ( GH_UNIT_HEIGHT[tid] ) {
	    let d = Cesium.Cartesian3.distanceSquared(cartesian, GH_UNIT_HEIGHT[tid].cartesian);
	    if ( d < GH_UNIT_TARGET_DISTANCE_SQUARED ) {
		let slope = height_org - GH_UNIT_HEIGHT[tid].height ;
		if ( slope > 0 ) {
		    // Uphill
		    if ( slope > Math.sqrt(d) * GH_UNIT_HEIGHT_SIN ) {
			height_adj = GH_UNIT_HEIGHT[tid].height;
		    } else {
			GH_UNIT_HEIGHT[tid].cartesian = cartesian;
			GH_UNIT_HEIGHT[tid].height = height_org;
		    }
		    GH_UNIT_HEIGHT[tid].type = 'up';
		} else {
		    // Downhill
		    if ( slope < -1*Math.sqrt(d) * GH_UNIT_HEIGHT_SIN ) {
			let ratio = Math.sqrt(d) / GH_UNIT_TARGET_DISTANCE;
			height_adj = ratio * slope + GH_UNIT_HEIGHT[tid].height;
		    } else {
			GH_UNIT_HEIGHT[tid].cartesian = cartesian;
			GH_UNIT_HEIGHT[tid].height = height_org;
		    }
		    GH_UNIT_HEIGHT[tid].type = 'down';		    
		}
	    } else {
		GH_UNIT_HEIGHT[tid].cartesian = cartesian;
		GH_UNIT_HEIGHT[tid].height = height_org;
	    }
	} else {
	    GH_UNIT_HEIGHT[tid] = {
		'cartesian' : cartesian,
		'height' : height_org,
		'type' : null
	    }
	}
    }
    ///////////////////////
    
    if ( GH_USE_TUNNEL ) {
	let lineprop = GH_UNIT_GEOM[trainid].lineprop;
	//GH_UNIT_GEOM[key].lineprop = [
	//    'linestring' ( geojson linestring )
	//    'level'
	//    'startpos'  [ lon , lat , alt  ]
	//    'exitos'  [ lon , lat , alt  ]
	//    'length'
        //  ]
	//
	let point = turf.helpers.point( [ Cesium.Math.toDegrees(cartopos.longitude), Cesium.Math.toDegrees(cartopos.latitude) ] );
	let propid = -1;
	let distance = 0;
	for (var i = 0,ilen=lineprop.length; i < ilen ; i++) {
	    distance = turf.pointToLineDistance.default( point, lineprop[i].linestring, {units: 'meters'});
	    if ( distance < GH_DISTANCE_TO_LINESTRING ) {
		propid = i;
		break;
	    } else {
		//if ( distance < GH_SET_POSITION_TO_LINESTRING ) {
		//    if ( lineprop[i].startpos ) {
		//	lineprop[i].startpos[2] = h;
		//    }
		//}
		// NOP
	    }
	}
	if ( propid < 0 ) {
	    return height_adj;
	} else {
	    if ( lineprop[propid].level < 0 ) {
		// Tunnel
		let startp = turf.helpers.point( [ lineprop[propid].startpos[0], lineprop[propid].startpos[1] ] );
		let exitp = turf.helpers.point( [ lineprop[propid].exitpos[0], lineprop[propid].exitpos[1] ] );
		let startdis = turf.distance.default(point,startp ,{units: 'meters'});
		let exitdis = turf.distance.default(point,exitp ,{units: 'meters'});
		let depth = GH_TUNNEL_DEPTH;

		if ( startdis < GH_TUNNEL_EDGE_METER ) {
		    return height_adj;
		} else if ( exitdis < GH_TUNNEL_EDGE_METER ) {
		    return height_adj;
		} else {
		    // NOP  default depth
		    return height_org - depth;
		}


//		if ( startdis < GH_TUNNEL_EDGE_METER ) {
//		    //depth = 0.5 * startdis;
//		    if ( h > lineprop[propid].startpos[2] ) {
//			depth = h - lineprop[propid].startpos[2];
//		    } else {
//			//  depth = 0.0699 * startdis; // tan 4 deg
//		    }
//		} else if ( exitdis < GH_TUNNEL_EDGE_METER ) {
//		    //  depth = 0.0699 * exitdis; // tan 4 deg
//		} else {
//		    // NOP  default depth
//		}
//		return h - depth;
		
	    } else {
		//if ( lineprop[propid].level > 0 )
		// Viaduct Bridge
		return height_adj;
	    }
	}
    } else {
	return height_adj;
    }
}


function __ghGetCartesianPositionLinestringDistance(trainid,tposc,hposc,distance) {

    // tposc  = target tail Cesium.Cartograpic
    // hposc  = target head Cesium.Cartograpic

    if ( GH_UNIT_GEOM[trainid] ) {

	let tailp = turf.helpers.point( [ Cesium.Math.toDegrees(tposc.longitude), Cesium.Math.toDegrees(tposc.latitude)  ] );
	let headp = turf.helpers.point( [ Cesium.Math.toDegrees(hposc.longitude) , Cesium.Math.toDegrees(hposc.latitude) ] );   
	var height = __ghGetTerrainHeight(trainid,tposc);

	var circle = turf.circle.default(tailp,distance,{steps:32,units:'meters'});
	var crosspoint = turf.lineIntersect.default(GH_UNIT_GEOM[trainid].line, circle) ;
	if ( crosspoint.features.length < 1 ) {
	    return tposc;
	} else if ( crosspoint.features.length < 2 ) {
	    //  Wrong data ?? console.log('Wrong intersect ' + trainid + ' ' + distance );
	    let ncart = new Cesium.Cartographic.fromDegrees(crosspoint.features[0].geometry.coordinates[0], crosspoint.features[0].geometry.coordinates[1] ,height);
            ncart.height = __ghGetTerrainHeight(trainid,ncart);
	    return Cesium.Cartographic.toCartesian(ncart);
	} else if (  crosspoint.features.length < 3 ) {
	    let d0 = turf.distance.default(crosspoint.features[0], headp ,{units: 'meters'});
	    let d1 = turf.distance.default(crosspoint.features[1], headp ,{units: 'meters'});
	    if ( d1 > d0 ) {
		//  Select d0 point
		let ncart = new Cesium.Cartographic.fromDegrees(crosspoint.features[0].geometry.coordinates[0], crosspoint.features[0].geometry.coordinates[1] ,height);
		ncart.height = __ghGetTerrainHeight(trainid,ncart);
		return Cesium.Cartographic.toCartesian(ncart);
		//return new Cesium.Cartesian3.fromDegrees( crosspoint.features[0].geometry.coordinates[0], crosspoint.features[0].geometry.coordinates[1] ,height );
            } else {
		//  Select d1 point
		let ncart = new Cesium.Cartographic.fromDegrees(crosspoint.features[1].geometry.coordinates[0], crosspoint.features[1].geometry.coordinates[1] ,height);
		ncart.height = __ghGetTerrainHeight(trainid,ncart);
		return Cesium.Cartographic.toCartesian(ncart);
		//return new Cesium.Cartesian3.fromDegrees( crosspoint.features[1].geometry.coordinates[0], crosspoint.features[1].geometry.coordinates[1] ,height );
	    }
	} else {
	    let inum = crosspoint.features.length;
	    let dmin = 1000000;
	    let di = 0;
	    for ( var i = 0;i<inum ; i++ ) {
		let d = turf.distance.default(crosspoint.features[i], headp ,{units: 'meters'});
		if ( d < dmin ) {
		    di = i;
		    dmin = d;
		}
	    }
	    let ncart = new Cesium.Cartographic.fromDegrees(crosspoint.features[di].geometry.coordinates[0], crosspoint.features[di].geometry.coordinates[1] ,height);
	    ncart.height = __ghGetTerrainHeight(trainid,ncart);
	    return Cesium.Cartographic.toCartesian(ncart);
	    //return new Cesium.Cartesian3.fromDegrees( crosspoint.features[di].geometry.coordinates[0], crosspoint.features[di].geometry.coordinates[1] ,height );
	}
    }
}
function __ghGetCoachEntityKey(id,num) {
    return id + '_coach_' + num;
}


////////////////////////////////
function ghUpdateUnitData(trainid,ct,headentity,tailentity) {

    // Head Target
    let headcartesian = new Cesium.Cartesian3();
    headentity.position.getValue(ct,headcartesian);
//    let hposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(hpos);

    // Tail Target
    let tailcartesian = new Cesium.Cartesian3();
    tailentity.position.getValue(ct,tailcartesian);
//    let tposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(tpos);

    let locomotive = GH_FIELD.units[ GH_UNIT_GEOM[trainid].fid ].locomotive;

    if ( headcartesian.equals(Cesium.Cartesian3.ZERO) || tailcartesian.equals(Cesium.Cartesian3.ZERO) ) {
        ghUnMapTrainMarker(trainid);
	ghUnloadUnitCoach(trainid,GH_LOCOMOTIVE[locomotive]);  //  Probabry , processed in Cesium 
    } else {
	if ( GH_UNIT_GEOM[trainid] ) {
	    //  Update Loeaflet Train Marker
	    let hposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(headcartesian);
	    ghMapTrainMarker(trainid,new L.LatLng( Cesium.Math.toDegrees(hposc.latitude) , Cesium.Math.toDegrees(hposc.longitude)) );
	    
	    if ( GH_LOCOMOTIVE[locomotive] ) {
		if ( GH_UNIT_GEOM[trainid].loadstatus ) {
		    let far =  Cesium.Cartesian3.distanceSquared( GH_V.camera.positionWC, headcartesian );
		    if ( far > GH_UNIT_RENDERING_DISTANCE_SQUARED ) {
			ghUpdateUnitCoachPoint(trainid,GH_LOCOMOTIVE[locomotive],headcartesian);
		    } else {
			ghUpdateUnitCoachSlice(trainid,GH_LOCOMOTIVE[locomotive],tailcartesian,headcartesian);
		    }
		} else {
		    let orient = new Cesium.Quaternion();
		    headentity.orientation.getValue(ct,orient);
		    ghLoadUnitCoach(trainid,GH_LOCOMOTIVE[locomotive],tailcartesian,headcartesian,orient);
		}
	    } else {
		// Load Locomotive Data
		ghLoadLocomotiveData(locomotive);
	    }

	} else {
	    // No Unit Data,  this trdainid
	}
    }
    
}

function __ghGetCartesianPositionLinestringSlice(trainid,linestring,distance,tail,head,cid) {
    // tail  = target tail position Cesium.Cartograpic
    // head  = target head position Cesium.Cartograpic    
    let coachid = trainid + cid;

    let cp = turf.invariant.getCoords( turf.lineSliceAlong.default(linestring,0,distance,{units: 'meters'}) );
    let coachpos = new Cesium.Cartographic.fromDegrees(cp[cp.length-1][0] ,cp[ cp.length-1][1]);
    let height_coach = __ghGetTerrainHeight(trainid,coachpos);

    if ( GH_USE_TUNNEL ) {
    
	let cartesian = Cesium.Cartographic.toCartesian(coachpos);
	let slope = 0;
	if ( GH_UNIT_HEIGHT[coachid] ) {
	    let d = Cesium.Cartesian3.distanceSquared(cartesian, GH_UNIT_HEIGHT[coachid].cartesian);
	    if ( d < GH_UNIT_TARGET_DISTANCE_SQUARED ) {
		//slope = coachpos.height - GH_UNIT_HEIGHT[coachid].height ;
		slope = height_coach - GH_UNIT_HEIGHT[coachid].height ;
		if ( slope > 0 ) {
		    // Uphill
		    if ( slope > Math.sqrt(d) * GH_UNIT_HEIGHT_SIN ) {
			//height_coach = GH_UNIT_HEIGHT[coachid].height;
			GH_UNIT_HEIGHT[coachid].type = 'upover';
		    } else {
			GH_UNIT_HEIGHT[coachid].cartesian = cartesian;
			GH_UNIT_HEIGHT[coachid].height = height_coach;
			GH_UNIT_HEIGHT[coachid].type = 'up';
		    }
		} else {
		    // Downhill
		    if ( slope < -1*Math.sqrt(d) * GH_UNIT_HEIGHT_SIN ) {
			//let ratio = Math.sqrt(d) / GH_UNIT_TARGET_DISTANCE;
			//height_coach = ratio * slope + GH_UNIT_HEIGHT[coachid].height;
			GH_UNIT_HEIGHT[coachid].type = 'downover';
		    } else {
			GH_UNIT_HEIGHT[coachid].cartesian = cartesian;
			GH_UNIT_HEIGHT[coachid].height = height_coach;
			GH_UNIT_HEIGHT[coachid].type = 'down';		    
		    }
		}
	    } else {
		GH_UNIT_HEIGHT[coachid].cartesian = cartesian;
		GH_UNIT_HEIGHT[coachid].height = height_coach;
		GH_UNIT_HEIGHT[coachid].type = 'far';		    
	    }
	} else {
	    GH_UNIT_HEIGHT[coachid] = {
		'cartesian' : cartesian,
		'height' : height_coach,
		'type' : 'none'
	    }
	}
	
	if ( GH_UNIT_HEIGHT[coachid].type == 'upover' ) {
	    coachpos.height = GH_UNIT_HEIGHT[coachid].height;
	} else if ( GH_UNIT_HEIGHT[coachid].type == 'downover' ) {
	    let height_head = __ghGetTerrainHeight(trainid,head);
	    let threshold = ( height_coach + GH_UNIT_HEIGHT[coachid].height ) / 2;
	    //let data = 'head ' + height_head + ' coach ' + height_coach + ' prev ' + GH_UNIT_HEIGHT[coachid].height + '  thresh ' + threshold;
	    //console.log(data);
	    if ( height_head < threshold ) {
		coachpos.height = height_coach;
	    } else {
		coachpos.height = GH_UNIT_HEIGHT[coachid].height;
	    }
	} else {
	    coachpos.height = height_coach;
	}
	
    } else  {
	//  Cannot use Tunnel
	// Clamp to terrain value
	coachpos.height = height_coach;
    }

    // return cartesian
    return Cesium.Cartographic.toCartesian(coachpos);
    
}
function __ghGetCartesianPositionLinestringSliceSample(trainid,linestring,distance,checkid) {
    let cp = turf.invariant.getCoords( turf.lineSliceAlong.default(linestring,0,distance,{units: 'meters'}) );
    let cart = new Cesium.Cartographic.fromDegrees(cp[cp.length-1][0] ,cp[ cp.length-1][1]);
    cart.height = __ghGetTerrainHeight(trainid,cart,checkid);
    return Cesium.Cartographic.toCartesian(cart);
}

function ghReCreateLineStringDetailLongs(coords,startcoord,stopcoord) {

    let start = turf.helpers.point( startcoord );
    let stop  = turf.helpers.point( stopcoord );
    let center  = turf.midpoint.default(startcoord,stopcoord);
    let radius = turf.distance.default(start,center, {units: 'meters'});
    let circle = turf.circle.default(center,radius,{steps:16,units: 'meters'});

    let points = [];
    let totaldistance = 0;
    let jmax = coords.length - 1;
    let j = 0;
    let prevcoords = start;
    points.push(startcoord);
    while ( totaldistance < GH_UNIT_TARGET_DISTANCE_S ) {
	let p = turf.helpers.point(coords[j]);
	if ( turf.booleanPointInPolygon.default(p,circle) ) {
	    points.push(coords[j]);
	    totaldistance += turf.distance.default(prevcoords,p, {units: 'meters'});
	    prevcoords = p;
	}
	j++;
	if ( j > jmax ) break;
    }
    points.push(stopcoord);
    if ( points.length < 3 ) {
	return null;
    } else {
	return turf.helpers.lineString(points);
    }
}

function ghUpdateUnitCoachSlice(trainid,locomotive,tailpos,headpos) {
    // tposc  = target tail position Cesium.Cartograpic
    // hposc  = target head head Cesium.Cartograpic
    
    // tailpos  = target tail position Cesium.Cartesian3
    // headpos  = target head position Cesium.Cartesian3
    
    let model = locomotive.data.model;
    let modellen = model.length;
    let hposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(headpos);
    let tposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(tailpos);

    let startp = [ Cesium.Math.toDegrees(tposc.longitude), Cesium.Math.toDegrees(tposc.latitude)  ];
    let start = turf.helpers.point(startp);
    let stopp  =[ Cesium.Math.toDegrees(hposc.longitude) , Cesium.Math.toDegrees(hposc.latitude) ] ;
    let stop  = turf.helpers.point( stopp );
    let sliced = turf.lineSlice.default(start,stop, GH_UNIT_GEOM[trainid].line);
    let slicedcoords = turf.invariant.getCoords( sliced ) ;
    let slicedlength = turf.length.default(sliced,{units:'meters'});

    /////////////////////
    const checkdistance = 6;  ///    Sometimes , needs to adjust value
    /////////////////////
    let cdis = turf.distance.default(slicedcoords[0],start, {units: 'meters'});
    if ( slicedlength < GH_UNIT_TARGET_DISTANCE_S ) {
	// Wrong Slice No Rendering
	if ( GH_DEBUG_CONSOLE ) console.log( "Wrong Short Line Slice " + slicedlength) ;
	return;
    } else if ( slicedlength > GH_UNIT_TARGET_DISTANCE_L ) {
	if ( GH_DEBUG_CONSOLE ) console.log( "Wrong Long Line Slice " + slicedlength) ;
	if ( cdis < checkdistance ) {
	    sliced = ghReCreateLineStringDetailLongs(slicedcoords,startp,stopp);
	} else {
	    sliced = ghReCreateLineStringDetailLongs(slicedcoords.reverse(),startp,stopp);
	}
	if ( sliced == null ) return;	
    } else {
	if ( cdis < checkdistance ) {
	    // NOP normal line string
	} else {
	    sliced = turf.helpers.lineString(slicedcoords.reverse() );
	}
    }

    let nextpos = __ghGetCartesianPositionLinestringSlice(trainid,sliced,locomotive.position[0],tposc,hposc,99);
    let prevvel = Cesium.Cartesian3.ONE;
    for (var i = 0; i < modellen ; i++) {
	let entity = GH_V.entities.getById( __ghGetCoachEntityKey(trainid,i) );
	let currentpos = __ghGetCartesianPositionLinestringSlice(trainid,sliced,locomotive.position[i+1],tposc,hposc,i);

	//////////////////////////////  Normalized Error work around //////////////////////////////
	let surf = new Cesium.Cartesian3();
	surf = Cesium.Cartesian3.multiplyComponents(currentpos, Cesium.Ellipsoid.WGS84.oneOverRadiiSquared, surf);
	if ( isNaN( Cesium.Cartesian3.magnitude( surf ) ) ) break;
	//////////////////////////////  Normalized Error work around //////////////////////////////
	
	if ( i == 0 ) {
	    //  for Train Label
	    if ( entity.label.show ) {
		if ( GH_USE_TUNNEL ) {
		    let ca = GH_V.scene.globe.ellipsoid.cartesianToCartographic(currentpos);
		    let ch = 0;
		    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
			ch = __sampleHeightsPhotorealisticGoogle3D(ca);
		    } else {
			ch = GH_S.globe.getHeight(ca);
		    }
		    if ( ca.height < ch ) {
			entity.label.eyeOffset = new Cesium.Cartesian3(0.0, GH_TRAIN_LABEL_Y_OFFSET + ( ch - ca.height ) , 0.0);
		    } else {
			entity.label.eyeOffset = new Cesium.Cartesian3(0.0, GH_TRAIN_LABEL_Y_OFFSET, 0.0);
		    }
		} else {
		    entity.label.eyeOffset = new Cesium.Cartesian3(0.0, GH_TRAIN_LABEL_Y_OFFSET, 0.0);
		}
	    }
	} else {
	    entity.show = true;
	}

        var vel = new Cesium.Cartesian3();   // Velocity Vector
        Cesium.Cartesian3.subtract(nextpos,currentpos,vel);
	//////////////////////////////  Normalized Error work around //////////////////////////////
	let vel_len = Cesium.Cartesian3.magnitude(vel);
	if ( isNaN(vel_len) || vel_len < 0.01  ) {
	    vel = prevvel;
	} else {
    	    Cesium.Cartesian3.normalize(vel, vel);
	}
	//////////////////////////////  Normalized Error work around //////////////////////////////
        var rot = new Cesium.Matrix3();      // Rotation Matrix
        Cesium.Transforms.rotationMatrixFromPositionVelocity(currentpos, vel, Cesium.Ellipsoid.WGS84, rot);
        var currentorientation = new Cesium.Quaternion();
        Cesium.Quaternion.fromRotationMatrix(rot, currentorientation);

	entity.orientation = currentorientation;
        entity.position = currentpos;

	currentpos.clone(nextpos);
	vel.clone(prevvel);
    }

}
function ghUpdateUnitCoachPoint(trainid,locomotive,cartesian) {
    let model = locomotive.data.model;
    let modellen = model.length;

    for (var i = 0; i < modellen ; i++) {
	let entity = GH_V.entities.getById( __ghGetCoachEntityKey(trainid,i) );
        if ( i == 0 ) {
	    entity.position = __ghClampTerrainCartesian(trainid,cartesian);
	} else {
	    entity.show = false;
	}
    }
}
function ghLoadUnitCoach(trainid,locomotive,tailpos,headpos,orientation) {

    // tailpos = cartesian3
    // headpos = cartesian3
    
    let model = locomotive.data.model;
    let modellen = model.length;
    let hposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(headpos);
    let tposc = GH_V.scene.globe.ellipsoid.cartesianToCartographic(tailpos);

    var coach = null;
    var scale = 1.0;
    for (var i = 0; i < modellen ; i++) {
	let uri = ghGetResourceUri(model[i]);
	let position = __ghGetCartesianPositionLinestringDistance(trainid,tposc,hposc,locomotive.position[i+1]);
        if ( i == 0 ) {
            coach = GH_V.entities.add({
		"id" : __ghGetCoachEntityKey(trainid,i),
		"position" : position,
		"orientation" : orientation,
		"model" : {
		    uri : uri,
		    scale: scale ,
		    minimumPixelSize : 4 ,
                    distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, scale * GH_DISTANCE_CONDITION )
		},
		"label" : {
		    text : trainid,
		    font : '18px Helvetica' ,
                    eyeOffset : new Cesium.Cartesian3(0.0, GH_TRAIN_LABEL_Y_OFFSET, 0.0),
		    heightReference : Cesium.HeightReference.NONE,
                    fillColor : Cesium.Color.YELLOW,
                    outlineColor : Cesium.Color.BLACK,
                    outlineWidth : 2,
                }
            });
	} else {
            coach = GH_V.entities.add({
		"id" : __ghGetCoachEntityKey(trainid,i),
		"position" : position,
		"orientation" : orientation,
		"model" : {
		    uri : uri ,
		    scale: scale,
		    minimumPixelSize : 0 ,
                    distanceDisplayCondition : new Cesium.DistanceDisplayCondition(0.0, scale * GH_DISTANCE_CONDITION )
		}
            });
	}
    }
    GH_UNIT_GEOM[trainid].loadstatus = true;
}
function ghUnloadUnitCoach(trainid,locomotive) {
    if ( ! locomotive ) return;
    let model = locomotive.data.model;
    let modellen = model.length;

    for (var i = 0; i < modellen ; i++) {
	let entity = GH_V.entities.getById( __ghGetCoachEntityKey(trainid,i) );
	if ( Cesium.defined( entity ) ) {
	    GH_V.entities.remove(entity);
	}
    }
    GH_UNIT_GEOM[trainid].loadstatus = false;
}
function ghUpdateUnits(ct) {

    let dslen = GH_V.dataSources.length;
    for(let i=0;i<dslen;i++){
	let ds = GH_V.dataSources._dataSources[i];
	let dataname = ds.name.split('_');
	if ( dataname.length == 3 && dataname[1] == 'train' ) {
	    ghUpdateUnitData( dataname[2],
			      ct,
			      ds.entities.getById( 'train_' + dataname[2] + '_head' ),
			      ds.entities.getById( 'train_' + dataname[2] + '_tail' ) );
	}
    }
}
function __getDatasourceEntityByID(id) {
    let dslen = GH_V.dataSources.length;
    for(let i=0;i<dslen;i++){
	let ds = GH_V.dataSources._dataSources[i];
	if ( ( typeof ds.entities.getById(id) ) != 'undefined' ) {
	    return ds.entities.getById(id);
	}
    }
    return null;
}
function _getEntityTimeCartesian(current,addsec) {
    let tpos = new Cesium.Cartesian3();
    let t0 = current;
    if ( addsec != 0 ) {
	t0 = Cesium.JulianDate.addSeconds(current, addsec, new Cesium.JulianDate());
    }
    if ( GH_V.trackedEntity != null ) {
	GH_V.trackedEntity.position.getValue(t0,tpos);
    } else if ( GH_PICK_ENTITY != null ) {
	GH_PICK_ENTITY.position.getValue(t0,tpos);
    } else {
	tpos = null;
    }
    if ( ( typeof tpos ) === 'undefined' ) {
	return null;
    }
    return tpos;
}

function ghUpdateCesiumScene(scene,currenttime) {
    //  Call every frame in Cesium
    ghUpdateStatusbarDatetime(currenttime);

    ghUpdateUnits(currenttime);

    if ( GH_V.trackedEntity != null ) {
	// NOP
    } else {
	if ( GH_CAM_MODE == GH_CAM_MODE_NONE ) {
	    // NOP
	} else {
	    ghSetViewpoint(currenttime);
	}
    }

    let currentpos = _getEntityTimeCartesian(currenttime,0);
//    var currentpos = new Cesium.Cartesian3();
//    if ( GH_V.trackedEntity != null ) {
//	GH_V.trackedEntity.position.getValue(currenttime,currentpos);
//    } else if ( GH_PICK_ENTITY != null ) {
//	GH_PICK_ENTITY.position.getValue(currenttime,currentpos);
//    } else {
//	currentpos = null;
//    }
    
    if ( GH_LAYER.autocenter ) {
	if ( GH_CAM_MODE == GH_CAM_MODE_NONE ) {
	    // NOP
	} else {
	    if ( currentpos == null ) {
		// NOP
	    } else {
		ghCenterLeafletMap(currentpos);
	    }
	}
    }
    
    
    if ( Cesium.JulianDate.secondsDifference(currenttime,GH_SPEED_METER_PROP.prevtime) > 1 ) {
    	let status = ghSetSpeedoMeter(currenttime);
	if ( status == 2 || status == 3 ) {
	    GH_SPEED_METER.changeValue(0);
	}
    }

    ghUpdateTitleMarqueeAndTimetable(currenttime,GH_V.clock.multiplier,currentpos);
    
    //
    // Rain update
    //
    if ( GH_IS_RAIN ) {
        if ( GH_WEATHER.rain == null ) {
            GH_WEATHER.rain = ghRainCreatePrimitive(GH_V.camera.positionCartographic,GH_RAIN_POINTS);
	    GH_V.scene.primitives.add(GH_WEATHER.rain);          
	} else {
    	    ghRainMovePrimitive(GH_V.camera.positionCartographic,GH_WEATHER.rain);
    	}       
    } else {
        ghRainRemove(GH_V.scene,GH_WEATHER.rain);
    	GH_WEATHER.rain = null;
    }

    //
    // Cloud update
    //
    if ( GH_IS_CLOUD ) {
        if ( GH_WEATHER.cloud == null ) {
            var bright = 0.93;
            GH_WEATHER.cloud = new Cesium.CloudCollection();
            ghCloudCreatePrimitive(GH_V.camera.positionCartographic,GH_WEATHER.cloud, GH_RAIN_POINTS, bright, 0.42) ;
            GH_V.scene.primitives.add(GH_WEATHER.cloud);          
        } else {
	    //ghCloudMovePrimitive(GH_V.camera.positionCartographic,GH_ENTITY.rain);
    	}       
    } else {
        ghCloudRemove(GH_WEATHER.cloud);
    	GH_WEATHER.cloud = null;
    }


    //
    // 3D tile
    //
    if ( GH_3DTILE.mode > GH_3DTILE_OSMBUILDING ) {
	if ( GH_3DTILE.previousupdate == null ) {
	    ghVectorTileSetup(GH_FIELDINDEX.urilist);
	    if ( currentpos == null ) {
		// NOP
	    } else {
		ghVectorTileUpdate(currenttime,currentpos,GH_3DTILE.mode,GH_3DTILE.areaunit);
	    }
	    GH_3DTILE.previousupdate = currenttime;
	} else {
	    if ( currentpos == null ) {
		// NOP
	    } else {
		let dt = Math.abs(Cesium.JulianDate.secondsDifference(GH_3DTILE.previousupdate,currenttime));
		if ( dt > GH_3DTILE.interval ) {
		    let checkinterval =  GH_3DTILE.interval * ( 6.0 / GH_V.clock.multiplier );
		    let nextpos = _getEntityTimeCartesian(currenttime,checkinterval);
		    if ( nextpos != null ) {
			ghVectorTileUpdate(currenttime,nextpos,GH_3DTILE.mode,GH_3DTILE.areaunit);
			GH_3DTILE.previousupdate = currenttime;
		    }
		}
	    }
	}
    }

}

function getUnmaskedInfo(gl) {
    var unMaskedInfo = {
        renderer: '',
        vendor: ''
    };
    var dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbgRenderInfo != null) {
        unMaskedInfo.renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
        unMaskedInfo.vendor   = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
    }
    return unMaskedInfo;
}

function ghCheckData(tc,str) {
        
    var language = (window.navigator.languages && window.navigator.languages[0]) ||
            window.navigator.language ||
            window.navigator.userLanguage ||
            window.navigator.browserLanguage;
    var txt = "plathome " + navigator.platform + " Core: " + navigator.hardwareConcurrency + "\n";
    txt += "train code " + tc + "\n";
    txt += "train desc " + str + "\n";
    txt += "width :" + window.screen.width + "\n";
    txt += "height :" + window.screen.height + "\n";
    txt += "href :" +  location.href + "\n";
    txt += "referrer :" + document.referrer + "\n";
    
    // canvas = GH_S.canvas
//    var gl = GH_V.scene.canvas.getContext('webgl');
//    var webgl = "version:" + gl.getParameter(gl.VERSION) + "\n";
//    webgl += "shading:" + gl.getParameter(gl.SHADING_LANGUAGE_VERSION) + "\n";
//    webgl += "vendor:" + gl.getParameter(gl.VENDOR) + "\n";
//    webgl += "renderer:" + gl.getParameter(gl.RENDERER) + "\n";
//    webgl += "unMaskVendor:" + getUnmaskedInfo(gl).vendor + "\n";    
//    webgl += "unMaskRenderer:" + getUnmaskedInfo(gl).renderer + "\n";    
//    webgl += "texture size:" + gl.getParameter(gl.MAX_TEXTURE_SIZE);
//    
//    var ret = txt + "\n" + webgl;
    
    $.ajax({
        type: "POST",
        url: "//earth.geoglyph.info/cgi/contactform.php",
 	data: {
	    "language": language ,
	    "name": "ghRail " + GH_REV,
            "checktype": "Rail",
	    "email" : "info@geoglyph.info", 
	    "subject" : window.navigator.userAgent,
	    "message" : txt
	}
    }).done(function(data) {
        // NOP
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
        var msg = "check contact query error ";
        msg += " XMLHttpRequest " + XMLHttpRequest.status ;
        msg += " textStatus " + textStatus ;
	console.log( msg );
    });

};

//function ghSetAboutContent() {
//    var data = "";
//    data += GH_REV + '<BR>';
//    data += '<BR>';
//    data += window.navigator.userAgent + '<BR>';
//    data += 'Plathome:' + navigator.platform + '<BR>';
//    data += 'Cesium :' + Cesium.VERSION + '&nbsp;&nbsp;' + 'Leaflet :' + L.version + '&nbsp;&nbsp;' + 'jQuery :' + jQuery.fn.jquery + '<BR>';     
//    $('#gh_aboutcontent').html(data);
//};
//function ghDelayStart() {
//
//    // For begginers
//    $('#gh_startmodal').modal('open');
//    
//    ghSetAboutContent();
//    
//}


/////////////////////////////////////////////////////////////
function ghTilequeueLoading() {
    if ( GH_SHOW_TILEQUEUE ) {
	var tile = GH_V.scene.globe._surface;
	var h = tile._tileLoadQueueHigh.length ;
	var m = tile._tileLoadQueueMedium.length ;
	var l = tile._tileLoadQueueLow.length ;
	var ret = h + m + l ;
        ghSetHeaderTilequeue("H " + h + " M " + m + " L " + l);
    }
}

///////////////////////////////////////
function __ghDelayStopTitleMarquee() {
    ghStopTitleMarquee();
    ghSetTitleMarquee(GH_FIELD.description);
}

function ghSetTitleMarquee(txt) {
    $('#gh_datatitle').html(txt);
}
function ghStartTitleMarquee() {
    if ( GH_TITLE_MARQUEE ) {
	GH_TITLE_MARQUEE.trigger('start');
    } else {
	GH_TITLE_MARQUEE = $('#gh_datatitlemarquee').marquee();
    }
}
function ghStopTitleMarquee() {
    if ( GH_TITLE_MARQUEE ) {
	GH_TITLE_MARQUEE.trigger('stop');
    } else {
	// NOP
    }
}

function ghUpdateTitleMarqueeAndTimetable(ctime,multiplier,cartesian) {
    if ( GH_TITLE_MARQUEE_PROP.previoustime == null ) {
	GH_TITLE_MARQUEE_PROP.previoustime = ctime.clone();
    } else {

	let eid = null;
	let dt = Math.abs(Cesium.JulianDate.secondsDifference(GH_TITLE_MARQUEE_PROP.previoustime,ctime));

	if ( GH_V.trackedEntity != null ) {
	    eid = GH_V.trackedEntity.id;
	} else if ( GH_PICK_ENTITY != null ) {
	    eid = GH_PICK_ENTITY.id;
	} else {
	    // NOP
	}
	if ( eid == null ) {
	    if ( dt > GH_TITLE_MARQUEE_PROP.interval * multiplier ) {
		let obj = {
		    'pickid' : null,
		    'ctime' : ctime.toString(),
		    'cartesian' : null,
		}
		ghBroadcastSendUpdateScene(obj);
		GH_TITLE_MARQUEE_PROP.previoustime = ctime;
	    }
	    return;
	}
	//let trainid = eid.split('_')[0];

	if ( eid == GH_TITLE_MARQUEE_PROP.previousid ) {

	    if ( dt > GH_TITLE_MARQUEE_PROP.interval * multiplier ) {
		let obj = {
		    'pickid' : eid,
		    'ctime' : ctime.toString(),
		    'cartesian' : cartesian
		}
		ghSendCommandUnitWorker('updatemarquee', obj );
		ghBroadcastSendUpdateScene(obj);
		GH_TITLE_MARQUEE_PROP.previoustime = ctime;
		GH_TITLE_MARQUEE_PROP.previousid = eid;
	    } else {
		// NOP
	    }
	} else {
	    let obj = {
		'pickid' : eid,
		'ctime' : ctime.toString(),
		'cartesian' : cartesian
	    }
	    ghSendCommandUnitWorker('updatemarquee', obj );
	    GH_TITLE_MARQUEE_PROP.previoustime = ctime;
	    GH_TITLE_MARQUEE_PROP.previousid = eid;
	}

    }
    
}
///////////////////////////////////////

function ghSetAboutModalContent() {
    var data = "Geoglyph Rail " + GH_REV + '<BR>';
    //data += GH_REV + '<BR>';
    //data += '<BR>';
    let dwidth = window.innerWidth * window.devicePixelRatio;
    let dheight = window.innerHeight * window.devicePixelRatio;
    data += window.navigator.userAgent + '<BR>';
    data += 'Plathome : ' + navigator.platform + '<BR>';
    data += 'Cesium : ' + Cesium.VERSION + '&nbsp;&nbsp;' + 'Leaflet :' + L.version + '&nbsp;&nbsp;' + 'jQuery :' + jQuery.fn.jquery + '<BR>';     
    data += 'Screen pixel : ' + screen.availWidth + 'px x ' + screen.availHeight + 'px<BR>';
    data += 'Window css pixel : ' + window.innerWidth + 'px x ' + window.innerHeight + 'px<BR>';
    data += 'Window devcice pixel : ' + dwidth + 'px x ' + dheight + 'px<BR>';
    data += 'Device Pixel Ratio : ' + window.devicePixelRatio + '<BR>';
    $('#gh_aboutcontent').html(data);
};

function ghSetStartModalContent() {
    // NOP
};
function ghSetShareModalContent() {
    if ( GH_LOCAL_CONSOLE ) {
	$("#gh_uploadconfigdata_content").show();
	$("#gh_downloadconfigdata_content").show();
	$("#gh_downloadcapture_content").show();	

	$("#gh_saveconfigdata_content").hide();
	$("#gh_savecaptureimage_content").hide();	
	
    } else {
	$("#gh_uploadconfigdata_content").hide();
	$("#gh_downloadconfigdata_content").hide();
	$("#gh_downloadcapture_content").hide();
	
	if ( GH_FIELDINDEX.args == null ) {
	    $("#gh_saveconfigdata_content").hide();
	    $("#gh_savecaptureimage_content").hide();
	} else { 
	    if ( GH_FIELDINDEX.args.tc ) {
		$("#gh_saveconfigdata_content").show();
		$("#gh_savecaptureimage_content").show();
	    } else {
		$("#gh_saveconfigdata_content").hide();
		$("#gh_savecaptureimage_content").hide();
	    }
	}
    }
};

function ghOnclickDialogButton(dialogid , mode) {
    if ( mode < 0 ) {
	// toggle mode
	if ( $( dialogid ).dialog('isOpen') ) {
            $( dialogid ).dialog('close');
	} else {
            $( dialogid ).dialog('open');
	}
    } else if ( mode > 9 ) {
	// Open mode
	if ( $( dialogid ).dialog('isOpen') ) {
            // NOP
	} else {
            $( dialogid ).dialog('open');
	}
    } else {
	// Close mode
	if ( $( dialogid ).dialog('isOpen') ) {
            $( dialogid ).dialog('close');
	} else {
            // NOP
	}
    }
}

function ghOnClickViewpointButton(type) {
    //if ( GH_MDL.model == null ) return;

    if ( GH_PICK_ENTITY == null ) return;

    type = 1.0 * type;
    
    switch (type) {
    case GH_CAM_MODE_NONE:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_TRACKED:
	GH_V.trackedEntity = GH_PICK_ENTITY;
	break;
    case GH_CAM_MODE_ABOVE:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_FRONT:
	GH_V.trackedEntity = null;	
	break;
    case GH_CAM_MODE_RIGHT:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_LEFT:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_BACK:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_NORTH:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_NORTHEAST:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_NORTHWEST:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_EAST:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_SOUTH:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_SOUTHEAST:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_SOUTHWEST:
	GH_V.trackedEntity = null;
	break;
    case GH_CAM_MODE_WEST:
	GH_V.trackedEntity = null;
	break;
    default:
	GH_V.trackedEntity = null;
    }	

    GH_CAM_MODE = type;

}
///////////////////////////////////////////////
function ghReSetCesiumJulianClock(juriandate) {
    if ( juriandate == null ) return;
    GH_V.clock.currentTime = juriandate;
    ghSetCesiumMultiplier( ghGetStatusbarMultiplier() );
    ghUpdateStatusbarDatetime(null);
}
function __ghInitializeCzmlClcck() {
    let s1 = GH_V.clock.startTime;
    let s2 = GH_V.clock.stopTime;
    let diff = Math.abs(Cesium.JulianDate.secondsDifference(s1,s2)/2);
    var t1 = Cesium.JulianDate.addSeconds(s1, diff, new Cesium.JulianDate());
    ghReSetCesiumJulianClock(t1);
}
function __ghInitializeCzmlCamera() {
    let bounds = [];
    let idx = 0;
    for(var key in GH_LAYER.polyline){
	if ( idx == 0 ) {
	    bounds = GH_LAYER.polyline[key].getBounds();
	} else {
	    bounds.extend( GH_LAYER.polyline[key].getBounds() );
	}
	idx++;
    }

    let center = bounds.getCenter();
    let p1 = bounds.getNorthEast();
    let range = center.distanceTo(p1);
    
    GH_CAM_HOME_BUTTON = new Cesium.BoundingSphere(
	Cesium.Cartesian3.fromDegrees(center.lng,center.lat),
	range
    );
    
    GH_V.camera.flyToBoundingSphere(GH_CAM_HOME_BUTTON);

    GH_M.fitBounds( bounds );

    ghSetHomeCameraPosition();
}

function ghDelayInitializeCzmlScene() {

    __ghInitializeCzmlClcck();
    __ghInitializeCzmlCamera();

    if ( GH_CLOCK_INIT_TIMER != null ) {
	clearTimeout( GH_CLOCK_INIT_TIMER );
    }
    GH_CLOCK_INIT_TIMER = null;

    //  Tooltip for Play Button
    if ( ( typeof $('.tooltipped')[0].M_Tooltip) === 'undefined' ) {
	// NOP
    } else {
	if ( GH_CONFIGFILE_JSON != null ) {
	    setTimeout( ghSetupConfigData ,3011); // Camera flight duration
	} else {
	    $('.tooltipped').tooltip('open');
	}
    }
	    
    //  For CZML Data Check
    if ( GH_DEBUG_CONSOLE )  {
	let dslen = GH_V.dataSources.length;
	for(let i=0;i<dslen;i++){
	    let ds = GH_V.dataSources._dataSources[i];
	    console.log(ds.name);
	    //  (FIELD_ID)_train_(trainid) ..  Unit Target Marker
	    //   XXX.geojson ...  Station Polygon
	}
    }

    
}

function ghCzmlLoadFinished(val) {
    GH_V.dataSources.add(val);
    if ( GH_CLOCK_INIT_TIMER != null ) {
	clearTimeout(GH_CLOCK_INIT_TIMER);
    }
    GH_CLOCK_INIT_TIMER = setTimeout( ghDelayInitializeCzmlScene, 997 );
}
///////////////////////////////////////////////

///////////////////////////////////////
//
//
//  Unit Worker
//

function ghDebugReceiveUnitWorker(event) {
    console.log("==");
    console.log(event.data);
}
function ghReceiveUnitWorker(event) {
    let ret = event.data;

    if ( ret.cmd ) {
	// NOP
    } else {
	// Uint8Array
	// Transfer Mode
	var array_buffer = new Uint8Array(event.data).buffer;
	var decoder = new TextDecoder("utf-8");
	var view = new DataView(array_buffer, 0, array_buffer.byteLength);
	ret = JSON.parse(decoder.decode(view));
    }
    
    if ( ret.cmd == 'initialize' ) {
	if ( GH_DEBUG_CONSOLE ) console.log( 'initialize ' + ret.result );
	GH_UNIT_WORKER.ack = true;
    } else if ( ret.cmd == 'append' ) {
	if ( ret.tgt == 'cesium' ) {
	    if ( ret.type == 'geojson' ) {
		// for debug test
		GH_V.dataSources.add(Cesium.GeoJsonDataSource.load( ret.result, {
		    stroke: Cesium.Color.fromCssColorString('#202020'),
		    fill: Cesium.Color.fromCssColorString('#202020'),
		    strokeWidth: 4,
		    clampToGround: true,
		    markerSymbol: '!'
		}));
	    } else if ( ret.type == 'czml' ) {
		Cesium.CzmlDataSource.load(ret.result).then( ghCzmlLoadFinished ) ;
		if ( GH_DEBUG_CONSOLE ) console.log( ret.result );
	    } else {
		// NOP
		console.log('Cesium Wrong type');
	    }
	} else if ( ret.tgt == 'unit' ) {
	    if ( ret.type == 'json' ) {
		GH_UNIT_GEOM[ ret.result.trainid ] = ret.result;
		if ( GH_DEBUG_CONSOLE ) console.log( ret.result );
	    } else {
		// NOP
	    }
	} else {
	    // NOP
	}
    } else if ( ret.cmd == 'message' ) {
	if ( ret.tgt == 'loading' ) {
	    ghSetTitleMarquee(ret.result);
	    ghStartTitleMarquee();
	    if ( ret.type > 0 ) {
		setTimeout( __ghDelayStopTitleMarquee, 6174 );
	    }
	} else	if ( ret.tgt == 'marquee' ) {
	    ghSetTitleMarquee(ret.result);
	    if ( GH_TITLE_MARQUEE.data('paused') && GH_IS_PLAYING ) {
		ghStartTitleMarquee();
	    }
	} else {
	    // NOP
	}
    } else {
	// NOP
    }

}
function ghInitUnitWorker() {
    if (window.Worker){
        if ( GH_UNIT_WORKER.worker == null ) {
            GH_UNIT_WORKER.worker = new Worker(GH_UNIT_WORKER.uri);
            GH_UNIT_WORKER.worker.addEventListener('message', ghReceiveUnitWorker );
            GH_UNIT_WORKER.worker.addEventListener('error', function(err) {
                console.error(err);
            });
	}
    } else {
	GH_UNIT_WORKER.worker = null;
    	console.log('Not support Web Workers');	
    }
    return;
}
function ghFreeUnitWorker(){
    if ( GH_UNIT_WORKER.worker != null ) {
        GH_UNIT_WORKER.worker.terminate();
        GH_UNIT_WORKER.worker = null;
    }
    return null;
}
function ghSendCommandUnitWorker(cmd,data){
    if ( GH_UNIT_WORKER.worker != null ) {
        GH_UNIT_WORKER.worker.postMessage({
            "cmd":cmd,
	    "value":data
        });
    }
}

//////////////////////////////////////

function ghResizeLeafletDialog(sz) {
    //var w = parseInt(sz.width,10);
    //var h = parseInt(sz.height,10);
    var titlebarmargin = 42;
    var w = parseInt( $('#ghLeafletDialog').dialog("option","width"),10);
    var h = parseInt( $('#ghLeafletDialog').dialog("option","height"),10);
    $('#ghLeafletDialog.ui-dialog-content').height(h-titlebarmargin);
    $('#ghLeafletDialog.ui-dialog-content').width(w);
    $('#ghLeafletContainer').height(h-titlebarmargin);
    $('#ghLeafletContainer').width(w);
    GH_M.invalidateSize(true);
}

function ghEventPropertyDialog(event,ui,btnid)  {
    if ( btnid == null ) return;

    let type = null;
    if ( ui == null ) {
	type = event ;
    } else {
	type = event.type ;
    }
	
    if ( type == 'dialogopen' ) {
	$( btnid ).css("color","#26A69A");
    } else if ( type == 'dialogclose' ) {
	$( btnid ).css("color","#FFFFFF");
    } else {
	// NOP

    }
}
function ghEventStatusDialog(event,ui,btnid)  {
    if ( btnid == null ) return;
    if ( event.type == 'dialogopen' ) {
	$( btnid ).css("color","#039be5");
    } else if ( event.type == 'dialogclose' ) {
	$( btnid ).css("color","#FFFFFF");
    } else {
	// NOP

    }
}


function ghInitDialog() {

    $('#ghaboutmodal').modal({
	onOpenStart : function () {
	    ghSetAboutModalContent();
	    ghEventPropertyDialog('dialogopen',null,'#ghaboutmodalbtn');
	},
	onCloseStart : function () {
	    ghEventPropertyDialog('dialogclose',null,'#ghaboutmodalbtn');
	}
    });

    $('#ghstartmodal').modal({
	onOpenStart : function () {
	    ghSetStartModalContent();
	    ghEventPropertyDialog('dialogopen',null,'#ghsearchbtn');
	},
	onCloseStart : function () {
	    ghEventPropertyDialog('dialogclose',null,'#ghsearchbtn');
	}
    });

    $('#ghsharemodal').modal({
	onOpenStart : function() {
	    ghSetShareModalContent();
	    ghEventPropertyDialog('dialogopen',null,'#ghsharemodalbtn');
	},
	onCloseStart : function () {
	    ghEventPropertyDialog('dialogclose',null,'#ghsharemodalbtn');
	}
    });

    $('#ghtimetablemodal').modal({
	onOpenStart : function () {
	    //ghOnclick2DdialogButton(1);// 3d map dialog close
            //ghOnclickPauseButton(); // clock pause button ( play stop )
	},
	onCloseStart : function () {
	    //  Execute Broadband
	    ghCloseTimetableModal();
	}
    });


    ///////////////////////////////////
    //GH_DIALOG_TITLE.leaflet,
    $( "#ghViewpointDialog" ).dialog({
	title: 'Viewpoint',
	width: 320,
	height: 320,
	resizable : false,
	position : { my: "right bottom-120", at : "right bottom" , of : window },
	open : function( event,ui ) { ghEventStatusDialog(event,ui,'#ghviewpointbtn') },
	close : function( event,ui ) { ghEventStatusDialog(event,ui,'#ghviewpointbtn') }	
    });
    //$('#ghViewpointDialog').dialog('close');
    $( '#ghviewpointbtn' ).click(function() {
	ghOnclickDialogButton('#ghViewpointDialog', -1);
    });
    // Change title bar color
    $( "#ghViewpointDialog" ).parent().find('.ui-dialog-titlebar').css("background-color","#039be5");
    ///////////////////////////////////

    ///////////////////////////////////
    //GH_DIALOG_TITLE.leaflet,
    $( "#ghLeafletDialog" ).dialog({
	title: '2D map',
	width: 412,
	height: 412,
	minWidth: 200,
	minHeight: 200,
	position : { my: "right top+90", at : "right top" , of : window },
	resizeStop: function ( event,ui ) { ghResizeLeafletDialog(ui.size) },
	open : function( event,ui ) { ghEventStatusDialog(event,ui,'#ghleafletbtn') },
	close : function( event,ui ) { ghEventStatusDialog(event,ui,'#ghleafletbtn') }	
    });
    //$('#gh_LeafletDialog').dialog('close');
    $( '#ghleafletbtn' ).click(function() {
	ghOnclickDialogButton('#ghLeafletDialog', -1);
    });
    // Change title bar color
    $( "#ghLeafletDialog" ).parent().find('.ui-dialog-titlebar').css("background-color","#039be5");
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.property3d,
//    $( "#gh2DPropertyDialog" ).dialog({
//	title: '2D Property',
//	width: 460,
//	height: 600,
//	minWidth: 200,
//	minHeight: 200,
//	position : { my: "left center", at : "left center" , of : window },
//    });
//    $('#gh2DPropertyDialog').dialog('close');
//    $( '#gh2dpropertybtn' ).click(function() {
//	ghOnclickDialogButton('#gh2DPropertyDialog', -1);
//    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.property3d,
    $( "#gh3DPropertyDialog" ).dialog({
	title: '3D property',
	width: 460,
	height: 500,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#gh3dpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#gh3dpropertybtn') }	
    });
    $('#gh3DPropertyDialog').dialog('close');
    $( '#gh3dpropertybtn' ).click(function() {
	ghOnclickDialogButton('#gh3DPropertyDialog', -1);
    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.object3d,
    $( "#gh3DObjectDialog" ).dialog({
	title: '3D object',
	width: 460,
	height: 300,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#gh3dobjectbtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#gh3dobjectbtn') }	
    });
    $('#gh3DObjectDialog').dialog('close');
    $( '#gh3dobjectbtn' ).click(function() {
	ghOnclickDialogButton('#gh3DObjectDialog', -1);
    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.roadproperty,
    $( "#ghTrainPropertyDialog" ).dialog({
	title: 'Train Proeperty',
	width: 460,
	height: 400,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghtrainpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghtrainpropertybtn') }	
    });
    $('#ghTrainPropertyDialog').dialog('close');
    $( '#ghtrainpropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghTrainPropertyDialog', -1);
    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.roadproperty,
    $( "#ghStationPropertyDialog" ).dialog({
	title: 'Station Proeperty',
	width: 460,
	height: 400,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghstationpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghstationpropertybtn') }	
    });
    $('#ghStationPropertyDialog').dialog('close');
    $( '#ghstationpropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghStationPropertyDialog', -1);
    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.roadproperty,
    $( "#ghTrackPropertyDialog" ).dialog({
	title: 'Track Proeperty',
	width: 460,
	height: 400,
	minWidth: 200,
	minHeight: 200,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghtrackpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghtrackpropertybtn') }	
    });
    $('#ghTrackPropertyDialog').dialog('close');
    $( '#ghtrackpropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghTrackPropertyDialog', -1);
    });
    ///////////////////////////////////


    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.modelproperty,
    $( "#ghCameraPropertyDialog" ).dialog({
	title: 'Camera Property',
	width: 460,
	height: 400,
	resizable: true,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghcamerapropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghcamerapropertybtn') }	
    });    //  resizeStop: function ( event,ui) { resize_control_dialog(ui.size) }	     
    $('#ghCameraPropertyDialog').dialog('close');
    $( '#ghcamerapropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghCameraPropertyDialog', -1);
    });
    ///////////////////////////////////
    
    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.weatherproperty,
    $( "#ghWeatherPropertyDialog" ).dialog({
	title: 'Weather Property',
	width: 460,
	height: 500,
	resizable: true,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghweatherpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghweatherpropertybtn') }	
    });    //  resizeStop: function ( event,ui) { resize_control_dialog(ui.size) }	     
    $('#ghWeatherPropertyDialog').dialog('close');
    $( '#ghweatherpropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghWeatherPropertyDialog', -1);
    });
    ///////////////////////////////////

    ///////////////////////////////////
    //title: GH_DIALOG_TITLE.weatherproperty,
    $( "#ghSoundEffectPropertyDialog" ).dialog({
	title: 'Sound Effect Property',
	width: 460,
	height: 300,
	resizable: true,
	position : { my: "left center", at : "left center" , of : window },
	open : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghsoundeffectpropertybtn') },
	close : function( event,ui ) { ghEventPropertyDialog(event,ui,'#ghsoundeffectpropertybtn') }	
    });    //  resizeStop: function ( event,ui) { resize_control_dialog(ui.size) }	     
    $('#ghSoundEffectPropertyDialog').dialog('close');
    $( '#ghsoundeffectpropertybtn' ).click(function() {
	ghOnclickDialogButton('#ghSoundEffectPropertyDialog', -1);
    });
    ///////////////////////////////////

    
}

///////////////////////////////////////////////////////////////
function ghAvoidOperation() {
    history.pushState(null, null, null);
    $(window).on("popstate", function (event) {
        if (!event.originalEvent.state) {
            alert('Attension reload button, if wrong operation? ---');
            history.pushState(null, null, null);
            return;
        }
    });
    window.addEventListener('beforeunload', function(e) {
        e.returnValue = 'Attension reload button, if wrong operation AA';
    }, false);
}

//////////////////////////////////////////////////////////////
//
//   Document Start
//
function ghResizeWindow() {

    //  Re-position Some Container

    //  Cesium Container
    let w = window.innerWidth;
    let h = window.innerHeight;
    let of = 50;  // Menu bar 42 + margin 8

    let x = 0; //  496 + 18 margin
    let y = of;

    $('#ghCesiumContainer').width(w);
    $('#ghCesiumContainer').height(h-of);

    
    //  Bottom Status Bar
    w = $('.cesium-viewer-timelineContainer').width();
    h = $('.cesium-viewer-timelineContainer').height();
    of = $('.cesium-viewer-timelineContainer').offset();

    x = w - 728; //  600 + 128 margin
    y = of.top - 56; //   48 + 8 margin
    
    $('#ghstatusbarbottom').css('left',x);
    $('#ghstatusbarbottom').css('top',y);    
    
}
/////////////////////////////////////////
function ghGetEnvData(id) {
    return {
	"revision" : GH_REV,
	"id" : id,
	"timestamp" : new Date().toString(),
	"plathome" : window.navigator.plathome,
	"agent" : window.navigator.userAgent,
	"hw" : window.navigator.hardwareConcurrency,
	"language" : window.navigator.language,
	"href" : location.href,
	"cesium"  : Cesium.VERSION,
	"leaflet" : L.version,
	"jquery" : jQuery.fn.jquery
    }
}
function ghCreateConfigData(id) {

    let ret = {
	"env" : ghGetEnvData(id),
	"argument" : GH_FIELDINDEX.args,
	"cesium" : null,
	"leaflet" : null,
	"menubar" : null,
	"statusbar" : null,
	"viewpoint" : {
	    "mode" : GH_CAM_MODE,
	    "centering" : GH_LAYER.autocenter,
	    "entityid" : null,
	    "camdistance" : GH_CAM_DISTANCE,
	    "camalt" : GH_CAM_ALT
	}
    }

    // Remove 'cf' argument  for recursive error
    if ( ret.argument.cf ) {
	delete ret.argument.cf;
    }
    
    if ( GH_PICK_ENTITY ) {
	ret.viewpoint.entityid = GH_PICK_ENTITY._id;
    }
    
    ret.cesium = {
	"size" : {
	    "width" : window.innerWidth,
	    "height" : window.innerHeight
	},
	"camera" : {
	    "positionWC" : GH_V.camera.positionWC,
	    "heading" : GH_V.camera.heading,
	    "pitch" : GH_V.camera.pitch,
	    "roll" : GH_V.camera.roll,
	    "upWC" : GH_V.camera.upWC
	}
    };


    let leafletdialog = $('#ghLeafletDialog').dialog("option");
    //console.log(leafletdialog.position);
    ret.leaflet = {
	"isOpen" : $('#ghLeafletDialog').dialog('isOpen'),
	"position" : {
	    "at" : leafletdialog.position.at,
	    "my" : leafletdialog.position.my
	},
	"size" : {
	    "width" : leafletdialog.width,
	    "height" : leafletdialog.height
	},
	"zoom" : GH_M.getZoom(),
	"center" : GH_M.getCenter(),
	"markersize" : {
	    "train" : GH_MARKER_PROP.train.size,
	    "station" : GH_MARKER_PROP.station.size,
	    "track" : GH_POLYLINE_PROP.size
	}
    }

    let timestamp = $('#timedescription').html().split(":");
    ret.statusbar = {
	"multiplier" : ghGetStatusbarMultiplier(),
	"timestamp" : {
	    "hour" : timestamp[0],
	    "min" : timestamp[1],
	    "sec" : timestamp[2]
	}
    }

    let wradio = "sunny"; // Default
    $('input[name="cesiumweather"]').each(function(i){
        if ( $(this).is(':checked') ) {
	    wradio = $(this).attr('value');
        }
    });

    ret.menubar = {
	"threedprop" : {
	    "quality" : $('#qualityslider').val(),
	    "tilecachesize" : $('#tilecachesizeslider').val(),
	    "showframerate" : $('#frameratecheckbox').is(':checked'),
	    "showtilequeue" : $('#tilequeuecheckbox').is(':checked'),
	    "showspeedometer" : $('#speedmetercheckbox').is(':checked'),
	    "enablesun" : $('#lightingcheckbox').is(':checked'),
	    "enablewater" : $('#watercheckbox').is(':checked'),
	    "enabletunnel" : $('#tunnelcheckbox').is(':checked'),
	    "enable3dobject" : GH_3DTILE.mode
	},
	"modelprop" : {
	    "modellabel" : $('#modellabelcheckbox').is(':checked'),
	    "modellabelscale" : $('#modellabelscaleslider').val(),
	    "modellabelyoffset" : $('#modellabelyoffsetslider').val(),
	    "modellabelcolor" : $('#modellabelcolor').val(),
	    "stationlabel" : $('#stationlabelcheckbox').is(':checked'),
	    "stationlabelscale" : $('#stationlabelscaleslider').val(),
	    "stationlabelyoffset" : $('#stationlabelyoffsetslider').val(),
	    "stationlabelcolor" : $('#stationlabelcolor').val(),
	    "trackwidth" : $('#trackwidthslider').val(),
	    "trackcolor" : $('#trackcolor').val()
	},
	"cameraprop" : {
	    "autocamera" : $('#autocameracheckbox').is(':checked'),
	    "cameraminutes" : $('#autocameraminutes').val(),
	    "enablestoptimer" : $('#enablestoptimercheckbox').is(':checked'),
	    "stoptimerhour" : $('#stoptimerhour').val(),
	    "stoptimermin" : $('#stoptimermin').val()
	},
	"weatherprop" : {
	    "weather" : wradio,
	    "density" : $( '#rainslider').val()
	},
	"seprop" : null
    }
    return ret;
}

function ghDownloadCaptureImage() {

    let d = new Date();
    let dstr = d.toString().replace(/\s+/g,'_');
    let tp = $('#timedescription').html().split(":");
    let outfilename = "GH_" + GH_FIELDINDEX.args.tc + '_' + tp[0] + tp[1] + tp[2] + "_" + dstr + ".jpg";

    GH_V.render();/// Important
    let imgdata = GH_V.canvas.toDataURL('image/jpeg', 0.85);
    let download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', imgdata );
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();

    $('#ghsharemodal').modal('close');
    //alert(outfilename + ' downloaded');
    
}
function ghDownloadConfigData() {
    let d = new Date();
    let ret = null;
    ret = ghCreateConfigData(d.getTime());
    
    let dstr = d.toString().replace(/\s+/g,'_');
    let outfilename = "GH_" + ret.argument.tc + "_" + ret.statusbar.timestamp.hour +  ret.statusbar.timestamp.min + ret.statusbar.timestamp.sec + "_" + dstr + ".ghjson";

    let download = document.createElement("a");
    document.body.appendChild(download);
    download.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent( JSON.stringify(ret) ) );
    download.setAttribute('download', outfilename);    
    download.click();
    download.remove();

    $('#ghsharemodal').modal('close');
    alert(outfilename + ' downloaded');
    
}
function ghSaveConfigData() {
    
    let d = new Date();
    GH_CONFIGFILE_ID = ghBroadcastGetUniqueID() + d.getTime();
    let ret = null;
    ret = ghCreateConfigData(GH_CONFIGFILE_ID);

    $.ajax({
        type: "POST",
        url: GH_SHARE_CGI.config,
        contentType: "Content-Type: application/json; charset=UTF-8",
        dataType: "json",   
        data: JSON.stringify(ret)
    }).done(function(data) {
        let saveurl = location.href;
	saveurl = saveurl.substring(0,saveurl.indexOf("?"));     // remove ? argument
	saveurl = saveurl + "?cf=" + GH_CONFIGFILE_ID;           //  Configdata Param
        //$("#gh_save_config_message").html(saveurl.replace('#!', ''));
	$("#gh_save_config_message").val( saveurl.replace('#!', '') );
        $("#gh_save_config_button").html("OK. share above URL link");
	$("#gh_save_config_message").focus();
	
	//  https://earth.geoglyph.info/rail/en/rail3m.html?tc=481NS?cf=18b55c7170f1b21697951192847
	
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
        var msg = "Cannot save data error ";
        msg += " XMLHttpRequest " + XMLHttpRequest.status ;
        msg += " textStatus " + textStatus ;
	console.log( msg );
    });
}

function __ghBase64ToBlob(base64, mime) 
{
    mime = mime || '';
    var sliceSize = 1024;
    var byteChars = window.atob(base64);
    var byteArrays = [];

    for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
        var slice = byteChars.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    return new Blob(byteArrays, {type: mime});
}

//https://www.web-dev-qa-db-ja.com/ja/javascript/blob%E3%82%92%E7%94%BB%E5%83%8F%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB%E3%81%AB%E5%A4%89%E6%8F%9B/838329639/
function ghSaveCaptureImage() {

//    alert('Not yet');
//    return;
    
    GH_V.render();/// Important
    let imgdata = GH_V.canvas.toDataURL('image/jpeg', 0.85);
    var img64 = imgdata.replace(/^data:image\/(png|jpeg);base64,/, "");
    var imgBlob = __ghBase64ToBlob(img64, 'image/jpeg');  

    var oReq = new XMLHttpRequest();
    oReq.open("POST", GH_SHARE_CGI.captureimage, true);
    oReq.onload = function (e) {
	if (e.target.status == 200) {
	    if (e.target.response) {
		//console.log(e.target.responseTexet);
		let ret = JSON.parse(e.target.response);
		console.log(ret);
		ghSaveCaptureProp(ret);
	    }
	} else {
	    console.log('Response Error');
	    console.log(e.target);
	}
	console.log(e);
    };
    oReq.send(imgBlob);

    //$('#ghsharemodal').modal('close');
    //alert(outfilename + ' downloaded');
    
}
function gGetLatlngFromCesiumPoint(w,h,wadd,hadd) {
    let ray = null;
    let intersection = null;
    let point = null;
    let maxcnt = 20;
    for(let cnt=0;cnt<maxcnt;cnt++){
	ray = GH_V.camera.getPickRay(new Cesium.Cartesian2(w,h));
	intersection = Cesium.IntersectionTests.rayEllipsoid(ray, Cesium.Ellipsoid.WGS84);
	if ( ( typeof intersection ) === 'undefined' ) {
	    w = w + wadd;
	    h = h + hadd;
	} else {
	    point = Cesium.Ray.getPoint(ray, intersection.start);
	    break;
	}
    }
    if ( ( typeof intersection ) === 'undefined' ) {
	point = Cesium.Cartesian3.ONE
    }
    // Radian
    //return Cesium.Cartographic.fromCartesian(point);
    let cp = Cesium.Cartographic.fromCartesian(point);
    let position = new Cesium.Cartographic(cp.longitude, cp.latitude);
    //let height = GH_S.sampleHeight(position);
    let height = GH_S.globe.getHeight(position);
    return [ [Cesium.Math.toDegrees(cp.latitude),Cesium.Math.toDegrees(cp.longitude)], height ];
}
function ghGetCameraViewRectangle() {
    let w = $('#ghCesiumContainer').width();
    let h = $('#ghCesiumContainer').height();
    let cam = GH_V.camera.positionCartographic;
    // cp ( longitude, altitude, height )
    //let camalt = GH_S.sampleHeight(camp);
    let camalt = GH_S.globe.getHeight( new Cesium.Cartographic(cam.longitude, cam.latitude) );
	
    let nw = gGetLatlngFromCesiumPoint(0,0,10,100);
    let sw = gGetLatlngFromCesiumPoint(0,h,10,-100);
    let se = gGetLatlngFromCesiumPoint(w,h,-10,-100);
    let ne = gGetLatlngFromCesiumPoint(w,0,-10,100);
    // unit degrees [ lat , lng ] for leaflet
    //return [nw,sw,se,ne];
    return {
	"polygon" : {
	    "latlngs" : [ nw[0],sw[0],se[0],ne[0] ],
	    "altitude" : [ nw[1],sw[1],se[1],ne[1] ]
	},
	"camera" : {
	    "latlng" : [ Cesium.Math.toDegrees(cam.latitude),Cesium.Math.toDegrees(cam.longitude) ],
	    "height" : cam.height,
	    "altitude" : camalt
	}
    }
}
function ghSaveCaptureProp(json) {
    let d = new Date();
    GH_CAPTUREFILE_ID = ghBroadcastGetUniqueID() + d.getTime();
    let timestamp = $('#timedescription').html().split(":");
    let ret = {
	"env" : ghGetEnvData(GH_CAPTUREFILE_ID),
	"tc" : GH_FIELDINDEX.args.tc,
	"imageid" : json.id,
	"viewpoint" : {
	    "position" : GH_V.camera.positionCartographic,
	    "heading" : GH_V.camera.heading,
	    "pitch" : GH_V.camera.pitch,
	    "roll" : GH_V.camera.roll,
	    "rectangle" : ghGetCameraViewRectangle()
	},
	"timestamp" : {
	    "hour" : timestamp[0],
	    "min" : timestamp[1],
	    "sec" : timestamp[2]
	}
    }

    $.ajax({
        type: "POST",
        url: GH_SHARE_CGI.captureprop,
        contentType: "Content-Type: application/json; charset=UTF-8",
        dataType: "json",   
        data: JSON.stringify(ret)
    }).done(function(data) {
        let url = location.href;
	url = url.substring(0,url.indexOf("?"));     // remove ? argument
	url = url.replace('rail3m','rail5view');     // capture file viewer HTML
	url = url + "?cf=" + GH_CAPTUREFILE_ID;       // Configdata Param
	$("#gh_save_capture_message").val( url );
	$("#gh_save_capture_button").html("OK. share above URL link");
	$("#gh_save_capture_message").focus();
	
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
        var msg = "Cannot save data error ";
        msg += " XMLHttpRequest " + XMLHttpRequest.status ;
        msg += " textStatus " + textStatus ;
	console.log( msg );
    });


}
function ghSetupConfigData( ) {
    ghSetupConfigLeaflet();
    ghSetupConfigCesium();    
    ghOnClickPlayPauseButton(); // Auto play start for viewport
    setTimeout( ghSetupConfigStatusbar,997);
    setTimeout( ghSetupConfigMenubar3D,5813);
    setTimeout( ghSetupConfigViewport,6211);
}
    
function ghUploadConfigData( data ) {
    var files = data.files;
    var reader = new FileReader();
    let outfilename = escape(files[0].name);
    reader.readAsText(files[0]);
    reader.onload = function(e) {
        GH_CONFIGFILE_JSON = JSON.parse(e.target.result);
	if ( GH_CONFIGFILE_JSON.argument ) {
	    GH_FIELDINDEX.args = GH_CONFIGFILE_JSON.argument;
	    ghSetBaseArgument();
	}

	//ghSetupConfigLeaflet(); in ghSetupConfigData at ghDelayInitializeCzmlScene()
	//ghSetupConfigCesium(); in ghSetupConfigData at ghDelayInitializeCzmlScene() 	
	//ghSetupConfigStatusbar(); in ghSetupConfigData at ghDelayInitializeCzmlScene()
	//ghSetupConfigMenubar(); in ghSetupConfigData at ghDelayInitializeCzmlScene() 	
	//ghOnClickPlayPauseButton(); in ghSetupConfigData  at ghDelayInitializeCzmlScene() 

	$('#ghsharemodal').modal('close');
	//alert(outfilename + ' uploaded');
    }
    $('#ghsharemodal').modal('close');
}

function ghSetupConfigViewport() {

    ////////////////////////////
    // viewpoint configure
    if ( GH_CONFIGFILE_JSON.viewpoint ) {

	if ( GH_CONFIGFILE_JSON.viewpoint.camdistance ) {
	    GH_CAM_DISTANCE = parseFloat(GH_CONFIGFILE_JSON.viewpoint.camdistance);
	}
	if ( GH_CONFIGFILE_JSON.viewpoint.camalt ) {
	    GH_CAM_ALT = parseFloat(GH_CONFIGFILE_JSON.viewpoint.camalt);
	}


	let entity = null;
	if ( GH_CONFIGFILE_JSON.viewpoint.entityid ) {
	    if ( GH_CONFIGFILE_JSON.viewpoint.entityid == null ) {
		// NOP
	    } else {
		entity = GH_V.entities.getById( GH_CONFIGFILE_JSON.viewpoint.entityid );
		if ( ( typeof entity ) === 'undefined' ) {
		    // NOP
		    entity = null;
		}  else {
		    __ghSetPickEntity( entity );

		    // For leaflet 
		    if ( GH_CONFIGFILE_JSON.viewpoint.centering ) {
			$('#ghmapcentercheckbox').prop('checked', true);
			ghSetAutoCenterLeafletMap( true );
		    } else {
			$('#ghmapcentercheckbox').prop('checked', false);
			ghSetAutoCenterLeafletMap( false );
		    }
		}
	    }
	}

	if ( GH_CONFIGFILE_JSON.viewpoint.mode ) {
	    GH_CAM_MODE = parseInt(GH_CONFIGFILE_JSON.viewpoint.mode,10);

	    if ( GH_CAM_MODE == GH_CAM_MODE_TRACKED ) {
		if ( entity == null ) {
		    GH_CAM_MODE = GH_CAM_MODE_NONE; // Re-set
		    GH_V.trackedEntity = null;
		} else {
		    if ( GH_CONFIGFILE_JSON.cesium
			 && GH_CONFIGFILE_JSON.cesium.camera ) {
			let cam = GH_CONFIGFILE_JSON.cesium.camera;
			GH_V.camera.setView({
			    destination: cam.positionWC,
			    orientation: {
				heading : cam.heading,
				pitch : cam.pitch,
				roll : cam.roll
			    }
			});
		    } else {
			// Not camera data
		    }
		}
	    } else {
		// NOP
	    }
	    
	    $('input:radio[name="viewpoint"]').each(function(index) {
		if ( $(this).val() == GH_CAM_MODE ) {
		    $(this).prop('checked', true);
		} else {
		    $(this).prop('checked', false);
		}
	    });
	    
	    ghOnClickViewpointButton( GH_CAM_MODE );
	}

    }
    
    
}
function ghSetupConfigLeaflet() {

    //////////////////////
    //  Leaflet Parameter
    if ( GH_CONFIGFILE_JSON.leaflet ) {
	if ( GH_CONFIGFILE_JSON.leaflet.position ) {
	    $('#ghLeafletDialog').dialog("option","position", {
		"at" : GH_CONFIGFILE_JSON.leaflet.position.at,
		"my" : GH_CONFIGFILE_JSON.leaflet.position.my,
		"of" : window
	    });
	}
	if ( GH_CONFIGFILE_JSON.leaflet.size ) {
	    $('#ghLeafletDialog').dialog("option","width", parseInt( GH_CONFIGFILE_JSON.leaflet.size.width,10) );
	    $('#ghLeafletDialog').dialog("option","height", parseInt( GH_CONFIGFILE_JSON.leaflet.size.height,10) );
	}

	ghResizeLeafletDialog(null);

	if ( GH_CONFIGFILE_JSON.leaflet.zoom ) {
	    let val = parseFloat( GH_CONFIGFILE_JSON.leaflet.zoom );
	    if ( val > GH_M.getMaxZoom() ) {
		val = GH_M.getMaxZoom();
	    }
	    GH_M.setZoom( val );
	}

	if ( GH_CONFIGFILE_JSON.leaflet.center ) {
	    let p = new L.LatLng(
		parseFloat(GH_CONFIGFILE_JSON.leaflet.center.lat),
		parseFloat(GH_CONFIGFILE_JSON.leaflet.center.lng)
	    );
	    GH_M.setView(p,GH_M.getZoom());
	}

	if ( GH_CONFIGFILE_JSON.leaflet.markersize ) {
	    if ( GH_CONFIGFILE_JSON.leaflet.markersize.train ) {
		GH_MARKER_PROP.train.size = parseFloat(GH_CONFIGFILE_JSON.leaflet.markersize.train);
		ghSetLeafletTrainIconSize(GH_MARKER_PROP.train.size);
	    }
	    if ( GH_CONFIGFILE_JSON.leaflet.markersize.station ) {
		GH_MARKER_PROP.station.size = parseFloat(GH_CONFIGFILE_JSON.leaflet.markersize.station);
		ghSetLeafletStationIconSize(GH_MARKER_PROP.station.size);
	    }
	    if ( GH_CONFIGFILE_JSON.leaflet.markersize.track ) {
		GH_POLYLINE_PROP.size = parseFloat(GH_CONFIGFILE_JSON.leaflet.markersize.track);
		ghSetLeafletTrackPolylineSize(GH_POLYLINE_PROP.size);
	    }
	    if ( GH_CONFIGFILE_JSON.leaflet.markersize.camera ) {
		// Not Yet
	    }
	}

	if ( GH_CONFIGFILE_JSON.leaflet.isOpen ) {
	    $('#ghLeafletDialog').dialog('open');
	} else {
	    $('#ghLeafletDialog').dialog('close');
	}
    }
}

function ghSetupConfigCesium() {

    //////////////////////
    //  Cesium Parameter
    if ( GH_CONFIGFILE_JSON.cesium.size ) {
	window.resizeTo(
	    parseInt(GH_CONFIGFILE_JSON.cesium.size.width,10),
	    parseInt(GH_CONFIGFILE_JSON.cesium.size.height,10)
	);
    }
}

function ghSetupConfigMenubar3D() {

    /////////////////////////
    // Menu bar
    if ( GH_CONFIGFILE_JSON.menubar ) {

	////////////////////////
	// 3D prop
	if ( GH_CONFIGFILE_JSON.menubar.threedprop ) {
	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.quality ) {
		let val = parseInt(GH_CONFIGFILE_JSON.menubar.threedprop.quality,10);
		$('#qualityslider').val(val),
		ghSetCesiumQuality( val );
	    }
	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.tilecachesize ) {
		let val = parseInt(GH_CONFIGFILE_JSON.menubar.threedprop.tilecachesize,10);
		$( '#tilecachesizeslider' ).val(val);
		ghSetCesiumCacheSize(val);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.enabletunnel ) {
		ghEnableCesiumTunnel( true );
		$('#tunnelcheckbox').prop('checked', true);
	    } else {
		ghEnableCesiumTunnel( false );
		$('#tunnelcheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.enablesun ) {
		ghEnableCesiumSunEffect( true );
		$('#lightingcheckbox').prop('checked', true);
	    } else {
		ghEnableCesiumSunEffect( false );
		$('#lightingcheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.showspeedometer ) {
		ghShowCesiumSpeedoMeter( true );
		$('#speedmetercheckbox').prop('checked', true);
	    } else {
		ghShowCesiumSpeedoMeter( false );
		$('#speedmetercheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.showframerate ) {
		ghShowCesiumFPS( true );
		$('#frameratecheckbox').prop('checked', true);
	    } else {
		ghShowCesiumFPS( false );
		$('#frameratecheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.showtilequeue ) {
		ghShowCesiumTileQueue( true );
		$('#tilequeuecheckbox').prop('checked', true);
	    } else {
		ghShowCesiumTileQueue( false );
		$('#tilequeuecheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.threedprop.enablewater ) {
		ghEnableCesiumWaterEffect( true ) ;
		$('#watercheckbox').prop('checked', true);
	    } else {
		ghEnableCesiumWaterEffect( false ) ;
		$('#watercheckbox').prop('checked', false);
	    }

	    if ( GH_CONFIGFILE_JSON.argument.gt ) {
		// NOP for Google Photorealistic 3D , set function ghSetBaseArgument()
		//ghEnableCesium3Dtile( GH_3DTILE_PHOTOREALISTIC_GOOGLE );
	    } else {
		let val = GH_3DTILE_NONE;
		if (  GH_CONFIGFILE_JSON.menubar.threedprop.enable3dobject ) {
		    val = parseFloat(GH_CONFIGFILE_JSON.menubar.threedprop.enable3dobject);
		}
		$('input:radio[name="vectortile3d"]').each(function(index) {
		    if ( parseFloat($(this).val()) == val ) {
			$(this).prop('checked', true);
		    } else {
			$(this).prop('checked', false);
		    }
		});
		ghEnableCesium3Dtile( val );
		
		//if ( GH_CONFIGFILE_JSON.menubar.threedprop.enable3dobject ) {
		//    ghEnableCesium3Dtile( parseFloat(GH_CONFIGFILE_JSON.menubar.threedprop.enable3dobject) );
		    //$('#tile3dcheckbox').prop('checked', true);
		//} else {
		//    //ghEnableCesium3Dtile( false );
		//    ghEnableCesium3Dtile( parseFloat(GH_CONFIGFILE_JSON.menubar.threedprop.enable3dobject) );
		//    //$('#tile3dcheckbox').prop('checked', false);
		//}
	    }
	}
    }

    setTimeout( ghSetupConfigMenubarCamera,2111);

}
function ghSetupConfigMenubarCamera() {

    /////////////////////////
    // Menu bar
    if ( GH_CONFIGFILE_JSON.menubar ) {

	////////////////////////
	// Camera Prop
	if ( GH_CONFIGFILE_JSON.menubar.cameraprop ) {

	    if ( GH_CONFIGFILE_JSON.menubar.cameraprop.autocamera ) {
		$( '#autocameracheckbox').prop('checked', true);
		ghEnableAutoCamera( true );
	    } else {
		$( '#autocameracheckbox').prop('checked', false);
		ghEnableAutoCamera( false );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.cameraprop.cameraminutes ) {
		let val = parseInt(GH_CONFIGFILE_JSON.menubar.cameraprop.cameraminutes,10);
		$( '#autocameraminutes').val(val);
		ghSetAutoCameraInterval( $('#autocameraminutes').val() );
	    }
	}
	
    }

    setTimeout( ghSetupConfigMenubarModel,2111);

}
function ghSetupConfigMenubarModel() {

    /////////////////////////
    // Menu bar
    if ( GH_CONFIGFILE_JSON.menubar ) {

	////////////////////////
	// Model Prop
	if ( GH_CONFIGFILE_JSON.menubar.modelprop ) {


	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.modellabel ) {
		$( '#modellabelcheckbox').prop('checked', true);
		ghSetCesiumModelLabelProperty( 'show' , true , '#008000' );
	    } else {
		$( '#modellabelcheckbox').prop('checked', false);
		ghSetCesiumModelLabelProperty( 'show' , false , '#008000' );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.modellabelscale ) {
		let val = parseFloat(GH_CONFIGFILE_JSON.menubar.modelprop.modellabelscale);
		$( '#modellabelscaleslider').val(val);
		ghSetCesiumModelLabelProperty( 'scale', false, val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.modellabelyoffset ) {
		let val = parseFloat(GH_CONFIGFILE_JSON.menubar.modelprop.modellabelyoffset);
		$( '#modellabelyoffsetslider').val(val);
		ghSetCesiumModelLabelProperty( 'yoffset', false, val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.modellabelcolor ) {
		let val = GH_CONFIGFILE_JSON.menubar.modelprop.modellabelcolor;
		$( '#modellabelcolor').val(val);
		ghSetCesiumModelLabelProperty( 'color', false, val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.stationlabel ) {
		$( '#stationlabelcheckbox').prop('checked', true);
		ghSetCesiumStationLabelProperty( 'show' , true , '#008000' );
	    } else {
		$( '#stationlabelcheckbox').prop('checked', false);
		ghSetCesiumStationLabelProperty( 'show' , false , '#008000' );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelscale ) {
		let val = parseFloat(GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelscale);
		$( '#stationlabelscaleslider').val(val);
		ghSetCesiumStationLabelProperty( 'scale', false, val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelyoffset ) {
		let val = parseFloat(GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelyoffset);
		$( '#stationlabelyoffsetslider').val(val);
		ghSetCesiumStationLabelProperty( 'yoffset', false, val );

		//  Change Y-Offset for label polyline
		//ghUpdateCesiumStationLabelOffset(GH_V.clock.currentTime);
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelcolor ) {
		let val = GH_CONFIGFILE_JSON.menubar.modelprop.stationlabelcolor;
		$( '#stationlabelcolor').val(val);
		ghSetCesiumStationLabelProperty( 'color', false, val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.trackcolor ) {
		let val = GH_CONFIGFILE_JSON.menubar.modelprop.trackcolor;
		$( '#trackcolor').val(val);
		ghSetCesiumTrackProperty( 'color', val );
	    }

	    if ( GH_CONFIGFILE_JSON.menubar.modelprop.trackwidth ) {
		let val = parseFloat(GH_CONFIGFILE_JSON.menubar.modelprop.trackwidth);
		$( '#trackwidthslider').val(val);
		ghSetCesiumTrackProperty( 'width', val );
	    }

	}
	
    }

    setTimeout( ghSetupConfigMenubarWeather,2111);

}
function ghSetupConfigMenubarWeather() {

    /////////////////////////
    // Menu bar
    if ( GH_CONFIGFILE_JSON.menubar ) {

	////////////////////////
	// Weather
	if ( GH_CONFIGFILE_JSON.menubar.weatherprop ) {
	    if ( GH_CONFIGFILE_JSON.menubar.weatherprop.weather ) {
		let w = GH_CONFIGFILE_JSON.menubar.weatherprop.weather;
		let val = 5; // Default 5
		if ( GH_CONFIGFILE_JSON.menubar.weatherprop.density ) {
		    val = parseInt(GH_CONFIGFILE_JSON.menubar.weatherprop.density,10);
		}
		if ( w == "rain" ) {
		    $('input:radio[name="cesiumweather"][value="rain"]').prop('checked', true);
		} else if ( w == "cloud" ) {
		    $('input:radio[name="cesiumweather"][value="cloud"]').prop('checked', true);
		} else {
		    $('input:radio[name="cesiumweather"][value="sunny"]').prop('checked', true);
		}
		$( '#rainslider').val(val);
		ghSetCesiumWeather( w, val );
	    }
	}
    }

}

function ghSetupConfigStatusbar() {

    /////////////////////////
    // Status bar
    if ( GH_CONFIGFILE_JSON.statusbar ) {

	if ( GH_CONFIGFILE_JSON.statusbar.multiplier ) {
	    $('#ghcesiummultiplier').val( parseInt( GH_CONFIGFILE_JSON.statusbar.multiplier , 10 ) );
	    ghSetCesiumMultiplier( $('#ghcesiummultiplier').val() );
	}

	if ( GH_CONFIGFILE_JSON.statusbar.timestamp ) {
	    let d = new Date();
	    //let str = GH_CONFIGFILE_JSON.statusbar.timestamp.split(":");
	    d.setHours( parseFloat( GH_CONFIGFILE_JSON.statusbar.timestamp.hour ) );
	    d.setMinutes( parseFloat( GH_CONFIGFILE_JSON.statusbar.timestamp.min ) );
	    d.setSeconds( parseFloat( GH_CONFIGFILE_JSON.statusbar.timestamp.sec ) );			      
	    let ts = d.getTime();
	    let ts_before = ts - ( 1000 * 60 * 1 ); // before 1 min
	    let d_before = new Date(ts_before);

	    let h = d_before.getHours();
	    if ( h < 10 ) h = "0" + h;

	    let m = d_before.getMinutes();
	    if ( m < 10 ) m = "0" + m;

	    $('#ghtimepicker_input' ).val(h+":"+m);
		
	    ghSetTimePicker( $('#ghtimepicker_input' ).val() , true );

	}
	
    }

}


/////////////////////////////////////////



function ghGetCurrentArgument() {

    var ret = {};
    var str = location.search.substring(1);
    var args = str.split("&");

    if ( args[0] == "" ) {
	// No argument
	return null
    }
	
    for(let i=0,len=args.length;i<len;i++){
	let param = args[i].split("=");
	//if ( ret[param[0]] ) {
	//}
	if ( isNaN(param[1]) ) {
	    ret[param[0]] = param[1];
	} else {
	    ret[param[0]] = parseFloat(param[1]);
	}

    }
    return ret;

}

function ghCalcObtuseAngle(angle01,angle12) {
    //
    // -180.0 <  angle  < 180.0
    //
    let res = 10000;
    if ( angle01 > 0 ) {
	if ( angle12 > 0 ) {
	    res = Math.abs( angle01 - angle12 );
	} else {
	    res = angle01 - angle12;
	}
    } else {
	// angle01 < 0
	if ( angle12 > 0 ) {
	    res = angle12 - angle01;
	} else {
	    // angle12 < 0
	    res = Math.abs( angle01 - angle12 );
	}
    }
    return res;
}


function ghCreateCesiumGroundPolyline(polyline,attr) {

    let latlngs = polyline.getLatLngs();
    let routename = attr.routes.value;
    
    var linestrings = [];
    var points = [];
    var p0 = null;
    var p1 = null;
    var p2 = null;
    var angle01 = null;
    var angle12 = null;
    var angle = 0;
    var isobtuse = true;
    let linename = null;
    const track_width = 1.0;

    for (var i = 0; i < latlngs.length; i++) {
	if ( i > 2 ) {
	    // More 2 points
	    p0 = turf.helpers.point( [ latlngs[i-2].lng, latlngs[i-2].lat ] );
	    p1 = turf.helpers.point( [ latlngs[i-1].lng, latlngs[i-1].lat ] );
	    p2 = turf.helpers.point( [ latlngs[i].lng, latlngs[i].lat ] );
	    angle01 = turf.bearing.default(p0,p1) ;
	    angle12 = turf.bearing.default(p1,p2) ;

	    angle = ghCalcObtuseAngle(angle01,angle12);
	    if ( angle < 60 || angle > 300.0 ) {
		isobtuse = true;
	    } else {
		isobtuse = false;
	    }
	} else {
	    isobtuse = true;
	}

	if ( isobtuse ) {
            // NOP
	    // points.push([ data.positions[i], data.positions[i+1] ]);
	} else {
	    if ( points.length > 1 ) {
		linename = routename + linestrings.length;
		linestrings.push ( turf.helpers.lineString(points,{name:linename} ) );
		points = [];
	    } else {
		let txt = routename + " wrong points " + points[0][0] + " " + points[0][1];
		console.log(txt);
	    }
	}
	points.push([ latlngs[i].lng, latlngs[i].lat ]);
    }

    // Last points
    if ( points.length > 1 ) {
	linename = routename + linestrings.length;
	linestrings.push ( turf.helpers.lineString(points,{name:linename} ) );
    }

    var linestrings_track = [];
    for (var i = 0; i < linestrings.length; i++) {
	linestrings_track.push ( turf.lineOffset.default(linestrings[i], track_width, {units:'meters'}) )
	linestrings_track.push ( turf.lineOffset.default(linestrings[i], -track_width, {units:'meters'}) );
    }
		
    // Create polyline Both Side
    var instance = [];
    var vpoly = [];
    var track_max = linestrings_track.length;
    for ( var i=0;i<track_max;i++){
	let primitiveid =  routename + "_side_" + i ;
	instance[i] = new Cesium.GeometryInstance({
            geometry : new Cesium.GroundPolylineGeometry({
		positions : Cesium.Cartesian3.fromDegreesArray(linestrings_track[i].geometry.coordinates.flat()),
		width : 3.0,
            }),
            attributes : {
		color : Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.2, 0.2, 0.2, 1.0))
            },
            id : primitiveid
	});
	vpoly[i] = new Cesium.GroundPolylinePrimitive({
            geometryInstances : instance[i],
            show : true,
            allowPicking : false,
            classificationType : Cesium.ClassificationType.TERRAIN,
	    releaseGeometryInstances: false,
            appearance : new Cesium.PolylineColorAppearance()
	});
	//  for save momery releaseGeometryInstances: false,
	GH_V.scene.groundPrimitives.add(vpoly[i]);
	//GH_ENTITY.line.push (vpoly[i]);
	//GH_ENTITY.lineid.push (primitiveid);

	GH_PRIMITIVE_ID.push(primitiveid);
    }
}


function ghSetLeafletTrainIconSize(size) {
    for(var key in GH_LAYER.train){
	if ( GH_M.hasLayer(GH_LAYER.train[key]) ) {
	    // NOP
	} else {
	    GH_LAYER.train[key].addTo(GH_M);
	}
	GH_LAYER.train[key].setIcon( ghCreateLeafletIcon("train",key) );
    }
}
function ghSetLeafletTrackPolylineSize(size) {
    if ( size < 1 ) {
	for ( var key in GH_LAYER.polyline ) {
	    if ( GH_M.hasLayer(GH_LAYER.polyline[key]) ) {
		GH_M.removeLayer(GH_LAYER.polyline[key]);
	    }
	}
    } else {
	for ( var key in GH_LAYER.polyline ) {
	    if ( GH_M.hasLayer(GH_LAYER.polyline[key]) ) {
		// NOP
	    } else {
		GH_LAYER.polyline[key].addTo(GH_M);
	    }
	    GH_LAYER.polyline[key].setStyle({weight: GH_POLYLINE_PROP.size});
	}
    }
}
function ghSetLeafletStationIconSize(size) {
    if ( size < 1  ) {
	for ( var key in GH_LAYER.station ) {
	    if ( GH_M.hasLayer(GH_LAYER.station[key]) ) {
		GH_M.removeLayer(GH_LAYER.station[key]);
	    }
	}
    } else {
	for ( var key in GH_LAYER.station ) {
	    if ( GH_M.hasLayer(GH_LAYER.station[key]) ) {
		// NOP
	    } else {
		GH_LAYER.station[key].addTo(GH_M);
	    }
	    GH_LAYER.station[key].setIcon( ghCreateLeafletIcon("station",key) );
	}
    }

}
function ghSetLeafletLayerSize(type,size) {
    if ( type == 'train' ) {
	GH_MARKER_PROP.train.size = GH_MARKER_SIZE[size];
	ghSetLeafletTrainIconSize(GH_MARKER_PROP.train.size);
    } else if (  type == 'track' ) {
	GH_POLYLINE_PROP.size = ( GH_MARKER_SIZE[ size ] / 4 ) |0;
	ghSetLeafletTrackPolylineSize(GH_POLYLINE_PROP.size);
    } else if (  type == 'station' ) {
	GH_MARKER_PROP.station.size = GH_MARKER_SIZE[size];
	ghSetLeafletStationIconSize(GH_MARKER_PROP.station.size);
    } else {
	// NOP
    }
}


function ghCreateLeafletStationMarker(name,lat,lng) {
    var p = new L.LatLng(parseFloat(lat),parseFloat(lng));
    var mi = ghCreateLeafletIcon('station',name);
    var marker = L.marker(p, { icon: mi , title: name , alt: name });
    marker.addTo(GH_M);
//    marker.on('click', function(e) {
//	ghPickLeafletData(this,'station',e);
//	ghOnclickLeafletMarker(e.target._myId,"station");
//    });
    GH_LAYER.station[name] = marker;

}

function ghCreateCesiumStationLabel(name,lat,lng) {
    var pos = new Cesium.Cartesian3.fromDegrees(
	parseFloat(lng),
	parseFloat(lat)
    );
    GH_V.entities.add({
	"id" : 'station_' + name,
	"name" : name,
	"position" : pos,
	"label" : {
	    text : name,
	    font : '16px Arial',
	    eyeOffset : new Cesium.Cartesian3(0.0, 10.0, 0.0),
            heightReference : Cesium.HeightReference.CLAMP_TO_GROUND,
	    fillColor : Cesium.Color.YELLOW,
	    outlineColor : Cesium.Color.WHITE,
	    outlineWidth : 2,
	    style : Cesium.LabelStyle.FILL_AND_OUTLINE
	},
	"polyline" : {
	    positions: Cesium.Cartesian3.fromDegreesArrayHeights([
		parseFloat(lng),
		parseFloat(lat),
		100,
		parseFloat(lng),
		parseFloat(lat),
		0
	    ]),
	    width: 2,
	    material: new Cesium.PolylineDashMaterialProperty({
		color: Cesium.Color.YELLOW
	    })
	}
    });
}	
//var GH_POLYLINE_PROP = {
//    color : [ '#800000', '#ff0000', '#800080', '#ff00ff','#008000', '#00ff00', '#808000', '#ffff00','#000080', '#0000ff', '#008080', '#00ffff' ],
//    size : ( GH_MARKER_SIZE['medium'] / 4 ) |0,
//    width : 6,
//    opacity : 0.7
//}

function ghCreateLeafletPolyline(xml) {
    var ep = $(xml).find('encodedpolyline')[0].attributes.geomid;
    var k = 0;
    $(xml).find('encodedpath').each(function(k){
        var id = 'encodedpolyline_' + ep.value + "_" + k;
        var p = L.Polyline.fromEncoded( $(this).text() , {
            pane: 'encodedpolyline',
            color: GH_POLYLINE_PROP.color,
            opacity: GH_POLYLINE_PROP.opacity,
            weight: GH_POLYLINE_PROP.size
        });
        p.addTo(GH_M);
        GH_LAYER.polyline[id] = p ;
	////////////////////////////////////////////////////////////////////////////////////
	ghCreateCesiumGroundPolyline(p,$(this)[0].attributes);  // if test, remove here
	////////////////////////////////////////////////////////////////////////////////////
        k ++;
    });

}
function ghCreateCesiumStationPolygonFinished (datasource) {
    //Get the array of entities
    var ent = datasource.entities.values;
    for (var j = 0; j < ent.length; j++) {
        var entity = ent[j];
        entity.polygon.material = Cesium.Color.GREY;
        entity.polygon.outline = false;
        entity.polygon.extrudedHeight = 1;
        entity.polygon.heightReference = Cesium.HeightReference.CLAMP_TO_GROUND;
    }
    GH_V.dataSources.add(datasource);
    if ( GH_DEBUG_CONSOLE ) console.log( datasource );
    
}
function ghCreateStationMarkers(id) {
    if ( ! GH_LINES[id].markers ) return;
    let markers = GH_LINES[id].markers;
    for ( let i=0,ilen=markers.length; i < ilen; i=i+3 ) {
	if ( GH_LAYER.station[markers[i]] ) {
	    //  Already Exists
	} else {
	    ghCreateLeafletStationMarker(markers[i],markers[i+1],markers[i+2]);
	    ghCreateCesiumStationLabel(markers[i],markers[i+1],markers[i+2]);
	}
    }
}

function ghLoadCacheGltfComponent(file) {
    // https://qiita.com/yuma84/items/fefb95c1a10396070cd2
    let uri = ghGetResourceUri(file);
    $.ajax({
	url: uri,
	type: "GET",
	dataType: 'binary',
	responseType:'blob',
	processData: false
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "GLTF Component Cannot load " + uri + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	//alert(GH_ERROR_MSG['gltfdatacannotload']);
    });
}
////////////////////////////////////////////
//
//   Load Locomotive data
//
function ghLoadLocomotiveData(key) {
    let uri = '';
    if ( key == 'default' ) {
	uri = ghGetResourceUri(GH_FIELD.locomotive);
    } else {
	uri = ghGetResourceUri(key);
    }
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	let mlen = data.model.length;
	for ( let i=0; i < mlen; i++ ) {
	    ghLoadCacheGltfComponent(data.model[i]);
	}
	let len = 0;
	let ilen = data.interval.length;
	for ( let i=0; i < ilen; i++ ) {
	    len += data.interval[i];
	}
	let range = 2 * GH_UNIT_TARGET_DISTANCE ;
	let margin = ( range - len ) / 2.0;
	let offset = range - margin;
	let pos = [];
	pos.push(offset + 10); // pos[0]  ( unit-1 target )
	pos.push(offset); // pos[1]  Unit-1 position center
	len = 0;
	for ( let i=0; i < ilen; i++ ) {
	    len += data.interval[i];
	    pos.push(offset - len); // pos[n]  Unit-n position center
	}
//	GH_LOCOMOTIVE[key] = {
//	    'data' : data,
//	    'nums' : ilen,
//	    'length' : Math.ceil(len)
//	}
	GH_LOCOMOTIVE[key] = {
	    'data' : data,
	    'nums' : mlen,
	    'position' : pos
	}
	if ( GH_DEBUG_CONSOLE ) console.log( GH_LOCOMOTIVE[key] );
	//GH_FIELD.gltf = data;
	//for ( var i=0,len=GH_FIELD.units.length; i < len; i++ ) {
	//    ghGetFieldGltfComponent(i,GH_FIELD.units[i]);
	//}
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Default GLTF Component Cannot load " + uri + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['gltfdatacannotload']);
    });

}

////////////////////////////////////////////
//
//   Load Line Polyline data (leaflet)
//
function ghLoadLinePolyline(id) {

    if ( ! GH_LINES[id].way ) return;
    
    var ways = GH_LINES[id].way;
    for ( var k=0,klen=ways.length; k < klen; k++ ) {
        let poly = ways[k].polyline;
        for ( var i=0,ilen=poly.length; i < ilen; i++ ) {
            var uri = ghGetResourceUri(GH_LINES[id].baseuri + poly[i]);
            $.ajax({
                dataType: "xml",
                url: uri
            }).done(function(xml) {
                ghCreateLeafletPolyline(xml);
		if ( GH_DEBUG_CONSOLE ) console.log( xml );
            }).fail(function(XMLHttpRequest, textStatus,errorThrown){
                var msg = "Polyline data Cannot load " + uri + "  ";
                msg += " XMLHttpRequest " + XMLHttpRequest.status ;
                msg += " textStatus " + textStatus ;
                console.log( msg );
		alert(GH_ERROR_MSG['polylinedatacannotload']);
            });
        }
    }

}
////////////////////////////////////////////
//
//   Load Line Polygon (station) data (Cesium)
//
function ghLoadLinePolygon(id) {
    if ( ! GH_LINES[id].way ) return;
    var ways = GH_LINES[id].way;
    for ( var k=0,klen=ways.length; k < klen; k++ ) {
	if ( ways[k].station3d ) {
	    var uri = ghGetResourceUri(GH_LINES[id].baseuri + ways[k].station3d );
	    Cesium.GeoJsonDataSource.load(uri).then( ghCreateCesiumStationPolygonFinished ) ;
	} else {
	    // NOP
	}
    }
}


////////////////////////////////////////////
//
//   Load Line JSON data
//
function ghLoadLineData(file) {

    var uri = ghGetResourceUri(file);
    if ( GH_DEBUG_CONSOLE ) console.log(uri);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_LINES[data.id] = data;
	ghLoadLinePolyline(data.id);
	ghLoadLinePolygon(data.id);
	ghCreateStationMarkers(data.id);
	ghAppendTimetableList(data.id);
	if ( GH_DEBUG_CONSOLE ) console.log( GH_LINES[data.id] );
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field Component Cannot load  " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fieldcomponentcannotload']);
    });
}
////////////////////////////////////////////
//
//   Load Field JSON data
//
function ghLoadFieldData(uri) {
    ghShowLoader(true);
//    ghOnclick2DdialogButton(11); // Open 2D map if closed
//    GH_FIELD_PROP.isok = false;

    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD = data;
	ghSendCommandUnitWorker('field',GH_FIELD);
	ghInitTimetableList();

	for(var key in GH_FIELD.lines){
            ghLoadLineData(GH_FIELD.lines[key]);
	}
	if ( GH_FIELD.locomotive ) {
	    ghLoadLocomotiveData('default');
	}
	ghSetTimezoneOffset(GH_FIELD.timezone);
	
	if ( GH_DEBUG_CONSOLE ) console.log( GH_FIELD );
	ghShowLoader(false);
	if ( GH_LOCAL_CONSOLE ) {
	    // NOP
	} else {
	    ghCheckData(GH_FIELD.id,GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc].name);
	}

    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "train data cannot load ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['traindatacannotload']);

	ghShowLoader(false);
    });

}
////////////////////////////////////////////
//
//   Load Field INDEX JSON data
//
function ghLoadFieldIndex() {

    $.ajax({
	method: "GET",
	url: GH_FIELDINDEX.file,
	dataType: 'json'
    }).done(function(res){
	//
	GH_FIELDINDEX.data = res;
	GH_FIELDINDEX.args = ghGetCurrentArgument();
	
	if ( GH_LOCAL_CONSOLE ) {
	    GH_FIELDINDEX.urilist = GH_FIELDINDEX.data.urilist_local;
	} else {
	    GH_FIELDINDEX.urilist = GH_FIELDINDEX.data.urilist_www;
	}

	ghSendCommandUnitWorker('fieldindex',GH_FIELDINDEX);
	if ( GH_DEBUG_CONSOLE ) console.log( GH_FIELDINDEX );
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field index data cannot load ";
	msg += " Load Errpr XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fielddatacannotload']);
    });

}

/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//

//function ghBroadcastUpdateTime() {
//    var t = $('#gh_currenttime').html();
//    var tt = t.split(":");
//    var str = tt[0] + ":" + tt[1];
//    var sp = 1;
//    if ( GH_V != null ) {
//	sp = GH_V.clock.multiplier;
//    }
//    var data = { time : str , speed : sp };
//    ghBroadcastSendTime(data);
//};

function ghBroadcastPrimaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION') {
	var initdata = { 
            "yourid": null,
	    "type" : GH_FIELDINDEX.data.type,
	    "version" : GH_FIELDINDEX.data.version,
	    "urilist" : GH_FIELDINDEX.urilist,
	    "args" : GH_FIELDINDEX.args,
	    "lineid" : $("input[name='timetableline']:checked").val(),
	    "name" : GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc].name,
	    "file" : GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc].file
	}; 
	ghBroadcastSendUniqueID(initdata);
    } else if (data.type == 'GETUNITS') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    if ( data.value.lineid == GH_FIELD_PROP.timetable.lineid ) {
		var data = { "marker" : GH_FIELD.marker ,
			     "locomotive" : GH_FIELD.locomotive,
			     "units" : GH_FIELD.units }; 
		ghBroadcastSendUnits(oid,data);
	    } else {
		var t = "Receive ID " + data.value.lineid + " modal ID " + GH_FIELD_PROP.timetable.lineid;
		console.log(t);
	    }
	}
    } else if (data.type == 'CLOSE') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
	    ghBroadcastRemoveID(oid);
	} else {
	    // NOP
	}
    } else if (data.type == 'UPDATEUNITS') {
	var oid = data.sender;
	if ( ghBroadcastCheckSender(oid) ) {
            $('#gh_update_timetable_line').html(data.value.name);
	    GH_UPDATE_UNIT = data.value.units;
	    $( '#gh_update_timetable_lineid' ).val(data.value.lineid);
            //$( '#gh_update_timetable_way' ).val(data.value.way);
	    $('#gh_updatemodal').modal('open');
            
            // Update OK -> call for ghUpdateTimetableModal();
	} else {
	    // NOP
	}
    }
}

function ghCheckBroadcastAPI() {
    if(window.BroadcastChannel){
	ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveMessage);
    } else {
	//  Hide timetable Button
	$("#ghtimetablebtn").hide();
	//console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
	console.log("Broadcast Channel Not Supported. ");
	//alert(GH_ERROR_MSG['broadcastnotsupport']);
    }
}

//
//  Broadcast Channel Function
//
/////////////////////////////


/////////////////////////////
//
//  Html Arguments
//

function ghSetGooglePhotorealistic3D(flag) {
    if ( flag ) {
	GH_3DTILE.mode = GH_3DTILE_PHOTOREALISTIC_GOOGLE;
	GH_S.setTerrain( GH_TPV[0] );
	Cesium.GoogleMaps.defaultApiKey = "___GOOGLE_TOKEN___";
	__setupPhotorealisticGoogle3D();
	console.log('use Google Photorealistic 3D tile');

	GH_S.globe.show = false;
    
	$('#vectortile3dradiobox').hide(); // need not for this mode
	$('#tilecachesizeslider').val(2000);  //  Up size cache
	ghSetCesiumCacheSize(2000);
    } else {
	GH_3DTILE.mode = GH_3DTILE_NONE;
	GH_V.baseLayer = Cesium.ImageryLayer.fromProviderAsync(
	    Cesium.ArcGisMapServerImageryProvider.fromBasemapType(
		Cesium.ArcGisBaseMapType.SATELLITE
	    )
	);
	GH_S.setTerrain( GH_TPV[0] );
	GH_S.globe.show = true;
    }

}
function ghSetBumpAngle(val) {
    //
    //  default = GH_UNIT_HEIGHT_SIN = Math.sin( 4 * Math.PI / 180 ) ; //  4 deg
    //
    if ( val > 0 && val < 40 ) {
	GH_UNIT_HEIGHT_SIN = Math.sin( val * Math.PI / 180 ) ;
	console.log('use Bump Angle ' + val + ' degree');
    } else {
	console.log('wrong Bump Angle ' + val );
    }
}

function ghSetMultiplierUnitScale(val) {
    //
    //  default = GH_CLOCK_UNIT_SCALE = 1.0;
    //
    if ( isNaN(val) ) {
	console.log('Wrong Multiplier unit scale ' + val );
    } else {
	GH_CLOCK_UNIT_SCALE = Math.abs(val);
	console.log('Cesium Clock Multiplier unit scale ' + GH_CLOCK_UNIT_SCALE + ' times');
    }
}
function ghSetBaseArgument() {
    if ( GH_FIELDINDEX.data == null ) {
	//$('#ghstartmodal').modal('open');
	setTimeout( ghSetBaseArgument, 1234 );
	return;
    }

    if ( GH_FIELDINDEX.args == null ) {
	$('#ghstartmodal').modal('open');
    } else {
	// for test ghGetFieldCustomData(fd);
	    
	//ghClearCesiumData();
	//ghClearLeafletData();
	//ghClearFieldData();

	//  tc = train code
	//
	//  cf = configure data
	//
	//  gt = Google 3D tile ( photorealistic 3D tile )
	//       default false
	//  bp = Bump Angle
	//       default 7 ( deg )
	//
	//  us = Cesium Clock Multiplier 
	//       default 1.0
	//
	//  tm = use Stop timer
	//


	if ( GH_FIELDINDEX.args.gt ) {
	    ///////////////////////////////////////////////
	    ///  Only Localhost 
	    if ( GH_LOCAL_CONSOLE ) {
		ghSetGooglePhotorealistic3D(true);
	    } else {
		ghSetGooglePhotorealistic3D(false);
	    }
	} else {
	    ghSetGooglePhotorealistic3D(false);
	}

	if ( GH_FIELDINDEX.args.bp ) {
	    ghSetBumpAngle(GH_FIELDINDEX.args.bp);
	}


	if ( GH_FIELDINDEX.args.us ) {
	    ghSetMultiplierUnitScale(GH_FIELDINDEX.args.us);
	}

	if ( GH_FIELDINDEX.args.tm ) {
	    $("#ghstoptimerinput").show();
	} else {
	    $("#ghstoptimerinput").hide();
	}

	if ( GH_FIELDINDEX.args.cf ) {

	    let uri = GH_CONFIGFILE_URI + GH_FIELDINDEX.args.cf + ".json";
	    $.ajax({
		dataType: "json",
		url: uri
	    }).done(function(data) {
		GH_CONFIGFILE_JSON = data;
		if ( GH_CONFIGFILE_JSON.argument ) {
		    GH_FIELDINDEX.args = GH_CONFIGFILE_JSON.argument;
		    ghSetBaseArgument();
		}
	    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
		var msg = "configure data cannot load ";
		msg += " XMLHttpRequest " + XMLHttpRequest.status ;
		msg += " textStatus " + textStatus ;
		console.log( msg );
	    });

	} else {
	    if ( GH_FIELDINDEX.args.tc ) {
		if ( GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc] ) {
		    if ( GH_3DTILE.mode == GH_3DTILE_PHOTOREALISTIC_GOOGLE ) {
			//Delay for google 
			setTimeout( ghLoadFieldData, 495, ghGetResourceUri(GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc].file) );
		    } else {
			ghLoadFieldData(
			    ghGetResourceUri(GH_FIELDINDEX.data.fieldlist[GH_FIELDINDEX.args.tc].file)
			);
		    }
		} else {
		    console.log('Wrong code parameter ' + GH_FIELDINDEX.args.tc);
		    $('#ghstartmodal').modal('open');
		}
	    } else {
		$('#ghstartmodal').modal('open');
	    }
	}
    }
}


$(document).ready(function(){

    // Your access token can be found at: https://cesium.com/ion/tokens.
    Cesium.Ion.defaultAccessToken = '___CESIUM_TOKEN___';

//    if(typeof jQuery == "undefined"){ //jQuery
//        console('Cannot load jQuery.. ');
//	alert(GH_ERROR_MSG['jquerylibrarynotsupport']);
//	location.href = 'index.html';
//    }
//    if(typeof L == "undefined"){ //leaflet
//        console('Cannot load leaflet.. ');
//	alert(GH_ERROR_MSG['leafletlibrarynotsupport']);
//	location.href = 'index.html';
//    }

    ghInitUnitWorker();
    ghSendCommandUnitWorker('initialize',0);


    //
    ghLoadFieldIndex();

    //
    ghInitDialog();

    // init leaflet container
    ghInitLeafletMap();
    
    // order important , after init leaflet ( depends on )
    ghInitInputForm();

    // init cesium container
    ghInitCesiumViewer('ghCesiumContainer');

    //
    ghInitSpeedoMeter();

    //  show 'play'
    ghChangePlayPauseButton(false);

    //  default hide
    // load save button ( test )
//    $("#gh_uploadconfigdata_content").hide();
//    $("#gh_downloadconfigdata_content").hide();
//    $("#gh_saveconfigdata_content").hide();    

    // Bottom status bar position
    $(window).resize(ghResizeWindow);
    ghResizeWindow();

    //ghAvoidOperation();
    ghCheckBroadcastAPI();

    // Setup base argument
    ghSetBaseArgument();


    // Show Revisions
    ghShowRevisionConsole();    
});

function __sampleHeightsPhotorealisticGoogle3D(cartographic) {
    if ( isNaN(cartographic.longitude) || isNaN(cartographic.latitude)  ) {
	console.log("__sampleHeightsPhotorealisticGoogle3D NaN");
	return -100;
    } else {
	let height = GH_S.sampleHeight(cartographic);
	return height;
    }
}
async function __sampleHeightsPhotorealisticGoogle3Dasync(cartographic) {
  const cartesians = new Array(1);
  cartesians[0] = Cesium.Cartographic.toCartesian(cartographic);
  const clampedCartesians = await GH_S.clampToHeightMostDetailed(
    cartesians
  );
  let pos = GH_S.globe.ellipsoid.cartesianToCartographic(clampedCartesians[0]);
  return pos.height;
}

async function __setupPhotorealisticGoogle3D() {
    //  google Mpa Tiles API
    // https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/
    // https://developers.google.com/maps/documentation/embed/get-api-key?hl=ja
    
    try {
	GH_3DTILE.primitive = await Cesium.createGooglePhotorealistic3DTileset();
	//  Google API
	// The globe does not need to be displayed,
	// since the Photorealistic 3D Tiles include terrain
	
	GH_V.scene.primitives.add(GH_3DTILE.primitive);
	console.log(`Google OK Tileset `);
	//alert(`Google Tileset is OK`);
    } catch (error) {
	console.log(`Google Failed to load tileset: ${error}`);
    }
}

function ghShowRevisionConsole() {
    console.log( " Cesium " + Cesium.VERSION + " jQuery " + jQuery.fn.jquery + " leaflet " + L.version );
}



