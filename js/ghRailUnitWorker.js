//
//
// ghRailUnitWorker
//
//   Create CZML data from Unit data
//
//  parseInt(x,10) => x|0;
//  
//  IN
//   lng longitude (degree) => tileX
//   lat latitude  (degree) => tileY
//     CZML Guide
//
//  https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/CZML-Guide
//
//
//  https://github.com/AnalyticalGraphicsInc/czml-writer/wiki/Packet
//
//
//
'use strict';

//it looks like the ugly hack.
// global is undefined error
// https://github.com/aspnet/AspNetCore/issues/6979
// for importScripts('../cesium/Cesium.js');
//
//const window = self.window = self;
window = self.window = self;

// simple passthrough of current href to CESIUM_BASE_URL
//importScripts('turf3DtileWorker.min.js');
importScripts('turfRail.min.js');
importScripts('../../cesium/Cesium.js');

const GH_DEBUG_CONSOLE = false;

const ACCL_RATIO = [ 0.11, 0.21 ];
//////ACCL_RATIO[0] = 0.06 ; //  0.01 < ratio < 0.4
//////ACCL_RATIO[1] = 0.11 ; //  0.1 < ratio < 0.4
//ACCL_RATIO[0] = 0.11 ; //  0.01 < ratio < 0.4
//ACCL_RATIO[1] = 0.19 ; //  0.1 < ratio < 0.4
const STOP_TIME = 30 ; // [sec] 
const GH_TYPE_ARRIVAL = 2;
const GH_TYPE_DEPATURE = 4;
const GH_TYPE_THROUGH = 7;

//////////////////////////////////////
//////////////////////////////////////
//////////////////////////////////////
var GH_FIELD = null;
var GH_FIELDINDEX = null;
var GH_LOCOMOTIVE = {};
var GH_LINES = {};
var GH_UNIT_GEOM = {};
function ghGetResourceUri(file) {
    if ( GH_FIELDINDEX.data ) {
	//var urilist = GH_FIELDINDEX.data.urilist;
	let urilist = GH_FIELDINDEX.urilist;
	var idx = Math.floor(Math.random() * urilist.length);
	return urilist[idx] + file;
    } else {
	return file;
    }
}
const GH_UNIT_GEOM_DISTANCE = 210; // unit [m] for extend train length target
const GH_UNIT_TARGET_DISTANCE = 200; // unit [m] for extend train length target

var GH_TZ_OFFSET_MINUTES = 0; // minutes

var GH_MARQUEE_PREVIOUS_CARTESIAN = null;
const GH_MARQUEE_UPDATE_DISTANCE = 500; // [m]

var CZML = [];

const GH_BASE_CLOCK = new Date().toString();
///////////////////////////////////////
function ghSetTimezoneOffset(timestr) {
    let str = timestr.split(":");
    let h = parseFloat(str[0]);
    let m = parseFloat(str[1]);
    GH_TZ_OFFSET_MINUTES = 60 * h + m;
}

function __ghSimulateTwoPoints(x,t,d,v) {
    //   x = distance from startpoint
    //   t = time interval between start point  and end point
    //   d = distance between start point  and end point
    //   v = velocity at start point

    if ( t < 1.0 ) {
        var msg = "Wrong data x=" + x + " t=" + t + " d=" + d + " v=" + v;
        console.log(msg);
	return 0.0;
    }
    var alpha = 2 * ( d - v * t ) / ( t * t );
    var ret = 0;
    var param = 0;
    if ( Math.abs(alpha) < 0.001 && v != 0 ) {
        // nearly constat velocity   
        ret = x / v ;
    } else {
        param = v * v + 2 * alpha * x;
        if ( param < 0 ) param = 0;
        ret = ( -1 * v + Math.sqrt( param ) ) / alpha;
        if ( ret < 0 ) ret = 0;
    }
    
    return ret;
}
function __ghSimulateTwoPointsOLD(x,t,d,v) {
    //   x = distance from startpoint
    //   t = time interval between start point  and end point
    //   d = distance between start point  and end point
    //   v = velocity at start point

    var alpha = 2 * ( d - v * t ) / ( t * t );
    var ret = 0;
    var param = 0;
    if ( Math.abs(alpha) < 0.001 && v != 0 ) {
        // nearly constat velocity   
        ret = x / v ;
    } else {
        param = v * v + 2 * alpha * x;
        if ( param < 0 ) param = 0;
        ret = ( -1 * v + Math.sqrt( param ) ) / alpha;
        if ( ret < 0 ) ret = 0;
    }
    
    if ( isFinite(ret) ) {
        // NOP
    } else {
        ret = 0.0;
        var msg = " ret=" + ret + " x=" + x + " t=" + t + " d=" + d + " v=" + v + " alpha=" + alpha;
        console.log(msg);
    }
    return ret;
}
function ghSimulateStationToStation(startidx,stopidx,distance,sec,startsec,geometry) {

    let ret = [];
    
    var x = 0;
    var y = 0;
    var vel = distance / ( ( 1 - ACCL_RATIO[0] ) * sec );
    var xbound = [];
    xbound[0] = ( ACCL_RATIO[0] * distance ) / ( 2 * ( 1 - ACCL_RATIO[0] ) );
    xbound[1] = ( ( 2 - 3 * ACCL_RATIO[0] ) * distance ) / ( 2 * ( 1 - ACCL_RATIO[0] ) );
    var ybound = [];
    ybound[0] = ACCL_RATIO[0] * sec;
    ybound[1] = ( 1 - ACCL_RATIO[0] ) * sec;

    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * geometry[ j ][1].toFixed(9) ;
        var lat1 = 1.0 * geometry[ j ][0].toFixed(9) ;
        var alt1 = 1.0 * geometry[ j ][2].toFixed(3) ;
	x = geometry[ j ][5] - geometry[ startidx ][5];
        
        if ( x >= 0 && x < xbound[0] ) {
            // Accle
            y = __ghSimulateTwoPoints( x, ACCL_RATIO[0] * sec , xbound[0] , 0);
        } else if ( x >= xbound[0] && x <= xbound[1] ) {
            // Vel
            y = __ghSimulateTwoPoints( x - xbound[0], ( 1 - 2 * ACCL_RATIO[0] ) * sec , xbound[1] - xbound[0] , vel) + ybound[0];
        } else if ( x > xbound[1] && x <= distance ) {
            //  0.1 margin for error
            // De-Accel
            y = __ghSimulateTwoPoints( x - xbound[1], ACCL_RATIO[0] * sec , xbound[0] , vel)  + ybound[1];
        } else {
            // Wrong parameter   
            var msg = "StationToStation start " + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);

	ret.push(startsec + ysec);
	ret.push(lng1);
	ret.push(lat1);
	ret.push(alt1);
    }

    return ret;
};
function ghSimulateStationToPassing(startidx,stopidx,distance,sec,startsec,geometry) {

    let ret = [];
    
    var x = 0;
    var y = 0;
    var vel = 2 * distance / ( ( 2 - ACCL_RATIO[1] ) * sec );
    var xbound = [];
    xbound[0] = ( ACCL_RATIO[1] * distance ) / ( 2 - ACCL_RATIO[1] );

    var ybound = [];
    ybound[0] = ACCL_RATIO[1] * sec;

    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * geometry[ j ][1].toFixed(9) ;
        var lat1 = 1.0 * geometry[ j ][0].toFixed(9) ;
        var alt1 = 1.0 * geometry[ j ][2].toFixed(3) ;
	x = geometry[ j ][5] - geometry[ startidx ][5];
        
        if ( x >= 0 && x < xbound[0] ) {
            // Accle
            y = __ghSimulateTwoPoints( x, ACCL_RATIO[1] * sec , xbound[0] , 0);
        } else if ( x >= xbound[0] && x <= distance + 0.1 ) {
            // Vel
            y = __ghSimulateTwoPoints( x - xbound[0], ( 1 - ACCL_RATIO[1] ) * sec , distance - xbound[0] , vel) + ybound[0]; 
        } else {
            // Wrong parameter   
            var msg = "StationToPassing start " + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);
      
	ret.push(startsec + ysec);
	ret.push(lng1);
	ret.push(lat1);
	ret.push(alt1);
    }
    return ret;
};

