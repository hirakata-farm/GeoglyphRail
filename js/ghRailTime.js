//
//
//   Geogplyph Rail Timetable 
//     Material design and time editor
//
//   rail4t.html
//     |- turfRail.min.js
//     |- ghRailBroadcast.js  ( Communicate for ghRail.js )
//     |- ghRailTime.js
//   
//   Require Cesium.js  for Cesium.Clock API
//   Require jSpreadsheet https://bossanova.uk/jexcel/v4/examples/tabs
//   Require graphology https://github.com/graphology/graphology  https://graphology.github.io/
//
//    //
//.jexcel .highlight-bottom {
//    border-bottom: 1px solid #000;
//}
//
//.jexcel > tbody > tr > td {
//    border-top: 1px solid #ccc;
//    border-left: 1px solid #ccc;
//    border-right: 1px solid transparent;
//    border-bottom: 1px solid transparent;
//    padding: 4px;
//    white-space: nowrap;
//    box-sizing: border-box;
//    line-height: 1em;
//}
//
var GH_REV = 'Revision 6.2';
const GH_DEBUG_CONSOLE = false;

var GH_FIELD = null;
var GH_LINES = {};
var GH_UNIT_GEOM = {};
//var GH_UNIT_DATA = {};
var GH_UNIT_DATA = [];
var GH_FIELDINDEX = null;

var GH_GRAPH = [];
GH_GRAPH[0] = new graphology.Graph({multi:false,allowSelfLoops:false,type:'directed'});
GH_GRAPH[1] = new graphology.Graph({multi:false,allowSelfLoops:false,type:'directed'});
//    console.log(graphologyLibrary); // for funcation name check

var GH_STATION_UNITS = {};  // Count number of start/stop units each station. 

var GH_TABLE = [];
var GH_TABLE_CURRENT_KEY = 2;
GH_TABLE[0] = {
    sheet : null,
    status : -1,
    rows : 0,
    cols : 0,
    data : []
}
GH_TABLE[1] = {
    sheet : null,
    status : -1,
    rows : 0,
    cols : 0,
    data : []
}
const GH_TABLE_PROP = {
    stationstep : 16,
    stationstring : "Station",
    stationwidth : 100
}
const GH_BLINK_PROP = {
    onstyle : '1px solid #f00',    
    offstyle : '1px solid transparent',
    interval : 1000
}

// Unit station data type
var GH_TYPE_ARRIVAL = 2;
var GH_TYPE_DEPATURE = 4;
var GH_TYPE_THROUGH = 7;

var COLNAME = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','AA','AB','AC','AD','AE','AF','AG','AH','AI','AJ','AK','AL','AM','AN','AO','AP','AQ','AR','AS','AT','AU','AV','AW','AX','AY','AZ','BA','BB','BC','BD','BE','BF','BG','BH','BI','BJ','BK','BL','BM','BN','BO','BP','BQ','BR','BS','BT','BU','BV','BW','BX','BY','BZ','CA','CB','CC','CD','CE','CF','CG','CH','CI','CJ','CK','CL','CM','CN','CO','CP','CQ','CR','CS','CT','CU','CV','CW','CX','CY','CZ','DA','DB','DC','DD','DE','DF','DG','DH','DI','DJ','DK','DL','DM','DN','DO','DP','DQ','DR','DS','DT','DU','DV','DW','DX','DY','DZ','EA','EB','EC','ED','EE','EF','EG','EH','EI','EJ','EK','EL','EM','EN','EO','EP','EQ','ER','ES','ET','EU','EV','EW','EX','EY','EZ','FA','FB','FC','FD','FE','FF','FG','FH','FI','FJ','FK','FL','FM','FN','FO','FP','FQ','FR','FS','FT','FU','FV','FW','FX','FY','FZ','GA','GB','GC','GD','GE','GF','GG','GH','GI','GJ','GK','GL','GM','GN','GO','GP','GQ','GR','GS','GT','GU','GV','GW','GX','GY','GZ'];


var GH_MSG_WS_NOT_VALID =  'Whitespace is not allowed !<BR>Not a valid  Train ID';
var GH_MSG_SAME_ID =  'Same ID already exist. !<BR>Please change other ID';
var GH_MSG_NOT_EDIT_COL =  'Can not edit this column !';
var GH_MSG_WRONG_TIME =  'Wrong time data !';
var GH_MSG_PREV_INCORRECT = 'The elapsed time from the previous stop is incorrect !';
var GH_MSG_NEXT_INCORRECT = 'The elapsed time from the next stop is incorrect !';
var GH_MSG_WRONG_COL = 'Select right column !';

function ghGetResourceUri(file) {
    if ( GH_FIELDINDEX.urilist ) {
	var urilist = GH_FIELDINDEX.urilist;
	var idx = Math.floor(Math.random() * urilist.length);
	return urilist[idx] + file;
    } else {
	return file;
    }
}

const GH_BASE_CLOCK = new Date().toString();

var margin = {top: 32, right: 40, bottom: 240, left: 40},
    width = $(window).width() - margin.left - margin.right,
    height = ( $(window).width() * 0.75 ) - margin.top - margin.bottom;

const AREA_W = parseInt(width,10) + "px";
const AREA_H = parseInt(height,10) + "px";

var GH_COMPARE_STATION = null;

var GH_BLINK_UNITS = [];
var GH_BLINK = {
    ontimer : null,
    offtimer : null,
    interval : GH_BLINK_PROP.interval,
    cells : []
}


//////////////////////////////////////////////////////
//   Diagram
//  https://www.bannerkoubou.com/photoeditor/grid/
//  https://www.achiachi.net/blog/leaflet/divicon
//
var GH_PIXEL_PER_MINUTES = 2;
var GH_TIME_PIXEL = 24 * 60 * GH_PIXEL_PER_MINUTES; // 2880px
var GH_PIXEL_PER_KILOMETER = 3;
var GH_KILO_PIXEL = 500 * GH_PIXEL_PER_KILOMETER; // 1500px
var GH_DIAGRAM = null;
//var GH_STATION_YRATIO = {};
var GH_DIAGRAM_CURRENTTIME = null;
var GH_DIAGRAM_AXIS = [];
//GH_DIAGRAM_AXIS[0] = [];
//GH_DIAGRAM_AXIS[1] = [];
var GH_DIAGRAM_CHART = [];
//GH_DIAGRAM_CHART[0] = [];
//GH_DIAGRAM_CHART[1] = [];
var GH_DIAGRAM_COLOR = {
    "up" : '#4682b4', // steelblue
    "down" : '#228b22', // Forestgreen
    "time" : '#dc143c', // Crimson
    "station" : '#d2b48c' // tan
};

function ghInitDiagram(id) {
    
    $('#ghDiagram').height(AREA_H).width(AREA_W);
    
    var ch = parseInt(GH_KILO_PIXEL/2,10);
    var cw = parseInt(GH_TIME_PIXEL/2,10);

    GH_DIAGRAM = L.map('ghDiagram', {
        crs: L.CRS.Simple,
        minZoom: -3,
        maxZoom: 5,
        
    });
    var bounds = [[0,0],[GH_KILO_PIXEL,GH_TIME_PIXEL]]; // H,W
    var backimg = L.imageOverlay('../images/diagramgrid.png',bounds).addTo(GH_DIAGRAM); // 2880x1500 px
    GH_DIAGRAM.setView( [ch, cw], -1);
    //GH_DIAGRAM.fitBounds(bounds);

    L.easyButton({
	states: [{
            stateName: 'timetable-0-open',        // name the state
            icon:      'fa-caret-square-o-down fa-2x',               // and define its properties
            title:     'Timetable 0 open',      // like its title
            onClick: function(btn, map) {       // and its callback
		ghOnclickDialogButton('#gh_Sheet0Dialog0', -1);
                btn.state('timetable-0-close');    // change state on click!
            }
        }, {
            stateName: 'timetable-0-close',
            icon:      'fa-caret-square-o-down fa-2x',
            title:     'Timetable 0 close',
            onClick: function(btn, map) {
		ghOnclickDialogButton('#gh_Sheet0Dialog0', -1);
                btn.state('timetable-0-open');
            }
	}]
    }).addTo( GH_DIAGRAM );

    L.easyButton({
	states: [{
            stateName: 'timetable-1-open',        // name the state
            icon:      'fa-caret-square-o-up fa-2x',               // and define its properties
            title:     'Timetable 1 open',      // like its title
            onClick: function(btn, map) {       // and its callback
		ghOnclickDialogButton('#gh_Sheet1Dialog1', -1);
                btn.state('timetable-1-close');    // change state on click!
            }
        }, {
            stateName: 'timetable-1-close',
            icon:      'fa-caret-square-o-up fa-2x',
            title:     'Timetable 1 close',
            onClick: function(btn, map) {
		ghOnclickDialogButton('#gh_Sheet1Dialog1', -1);
                btn.state('timetable-1-open');
            }
	}]
    }).addTo( GH_DIAGRAM );

};

