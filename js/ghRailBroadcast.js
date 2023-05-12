/////////////////////////////
//
//  Broadcast Channel
//https://www.digitalocean.com/community/tutorials/js-broadcastchannel-api
//https://developers.google.com/web/updates/2016/09/broadcastchannel
//
//
//
//
//   Primary
//
//    ghBroadcastSetup('primary',ghBroadcastPrimaryReceiveMessage);
//
//   Secondary
//
//    ghBroadcastSetup('secdondary',ghBroadcastSecondaryReceiveMessage);
//
//
//    Startup Sequence
//
//    (S) ghBroadcastSendInitConnection();
//           'INITCONNECTION'
//    (P) ghBroadcastSendUniqueID(data);
//           'INITCONNECTION_ACK',
//
//
//
//    (S) ghBroadcastSendRequestUnits()
//           'GETUNITS',
//    (P) ghBroadcastSendUnits(oid,data);
//           'GETUNITS_ACK',
//
//
//
//    Sync Sequence
//
//    (P) ghBroadcastSendTime(data);
//            'CURRENTTIME',
//
//
//    Pick Sequence
//
//    (P) ghBroadcastSendPickData(type,tid);
//            'PICKSTATION';
//            'PICKTRAIN';
//            
//
//
//
//    Timetable update Sequence
//
//    (S) ghBroadcastUpdateUnits(ret);
//           'UPDATEUNITS',
//
//

'use strict';

var GH_BROADCAST = {
    name: 'geoglyph_rail_6_channel',
    channel : null,
    selfID : 0,
    others : [],
    clock : "2014-10-10T13:50:40+09:00"
}
// Iso8601 2014-10-10T13:50:40+09:00
//

function ghBroadcastSetup(mode,callback){
    //
    //  mode =  primary or secondary
    //  primary = 0;
    //  secondary = -1;
    //
    var initid = -1;
    if ( mode == "primary" ) initid = 0;
    
    if(window.BroadcastChannel){
        GH_BROADCAST.channel = new BroadcastChannel(GH_BROADCAST.name);
	GH_BROADCAST.selfID = initid;
        GH_BROADCAST.channel.onmessage = function(evt) {
            if ( evt.data.receiver < 0 || evt.data.receiver == GH_BROADCAST.selfID ) {
		callback(evt.data);
            }
        }
    } else {
        GH_BROADCAST.channel = null;
	console.log('Not support Broadcast Cahnnel API');	
    }
}

function ghBroadcastClose() {
    if ( GH_BROADCAST.channel != null ) {
        GH_BROADCAST.channel.close();
	GH_BROADCAST.channel = null;
    }
}
function ghBroadcastSendClose() {
    if ( GH_BROADCAST.channel != null ) {
        var data = { status : -1 }; 
        GH_BROADCAST.channel.postMessage({
            type: 'CLOSE',
            sender: GH_BROADCAST.selfID,
            receiver: -1,
            value: data
        });
        ghBroadcastClose();
    }
}

function ghBroadcastRemoveID(id) {
    for ( var i=0,ilen=GH_BROADCAST.others.length;i<ilen;i++ ) {
	if ( GH_BROADCAST.others[i] == id ) GH_BROADCAST.others.splice(i,1);
    }
}
function ghBroadcastCheckSender(id) {
    for ( var i=0,ilen=GH_BROADCAST.others.length;i<ilen;i++ ) {
	if ( GH_BROADCAST.others[i] == id ) return true;
    }
    return false;
}

function ghBroadcastGetUniqueID(myStrong) {
    var strong = 1000;
    if (myStrong) strong = myStrong;
    return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
}

////////////////////////////////////////////
//
//  Sender
//
function ghBroadcastSendUniqueID(data) {
    var uid = ghBroadcastGetUniqueID();
    data.yourid = uid
    GH_BROADCAST.channel.postMessage({
        type: 'INITCONNECTION_ACK',
        sender: GH_BROADCAST.selfID,
        receiver: -1,
        value: data
    }); 
    GH_BROADCAST.others.push(uid);
}

function ghBroadcastSendInitConnection() {
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

function ghBroadcastSendUpdateScene(data) {
    if ( GH_BROADCAST.channel == null ) return;
    if ( GH_BROADCAST.others.length < 1 ) return;
    GH_BROADCAST.channel.postMessage({
        type: 'UPDATESCENE',
        sender: GH_BROADCAST.selfID,
        receiver: -1,
        value: data
    }); 
}

//function ghBroadcastSendUnits(oid,data) {
//    if ( GH_BROADCAST.channel == null ) return;
//    if ( GH_BROADCAST.others.length < 1 ) return;
//    GH_BROADCAST.channel.postMessage({
//        type: 'GETUNITS_ACK',
//        sender: GH_BROADCAST.selfID,
//        receiver: oid,
//        value: data
//    });    
//}

//function ghBroadcastSendTime(data) {
//    if ( GH_BROADCAST.channel == null ) return;
//    if ( GH_BROADCAST.others.length < 1 ) return;
//    if ( GH_BROADCAST.time == data.time  ) return;
//    GH_BROADCAST.channel.postMessage({
//        type: 'CURRENTTIME',
//        sender: GH_BROADCAST.selfID,
//        receiver: -1,
//        value: data
//    });
//    GH_BROADCAST.time = data.time;
//}

//function ghBroadcastSendPickData(type,tid) {
//    if ( GH_BROADCAST.channel == null ) return;
//    if ( GH_BROADCAST.others.length < 1 ) return;
//    var cmd = 'PICKSTATION';
//    if ( type == 'train' ) {
//	cmd = 'PICKTRAIN';
//    } else if ( type == 'station' ) {
//	cmd = 'PICKSTATION';
//    } else {
//	return;
//    }
//    GH_BROADCAST.channel.postMessage({
//        type: cmd,
//        sender: GH_BROADCAST.selfID,
//        receiver: -1,
//        value: tid
//    });
//}


///////////////////////////////////////
//function ghBroadcastSendRequestUnits(id) {
//    if ( GH_BROADCAST.channel == null ) return;
//    var data = { "lineid" : id }; 
//    GH_BROADCAST.channel.postMessage({
//        type: 'GETUNITS',
//        sender: GH_BROADCAST.selfID,
//        receiver: -1,
//        value: data
//    });
//}
//function ghBroadcastSendUpdateUnits(data) {
//    if ( GH_BROADCAST.channel == null ) return;
//    GH_BROADCAST.channel.postMessage({
//        type: 'UPDATEUNITS',
//        sender: GH_BROADCAST.selfID,
//        receiver: -1,
//        value: data
//    });
//}