function ghSimulatePassingToStation(startidx,stopidx,distance,sec,startsec,geometry) {

    let ret = [];
    
    var x = 0;
    var y = 0;
    var vel = 2 * distance / ( ( 2 - ACCL_RATIO[1] ) * sec );
    var xbound = [];
    xbound[0] = 2 * ( 1 - ACCL_RATIO[1] ) * distance / ( 2 - ACCL_RATIO[1] );
    var ybound = [];
    ybound[0] = ( 1 - ACCL_RATIO[1] ) * sec;

    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * geometry[ j ][1].toFixed(9) ;
        var lat1 = 1.0 * geometry[ j ][0].toFixed(9) ;
        var alt1 = 1.0 * geometry[ j ][2].toFixed(3) ;
	x = geometry[ j ][5] - geometry[ startidx ][5];
        
        if ( x >= 0 && x < xbound[0] ) {
            // Vel 
            y = __ghSimulateTwoPoints( x, ( 1 - ACCL_RATIO[1] ) * sec , xbound[0] , vel);
        } else if ( x >= xbound[0] && x <= distance + 0.1 ) {
            // De-Accel
            y = __ghSimulateTwoPoints( x - xbound[0], ACCL_RATIO[1] * sec , distance - xbound[0] , vel) + ybound[0]; 
        } else {
            // Wrong parameter   
            var msg = "PassingToStation start " + startidx + " stop " + stopidx + " distance " + distance + " sec " + sec + " total " + startsec + " x " + x + " j " + j;
            console.log(msg);
        }
        var ysec = 1.0 * y.toFixed(1);
     
	ret.push(startsec + ysec);
	ret.push(lng1);
	ret.push(lat1);
	ret.push(alt1);
    }
    return ret;
};

function ghSimulatePassingToPassing(startidx,stopidx,distance,sec,startsec,geometry) {

    let ret = [];
    
    var x = 0;
    var y = 0;
    var vel = distance / sec;

    for ( var j=startidx;j<stopidx; j++ ) {
        var lng1 = 1.0 * geometry[ j ][1].toFixed(9) ;
        var lat1 = 1.0 * geometry[ j ][0].toFixed(9) ;
        var alt1 = 1.0 * geometry[ j ][2].toFixed(3) ;
	x = geometry[ j ][5] - geometry[ startidx ][5];
        
        // Vel 
        y = __ghSimulateTwoPoints( x, sec , distance , vel);
        var ysec = 1.0 * y.toFixed(1);
      
	ret.push(startsec + ysec);
	ret.push(lng1);
	ret.push(lat1);
	ret.push(alt1);
    }
    return ret;
};
function __ghGetStationPoint(name,type,startid,geom) {
    let geomlength = geom.length;
    let flag = type;
    if ( flag == 'mark' ) {
	flag = 'm';
	//  mrked in function ghAdjustUnitGeometryArray(trainid,range);
    }
    for ( let i=startid; i < geomlength; i++ ) {
	if ( name == geom[i][3] && flag == geom[i][6] ) {
	    return {
		'index' : i,
		'name' : name,
		'lat' : geom[i][0],
		'lng': geom[i][1],
		'alt': geom[i][2],
		'type': geom[i][4],
		'distance' : geom[i][5]
	    }
	}
    }
    //console.log('Cannot search ' + name + " type " + type);
    return null;
}

//
//  https://codelikes.com/javascript-array-merge/
function __ghCreateTimePositionArray(trainid,timetable,type) {

    let positions = GH_UNIT_GEOM[trainid].positions;
    //  [ latitude, longitude , altitude, station name , station type, distance from start point , station position ]

    let pos = [];

    let dsec_c = 0;
    let timestart = null;

    let pointprev = null;
    let pointc = null;
    let timeprev = null;
    let timec = null;
    let turnpointc = null;
    
    timestart = __ghGetCesiumClock(timetable[0],GH_FIELD.timezone);
    timeprev = __ghGetCesiumClock(timetable[0],GH_FIELD.timezone);
    pointprev = __ghGetStationPoint(timetable[1],type,0,positions);

    for ( let i=3,ilen=timetable.length; i < ilen; i=i+3 ) {
	timec = __ghGetCesiumClock(timetable[i],GH_FIELD.timezone);
	dsec_c = Cesium.JulianDate.secondsDifference(timec,timestart);
	pointc = __ghGetStationPoint(timetable[i+1],type,pointprev.index,positions);
	if ( pointc == null ) {
	    console.log('NULL error');
	    console.log(trainid);
	    console.log(timetable);
	    console.log(positions);
	}
	if ( pointprev.name == pointc.name ) {
            // Dont Move
	    //console.log('ID ' + trainid + ' i ' + i + ' name ' + pointc.name + ' lng ' + pointprev.lng + ' ' + pointc.lng);
	    //pos.push(dsec_c);
	    //pos.push(1.0 * pointc.lng.toFixed(9));
	    //pos.push(1.0 * pointc.lat.toFixed(9));
	    //pos.push(1.0 * pointc.alt.toFixed(3));
	    turnpointc = __ghGetStationPoint(timetable[i+1], type + '_r_' ,pointprev.index,positions);
	    if ( turnpointc == null ) {
		// NOP
		pos.push(dsec_c);
		pos.push(1.0 * pointc.lng.toFixed(9));
		pos.push(1.0 * pointc.lat.toFixed(9));
		pos.push(1.0 * pointc.alt.toFixed(3));
	    } else {
		//console.log(dsec_c);
		//console.log(pointc);
		//console.log(turnpointc);
		pos.push(dsec_c-0.1);
		pos.push(1.0 * pointc.lng.toFixed(9));
		pos.push(1.0 * pointc.lat.toFixed(9));
		pos.push(1.0 * pointc.alt.toFixed(3));
		pos.push(dsec_c);
		pos.push(1.0 * turnpointc.lng.toFixed(9));
		pos.push(1.0 * turnpointc.lat.toFixed(9));
		pos.push(1.0 * turnpointc.alt.toFixed(3));
		pointc = turnpointc;
	    }
	} else {
	    //if ( timetable[i-1] < GH_TYPE_THROUGH && timetable[i+2] < GH_TYPE_THROUGH ) {  WRONG
	    if ( timetable[i-1] == GH_TYPE_DEPATURE && timetable[i+2] == GH_TYPE_ARRIVAL ) {
                //  station - station
                pos.push (
		    ...ghSimulateStationToStation(
			pointprev.index,
			pointc.index+1,
			pointc.distance - pointprev.distance,
			Cesium.JulianDate.secondsDifference(timec,timeprev),
			Cesium.JulianDate.secondsDifference(timeprev,timestart),
			positions )
		);
            //} else if ( timetable[i-1] < GH_TYPE_THROUGH && timetable[i+2] > GH_TYPE_DEPATURE ) { WRONG
            } else if ( timetable[i-1] == GH_TYPE_DEPATURE && timetable[i+2] == GH_TYPE_THROUGH ) {		
                //  station - through
		pos.push (
                    ...ghSimulateStationToPassing(
			pointprev.index,
			pointc.index+1,
			pointc.distance - pointprev.distance,
			Cesium.JulianDate.secondsDifference(timec,timeprev),
			Cesium.JulianDate.secondsDifference(timeprev,timestart),
			positions )
		);
            //} else if ( timetable[i-1] > GH_TYPE_DEPATURE && timetable[i+2] < GH_TYPE_THROUGH ) {  WRONG
	    } else if ( timetable[i-1] == GH_TYPE_THROUGH && timetable[i+2] == GH_TYPE_ARRIVAL ) {
                //  through - station
		pos.push (
                    ...ghSimulatePassingToStation(
			pointprev.index,
			pointc.index+1,
			pointc.distance - pointprev.distance,
			Cesium.JulianDate.secondsDifference(timec,timeprev),
			Cesium.JulianDate.secondsDifference(timeprev,timestart),
			positions )
		);
            // } else { ==============
	    } else if ( timetable[i-1] == GH_TYPE_THROUGH && timetable[i+2] == GH_TYPE_THROUGH ) {
                //  through - through
		pos.push (
                    ...ghSimulatePassingToPassing(
			pointprev.index,
			pointc.index+1,
			pointc.distance - pointprev.distance,
			Cesium.JulianDate.secondsDifference(timec,timeprev),
			Cesium.JulianDate.secondsDifference(timeprev,timestart),
			positions )
		);
            } else {
		// NOP Wrong status
		let msg = ' Wrong status ' + timetable[i-2] + ' ' + timetable[i-1] + ' -> ' + timetable[i+1] + ' ' + timetable[i+2] ;
		console.log(msg);
	    }
	}

	pointprev = pointc;
	timeprev = timec;
    }

    // Last Stop exist 
    pos.push(Cesium.JulianDate.secondsDifference(timeprev,timestart) + STOP_TIME);
    pos.push(1.0 * pointprev.lng.toFixed(9));
    pos.push(1.0 * pointprev.lat.toFixed(9));    
    pos.push(1.0 * pointprev.alt.toFixed(3));
    return pos;
}