function ghClearDiagramAxis(id) {  
    var m = GH_DIAGRAM_AXIS[id];
    for ( var i = 0,ilen = m.length; i< ilen; i++ ) {
        GH_DIAGRAM.removeLayer(m[i]);
    }        
    GH_DIAGRAM_AXIS[id] = [];
}
////////////////////////////////////////////////////////////////////////////////////
function ghDrawDiagramAxis(stationy) {  

    // Y axis

    for ( var i = 0,ilen = stationy.length; i< ilen; i++ ) {
        var strwidth = 10 * stationy[i].name.length;
        var strheight = 16;
        var divIcon = L.divIcon({
            html: stationy[i].name,
            className: 'diagramtexticon',
            iconSize: [strwidth,strheight]
        });
        // Left side

        var xpos = 30;
        var ypos = GH_KILO_PIXEL - ( GH_KILO_PIXEL * stationy[i].ratio );
        var m = L.marker([ypos, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS.push(m);

        // Right side
        m = L.marker([ypos, GH_TIME_PIXEL], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS.push(m);

        var l = L.polyline([[ypos,xpos], [ypos,GH_TIME_PIXEL]],{
            color: GH_DIAGRAM_COLOR.station,
            opacity: 0.4,
            fill: false,
            weight: 3
        }).addTo(GH_DIAGRAM).bindPopup( stationy[i].name ).bindTooltip( stationy[i].name );
        GH_DIAGRAM_AXIS.push(l);        
    }

    // X axis
    var strwidth = 10 * 5;
    var strheight = 16;
    for ( var x=0;x<24;x++) {
	// x indicate [hour]
        var xpos = GH_PIXEL_PER_MINUTES * ( x * 60 ) ;
	var ypos = GH_KILO_PIXEL;
        var col = GH_DIAGRAM_COLOR.time;
	var str = x + ":00";
        var divIcon = L.divIcon({
            html: str,
            className: 'diagramtexticon',
            iconSize: [strwidth,strheight]
        });

	// top
        m = L.marker([ypos, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS.push(m);

	// bottom
        m = L.marker([0, xpos], {icon: divIcon}).addTo(GH_DIAGRAM);
        GH_DIAGRAM_AXIS.push(m);
    }
}

function _ghCalcDiagramXfromTimeStr(timestr) {
    // "0T07:54:00" -> Convert to [sec]
    let a = timestr.split("T");
    let r0 = parseInt(a[0],10) * 24 * 60 * 60;
    let b = a[1].split(":");
    let r1 = parseInt(b[0],10) * 60 * 60;
    let r2 = parseInt(b[1],10) * 60;
    let r3 = parseInt(b[2],10) * 1;
    let sec = r0 + r1 + r2 + r3;
    return GH_PIXEL_PER_MINUTES * ( sec / 60 );
}
function _ghCalcDiagramYfromStation(name,stations) {

    let ratio = 0;
    for ( var i = 0,ilen = stations.length; i< ilen; i++ ) {
        if ( stations[i].name == name ) {
	    ratio = stations[i].ratio;
	    break;
	}
    }
    return GH_KILO_PIXEL - ( GH_KILO_PIXEL * ratio );
}

function ghDrawDiagramChart(stationy) {  

    let units = GH_FIELD.units;
    for ( let i=0,ilen=units.length; i < ilen; i++ ) {
        let lineid = units[i].lineid; // 10ES
        let trainid = units[i].trainid; // 9761
	let routename = units[i].route;
	let way = units[i].way;
	let timetable = units[i].timetable;
	//console.log(trainid);
	if ( lineid == GH_FIELDINDEX.lineid ) {
	    let points = [];
	    for ( let j=0;j<timetable.length;j=j+3) {
		if ( timetable[j+2] == GH_TYPE_THROUGH ) {
		    // NOP through point
		} else {
		    let xpos = _ghCalcDiagramXfromTimeStr(timetable[j]);
		    let ypos = _ghCalcDiagramYfromStation(timetable[j+1],stationy);
                    points.push([ ypos, xpos ]);
		    //let txt = ' pos ' + j + ' ' + timetable[j+1]  + ' ' + ypos ;
		    //console.log(txt);
		    //console.log(stationy);
		}
	    }
            if ( points.length > 1 ) {
		//var popup = L.popup({minWidth: 100, maxWidth: 300, closeButton:true}).setContent( txt );
		var popup = L.popup({minWidth: 100, maxWidth: 300, closeButton:true}).setContent( trainid );
		var col = GH_DIAGRAM_COLOR.down;
		if ( way > 0 ) col = GH_DIAGRAM_COLOR.up;
                var l = L.polyline(points,{
                    color: col,
                    opacity: 0.8
                }).addTo(GH_DIAGRAM).bindPopup(popup).bindTooltip(trainid);
                GH_DIAGRAM_CHART.push(l);
            }
	}
	
    }
}


function ghClearDiagramChart(id) {  
    var m = GH_DIAGRAM_CHART[id];
    for ( var i = 0,ilen = m.length; i< ilen; i++ ) {
        GH_DIAGRAM.removeLayer(m[i]);
    }        
    GH_DIAGRAM_CHART[id] = [];
}


//function ghUpdateDiagramChart(id) {  
//    ghClearDiagramChart(id);
//    ghDrawDiagramChart(id);
//}


function ghClearDiagramCurrentTime() { 
    if ( GH_DIAGRAM_CURRENTTIME != null ) {
        GH_DIAGRAM.removeLayer(GH_DIAGRAM_CURRENTTIME);
    }
    GH_DIAGRAM_CURRENTTIME = null;
}
function ghDrawDiagramCurrentTime(t) {  
    // t = 10:55
    let a = t.split(":");
    let min = parseFloat(a[0]) * 60 +  parseFloat(a[1]);
    var xpos = GH_PIXEL_PER_MINUTES * min;
    var col = GH_DIAGRAM_COLOR.time;
    var poly = [ [ 0, xpos ], [ GH_KILO_PIXEL, xpos ] ];
    ghClearDiagramCurrentTime();
    GH_DIAGRAM_CURRENTTIME = L.polyline(poly,{
        color: col,
        opacity: 0.8
    }).addTo(GH_DIAGRAM).bindPopup(t).bindTooltip(t);
}

////////////////////////////////////
function ghInitSheets(rows,cols) {

    // rows not include header(train ID)
    // cols = []
    // cols[0] = way(0) cols ( not include km station name header )
    // cols[1] = way(1) cols ( not include km station name header )
    //
    //  Header H = 28.5px  W = Km 50px, Name 100px,
    //  
    //  Each cells (w x h) = ( 50px x 25px)
    //

    let table_width = ( 50 + GH_TABLE_PROP.stationwidth + 10 ); // +10 margin
    if ( cols[0] > cols[1] ) {
	table_width = table_width + ( cols[0] + 1 ) * 50; // +1 margin
    } else {
	table_width = table_width + ( cols[1] + 1 ) * 50;
    }
    let table_height = 28.5 + ( rows + 1 ) * 25 ; // +1 margin
    let table_w = parseInt(table_width,10) + "px";
    let table_h = parseInt(table_height,10) + "px";    
    
    var GH_SHEET_OPTIONS = {
	colHeaders: ['Km',GH_TABLE_PROP.stationstring],
	colWidths: [ 50, GH_TABLE_PROP.stationwidth],
	columns: [
	    { type: 'numeric', readOnly:true },
            { type: 'text', readOnly:true  }
	],
	minDimensions:[0,0],
	tableOverflow:true,
	tableWidth: table_w,
	tableHeight: table_h,
	freezeColumns: 2,
	columnSorting:false,
	onchange: _ghOnchangeValue,
	onselection: _ghOnselectBuffer,
	allowInsertRow : false,
	allowManualInsertRow : false,
	allowDeleteRow : false,
	allowInsertColumn : true,
	allowDeleteColumn : false,
	updateTable:function(instance, cell, col, row, val, label, cellName) {
            // Odd row colours
            if (row % 2) {
		//cell.style.backgroundColor = '#b0bec5'; blue-grey lighten-3
		cell.style.backgroundColor = '#eceff1';
            } else {
		// default
	    }
	}
    }
    
    GH_TABLE[0].sheet = $('#ghSpreadsheet0').jspreadsheet(GH_SHEET_OPTIONS);
    GH_TABLE[1].sheet = $('#ghSpreadsheet1').jspreadsheet(GH_SHEET_OPTIONS);

}

function _ghOnchangeValue(instance, cell, x, y, value) {
}

function _ghOnselectBuffer(instance, x1, y1, x2, y2, origin) {
}

function _ghGetStationNameIdx(stations,name) {
    for ( let j=0,jlen=stations.length ; j < jlen; j++) {
	if ( stations[j].name == name ) {
	    return j
	}
    }
    return -1
}
function _ghGetUncheckedIdx(stations) {
    for ( let j=0,jlen=stations.length ; j < jlen; j++) {
	if ( stations[j].rank < 0 ) {
	    return j
	}
    }
    return -10000;
}

function ghOrderStationColumns(way,stations) {

    //  At First Create Main Line
    let p = graphologyLibrary.simplePath.allSimplePaths(
	GH_GRAPH[way],
	stations[0].name,
	stations[stations.length-1].name);

    //  Check Longest Path ( more stations )
    let maxlen = 0;
    let maxk = 0;
    for ( let k=0;k<p.length;k++) {
	let plen = p[k].length;
	if ( plen > maxlen ) {
	    maxk = k;
	    maxlen = plen;
	}
    }
    let step = 1;
    let rank = 1;
    for ( let k=0;k<p[maxk].length;k++) {
	let id = _ghGetStationNameIdx(stations,p[maxk][k]);
	if ( id < 0 ) {
	    // Nop Cannot Search name Station
	    console.log(stations);
	    console.log(p[maxk][k]);
	} else {
	    if ( stations[id].rank < 0 ) {
		stations[id].rank = (rank/step);
		rank++;
	    }
	}
    }

    //  Nest Rest station check loop , traverse from Start Point
    let isnext = true;
    while ( isnext ) {
	let nid = _ghGetUncheckedIdx(stations);
	step = step * 10;

	if ( nid < -9999 ) {
	    isnext = false;
	} else {
	    ////////////////////////////// check!! 284TGV
	    p = graphologyLibrary.simplePath.allSimplePaths(
		GH_GRAPH[way],
		stations[0].name,
		stations[nid].name);
	    if ( p.length > 0 ) {
		//  Check Longest Path ( more stations )
		maxlen = 0;
		maxk = 0;
		for ( let k=0;k<p.length;k++) {
		    let plen = p[k].length;
		    if ( plen > maxlen ) {
			maxk = k;
			maxlen = plen;
		    }
		}
		rank = 1;
		let prevrank = 0;
		for ( let k=0;k<p[maxk].length;k++) {
		    let id = _ghGetStationNameIdx(stations,p[maxk][k]);
		    if ( id < 0 ) {
			// Nop Cannot Search name Station
			console.log(stations);
			console.log(p[maxk][k]);
		    } else {
			if ( stations[id].rank < 0 ) {
			    stations[id].rank = prevrank + (rank/step);
			    rank++;
			} else {
			    prevrank = stations[id].rank;
			}
		    }
		}
	    } else {
		isnext = false;
	    }
	}
    }

    //  Nest Rest station check loop , traverse from Stop Point
    isnext = true;
    step = 1;
    while ( isnext ) {
	let nid = _ghGetUncheckedIdx(stations);
	step = step * 10;

	if ( nid < -9999 ) {
	    isnext = false;
	} else {

	    p = graphologyLibrary.simplePath.allSimplePaths(
		GH_GRAPH[way],
		stations[nid].name,
		stations[stations.length-1].name);
	    if ( p.length > 0 ) {
		//  Check Longest Path ( more stations )
		maxlen = 0;
		maxk = 0;
		for ( let k=0;k<p.length;k++) {
		    let plen = p[k].length;
		    if ( plen > maxlen ) {
			maxk = k;
			maxlen = plen;
		    }
		}
		rank = 1;
		let prevrank = 0;
		for ( let k=p[maxk].length-1;k>-1;k--) {
		    let id = _ghGetStationNameIdx(stations,p[maxk][k]);
		    if ( id < 0 ) {
			// Nop Cannot Search name Station
			console.log(stations);
			console.log(p[maxk][k]);
		    } else {
			if ( stations[id].rank < 0 ) {
			    stations[id].rank = prevrank - (rank/step);
			    rank++;
			} else {
			    prevrank = stations[id].rank;
			}
		    }
		}
	    } else {
		isnext = false;
	    }
	}
    }

    return stations;
}
function __rank_compare(a, b) {
  // https://www.webprofessional.jp/sort-an-array-of-objects-in-javascript/
  var comparison = 0;
  if (a.rank > b.rank) {
    comparison = 1;
  } else if (a.rank < b.rank) {
    comparison = -1;
  }
  return comparison;
}

function ghCreateTimetableStation(way) {

    let sta = [];
    let stations = GH_LINES[GH_FIELDINDEX.lineid].way[way].stations;

    for ( let j=0,jlen=stations.length ; j < jlen; j=j+2) {
	if ( _ghGetStationNameIdx(sta,stations[j]) < 0 ) {
	    sta.push({
		'name': stations[j],
		'way' : way,
		'distance' : -1,
		'rank' : -1
	    });
	}
    }

    for ( let j=0,jlen=sta.length ; j < jlen; j++) {

	let p = graphologyLibrary.simplePath.allSimplePaths(GH_GRAPH[way],sta[0].name,sta[j].name);
	let distance = 0;
	if ( p.length > 0 ) {
	    //  Check Longest Path ( more stations )
	    maxlen = 0;
	    maxk = 0;
	    for ( let k=0;k<p.length;k++) {
		let plen = p[k].length;
		if ( plen > maxlen ) {
		    maxk = k;
		    maxlen = plen;
		}
	    }
	    for ( let k=1;k<p[maxk].length;k++) {
		if ( GH_GRAPH[way].hasEdge(p[maxk][k-1],p[maxk][k]) ) {
		    let d = GH_GRAPH[way].getEdgeAttribute(p[maxk][k-1],p[maxk][k],'weight');
		    distance += d;
		}
	    }
	}
	sta[j].distance = 1.0 * distance.toFixed(1);
    }
    
    let col = ghOrderStationColumns(way,sta);

    col.sort(__rank_compare);

    return col;
    
    //let colums = ghCreateTtimetableColums(); // Array
    //let rows = ghCreateTtimetableRows();     // Array
//    console.log(stations[0]);
//    console.log(stations[1]);    

}

function _ghGetSheetTimeFormat(str){
    // str = "0T07:55:00"
    var a = str.split("T");
    var b = a[1].split(":");
    return b[0] + b[1];
}

function _ghGetTimeData(timetable,name) {

    let res = [];
    for ( var i=0,ilen=timetable.length;i<ilen;i=i+3) {
	if ( timetable[i+1] == name ) {
	    res.push ({
		"time" : _ghGetSheetTimeFormat(timetable[i]),
		"type" : timetable[i+2]
	    });
	}
    }
    return res
}

function ghInsertUnitColumn(way,trainid,timetable,station) {

    let data = [];
    if ( way == 0 ) {
	let ilen = station.length;
	for ( var i=0;i<ilen;i++) {
	    let p = _ghGetTimeData(timetable,station[i].name);
	    if ( i == 0 ) {
		if ( p.length < 1 ) {
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_DEPATURE ) {
			data.push( p[0].time );
		    } else {
			data.push( "" );
		    }
		} else {
		    data.push( "" );
		}
	    } else if ( i == ilen-1 ) {
		if ( p.length < 1 ) {
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_ARRIVAL ) {
			data.push( p[0].time );
		    } else {
			data.push( "" );
		    }
		} else {
		    data.push( "" );
		}
	    } else {
		if ( p.length < 1 ) {
		    data.push( "" );
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_ARRIVAL ) {
			data.push( p[0].time );
			data.push( "" );
		    } else if ( p[0].type == GH_TYPE_DEPATURE) {
			data.push( "" );
			data.push( p[0].time );
		    } else {
			data.push( "" );
			data.push( "" );
		    }
		} else {
		    data.push( p[0].time );
		    data.push( p[1].time );
		}
	    }
	}
	/////////////////////////////////////////////
    } else {
	let ilen = station.length;
	for ( var i=ilen-1;i>-1;i--) {
	    let p = _ghGetTimeData(timetable,station[i].name);
	    if ( i == 0 ) {
		if ( p.length < 1 ) {
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_ARRIVAL ) {
			data.push( p[0].time );
		    } else {
			data.push( "" );
		    }
		} else {
		    data.push( "" );
		}
	    } else if ( i == ilen-1 ) {
		if ( p.length < 1 ) {
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_DEPATURE ) {
			data.push( p[0].time );
		    } else {
			data.push( "" );
		    }
		} else {
		    data.push( "" );
		}
	    } else {
		if ( p.length < 1 ) {
		    data.push( "" );
		    data.push( "" );
		} else if ( p.length < 2 ) {
		    if ( p[0].type == GH_TYPE_ARRIVAL ) {
			data.push( p[0].time );
			data.push( "" );
		    } else if ( p[0].type == GH_TYPE_DEPATURE) {
			data.push( "" );
			data.push( p[0].time );
		    } else {
			data.push( "" );
			data.push( "" );
		    }
		} else {
		    data.push( p[0].time );
		    data.push( p[1].time );
		}
	    }
	}
	/////////////////////////////////////////////
    }
    GH_TABLE[way].sheet.insertColumn(data);
    GH_TABLE[way].sheet.setHeader(GH_TABLE[way].cols,trainid);
    GH_TABLE[way].cols += 1;

}
function ghSetStationColumn(way,station) {

    let data = [];
    let rows = 0;
    if ( way == 0 ) {
	for ( var i=0,ilen=station.length;i<ilen;i++) {
	    if ( i == 0 || i == ilen-1 ) {
		data.push( [ station[i].distance, station[i].name ] );
		rows++;
	    } else {
		data.push( [ station[i].distance, station[i].name ] );
		rows++;
		data.push( [ station[i].distance, station[i].name ] );
		rows++;
	    }
	}
    } else {
	let maxdistance = station[station.length-1].distance;
	let ilen = station.length;
	for ( var i=ilen-1;i>-1;i--) {
	    let dis = maxdistance - station[i].distance;
	    if ( i == 0 || i == ilen-1 ) {
		if ( dis < 1 ) {
		    data.push( [ "" , station[i].name ] );
		} else {
		    data.push( [ 1.0 * dis.toFixed(1) , station[i].name ] );
		}
		rows++;
	    } else {
		if ( dis < 1 ) {
		    data.push( [ "", station[i].name ] );
		    rows++;
		    data.push( [ "", station[i].name ] );
		    rows++;
		} else {
		    data.push( [ 1.0 * dis.toFixed(1), station[i].name ] );
		    rows++;
		    data.push( [ 1.0 * dis.toFixed(1), station[i].name ] );
		    rows++;
		}
	    }
	}
    }
    GH_TABLE[way].sheet.setData(data);
    GH_TABLE[way].rows = rows;
    GH_TABLE[way].cols = 2;
    
    for ( var i=0;i<GH_TABLE[way].rows;i++) {
        if ( i == 0 || i == GH_TABLE[way].rows-1 ) {
            // NOP
        } else {
            if ( i % 2 ) {
                // NOP
            } else {
                GH_TABLE[way].sheet.setMerge("A" + i,1,2);
                GH_TABLE[way].sheet.setMerge("B" + i,1,2);
            }
        }

    }
    GH_TABLE[way].status = 0;

}

