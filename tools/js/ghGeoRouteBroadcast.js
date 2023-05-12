/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//
//
// (P) ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveData);
//
// (S) ghBroadcastSetup('secondary',ghBroadcastSecondaryReceiveData);
//     ghBroadcastInitConnection(); INITCONNECTION
// (P) ghBroadcastSendUniqueID();  INITCONNECTION_ACK
// (S) ghBroadcastReqGeoJSON();   GETGEOJSON
// (P) ghBroadcastSendGeoJSON(LoadData,oid); 'GETGEOJSON_ACK'
// (S) ghBroadcastReqStations(); 'GETSTATIONS'
// (P) ghBroadcastSendStations(RouteData.stations,oid); ,'GETSTATIONS_ACK'
//
//
//
// User Update Button
// (S) ghBroadcastUpdateStations(result,-1); ,'UPDATESTATIONS'
//
//
// User Route Select Button
// (P) ghBroadcastSendRoutePoint(routepoints,routename); 'SENDROUTEPOINT'
// (S) ghFindRoute(name,points);
//     ghUpdateRouteList(name);
//
//
//
// User Sync Checkbox
// (P) ghBroadcastMapSync(data);'MAPSYNC' 
// (S) ghBroadcastMapSync(data);'MAPSYNC' 
//
//

var GH_BROADCAST = {
    name: 'geoglyph_rail_route_v5',
    channel : null,
    selfID : 0,
    others : []
}
function ghBroadcastGetUniqueID(myStrong) {
    var strong = 1000;
    if (myStrong) strong = myStrong;
    return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
}
function ghBroadcastSetup(initmode,callback){
    //
    //  initmode =  primary or secondary
    //  primary = 0;
    //  secondary = -1;
    //
    var initid = -1;
    if ( initmode == "primary" ) initid = 0;
    
    if(window.BroadcastChannel){
        GH_BROADCAST.channel = new BroadcastChannel(GH_BROADCAST.name);
	GH_BROADCAST.selfID = initid;
        GH_BROADCAST.channel.onmessage = function(evt) {
            if ( evt.data.receiver < 0 || evt.data.receiver == GH_BROADCAST.selfID ) {
		callback(evt.data);
		//ghBroadcastReceiveMessage(evt.data)
            }
        }
    } else {
        GH_BROADCAST.channel = null;
	console.log('Not support Broadcast Cahnnel');	
    }
}
function ghBroadcastClose() {
    if ( GH_BROADCAST.channel != null ) {
        GH_BROADCAST.channel.close();
	GH_BROADCAST.channel = null;
    }
}
function ghBroadcastInitConnection() {
    if ( GH_BROADCAST.channel != null && GH_BROADCAST.selfID < 0 ) {
        var data = { status : 0 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'INITCONNECTION',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
    }    
}
function ghBroadcastCheckSender(id) {
    for ( var i=0,ilen=GH_BROADCAST.others.length;i<ilen;i++ ) {
	if ( GH_BROADCAST.others[i] == id ) return true;
    }
    return false;
}
function ghBroadcastSendUniqueID() {
    var uid = ghBroadcastGetUniqueID();
    var data = { yourid: uid  }; 
    if ( GH_BROADCAST.channel != null ) {
	GH_BROADCAST.channel.postMessage({
            type: 'INITCONNECTION_ACK',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
	}); 
    }
    GH_BROADCAST.others.push(uid);
}

function ghBroadcastReqGeoJSON() {
    if ( GH_BROADCAST.channel != null ) {
        var data = { status : 0 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'GETGEOJSON',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
    }
}
function ghBroadcastReqStations() {
    if ( GH_BROADCAST.channel != null ) {
        var data = { status : 0 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'GETSTATIONS',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
    }
}

function ghBroadcastSendGeoJSON(obj,id) {
    if ( GH_BROADCAST.channel != null ) {
	var data = { filename: obj.file , geojson : JSON.stringify(obj.geojson) };
	GH_BROADCAST.channel.postMessage({
            type: 'GETGEOJSON_ACK',
            sender: GH_BROADCAST.selfID,
            receiver: id,
            value: data
	});
    }
}
function ghBroadcastSendStations(obj,id) {
    if ( GH_BROADCAST.channel != null ) {
	var data = { array: obj };
	GH_BROADCAST.channel.postMessage({
            type: 'GETSTATIONS_ACK',
            sender: GH_BROADCAST.selfID,
            receiver: id,
            value: data
	});
    }
}
function ghBroadcastUpdateStations(sarray,id) {
    if ( GH_BROADCAST.channel != null ) {
	var data = { array: sarray };
	GH_BROADCAST.channel.postMessage({
            type: 'UPDATESTATIONS',
            sender: GH_BROADCAST.selfID,
            receiver: id,
            value: data
	});
    }  
};


function ghBroadcastSendRoutePoint(routes,rname) {
    if ( GH_BROADCAST.channel != null ) {
	var data = { name: rname, routes: routes };
	GH_BROADCAST.channel.postMessage({
            type: 'SENDROUTEPOINT',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
	});
    }
}

function ghBroadcastMapSync(data) {
    if ( GH_BROADCAST.channel != null ) {
	GH_BROADCAST.channel.postMessage({
            type: 'MAPSYNC',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
	});
    }
}

//if(window.BroadcastChannel){
//    ghBroadcastSetup();
//} else {
//    console.log("Broadcast Channel Not Supported. \nThis application does not work your browser.");
//}
window.addEventListener('beforeunload', function(e) {
    //ghBroadcastClose();  Wmmmm...
    e.returnValue = 'Attension unload button';
}, false);

//
//  Broadcast Channel Function
//
/////////////////////////////