function __ghGetCesiumClock(str,timezone) {
    // str = '0T06:33:21';
    //let cstr = '2010-01-0' + str + 'Z';
    //let cstr = '2010-01-0' + str + timezone;
    //return Cesium.JulianDate.fromIso8601(cstr, new Cesium.JulianDate());
    
    let t = str.split("T");
    let td = parseInt(t[0],10);
    let now = new Date(GH_BASE_CLOCK);
    if ( td > 0 ) {
	now.setDate(now.getDate() + td );
    }
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    if ( month < 10 ) {
	    month = "0" + month;
    }
    let ddd = now.getDate();
    if ( ddd < 10 ) {
	    ddd = "0" + ddd;
    }
    let datetime = year + "-" + month + "-" + ddd + "T" + t[1] + ".000" + timezone;
    return Cesium.JulianDate.fromIso8601(datetime, new Cesium.JulianDate());
}
function __ghCreateAvailabilityString(startstr,stopstr,timezone) {
    let ss = __ghGetCesiumClock(startstr,timezone);
    let ee = __ghGetCesiumClock(stopstr,timezone);
    return ss.toString() + "/" + ee.toString();
}


function ghCreateUnitCzml( key ) {
    //var uint8_array = new TextEncoder().encode( JSON.stringify(json) );
    //var array_buffer = uint8_array.buffer;
    //self.postMessage(array_buffer, [array_buffer]);

    CZML = [];

    var entityname = GH_FIELD.id + "_train_" + key;
    var title = {
	"name": entityname,
	"version": "1.4",
	"id": "document"
    };
    CZML.push(title);
    
    let timetable = GH_FIELD.units[ GH_UNIT_GEOM[key].fid ].timetable;

    // Box
    //   "availability": __ghCreateAvailabilityString(timetable[0],timetable[timetable.length-3],GH_FIELD.timezone),
    var obj_head = {
	"id": 'train_' + key + '_head',
	"availability": __ghCreateAvailabilityString("0T00:00:01","0T23:59:59",GH_FIELD.timezone),
	"box" : {
	    "dimensions" : {
		"cartesian" : [1.0, 1.0, 1.0],
	    },
	    "fill" : false,
	    "outline": true,
	    "outlineColor": {
		"rgba": [64, 64, 64, 64]
	    }
	},
	"position": {
	    "interpolationAlgorithm": "LAGRANGE",
	    "interpolationDegree": 1,
	    "cartographicDegrees": __ghCreateTimePositionArray(key,timetable,'head'),
	    "epoch": __ghGetCesiumClock(timetable[0],GH_FIELD.timezone).toString()
	},
	"orientation": {
	    "velocityReference": "#position"
	}
    };
    CZML.push(obj_head);

    // "availability": __ghCreateAvailabilityString(timetable[0],timetable[timetable.length-3],GH_FIELD.timezone),
    var obj_mark = {
	"id": 'train_' + key + '_mark',
	"availability": __ghCreateAvailabilityString("0T00:00:01","0T23:59:59",GH_FIELD.timezone),
	"box" : {
	    "dimensions" : {
		"cartesian" : [1.0, 1.0, 1.0],
	    },
	    "fill" : false,
	    "outline": true,
	    "outlineColor": {
		"rgba": [64, 64, 64, 64]
	    }
	},
	"position": {
	    "interpolationAlgorithm": "LAGRANGE",
	    "interpolationDegree": 1,
	    "cartographicDegrees": __ghCreateTimePositionArray(key,timetable,'mark'),
	    "epoch": __ghGetCesiumClock(timetable[0],GH_FIELD.timezone).toString()
	},
	"orientation": {
	    "velocityReference": "#position"
	}
    };
    
//    CZML.push(obj_mark);

    // "availability": __ghCreateAvailabilityString(timetable[0],timetable[timetable.length-3],GH_FIELD.timezone),
    var obj_tail = {
	"id": 'train_' + key + '_tail',
	"availability": __ghCreateAvailabilityString("0T00:00:01","0T23:59:59",GH_FIELD.timezone),
	"box" : {
	    "dimensions" : {
		"cartesian" : [1.0, 1.0, 1.0],
	    },
	    "fill" : false,
	    "outline": true,
	    "outlineColor": {
		"rgba": [64, 64, 64, 64]
	    }
	},
	"position": {
	    "interpolationAlgorithm": "LAGRANGE",
	    "interpolationDegree": 1,
	    "cartographicDegrees": __ghCreateTimePositionArray(key,timetable,'tail'),
	    "epoch": __ghGetCesiumClock(timetable[0],GH_FIELD.timezone).toString()
	},
	"orientation": {
	    "velocityReference": "#position"
	}
    };
    
    CZML.push(obj_tail);

    __AppendCesiumCZML(CZML,false);
}