function ghSetupTimetables() {

    if ( ! GH_LINES[GH_FIELDINDEX.lineid] ) return;

    let ary = ghCreateTimetableStation(0); // Only Way 0
    let units = GH_FIELD.units;
    let colunits = [];
    colunits[0] = 0;
    colunits[1] = 0;
    for ( let i=0,ilen=units.length; i < ilen; i++ ) {
	let lineid = units[i].lineid; // 10ES
	let way = units[i].way;
	if ( lineid == GH_FIELDINDEX.lineid ) { 
	    colunits[way]++;
	}
    }
    let rows = ( ary.length - 2 ) * 2  + 2;
    ghInitSheets(rows,colunits);
    
    ghSetStationColumn(0,ary);
    ghSetStationColumn(1,ary);

//    for ( let i=0,ilen=units.length; i < ilen; i++ ) {
//	let lineid = units[i].lineid; // 10ES
//        let trainid = units[i].trainid; // 9761
//	let way = units[i].way;
//	let timetable = units[i].timetable;
//	if ( lineid == GH_FIELDINDEX.lineid ) { 
//	    ghInsertUnitColumn(way,trainid,timetable,ary);
//	}
//    }
    for ( let i=0,ilen=GH_UNIT_DATA.length; i < ilen; i++ ) {
	let lineid = GH_UNIT_DATA[i].lineid; // 10ES
        let trainid = GH_UNIT_DATA[i].trainid; // 9761
	let way = GH_UNIT_DATA[i].way;
	let timetable = units[ GH_UNIT_DATA[i].fid ].timetable;
	if ( lineid == GH_FIELDINDEX.lineid ) { 
	    ghInsertUnitColumn(way,trainid,timetable,ary);
	}
    }



    
    
    return ary;
    
}