function ghInitUnitGeom(fieldid, trainid, geomary, lineid, routename, lineway) {
    var geo = new XMLHttpRequest();
    var ret = [];
    for ( var i = 0,ilen=geomary.length; i<ilen; i++ ) {
	var file = GH_LINES[lineid].way[lineway].geometry[ geomary[i] ];
	if (typeof file === "undefined") {
	    // NOP
	    console.log( lineid );
	    console.log( lineway );
	    console.log( GH_LINES[ lineid ].way[lineway].geometry );
	    console.log( geomary[i] );
	} else {
	    var uri = ghGetResourceUri( GH_LINES[lineid].baseuri + file );
            geo.open('GET', uri , false);
	    geo.send();
	    if (geo.status == 200) {
		if (geo.response) {
		    var r = geo.responseText;
		    var a = r.split(/\n/);
		    //var startline = 1; Error
		    var startline = 0;		    

		    //  concat array 
		    for ( var j = startline,jlen=a.length; j<jlen; j++ ) {
        		if ( a[j] != "" ) {
			    ret.push ( a[j] );
			}
		    }
		}
	    } else {
    		var msg = "Unit geometry data load error " + geo.status + " " + uri;
		console.log( msg );
	    }
	}
    }

    if ( ret.length > 1 ) {
	GH_UNIT_GEOM[trainid] = {
	    'fid' : fieldid,
	    'path' : ret,
	    'route' : routename,
	    'line' : null,
	    'length' : 0,
	    'geometry' : [],
	    'lineprop' : [],
	    'positions' : [],
	}
    }

    
}
function __ghGetStationRangePointsTurn(trainid,station,startid,stopid,range) {

    let geom = GH_UNIT_GEOM[trainid].geometry;
    let geomlength = geom.length;

    let station_id = -1;
    let station_point =null;
    let idis = 0;

    //  Search Station Point
    for ( let i=startid; i < geomlength; i++ ) {
	if ( station == geom[i][4] ) {
	    station_id = i;
	    station_point = turf.helpers.point([geom[i][2], geom[i][1] ]);
	    break;
	}
    }
    if ( station_id < 0 ) {
	//console.log(' Cannot search station name ' + station);
	//console.log(geom);
	return null;
    };

    //console.log(' Turn check station name ' + station);

    //  Search Turn Station point ( from point distance )
    let turnmaxid = stopid+30;
    if ( turnmaxid > geomlength ) turnmaxid = stopid;
    
    let turn_id = -1;
    let turnlength = 10000;
    const turn_nearest_threshold = 10;

    for ( let i=stopid+1; i < turnmaxid; i++ ) {
	let tlinestring = turf.helpers.lineString([ [ geom[i-1][2], geom[i-1][1] ] , [ geom[i][2], geom[i][1] ] ],{ name : 'turnstation'+i } );
	let plength = turf.pointToLineDistance.default(station_point,tlinestring,{units: 'meters'});
	if ( plength < turnlength ) {
	    turn_id = i;
	    turnlength = plength;
	}
    }
    if ( turnlength < turn_nearest_threshold ) {
	let msg = " turning station "  + station + " ID   "  +  turn_id + " " + startid + " " + stopid +  " distance " + turnlength;
	console.log(msg);
    } else {
	// NO turning station
	return null;
    }
    
    //  Search Point Tail ID
    let point_tail_id = -1;
    let point_tail_distance = -1;
    let searchmax = turn_id-300;
    if ( searchmax < 0 ) searchmax = -1;
    let point0 = station_point;
    let distance = 0;
    for ( let i=turn_id-1; i > searchmax; i-- ) {
	let point1 = turf.helpers.point([geom[i][2], geom[i][1] ]);
	distance += turf.distance.default( point0, point1, {units: 'meters'});
	if ( distance > range * 1.1 ) {
	    point_tail_id = i;  // *1.1 is ad-hook
	    point_tail_distance = distance;
	    break;
	}
	point0 = point1;
    }
    if ( point_tail_id < 0 ) {
	console.log(geom);
	console.log(' Cannot search point_tail_id ' + station_id + ' ' + station);
	return null;
    };

    //  Search Point Head ID
    let point_head_id = -1;
    let point_head_distance = -1;
    searchmax = turn_id+300;
    if ( searchmax > geomlength ) searchmax = geomlength;
    point0 = station_point;
    distance = 0;
    for ( let i=turn_id; i < searchmax; i++ ) {
	let point1 = turf.helpers.point([geom[i][2], geom[i][1] ]);
	distance += turf.distance.default( point0, point1, {units: 'meters'});
	if ( distance > range * 2.0 ) {
	    point_head_id = i;  // *2.1 is ad-hook
	    point_head_distance = distance;
	    break;
	}
	point0 = point1;
    }
    if ( point_head_id < 0 ) {
	console.log(geom);
	console.log(' Cannot search point_head_id ' + station);
	return null;
    };

    //  Set Point Lat Lng
    let points = [];
    for ( let i=point_tail_id; i < point_head_id + 1; i++ ) {
	points.push( [  geom[i][2], geom[i][1] ] );
    }

    //console.log(points);
    let linestring = turf.helpers.lineString(points,{ name : station } );
    
    // Create LineString and sliced
    let sliced = turf.lineSliceAlong.default(
	linestring,
	point_tail_distance,
	point_tail_distance + 2 * range,
	{units: 'meters'}) ;

    //__AppendCesiumGeojson(sliced,false);
    
    let cp = turf.invariant.getCoords( sliced );
    // Leaflet, Turf -> Lon, Lat
    // Cesium -> Lat , Lon
    // [ Lat , Lon ]
    
    return {
	'tailid' : point_tail_id,
	'tailpoint' : [ cp[0][1], cp[0][0]  ],
	'stationid' : turn_id,
	'headid' : point_head_id+1,
	'headpoint' : [ cp[cp.length-1][1], cp[cp.length-1][0]  ]
    }

}
function __ghGetStationRangePoints(trainid,station,startid,range) {

    let geom = GH_UNIT_GEOM[trainid].geometry;
    let geomlength = geom.length;

    let station_id = -1;
    let station_distance = -1;
    let idis = 0;

    //  Search Station Point
    for ( let i=startid; i < geomlength; i++ ) {
	if ( station == geom[i][4] ) {
	    station_id = i;
	    station_distance = geom[i][6];
	    break;
	}
    }
    if ( station_id < 0 ) {
	console.log(' Cannot search station name ' + station);
	console.log(geom);
	return null;
    };

    //  Search Point Tail ID
    let point_tail_id = -1;
    let point_tail_distance = -1;
    let searchmax = station_id-300;
    if ( searchmax < 0 ) searchmax = -1;
    for ( let i=station_id-1; i > searchmax; i-- ) {
	idis = station_distance - geom[i][6] ;
	if ( idis > range ) {
	    point_tail_id = i;
	    point_tail_distance = Math.abs(idis-range);
	    break;
	}
    }
    if ( point_tail_id < 0 ) {
	console.log(geom);
	console.log(' Cannot search point_tail_id ' + station_id + ' ' + station);
	return null;
    };

    //  Search Point Head ID
    let point_head_id = -1;
    let point_head_distance = -1;
    searchmax = station_id+300;
    if ( searchmax > geomlength ) searchmax = geomlength;
    for ( let i=station_id+1; i < searchmax; i++ ) {
	idis = geom[i][6] - station_distance;
	if ( idis > range ) {
	    point_head_id = i;
	    point_head_distance = Math.abs(idis-range);
	    break;
	}
    }
    if ( point_head_id < 0 ) {
	console.log(geom);
	console.log(' Cannot search point_head_id ' + station);
	return null;
    };

    //  Set Point Lat Lng
    let points = [];
    for ( let i=point_tail_id; i < point_head_id + 1; i++ ) {
	points.push( [  geom[i][2], geom[i][1] ] );
    }

    // Create LineString and sliced
    let sliced = turf.lineSliceAlong.default(
	turf.helpers.lineString(points,{ name : station } ),
	point_tail_distance,
	point_tail_distance + 2 * range,
	{units: 'meters'}) ;

    //__AppendCesiumGeojson(sliced,false);
    
    let cp = turf.invariant.getCoords( sliced );
    // Leaflet, Turf -> Lon, Lat
    // Cesium -> Lat , Lon
    // [ Lat , Lon ]
    
    return {
	'tailid' : point_tail_id,
	'tailpoint' : [ cp[0][1], cp[0][0]  ],
	'stationid' : station_id,
	'headid' : point_head_id,
	'headpoint' : [ cp[cp.length-1][1], cp[cp.length-1][0]  ]
    }
}



function ghAdjustUnitGeometryArray(trainid,range) {

    let timetable = GH_FIELD.units[ GH_UNIT_GEOM[trainid].fid ].timetable;
    let geometry = GH_UNIT_GEOM[trainid].geometry;
    //  GH_UNIT_GEOM[trainid].geometry;
    //  [ pathidx , latitude , longitude, altitude, station name , station type, distance from start point , bearing for next point ]
    let geomlength = geometry.length;

    let d_geometry = [];
    //  [ latitude , longitude, altitude, station name , station type, distance from start point , station position ]

    let pointprev = null;
    let pointc = null;
    pointprev = __ghGetStationRangePoints(trainid,timetable[1],0,range);
    d_geometry.push(
	[ pointprev.tailpoint[0],pointprev.tailpoint[1],geometry[pointprev.tailid][3],geometry[pointprev.stationid][4],geometry[pointprev.stationid][5],0,'tail' ]
    );
    for ( let j=pointprev.tailid+1; j < pointprev.headid; j++ ) {
	d_geometry.push(
	    [ geometry[j][1],geometry[j][2],geometry[j][3],geometry[j][4],geometry[j][5],0,'m' ]
	);
    }
    d_geometry.push(
	[ pointprev.headpoint[0],pointprev.headpoint[1],geometry[pointprev.headid][3],geometry[pointprev.stationid][4],geometry[pointprev.stationid][5],0,'head' ]
    );
    for ( let i=3,ilen=timetable.length; i < ilen; i=i+3 ) {
	if ( timetable[i-2] == timetable[i+1] ) {
	    // NOP
	    // Same station 'Stop operation'
	    let turnpointc = __ghGetStationRangePointsTurn(trainid,timetable[i+1],pointprev.tailid,pointprev.headid,range);
	    if ( turnpointc == null ) {
		// NOP
	    } else {

		d_geometry.push(
		    [ turnpointc.tailpoint[0],turnpointc.tailpoint[1],geometry[turnpointc.tailid][3],geometry[pointprev.stationid][4],geometry[turnpointc.stationid][5],0,'tail_r_' ]
		);
		
		d_geometry.push(
		    [ turnpointc.headpoint[0],turnpointc.headpoint[1],geometry[turnpointc.headid][3],geometry[pointprev.stationid][4],geometry[turnpointc.stationid][5],0,'head_r_' ]
		);

		pointprev = turnpointc;
	    }
	}  else {
	    pointc = __ghGetStationRangePoints(trainid,timetable[i+1],pointprev.headid,range);

	    for ( let j=pointprev.headid; j < pointc.tailid+1; j++ ) {
		d_geometry.push(
		    [ geometry[j][1],geometry[j][2],geometry[j][3],geometry[j][4],geometry[j][5],0,'n' ]
		);
	    }

	    /////////////////////
	    d_geometry.push(
		[ pointc.tailpoint[0],pointc.tailpoint[1],geometry[pointc.tailid][3],geometry[pointc.stationid][4],geometry[pointc.stationid][5],0,'tail' ]
	    );
	    for ( let j=pointc.tailid+1; j < pointc.headid; j++ ) {
		d_geometry.push(
		    [ geometry[j][1],geometry[j][2],geometry[j][3],geometry[j][4],geometry[j][5],0,'m' ]
		);
	    }
	    d_geometry.push(
		[ pointc.headpoint[0],pointc.headpoint[1],geometry[pointc.headid][3],geometry[pointc.stationid][4],geometry[pointc.stationid][5],0,'head' ]
	    );
	    /////////////////////
	    
	    pointprev = pointc;
	}
    }

    //  Re-Calc Distance using Cesium library
    let length = 0;
    let p0 = new Cesium.Cartesian3.fromDegrees(d_geometry[0][1],d_geometry[0][0],d_geometry[0][2]);
    let p1 = new Cesium.Cartesian3.fromDegrees(d_geometry[0][1],d_geometry[0][0],d_geometry[0][2]);
    d_geometry[0][5] = length;
    for ( let i=1,ilen=d_geometry.length; i < ilen; i++ ) {
        p1 = new Cesium.Cartesian3.fromDegrees(d_geometry[i][1],d_geometry[i][0],d_geometry[i][2]);    
        length += Cesium.Cartesian3.distance(p0,p1);
	d_geometry[i][5] = length;
	p0 = p1;
    }
    return d_geometry;
}

function ghSetupUnitGeom() {

    let maxunits = Object.keys(GH_UNIT_GEOM).length ;
    let cnt = 1;
    __AckLoadingMessage(0,maxunits,false);
    
    for(var key in GH_UNIT_GEOM){
	ghCreateUnitLineString(key);
	ghCreateUnitLineProperty(key);
	__AppendUnitGeom({
	    'trainid' : key,
	    'fid' : GH_UNIT_GEOM[key].fid,
	    'route' : GH_UNIT_GEOM[key].route,
	    'line' : GH_UNIT_GEOM[key].line,
	    'length' : GH_UNIT_GEOM[key].length,
	    'lineprop' : GH_UNIT_GEOM[key].lineprop,
	    'loadstatus' : false
	},false );


	//  Add tail and head Check forrr
	GH_UNIT_GEOM[key].positions = ghAdjustUnitGeometryArray(key,GH_UNIT_TARGET_DISTANCE);
	//console.log(key);
	//console.log(GH_UNIT_GEOM[key].geometry);
	//console.log(GH_UNIT_GEOM[key].positions);
	
	
	// for debug test //
	//let testp = [];
	//for ( var k=0; k < GH_UNIT_GEOM[key].geometry_head.length; k++ ) {
	//    testp.push([ GH_UNIT_GEOM[key].geometry_head[k][1] , GH_UNIT_GEOM[key].geometry_head[k][0] ]);
	//}
	//let testlinestring = turf.helpers.lineString(testp,{ name : 'test-line' } );
	//__AppendCesiumGeojson(testlinestring,false );
	// for debug test //

	ghCreateUnitCzml(key);
	
	__AckLoadingMessage(cnt,maxunits,false);
	cnt++;
    }
}