function ghSetupDiagrams() {

    if ( ! GH_LINES[GH_FIELDINDEX.lineid] ) return;

    let way = 0;  // Calcurate one way...
    let sta = [];
    let stations = GH_LINES[GH_FIELDINDEX.lineid].way[way].stations;
//    console.log('check stations');
//    console.log(stations);

    //  Search Longest Path
    let maxdistance = -1000;
    let maxstartidx = 0;
    let maxstopidx = 0;
    
    for ( let i=0,ilen=stations.length ; i < ilen; i=i+2) {
	for ( let j=i+2,jlen=stations.length ; j < jlen; j=j+2) {

	    let p = graphologyLibrary.simplePath.allSimplePaths(GH_GRAPH[way],stations[i],stations[j]);
	    let distance = 0;
	    if ( p.length > 0 ) {
		//  Check Longest Path ( more stations )
		maxlen = 0;
		maxk = 0;
		for ( let k=0;k<p.length;k++) {
		    let plen = p[k].length;
		    if ( plen > maxlen ) {
			maxk = k;
			maxlen = plen;
		    }
		}
		for ( let k=1;k<p[maxk].length;k++) {
		    if ( GH_GRAPH[way].hasEdge(p[maxk][k-1],p[maxk][k]) ) {
			let d = GH_GRAPH[way].getEdgeAttribute(p[maxk][k-1],p[maxk][k],'weight');
			distance += d;
		    }
		}

		if ( distance > maxdistance ) {
		    maxdistance = distance;
		    maxstartidx = i;
		    maxstopidx = j;
		}
	    } else {
		console.log(' Wrong Path at setup diagrams' );
	    }
	}
    }

//    console.log(stations[maxstartidx]);
//    console.log(stations[maxstopidx]);
//    console.log(maxdistance);

    for ( let j=0,jlen=stations.length ; j < jlen; j=j+2) {
	if ( _ghGetStationNameIdx(sta,stations[j]) < 0 ) {
	    sta.push({
		'name': stations[j],
		'way' : way,
		'rank' : 0
	    });
	}
    }

    for ( let j=0,jlen=sta.length ; j < jlen; j++) {

	let p = graphologyLibrary.simplePath.allSimplePaths(GH_GRAPH[way],stations[maxstartidx],sta[j].name);
	let distance = 0;
	if ( p.length > 0 ) {
	    //  Check Longest Path ( more stations )
	    maxlen = 0;
	    maxk = 0;
	    for ( let k=0;k<p.length;k++) {
		let plen = p[k].length;
		if ( plen > maxlen ) {
		    maxk = k;
		    maxlen = plen;
		}
	    }
	    for ( let k=1;k<p[maxk].length;k++) {
		if ( GH_GRAPH[way].hasEdge(p[maxk][k-1],p[maxk][k]) ) {
		    let d = GH_GRAPH[way].getEdgeAttribute(p[maxk][k-1],p[maxk][k],'weight');
		    distance += d;
		}
	    }
	} else {

	    distance = 0;
	    p = graphologyLibrary.simplePath.allSimplePaths(GH_GRAPH[way],sta[j].name,stations[maxstopidx]);
	    if ( p.length > 0 ) {
		//  Check Longest Path ( more stations )
		maxlen = 0;
		maxk = 0;
		for ( let k=0;k<p.length;k++) {
		    let plen = p[k].length;
		    if ( plen > maxlen ) {
			maxk = k;
			maxlen = plen;
		    }
		}
		for ( let k=1;k<p[maxk].length;k++) {
		    if ( GH_GRAPH[way].hasEdge(p[maxk][k-1],p[maxk][k]) ) {
			let d = GH_GRAPH[way].getEdgeAttribute(p[maxk][k-1],p[maxk][k],'weight');
			distance += d;
		    }
		}
		
	    } else {
		console.log('Wrong Path distance ');
	    }
	    distance = maxdistance - distance;
	    
	}
	sta[j].rank = distance;
    }

    sta.sort(__rank_compare);

    let res = [];
    for ( let j=0,jlen=sta.length ; j < jlen; j++) {
	res[j] = {
	    "name" : sta[j].name,
	    'way' : way,
	    'distance' : sta[j].rank,
	    'ratio' : sta[j].rank / maxdistance
	}
    }

    return res;
}