function ghCreateUnitPath() {

    if ( ! GH_FIELD.units ) return;
    
    let units = GH_FIELD.units;
    let finished = true;
    for ( var i=0,ilen=units.length; i < ilen; i++ ) {
        var lineid = units[i].lineid; // 10ES
        var trainid = units[i].trainid; // 9761
	if ( GH_LINES[lineid] ) {
	    if ( GH_UNIT_GEOM[trainid] ) {
		// Already exists
	    } else {
		var geomary = units[i].geometry; // route index array [0,1,2,3,4]
		var routename = units[i].route; // routename soundboundA
		var lineway = parseInt(units[i].way,10); // 0 or 1
	        ghInitUnitGeom( i, trainid , geomary, lineid, routename , lineway );
	    }
	} else {
	    // Not yet loaded
	    finished = false;
	}
    }

    if ( finished ) {
	ghSetupUnitGeom();
    } else {
	console.log('Retry create unit path proc');
	setTimeout(ghCreateUnitPath,523);
    }
}


function __ghExtendNewPointsForStation(key,startid,direction) {

    let path = GH_UNIT_GEOM[key].path;
    let points = [];
    let pt = null;    
    let pathidx = 0;

    // Search Next Station
    if ( direction > 0 ) {
	for ( var i=startid,ilen=path.length; i < ilen; i++ ) {
	    if (path[i].indexOf('#') < 0 && path[i] != "" ) {
		pt = __ghParsePathStr(path[i]);
		points.push(pt);
		if ( pt.name != 'x' ) {
		    pathidx = i;
		    break;
		}
	    }
	}
    } else {
	for ( var i=startid; i > 0; i-- ) {
	    if (path[i].indexOf('#') < 0 && path[i] != "" ) {
		pt = __ghParsePathStr(path[i]);
		points.push(pt);
		if ( pt.name != 'x' ) {
		    pathidx = i;
		    break;
		}
	    }
	}
    }

    // Calc distance Next Station
    let length = 0;
    ilen = points.length;
    for ( var i=0; i < ilen -1; i++ ) {
	length += turf.distance.default( points[i].point, points[i+1].point, {units: 'meters'});
    }

    // Check and Create point when under GH_UNIT_GEOM_DISTANCE
    let angle = 0;
    if ( length <  GH_UNIT_GEOM_DISTANCE ) {
	length = GH_UNIT_GEOM_DISTANCE - length;
	let npt = null;
	if ( ilen == 1 ) {
	    // startpoint is Station point
	    if ( direction > 0 ) {
		npt = __ghParsePathStr(path[pathidx+2]);
	    } else {
		npt = __ghParsePathStr(path[pathidx-2]);
	    }
	    angle = turf.bearing.default(points[0].point,npt.point) ;
	} else {
	    angle = turf.bearing.default(points[0].point,points[1].point) ;
	}
	angle = angle + 180; // reverse angle
	if ( angle > 180 ) angle = angle - 360; //  -180 < angle < 180
	pt = turf.destination.default(points[0].point,length,angle,{units: 'meters'}) ;
	let ptc = turf.invariant.getCoord(pt);
	return {
	    'lat' : ptc[1],
	    'lng' : ptc[0],
	    'alt' : points[0].alt,
	    'name' : 'x',
	    'type' : 'new',
	    'point' : pt
	}
	//console.log(res);
	//return res;
    } else {
	return null;
    }

}
function __ghCalcObtuseAngle(angle01,angle12) {
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

function __ghParsePathStr(str) {
    let p = str.split(",");
    return {
	'lat' : parseFloat(p[0]),
	'lng' : parseFloat(p[1]),
	'alt' : parseFloat(p[2]),
	'name' : p[3],
	'type' : p[4],
	'point' : turf.helpers.point( [ parseFloat(p[1]), parseFloat(p[0]) ] )
    }

}
function ghCreateUnitLineString(key) {

    if ( ! GH_UNIT_GEOM[key] ) return;

    let path = GH_UNIT_GEOM[key].path;
    let points = [];
    let geometry = [];
    let angle01 = null;
    let angle12 = null;
    let angle = 0;
    let pt1 = null;
    let pt2 = null;
    
    //  extend first and last point for train length.
    // Extend sharp points for train length.
	
    let pt0 = __ghExtendNewPointsForStation(key,0,1);
    if ( pt0 == null ) {
	// NOP
    } else {
	//  Add new points
	points.push([ pt0.lng , pt0.lat ]);
	geometry.push( [-1, pt0.lat, pt0.lng, pt0.alt, pt0.name, pt0.type , 0 , 0 ]);
	//
	//  GH_UNIT_GEOM[trainid].geometry;
	//  [ pathidx , latitude , longitude, altitude, station name , station type, distance from start point , bearing for next point ]
	//
    }
    for ( var i=0,ilen=path.length; i < ilen; i++ ) {
	if (path[i].indexOf('#') < 0 && path[i] != "" ) {
	    pt0 = __ghParsePathStr(path[i]);
	    points.push([ pt0.lng , pt0.lat ]);
	    geometry.push( [i, pt0.lat, pt0.lng, pt0.alt, pt0.name, pt0.type , 0 , 0 ]);
	    
	    if ( i < ilen - 4 && i > 4 ) {
		
		pt1 = __ghParsePathStr(path[i-2]);
		pt2 = __ghParsePathStr(path[i+2]);
		
		angle01 = turf.bearing.default(pt1.point,pt0.point) ;
		angle12 = turf.bearing.default(pt0.point,pt2.point) ;

		angle = __ghCalcObtuseAngle(angle01,angle12);
		if ( angle < 90 || angle > 270.0 ) {
		    // NOP
		} else {
		    pt0 = __ghExtendNewPointsForStation(key,i,-1);
		    if ( pt0 == null ) {
			// NOP
		    } else {
			//  Add new points
			points.push([ pt0.lng , pt0.lat ]);
			geometry.push( [100000+i, pt0.lat, pt0.lng, pt0.alt, pt0.name, pt0.type, 0 , 0  ]);
		    }
		}
	    }
    	}
    }
    pt0 = __ghExtendNewPointsForStation(key,ilen-1,-1);
    if ( pt0 == null ) {
	// NOP
    } else {
	//  Add new points
	points.push([ pt0.lng , pt0.lat ]);
	geometry.push( [ilen+1, pt0.lat, pt0.lng, pt0.alt, pt0.name, pt0.type , 0, 0 ]);
    }
    
    GH_UNIT_GEOM[key].line = turf.helpers.lineString(points,{ name : GH_UNIT_GEOM[key].route } );
    GH_UNIT_GEOM[key].length = turf.length.default(GH_UNIT_GEOM[key].line,{units: 'meters'});
    GH_UNIT_GEOM[key].geometry = geometry;

    // for test
    //__AppendCesiumGeojson(GH_UNIT_GEOM[key].line ,false );
}

function __ghGetGeometryProperty(str) {
    if (typeof str === "undefined") return null;
    if ( str == "" ) return null;
    var obj = str.split(",");
    if ( obj[0] != "#P" ) return null;

    var prop = {
    	"bridge" : false,
    	"tunnel" : false,
    	"gauge" : -1,
    	"maxspeed" : -1,
    	"highspeed" : false,
    	"layer" : 0,
    	"embankment" : false
    }
    var param = obj[1].split(":");
    for ( var i=0,ilen=param.length; i < ilen; i++ ) {
    	if ( param[i].indexOf("bg") > -1 ) {
	        prop.bridge = true;
	    }
	    if ( param[i].indexOf("tn") > -1 ) {
    	    prop.tunnel = true;
    	}
    	if ( param[i].indexOf("gu") > -1 ) {
	        var dat = param[i].split("=");
	        prop.gauge = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("ms") > -1 ) {
    	    var dat = param[i].split("=");
	        prop.maxspeed = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("hs") > -1 ) {
    	    prop.highspeed = true;
    	}
    	if ( param[i].indexOf("ly") > -1 ) {
	        var dat = param[i].split("=");
	        prop.layer = parseInt(dat[1],10);
	    }
	    if ( param[i].indexOf("em") > -1 ) {
    	    prop.embankment = true;
    	}
    }
    return prop;
}

function ghCreateUnitLineProperty(key) {

    if ( ! GH_UNIT_GEOM[key] ) return;
    
    let path = GH_UNIT_GEOM[key].path;
    let pathlength = path.length;

    let geom = GH_UNIT_GEOM[key].geometry;
    let geomlength = geom.length;

    let points = [];
    let prop_p = null;
    let prop_n = null;
    let ent_pos = []; //'height = 0;
    let exit_pos = []; // height = 0;
    let linestring = null;
    let level = 0;

    let length = 0;
    let angle = 0;
    let prevp = turf.helpers.point( [ geom[0][2], geom[0][1] ] );
    let thisp = null;
    let nextp = null;
    
    for ( var i=0; i < geomlength -1; i++ ) {
	let pathidx = geom[i][0];
	thisp = turf.helpers.point( [ geom[i][2], geom[i][1] ] );
	nextp = turf.helpers.point( [ geom[i+1][2], geom[i+1][1] ] );

	//  Update geometry distance and bearing
	length += turf.distance.default( prevp, thisp, {units: 'meters'});
	angle = turf.bearing.default( thisp, nextp ) ;
	geom[i][6] = length;
	geom[i][7] = angle;
	
	if ( pathidx + 1 < pathlength ) {
	    prop_n = __ghGetGeometryProperty( path[pathidx+1] );
	} else {
	    prop_n = null;
	}
	if ( pathidx - 1 > 0 ) {
	    prop_p = __ghGetGeometryProperty( path[pathidx-1] );
	} else {
	    prop_p = null;
	}
	if ( prop_p == null || prop_n == null ) {
	    // NOP
	} else {
	    if ( ! prop_p.tunnel && prop_n.tunnel ) {
		// start Tunnel
		points.push([ geom[i][2] , geom[i][1] ]);
		// Lon Lat
		ent_pos = [ geom[i][2] , geom[i][1], geom[i][3] ];
	    } else if ( prop_p.tunnel && prop_n.tunnel ) {
		// in  Tunnel
		points.push([ geom[i][2] , geom[i][1] ]);
		if ( ent_pos.length < 1 ) {
		    ent_pos = [ geom[i][2] , geom[i][1], geom[i][3] ];
		}
	    } else if ( prop_p.tunnel && ! prop_n.tunnel ) {
		// end Tunnel
		points.push([ geom[i][2] , geom[i][1] ]);
		if ( points.length > 1 ) {
		    exit_pos = [ geom[i][2] , geom[i][1], geom[i][3] ];
		    linestring = turf.helpers.lineString(points,{ name : 'tunnel' } );
		    if ( prop_p.layer < 0 ) {
			level = prop_p.layer;
		    } else {
			level = -1;
		    }
		    if ( ent_pos.length < 1 ) {
			console.log(ent_pos);
			console.log(linestring);
		    }
		    if ( exit_pos.length < 1 ) {
			console.log(exit_pos);
			console.log(linestring);
		    }
		    GH_UNIT_GEOM[key].lineprop.push ( {
			'linestring' : linestring,
			'level' : level,
			'startpos' : ent_pos,
			'exitpos' : exit_pos,
			'length' : turf.length.default(linestring,{units:'meters'})
		    } );
		} else {
		    // NOP
		}
		points = [];
		ent_pos = [];		
	    } else if ( ! prop_p.bridge && prop_n.bridge ) {
		// start Bridge
		points.push([ geom[i][2] , geom[i][1] ]);
		ent_pos = [ geom[i][2] , geom[i][1], geom[i][3] ];
	    } else if ( prop_p.bridge && prop_n.bridge ) {
		// in Bridge
		points.push([ geom[i][2] , geom[i][1] ]);
		if ( ent_pos.length < 1 ) {
		    ent_pos = [ geom[i][2] , geom[i][1], geom[i][3] ];
		}
	    } else if ( prop_p.bridge && ! prop_n.bridge ) {
		// end Bridge
		points.push([ geom[i][2] , geom[i][1] ]);
		if ( points.length > 1 ) {
		    exit_pos =  [ geom[i][2] , geom[i][1], geom[i][3] ];
		    linestring = turf.helpers.lineString(points,{ name : 'bridge' } );
		    if ( prop_p.layer > 0 ) {
			level = prop_p.layer;
		    } else {
			level = 1;
		    }
		    GH_UNIT_GEOM[key].lineprop.push ( {
			'linestring' : linestring,
			'level' : level,
			'startpos' : ent_pos,
			'exitpos' : exit_pos,
			'length' : turf.length.default(linestring,{units:'meters'})
		    } );
		} else {
		    // NOP
		}
		points = [];
		ent_pos = [];
	    } else {
		// NOP
	    }
	}
	prevp = thisp;
    }

    //  Last point
    thisp = turf.helpers.point( [ geom[geomlength-1][2], geom[geomlength-1][1] ] );
    length += turf.distance.default( prevp, thisp, {units: 'meters'});
    geom[geomlength-1][6] = length;
    geom[geomlength-1][7] = geom[geomlength-2][7];
    
}


function ghUpdateMarqueeMessage(pickid,ctime,cartesian) {

    let trainid = pickid.split('_')[0];
    if ( ! GH_UNIT_GEOM[trainid] ) return;

    let timetable = GH_FIELD.units[ GH_UNIT_GEOM[trainid].fid ].timetable;
    let timetablelength = timetable.length;
    
    let timestart = __ghGetCesiumClock(timetable[0],GH_FIELD.timezone);
    let startstation = timetable[1];
    let stopstation = timetable[timetablelength-2];
    let nextstation = "";
    let nowstopping = false;
    let nextmin = 0;
    
    for ( let i=3; i < timetablelength; i=i+3 ) {
	let timec = __ghGetCesiumClock(timetable[i],GH_FIELD.timezone);
	let dsec_c = Cesium.JulianDate.secondsDifference(timec,ctime);
	if ( dsec_c > 0 ) {
	    nextstation = timetable[i+1];
	    if ( i-2 > 0 ) {
		if ( nextstation == timetable[i-2] ) {
		    nowstopping = true;
		}
	    }
	    nextmin = Math.floor(dsec_c/60);
	    //console.log('timetable check time' + timec.toString());
	    //console.log('current time' + ctime.toString());
	    //console.log(dsec_c);	    	    
	    //console.log(nextstation);
	    break;
	}
    }

    let dis = 0;
    if ( GH_MARQUEE_PREVIOUS_CARTESIAN == null ) {
	dis = GH_MARQUEE_UPDATE_DISTANCE + 100;
    } else {
        dis = Cesium.Cartesian3.distance(GH_MARQUEE_PREVIOUS_CARTESIAN,cartesian);
    }

    if ( dis > GH_MARQUEE_UPDATE_DISTANCE ) {
	let msg = "Train " + trainid + "   " + " Destination " + stopstation + ". ";
	if ( nowstopping ) {
	    msg += " Now stopping at " + nextstation + " leaving in " + nextmin + " min ";
	} else {
	    msg += " Next Stop is " + nextstation + " arrive in " + nextmin + " min.";
	}
	__UpdateMarqueeMessage(msg,false);
	GH_MARQUEE_PREVIOUS_CARTESIAN = cartesian;
    } else {
	let msg = "Train " + trainid + "   " + " Destination " + stopstation + ". ";
	if ( nowstopping ) {
	    msg += " Now stopping at " + nextstation + " leaving in " + nextmin + " min ";
	    __UpdateMarqueeMessage(msg,false);
	} else {
	    // NOP
	}
    }
}

///////////////////////////////////
//
//   Send to Parent
//
function __AppendSheetRows(id,ary,transfer) {
    if ( transfer ) {
	__SendMessageToParentTransfer('append','sheet','row', ary);
    } else {
	__SendMessageToParent('append','sheet','row', ary);
    }
}
function __AckInitialize(data,transfer) {
    __SendMessageToParent('initialize','parent','raw', data);
}
function __AppendCesiumGeojson(geojson,transfer) {
    if ( transfer ) {
	__SendMessageToParentTransfer('append','cesium','geojson', geojson);
    } else {
	__SendMessageToParent('append','cesium','geojson', geojson);
    }
}
function __AppendUnitGeom(data,transfer) {
    if ( transfer ) {
	__SendMessageToParentTransfer('append','unit','json', data);
    } else {
	__SendMessageToParent('append','unit','json', data);
    }
}
function __AppendCesiumCZML(data,transfer) {
    if ( transfer ) {
	__SendMessageToParentTransfer('append','cesium','czml', data);
    } else {
	__SendMessageToParent('append','cesium','czml', data);
    }
}
function __AckLoadingMessage(c,m,transfer) {
    let value = parseFloat(c/m) * 100;
    let str = "loading data " + value.toFixed(2) + "%";
    if ( c == m )  {
	__SendMessageToParent('message','loading',1, str);
    } else {
	__SendMessageToParent('message','loading',0, str);
    }
}
function __UpdateMarqueeMessage(msg,transfer) {
    __SendMessageToParent('message','marquee',1, msg);
}

////////////////////////////
//
//   low-level message
//
//
function __SendMessageToParent(cmd,target,type,data) {
    var ret = {
	'cmd': cmd,
	'tgt': target,
	'type': type,
        'result' : data
    };
    self.postMessage( ret );
}

function __SendMessageToParentTransfer(cmd,target,type,data) {
    var ret = {
	'cmd': cmd,
	'tgt': target,
	'type': type,
	'result' : data
    };
    var uint8_array = new TextEncoder().encode( JSON.stringify(ret) );
    var array_buffer = uint8_array.buffer;
    self.postMessage(array_buffer, [array_buffer]);
}

///////////////////////////////////////////////////////

function __ghLoadLocomotiveData(key) {
    let uri = '';
    if ( key == 'default' ) {
	uri = ghGetResourceUri(GH_FIELD.locomotive);
    } else {
	uri = ghGetResourceUri(key);
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.onreadystatechange = function() {
    	// readyState XMLHttpRequest の状態 4: リクエストが終了して準備が完了
    	// status httpステータス
    	if (xhr.readyState == 4 && xhr.status == 200) {
            if (xhr.response) {
                var json = JSON.parse(xhr.responseText);

		let len = 0;
		let ilen = json.size.length;
		for ( let i=0; i < ilen; i++ ) {
		    len += json.size[i];
		}
		GH_LOCOMOTIVE[key] = {
		    'data' : json,
		    'nums' : ilen,
		    'length' : Math.ceil(len)
		}
		if ( GH_DEBUG_CONSOLE ) console.log( key );
		if ( GH_DEBUG_CONSOLE ) console.log( GH_LOCOMOTIVE[key] );			
            }
        } else {
	        // NOP
	        //var msg = "Line data state " + xhr.status + " " + xhr.readyState + " " + file ;
    	    //console.log( msg );
    	}
    }
    xhr.send();
}

function __ghLoadLineData(file) {
    var uri = ghGetResourceUri(file);
    var xhr = new XMLHttpRequest();
    xhr.open('GET', uri , true);
    xhr.onreadystatechange = function() {
    	// readyState XMLHttpRequest の状態 4: リクエストが終了して準備が完了
    	// status httpステータス
    	if (xhr.readyState == 4 && xhr.status == 200) {
            if (xhr.response) {
                var json = JSON.parse(xhr.responseText);
        	GH_LINES[json.id] = json;
		if ( GH_DEBUG_CONSOLE ) console.log(GH_LINES[json.id]);
                //__ghWaitFieldLineLoaded( __ghLoadUnitData );
            }
        } else {
	        // NOP
	        //var msg = "Line data state " + xhr.status + " " + xhr.readyState + " " + file ;
    	    //console.log( msg );
    	}
    }
    xhr.send();
}

//////////////////////////////////////////////
// Main Loop
/////////////////////////////////////////////
self.addEventListener('message', function(e) {
    var data = e.data;
    var command = data.cmd;
    if ( command == 'initialize') {
	__AckInitialize('ackowledgement',false);
    } else if ( command == 'fieldindex') {
	GH_FIELDINDEX = data.value;
	if ( GH_DEBUG_CONSOLE ) console.log(GH_FIELDINDEX);
    } else if ( command == 'field') {
	GH_FIELD = data.value;
	for(var key in GH_FIELD.lines){
	    __ghLoadLineData(GH_FIELD.lines[key]);
	}
	//if ( GH_FIELD.locomotive ) {
	//    __ghLoadLocomotiveData('default');
	//}
	ghCreateUnitPath();

	ghSetTimezoneOffset(GH_FIELD.timezone);
	
	if ( GH_DEBUG_CONSOLE ) console.log(GH_FIELD);
    } else if ( command == "updatemarquee") {
	let t = Cesium.JulianDate.fromIso8601(data.value.ctime, new Cesium.JulianDate());
	ghUpdateMarqueeMessage( data.value.pickid, t, data.value.cartesian );
    } else if ( command == "remove") {	

    } else if ( command == "reset") {
	    TILE_HASH = {};
    } else {
        // NOP
    }
    e = null;
});


//self.postMessage( "Start-Thread" );