/////////////////////////////
//
//  Broadcast Channel Function
//

function ghBroadcastSecondaryReceiveMessage(data) {
    if (data.type == 'INITCONNECTION_ACK') {
        if ( GH_BROADCAST.selfID < 0 ) {
            GH_BROADCAST.selfID = data.value.yourid;

	    GH_FIELDINDEX = data.value;
	    if ( GH_DEBUG_CONSOLE ) console.log(GH_FIELDINDEX);

	    ghLoadFieldData(ghGetResourceUri(GH_FIELDINDEX.file));
	    
//            GH_DATA.lineid = data.value.lineid; // GH_FIELD_PROP.timetable.lineid, 10ES
//
//            GH_DATA.name = data.value.name;  // GH_FIELD.name 
//            GH_DATA.way = data.value.way;
//            GH_URILIST = data.value.urilist;
//        
//            $('#gh_lineinformation').html(GH_DATA.name);
//            $('#gh_displaylines').html(data.value.description);
//            $('#gh_displaydirection_0').html(GH_DATA.way[0].direction);
//            $('#gh_displaydirection_1').html(GH_DATA.way[1].direction);

//            ghCreateNewTable(0);
//            ghCreateNewTable(1);
//            ghBroadcastSendRequestUnits(GH_DATA.lineid);
        }

    } else if (data.type == 'UPDATESCENE') {
	ghUpdateDisplayClock(data.value.ctime);
	ghDrawDiagramCurrentTime($('#gh_displayclock').html());
	ghUpdateBlinkUnits(data.value.ctime);
	if ( data.value.pickid != null ) {
	    ghSelectPickID(data.value.pickid);
	}
    } else {
        // Not Implemented
    }
};

if(window.BroadcastChannel){
    ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveMessage);
} else {
    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
    alert(GH_ERROR_MSG['broadcastnotsupport']);
}

//
//  Broadcast Channel Function
//
/////////////////////////////

function ghShowLoader(flag) {
    if ( flag ) {
    	$('#gh_loader').addClass('active');
    } else {
    	$('#gh_loader').removeClass('active');
    }
}


function ghSettingModalOK() {
    blinkval = $('#gh_blinkinterval').val();
    GH_BLINK_PROP.interval = blinkval * 1000; // mili-sec
    GH_BLINK.interval = GH_BLINK_PROP.interval;
    return;
}    

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

function ghSetAboutContent() {
    var data = "";
//    data += GH_REV + '<BR>';
//    data += '<BR>';
    let dwidth = window.innerWidth * window.devicePixelRatio;
    let dheight = window.innerHeight * window.devicePixelRatio;
    data += window.navigator.userAgent + '<BR>';
    data += 'Plathome : ' + navigator.platform + ' ' + jexcel.version().print()  + '<BR>';
    data += 'Cesium : ' + Cesium.VERSION + '&nbsp;&nbsp;' + 'Leaflet :' + L.version + '&nbsp;&nbsp;' + 'jQuery :' + jQuery.fn.jquery + '<BR>';     
    data += 'Screen pixel : ' + screen.availWidth + 'px x ' + screen.availHeight + 'px<BR>';
    data += 'Window css pixel : ' + window.innerWidth + 'px x ' + window.innerHeight + 'px<BR>';
    data += 'Window devcice pixel : ' + dwidth + 'px x ' + dheight + 'px<BR>';
    data += 'Device Pixel Ratio : ' + window.devicePixelRatio + '<BR>';
    $('#gh_aboutcontent').html(data);
};

////////////////  Graph ////////////////
// Graphology
//  https://graphology.github.io/
//
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
function ghCreateLineGraph(key) {

    if ( ! GH_UNIT_GEOM[key] ) return;
    let path = GH_UNIT_GEOM[key].path;
    let way = GH_UNIT_GEOM[key].way;

    let prevname = null;
    let prevpoint = null;
    let distance = 0;

    for ( var i=0,ilen=path.length; i < ilen; i++ ) {
	if (path[i].indexOf('#') < 0 && path[i] != "" ) {
	    let pt = __ghParsePathStr(path[i]);
	    if ( pt.name == "x" ) {
		if ( prevpoint == null ) {
		    // NOP
		} else {
		    distance += turf.distance.default( prevpoint, pt.point, {units: 'kilometers'});
		}
	    } else {
		if ( GH_GRAPH[way].hasNode(pt.name) ) {
		    // NOP Already exist
		    //console.log('Duplicate Name ' + pt.name);
		} else {
		    //console.log('Add Node ' + key + ' ' + way + ' ' + pt.name);
		    GH_GRAPH[way].addNode(pt.name,{
			lng: pt.lng,
			lat: pt.lat,
			alt: pt.alt
		    });
		}
		if ( prevname == null ) {
		    // NOP
		} else {
		    if ( GH_GRAPH[way].hasNode(prevname) ) {
			if ( GH_GRAPH[way].hasEdge(prevname,pt.name) ) {
			    // NOP Already exist
			} else {
			    distance += turf.distance.default( prevpoint, pt.point, {units: 'kilometers'});
			    GH_GRAPH[way].addEdge(prevname,pt.name,{
				weight : distance
			    });
			    //console.log('Add Edge ' + key + ' ' + way + ' ' + prevname + ' ' + pt.name);
			}
		    } else {
			// Wrong data ?
			console.log('Wrong Data? ' + prevname + ' ' + pt.name);			    
		    }

		}
		prevname = pt.name;
		distance = 0;
	    }
	    prevpoint = pt.point;
	}
    }


}
////////////////////////////////////
////  Blink
///
function ghUpdateBlinkCells() {
    // Init Cell array
    GH_BLINK.cells = [];

    let units = GH_FIELD.units;
    for ( let i=0,ilen=GH_BLINK_UNITS.length; i < ilen; i++ ) {
	let trainid = GH_BLINK_UNITS[i].trainid;
	let way = GH_BLINK_UNITS[i].way;
	let ct = Cesium.JulianDate.fromIso8601(GH_BLINK_UNITS[i].status, new Cesium.JulianDate());
	let timetable = units[ GH_BLINK_UNITS[i].fid ].timetable;

	// Search Timetable 
	let station0 = "UNKNOWN";
	let station1 = "UNKNOWN";
	let t0 = "";
	let ratio = 1.0;
	for ( let j=3;j<timetable.length;j=j+3) {
	    let t1 = __ghGetCesiumClock(timetable[j],GH_FIELD.timezone)
	    let sd = Cesium.JulianDate.secondsDifference(t1,ct);
	    if ( sd > 0 && timetable[j+2] != GH_TYPE_THROUGH ) {
		//  Search Previous Stop Station
		let sidx = j-3;
		for ( let k=j-1;k>0;k=k-3) {
		    if ( timetable[k] != GH_TYPE_THROUGH ) {
			sidx = k-2;
			break;
		    };
		}
		station0 = timetable[sidx+1];
		station1 = timetable[j+1];
		t0 = __ghGetCesiumClock(timetable[sidx],GH_FIELD.timezone);
		sd = Cesium.JulianDate.secondsDifference(ct,t0);
		let b = Cesium.JulianDate.secondsDifference(t1,t0);
		ratio = Math.abs(sd)/b; ///  Calc
		break;
	    }
	}

	// Search Sheet cols
	let colx = -1;
	// x = 0 [Km]
	// x = 1 [staion]
	for ( let x=2;x<GH_TABLE[way].cols;x++) {
	    var title = GH_TABLE[way].sheet.getHeader(x);
	    if ( title == trainid ) {
		colx = x;
		break;
	    }
	}
	
	// Search Sheet rows from Station name
	let rowy0 = -1;
	for ( var y=0;y<GH_TABLE[way].rows;y++) {
            var cellstation = GH_TABLE[way].sheet.getValueFromCoords(1,y);
	    if ( cellstation == station0 ) {
		if ( rowy0 < 0 ) rowy0 = y;
		break;
	    }
	}
	let rowy1 = -1;
	for ( var y=GH_TABLE[way].rows-1;y>-1;y--) {
            var cellstation = GH_TABLE[way].sheet.getValueFromCoords(1,y);
	    if ( cellstation == station1 ) {
		if ( rowy1 < 0 ) rowy1 = y;
		break;
	    }
	}

	//let msg = ' ID ' + trainid + ' ' + colx + ' ' + rowy0 + ' ' + rowy1;
	//console.log(msg);
	
	let rowy = -1;
	if ( rowy0 == rowy1 ) {
	    rowy = rowy0+1;
	} else {
	    if ( rowy0 == 0 && rowy1 == 1 ) {
		rowy = 1;
	    } else {
		rowy = Math.floor(((rowy1+1)-(rowy0+2))*ratio+rowy0+2);
	    }
	}

	let idx = "" + rowy;
	let cellname = "" + COLNAME[ colx ] + idx;
	GH_BLINK.cells.push([way,cellname]);
	GH_BLINK_UNITS[i].status = null;
    }
}
function ghBlinkOn() {
    if ( GH_BLINK_UNITS.length > 0 ) {
	if ( GH_BLINK_UNITS[0].status == null ) {
	    // Check Only first index
	    //  Need Not update GH_BLINK_UNITS
	} else {
	    // Update Blink Unit for Current time
	    ghUpdateBlinkCells()
	}
	for ( let i=0,ilen=GH_BLINK.cells.length; i < ilen; i++ ) {
	    let b = GH_BLINK.cells[i];
	    GH_TABLE[ b[0] ].sheet.setStyle(b[1],'border-bottom',GH_BLINK_PROP.onstyle);
	}
    } else {
	// No Blink Units
	GH_BLINK.ontimer = setTimeout(ghBlinkOn,GH_BLINK.interval);
	return;
    }
    GH_BLINK.offtimer = setTimeout(ghBlinkOff,GH_BLINK.interval);
}
function ghBlinkOff() {
    for ( let i=0,ilen=GH_BLINK.cells.length; i < ilen; i++ ) {
	let b = GH_BLINK.cells[i];
	GH_TABLE[ b[0] ].sheet.setStyle(b[1],'border-bottom',GH_BLINK_PROP.offstyle);
    }
    GH_BLINK.ontimer = setTimeout(ghBlinkOn,GH_BLINK.interval);
}

function ghUpdateBlinkUnits(current) {
    let ct = Cesium.JulianDate.fromIso8601(current, new Cesium.JulianDate());
    GH_BLINK_UNITS = [];
    for ( let i=0,ilen=GH_UNIT_DATA.length; i < ilen; i++ ) {
	let lineid = GH_UNIT_DATA[i].lineid; // 10ES
	if ( lineid == GH_FIELDINDEX.lineid ) {
	    let s = Cesium.JulianDate.fromIso8601(GH_UNIT_DATA[i].startclock, new Cesium.JulianDate());
	    let sd = Cesium.JulianDate.secondsDifference(s,ct);
	    if ( sd < 0 ) {
		let e = Cesium.JulianDate.fromIso8601(GH_UNIT_DATA[i].stopclock, new Cesium.JulianDate());	    
		let ed = Cesium.JulianDate.secondsDifference(e,ct);
		if ( ed > 0 ) {
		    GH_BLINK_UNITS.push({
			'fid' : GH_UNIT_DATA[i].fid,
			'trainid' :  GH_UNIT_DATA[i].trainid,
			'way' : GH_UNIT_DATA[i].way,
			'status' : current
		    });			
		} else {
		    // NOP
		}
	    } else {
		// NOP
	    }
	}
    }
    if ( GH_DEBUG_CONSOLE ) console.log(GH_BLINK_UNITS);
}
//////////////////////////////////////////

function ghSelectStationRows(name) {
    for( var id = 0;id<GH_TABLE.length;id++ ) {
        var selectedidx = -1;
        for ( var y=0;y<GH_TABLE[id].rows;y++) {
            var cellstation = GH_TABLE[id].sheet.getValueFromCoords(1,y);
            if ( cellstation == name ) {
                selectedidx = y;
                break;
            }
        }
        if ( selectedidx > -1 ) {
            GH_TABLE[id].sheet.updateSelectionFromCoords(0, selectedidx, GH_TABLE[id].cols-1, selectedidx);
        } else {
            GH_TABLE[id].sheet.resetSelection(false);
        }
    }
};

function ghSelectTrainCols(name) {
    for( var id = 0;id<GH_TABLE.length;id++ ) {
	var selectedidx = -1;
        for ( var x=2;x<GH_TABLE[id].cols;x++) {
            var data = GH_TABLE[id].sheet.getHeader(x);
            if ( data == name ) {
                selectedidx = x;
                break;
            }
        }
        if ( selectedidx > -1 ) {
            GH_TABLE[id].sheet.updateSelectionFromCoords(selectedidx, 0, selectedidx, GH_TABLE[id].rows-1);
        } else {
            GH_TABLE[id].sheet.resetSelection(false);
        }
    }
};


function ghSelectPickID(pickid) {

    // pickid 
    // station_Dundalk
    // 125_coach_0
    //

    if ( GH_TABLE[0].cols < 3 || GH_TABLE[1].cols < 3 ) return;
    
    let sid = pickid.split('_');
    if ( sid[0] == 'station' ) {
	ghSelectStationRows(sid[1]);
    } else if ( sid[1] == 'coach' ) {
	ghSelectTrainCols(sid[0]);
    } else {
	// NOP
    }
}
////////////////////////////////////

function ghUpdateDisplayClock(str) {
    let ts = str.split("T");
    let ts1 = ts[1].split(":");
    let cs = "0T" + ts1[0] + ":" + ts1[1] + ":00"; //  + parseInt(ts1[2].slice(0,3),10);
    // Inverse +/- timezone string
    let newtz = GH_FIELD.timezone;
    if ( GH_FIELD.timezone.indexOf('+') != -1 ) {
	newtz = GH_FIELD.timezone.replace('+','-');
    }
    if ( GH_FIELD.timezone.indexOf('-') != -1 ) {
	newtz = GH_FIELD.timezone.replace('-','+');
    }
    let d = __ghGetCesiumClock(cs,newtz);
    var gregorianDate = Cesium.JulianDate.toGregorianDate(d);
    var hour = gregorianDate.hour;
    if ( hour < 10 ) hour = "0" + hour;
    var min = gregorianDate.minute;
    if ( min < 10 ) min = "0" + min;
    //var sec = gregorianDate.seconds;
    //if ( sec < 10 ) sec = "0" + sec;
    $('#gh_displayclock').html(hour + ":" + min);
}
///////////////////////////////////////////
//   Unit Time and Station
//
function __ghGetCesiumClock(str,timezone) {
    // str = '0T06:33:21';
    //let cstr = '2010-01-0' + str + 'Z';
    //let cstr = '2010-01-0' + str + timezone;
    //return Cesium.JulianDate.fromIso8601(cstr, new Cesium.JulianDate());
    
    let t = str.split("T");
    let td = parseInt(t[0],10);
    let now = new Date(GH_BASE_CLOCK);
    if ( td != 0 ) {
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

function ghSetupUnitDataDistance() {

    if ( ! GH_FIELD.units ) return;
    let units = GH_FIELD.units;
    for ( let i=0,ilen=units.length; i < ilen; i++ ) {
        let lineid = units[i].lineid; // 10ES
        let trainid = units[i].trainid; // 9761
	let routename = units[i].route;
	let way = units[i].way;
	let timetable = units[i].timetable;

	if ( lineid == GH_FIELDINDEX.lineid ) { 
	    let distances = [];
	    let totaldistance = 0;

	    if ( GH_STATION_UNITS[ timetable[1] ] ) {
		// NOP
	    } else {
		GH_STATION_UNITS[ timetable[1] ] = [];
	    }
	    GH_STATION_UNITS[ timetable[1] ].push( trainid );

	    for ( let j=4;j<timetable.length;j=j+3) {
		let sta0 = timetable[j-3];
		let sta1 = timetable[j];

		if ( sta0 != sta1 ) {

		    if ( GH_STATION_UNITS[ timetable[j] ] ) {
			// NOP
		    } else {
			GH_STATION_UNITS[ timetable[j] ] = [];
		    }
		    GH_STATION_UNITS[ timetable[j] ].push( trainid );

		    let p = graphologyLibrary.simplePath.allSimplePaths(GH_GRAPH[way],sta0,sta1);

		    //  Check Longest Path ( more stations )
		    let maxlen = 0;
		    let maxk = 0;
		    for ( let k=0;k<p.length;k++) {
			let plen = p[k].length;
			if ( plen > maxlen ) {
			    maxk = k;
			    maxlen = plen;
			}
		    }
		    for ( let k=1;k<p[maxk].length;k++) {
			if ( GH_GRAPH[way].hasEdge(p[maxk][k-1],p[maxk][k]) ) {
			    let d = GH_GRAPH[way].getEdgeAttribute(p[maxk][k-1],p[maxk][k],'weight');
			    distances.push(d);
			    totaldistance += d;
			}
		    }

		} else {
		    // Same Station NOP
		}
	    }
	    let starttime = __ghGetCesiumClock(timetable[0],GH_FIELD.timezone);
	    let stoptime = __ghGetCesiumClock(timetable[timetable.length-3],GH_FIELD.timezone);	    

	    GH_UNIT_DATA[trainid] = {
		'fid' : i,
		'lineid' : lineid,
		'route' : routename,
		'way' : way,
		'startstation' : timetable[1],
		'starttime' : starttime,
		'stopstation' : timetable[timetable.length-2],
		'stoptime' : stoptime,
		'distances' : distances,
		'totaldistance' : totaldistance,
		'duration' : Cesium.JulianDate.secondsDifference(stoptime,starttime)
	    };

	} else {
	    // NOP
	}
    }
}
function __ghGetSecFromBASECLOCK(timestr) {
    let ptime = __ghGetCesiumClock('-1T12:00:00',GH_FIELD.timezone);
    let ctime = __ghGetCesiumClock(timestr,GH_FIELD.timezone);
    return Cesium.JulianDate.secondsDifference(ctime,ptime)
}
function ghSetupUnitDataSimple() {

    if ( ! GH_FIELD.units ) return;
    let units = GH_FIELD.units;
    for ( let i=0,ilen=units.length; i < ilen; i++ ) {
        let lineid = units[i].lineid; // 10ES
        let trainid = units[i].trainid; // 9761
	let routename = units[i].route;
	let way = units[i].way;
	let timetable = units[i].timetable;

	if ( lineid == GH_FIELDINDEX.lineid ) { 

	    if ( GH_STATION_UNITS[ timetable[1] ] ) {
		// NOP
	    } else {
		GH_STATION_UNITS[ timetable[1] ] = [];
	    }
	    GH_STATION_UNITS[ timetable[1] ].push( trainid );

	    let stations = [];
	    let timesec = [];
	    for ( let j=1;j<timetable.length;j=j+3) {
		let sta0 = timetable[j];
		let sta1 = 'Over';
		if ( j+3 < timetable.length ) {
		    sta1 = timetable[j+3];
		}
		if ( sta0 != sta1 ) {
		    if ( GH_STATION_UNITS[ timetable[j] ] ) {
			// NOP
		    } else {
			GH_STATION_UNITS[ timetable[j] ] = [];
		    }
		    GH_STATION_UNITS[ timetable[j] ].push( trainid );

		    stations.push( timetable[j] );
		    timesec.push( __ghGetSecFromBASECLOCK(timetable[j-1]) );
		} else {
		    // Same Station NOP
		}
	    }
	    GH_UNIT_DATA.push ({
		'fid' : i,
		'trainid' : trainid,
		'lineid' : lineid,
		'route' : routename,
		'way' : way,
		'startclock' : __ghGetCesiumClock(timetable[0],GH_FIELD.timezone).toString(),
		'stopclock' : __ghGetCesiumClock(timetable[timetable.length-3],GH_FIELD.timezone).toString(),
		'stations' : stations,
		'timesec' : timesec
	    });

	} else {
	    // NOP
	}
    }
}

///////////////////////////////////////////
//   Unit Geometry
//
function ghSetupLineGraph() {
    for(var key in GH_UNIT_GEOM){
	if ( GH_UNIT_GEOM[key].lineid == GH_FIELDINDEX.lineid ) {
	    ghCreateLineGraph(key);
	} else {
	    // NOP
	}
    }

    //console.log(GH_GRAPH[0].order);
    //console.log(GH_GRAPH[0].size);
//    GH_GRAPH[0].forEachEdge(
//	(edge, attributes, source, target, sourceAttributes, targetAttributes) => {
////	    console.log(`Way 0 Edge from ${source} to ${target} distance `+ attributes.weight);
//	});
    
    //console.log(GH_GRAPH[1].order);
    //console.log(GH_GRAPH[1].size);
//    GH_GRAPH[1].forEachEdge(
//	(edge, attributes, source, target, sourceAttributes, targetAttributes) => {
//	    console.log(`Way 1 Edge from ${source} to ${target} distance ` + attributes.weight);
//	});
    
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
	    'way' : lineway,
	    'lineid' : lineid
	}
    }
}

function ghCreateUnitPath() {

    if ( ! GH_FIELD.units ) return;

    let units = GH_FIELD.units;
    let finished = true;
    for ( var i=0,ilen=units.length; i < ilen; i++ ) {
        var lineid = units[i].lineid; // 10ES
        var trainid = units[i].trainid; // 9761

	if ( lineid == GH_FIELDINDEX.lineid ) { 
	
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
    }

    if ( finished ) {
	ghInitTimeLineData();
    } else {
	console.log('Retry create unit path proc');
	setTimeout(ghCreateUnitPath,523);
    }
}

///////////////////////////////////////////
function __station_compare(a, b) {
    // https://www.webprofessional.jp/sort-an-array-of-objects-in-javascript/
    var comparison = 0;
    let astationsec = a.timesec[0];
    let bstationsec = b.timesec[0];
    if ( a.way > 0 ) {
	astationsec = a.timesec[a.timesec.length-1];
    } 
    if ( b.way > 0 ) {
	bstationsec = b.timesec[b.timesec.length-1];
    } 
    for ( var i = 0,ilen = a.stations.length; i< ilen; i++ ) {
	if ( a.stations[i] == GH_COMPARE_STATION ) {
	    astationsec = a.timesec[i];
	    break;
	}
    }        
    for ( var i = 0,ilen = b.stations.length; i< ilen; i++ ) {
	if ( b.stations[i] == GH_COMPARE_STATION ) {
	    bstationsec = b.timesec[i];
	    break;
	}
    }        
    if (astationsec > bstationsec) {
	comparison = 1;
    } else if (astationsec < bstationsec) {
	comparison = -1;
    }
    return comparison;
}

function ghInitTimeLineData() {

    ghSetupLineGraph();

    GH_STATION_UNITS = {};
    //GH_UNIT_DATA = {};
    //ghSetupUnitDataDistance();
    GH_UNIT_DATA = [];
    ghSetupUnitDataSimple();

    let maxstopstaion = null;
    let maxstopstaion_cnt = -1;
    for(var key in GH_STATION_UNITS){
	if ( GH_STATION_UNITS[key].length > maxstopstaion_cnt ) {
	    maxstopstaion = key;
	    maxstopstaion_cnt = GH_STATION_UNITS[key].length;
	}
    }
    GH_COMPARE_STATION = maxstopstaion;
    //  Sort for GH_COMPARE_STATION
    GH_UNIT_DATA.sort(__station_compare);
    if ( GH_DEBUG_CONSOLE ) console.log(GH_UNIT_DATA);
    
    //  Sheet
    let stationcolum = ghSetupTimetables();
    GH_BLINK.ontimer = setTimeout(ghBlinkOn,GH_BLINK.interval);
    if ( GH_DEBUG_CONSOLE ) console.log(stationcolum);

    //  Diagram
    let stationy = ghSetupDiagrams();
    if ( GH_DEBUG_CONSOLE ) console.log(stationy);
    ghDrawDiagramAxis(stationy);
    ghDrawDiagramChart(stationy);

}

////////////////////////////////////////////
//
//   Load JSON data
//
function ghLoadLineData(file) {
    var uri = ghGetResourceUri(file);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_LINES[data.id] = data;
	if ( GH_DEBUG_CONSOLE ) console.log(GH_LINES[data.id]); 
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "Field Component Cannot load  " + file + "  ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['fieldcomponentcannotload']);
    });
}
function ghLoadFieldData(uri) {
    ghShowLoader(true);
    $.ajax({
	dataType: "json",
	url: uri
    }).done(function(data) {
	GH_FIELD = data;
	if ( GH_DEBUG_CONSOLE )	console.log(GH_FIELD);
	for(var key in GH_FIELD.lines){
	    if ( key == GH_FIELDINDEX.lineid ) {
		// Only One LineID
		ghLoadLineData(GH_FIELD.lines[key]);
	    }
	}

	GH_LINES = {};
	GH_UNIT_GEOM = {};

	ghCreateUnitPath();

//	if ( GH_FIELD.locomotive ) {
//	    ghLoadLocomotiveData('default');
//	}
//	ghSetTimezoneOffset(GH_FIELD.timezone);
//	
//	if ( GH_DEBUG_CONSOLE ) console.log( GH_FIELD );

	$('#gh_lineinformation').html(GH_FIELD.description);

	ghShowLoader(false);
	
    }).fail(function(XMLHttpRequest, textStatus,errorThrown){
	var msg = "train data cannot load ";
	msg += " XMLHttpRequest " + XMLHttpRequest.status ;
	msg += " textStatus " + textStatus ;
	console.log( msg );
	alert(GH_ERROR_MSG['traindatacannotload']);

	ghShowLoader(false);
    });

}
////////////////////////////////
function ghInitDialog() {

   $('#gh_settingmodal').modal();

    $('#gh_aboutmodal').modal({
	onOpenStart : ghSetAboutContent
    });

    ///////////////////////////////////
    $( "#gh_Sheet0Dialog0" ).dialog({
	title: 'Timetable 0',
	width: 600,
	height: 400,
	resizable: true,
	position : { my: "left center", at : "left center" , of : window }
    });    //  resizeStop: function ( event,ui) { resize_control_dialog(ui.size) }	     
    $('#gh_Sheet0Dialog0').dialog('close');
//    $( '#gh_sheet0btn' ).click(function() {
//	ghOnclickDialogButton('#gh_Sheet0Dialog', -1);
//    });
    ///////////////////////////////////
    
    
    ///////////////////////////////////
    $( "#gh_Sheet1Dialog1" ).dialog({
	title: 'Timetable 1',
	width: 600,
	height: 400,
	resizable: true,
	position : { my: "left center", at : "left center" , of : window }
    });    //  resizeStop: function ( event,ui) { resize_control_dialog(ui.size) }	     
    $('#gh_Sheet1Dialog1').dialog('close');
//    $( '#gh_sheet1btn' ).click(function() {
//	ghOnclickDialogButton('#gh_Sheet1Dialog', -1);
//    });
    // Change title bar color
    $( "#gh_Sheet1Dialog1" ).parent().find('.ui-dialog-titlebar').css("background-color","#039be5");
    ///////////////////////////////////

    
}
$(document).ready(function(){

    //
    ghInitDialog();

    //
    ghInitDiagram();
    
    ghBroadcastSendInitConnection();

});

////////////////////////////////


////////////////////////////////////////
//
//   Avoid reload
//

// Called Modal Close
history.pushState(null, null, null);
//$(window).on("popstate", function (event) {
//  if (!event.originalEvent.state) {
//      //alert('popstate Attension re-load button, if wrong operation?');
//    history.pushState(null, null, null);
//    return;
//  }
//});

window.addEventListener('beforeunload', function(e) {
    ghBroadcastClose();
    e.returnValue = 'Attension unload button';
}, false);

