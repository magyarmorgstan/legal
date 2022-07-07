var isVisible = true;
var isLocked = false;
var lockTimer = undefined;
var eraseTimer = undefined;
var wrongCode = 0;
var isOnline = false;
var members = [];
var input_elem = null;
var replace_emoji = false;
var self_id = 0
var other_id = 1
var incorrect_count = 0
var room_subscribed = ""
var in_reply_mode = false
var in_reply_to = ""
const e_key = "e"
const l_key = "l";
var lock_message_store =[]
var p_key=""
var title_str = ""
var last_status = ""

var kfl=44

var ep="U2FsdGVkX1+UTCGgo3S+GuKtGvOdzdOuF+iQcv5iF+U=U2FsdGVkX1+cFF4/1+JZg7yj95uyVzFew7YGkfBoUBw="
var ea="U2FsdGVkX1+WI9+GK5xtcMDZYuNuWMT30B8vfmBcjTM=U2FsdGVkX1+LN9pUwDPXzHAMx5d10Y0E2q6wwi0/gr8=U2FsdGVkX19Hw9P5wMz8Q+C0bGRGcqzcaKkuIoEL4M4="
var et="U2FsdGVkX18pQn3piGdC59R1dLSzYljE2thRZSUEtTs=U2FsdGVkX1+4npptPzYpfvlI+WfQOMVRbbXPICq3BtQ=U2FsdGVkX196VKxwmzJDt2hB8Ps1MH1YVM1SplYFGFE=";
var ei="U2FsdGVkX18fenFHQLsATe9Z94J2BQh9Yg/z2itiprs=U2FsdGVkX19yE2/oIWSJCewOw4p7uVW0hDmkeH1m7a4=U2FsdGVkX1/nPeINHpMrHNc7AGYP8GLuSekRF8qvK/U="

var uname = undefined
while (uname == undefined || uname == "")
	uname=prompt("Enter Credentials?");

var salt = undefined
while (salt == undefined || salt == "")
	salt=prompt("Token");

console.log(ea.substring(kfl*2,kfl*3))
console.log(decryptMe(ea.substring(kfl*2,kfl*3)))

var eindex=-1
if (decryptMe(ea.substring(0,kfl)) == salt) {
	eindex = 0
} else if (decryptMe(ea.substring(kfl,88)) == salt) {
	eindex = kfl
} else if (decryptMe(ea.substring(kfl*2,kfl*3)) == salt) {
	eindex = kfl*2
}

p_key = ea.substring(eindex,eindex+kfl)
title_str=decryptMe(et.substring(eindex,eindex+kfl))
icon_src="images/"+decryptMe(ei.substring(eindex,eindex+kfl))

const room_name =  uname;
const status_room_name = 'status-' + room_name;
var status_room_subscription = ""
//console.log("Status Room : " + status_room_name)
// connection option
const options = {
    clean: true, // retain session
    connectTimeout: 4000, // Timeout period
	keepalive: 60,
    useSSL: true,
    will: {
      topic: 'scx/' + status_room_name,
      payload: 'Disconnected',
      qos: 1,
      retain: true
    }
}

const mqConnectUrl = 'ws://broker.hivemq.com:8000/mqtt'
mqClient = mqtt.connect(mqConnectUrl, options)

mqClient.on('connect', (error) => {
	addLocalMessage(self_id,'Connected to service successfully')
	mqClient.publish('scx/'+status_room_name,"Online",{retain:true});
})

mqClient.on('reconnect', (error) => {
	addLocalMessage(self_id,'Re-Connecting...')
	console.log('Reconnecting:', error)
})

mqClient.on('error', (error) => {
	addLocalMessage(self_id,'Connection failed...')
	console.log('Connection failed:', error)
})

mqClient.on('message', (topic, message) => {  
	// Check topic
	if (topic == status_room_subscription) {
		last_status = "" + message;
		$("#other-status").html(last_status)
		//$("#l-status").html(last_status)
		set_locked_status()
		return;
	}
	var dmesg = JSON.parse(message)

	if (isLocked) {
		lock_message_store.push(dmesg);
		set_locked_status();
		return;
	}
	
	inspect_incoming_and_add(dmesg)
})

function addLocalMessage(id, msg_to_add) {
	addRemoteMessage(id,encryptMe(msg_to_add));
}

function addRemoteMessage(id, msg_to_add, msg_time="", in_reply_to="") {
	let value = msg_to_add;
	if (value === "") return;
	
	time_stamp = msg_time;

	if (msg_time == "")
		time_stamp = mDate().toString();

	d_time_stamp = mDate().toString()

	if (!isVisible) {
		// We could be unlocked but not visible, 
		// in which case dont set the dtime variaable
		d_time_stamp = ""
	}
	let msg = {
		sender: id,
		body: value,
		time: time_stamp,
		dtime: d_time_stamp,
		status: 1,
		recvId: (id == self_id ? other_id : self_id),
		isReply: (in_reply_to == "" ? 0 : 1),
		replyTo: in_reply_to
	};

	if (isLocked || !isVisible) {
		msg.dtime = "";
	}

	addMessageToMessageArea(msg);
	MessageUtils.addMessage(msg);
};

let getById = (id, parent) => parent ? parent.getElementById(id) : getById(id, document);
let getByClass = (className, parent) => parent ? parent.getElementsByClassName(className) : getByClass(className, document);

const DOM =  {
	messageArea: getById("message-area"),
	inputArea: getById("input-area"),
	messages: getById("messages"),
	messageAreaName: getById("name", this.messageArea),
	messageAreaPic: getById("pic", this.messageArea),
	messageAreaNavbar: getById("navbar", this.messageArea),
	messageAreaDetails: getById("details", this.messageAreaNavbar),
	messageAreaOverlay: getByClass("overlay", this.messageArea)[0],
	messageInput: getById("input"),
};

let mClassList = (element) => {
	return {
		add: (className) => {
			element.classList.add(className);
			return mClassList(element);
		},
		remove: (className) => {
			element.classList.remove(className);
			return mClassList(element);
		},
		contains: (className, callback) => {
			if (element.classList.contains(className))
				callback(mClassList(element));
		}
	};
};

// this will be used to store the date of the last message
// in the message area
let lastDate = "";

let addDateToMessageArea = (date) => {
	DOM.messages.innerHTML += `
	<div class="mx-auto my-2 bg-primary text-white small py-1 px-2 rounded">
		${date}
	</div>
	`;
};

let addMessageToMessageArea = (msg) => {

	if (msg == undefined || msg.body == undefined || msg.body == "")
		return;
	
	let msgDate = mDate(msg.time).getDate();
	if (lastDate != msgDate) {
		addDateToMessageArea(msgDate);
		lastDate = msgDate;
	}

	let dbody = decryptMe(msg.body)
	
	//let dbody = msg.body
	dreply = dbody;
	if (dbody.length > 30)
		dreply = dbody.substring(0,30) + "..."
	
	let dreply_to = ""
	let reply_class = "d-none"

	if (msg.isReply == 1) {
		dreply_to = decryptMe(msg.replyTo)	
		reply_class = ""
	}
	let sendStatus = `<i class="${msg.status < 2 ? "far" : "fas"} fa-check-circle"></i>`;
	
	DOM.messages.innerHTML += `
			<div class="align-self-${msg.sender == self_id ? "end self" : "start"} p-1 my-1 mx-3 rounded bg-white shadow-sm message-item">
				
				<div class="options">
					<a  data-toggle="dropdown" href="#" role="button" aria-haspopup="true" aria-expanded="false">
					<i class="fas fa-angle-down text-muted px-2"></i></a>
					<div class="dropdown-menu dropdown-menu-right">
						<a class="dropdown-item" href="#" onclick="reply_to('${dreply}')">Reply</a>
					</div>
				</div>

				<div class="time ml-auto small text-left flex-shrink-0 align-self-end ${msg.sender == self_id ? "text-success" : "text-primary"} ">${msg.sender == self_id ? "Me" : "Other"} </div>
				
				<div class="d-flex flex-row bg-light rounded ${reply_class} ${reply_class == "d-none" ? "": "border"} ">
					<div class="${reply_class} body m-1 mr-2 time small text-left flex-shrink-0 align-self-end text-muted">${dreply_to}</div>
				</div>

				<div class="d-flex flex-row">
					<div class="body m-1 mr-2">${dbody}</div>
					<div class="time ml-auto small text-right flex-shrink-0 align-self-end text-muted" style="width:75px;">
						${mDate(msg.time).getTime()}
						${(msg.sender == self_id) ? sendStatus : ""}
					</div>
				</div>
			</div>
	`;

    // Scroll to bottom
    DOM.messages.scrollTop = DOM.messages.scrollHeight - DOM.messages.clientHeight;
};

let generateMessageArea = () => {

	mClassList(DOM.inputArea).contains("d-none", (elem) => elem.remove("d-none").add("d-flex"));
	mClassList(DOM.messageAreaOverlay).add("d-none");
	
	DOM.messageAreaName.innerHTML = title_str + (room_subscribed == "" ? " - room not attached" : " ");
	DOM.messageAreaPic.src = icon_src;
	
	//let msgs = MessageUtils.getByContactId(self_id);
	let msgs = MessageUtils.getMessages();

	DOM.messages.innerHTML = "";

	//null s
	if (isLocked) {
		return;
	}
	//null s
	lastDate = "";
	msgs.forEach((msg) => addMessageToMessageArea(msg));

	//.sort((a, b) => mDate(a.time).subtract(b.time))
};

let sendMessage = (msg) => {
	addMessageToMessageArea(msg);
	MessageUtils.addMessage(msg);
};

let init = () => {
	lockTimer = setTimeout(lockScreen,60 * 1000);
};

function subscribe_to_room(room_to) {
    let room_to_subscribe_mq = 'scx/' + room_to;
    addLocalMessage(self_id,'Attaching to room ' + room_to);
    status_room_subscription = "scx/status-" + room_to;
    mqClient.subscribe(room_to_subscribe_mq);
    mqClient.subscribe(status_room_subscription);
	//console.log("Subscribed to : " + room_to_subscribe_mq);
	//console.log("Subscribed status to : " + status_room_subscription);
    addLocalMessage(self_id, 'Subscribed ' + room_to);
	room_subscribed = room_to
	DOM.messageAreaName.innerHTML = "x-official" + ((room_subscribed == "") ? " - room not attached" : "")
}

function encryptMe(msg) {
	//return msg;
	if ( msg == undefined || msg == "")
		return "";
	
	return CryptoJS.AES.encrypt(msg, salt).toString();
}

function decryptMe(msg) {
	if ( msg == undefined || msg == "")
		return "";
	
	var decrypted = CryptoJS.AES.decrypt(msg, salt);
	return decrypted.toString(CryptoJS.enc.Utf8);
}

function inspect_incoming_and_add(message, msg_time = "") {

	var dmesg = decryptMe(message.body)

	if (dmesg.startsWith("/eraseall")) {
		MessageUtils.deleteAllMessages();
		return;
	}

	if (dmesg.startsWith("/lock")) {
		//console.log("Got lock command...")
		lockScreen();
		return;
	}
	
	addRemoteMessage(other_id, message.body, msg_time, message.replyTo)

	if (isLocked || !isVisible) {
		set_locked_status();
	}
}

let inspect_outgoing_and_send = () => {
	let value = DOM.messageInput.value;
	if (value === "") return;
	
	try {
		if (e_key == value.toLowerCase()) {
			MessageUtils.deleteAllMessages();
			lockScreen();
			return;
		}

		if (l_key == value.toLowerCase()) {
			lockScreen();
			return;
		}
		
		if (value.startsWith("/room")) {
			var room_str = value.substring(6);
			subscribe_to_room(room_str);
			return;
		}
		
		let msg = {
			sender: self_id,
			body: encryptMe(value),
			time: mDate().toString(),
			dtime: mDate().toString(),
			status: 2,
			recvId: other_id,
			isReply: (in_reply_mode ? 1 : 0),
			replyTo: (in_reply_mode ? encryptMe(in_reply_to) : "")
		}

		if (value.startsWith("/eraseall")) {
			addLocalMessage(self_id,"Remote cleared...")
		} else if (value.startsWith("/lock"))  {
			DOM.messageInput.value = "";
		} else {
			sendMessage(msg)
		}

		var jmesg = JSON.stringify(msg)
		mqClient.publish('scx/'+ room_name,jmesg)
	} finally {
		DOM.messageInput.value = "";
		if (in_reply_mode)
			hide_reply_to();
	}
}

DOM.messageInput.addEventListener('keypress', function(e) { 

	DOM.messageInput.value = DOM.messageInput.value.replace(":-)","😀")
    DOM.messageInput.value = DOM.messageInput.value.replace(":)","😀")

    DOM.messageInput.value = DOM.messageInput.value.replace(";-)","😉")
    DOM.messageInput.value = DOM.messageInput.value.replace(";)","😉")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-D","😁")
    DOM.messageInput.value = DOM.messageInput.value.replace(":D","😁")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-(","🙁")
    DOM.messageInput.value = DOM.messageInput.value.replace(":(","🙁")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-*","😘")
    DOM.messageInput.value = DOM.messageInput.value.replace(":*","😘")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-#","😘")
    DOM.messageInput.value = DOM.messageInput.value.replace(":#","😘")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-o","😮")
    DOM.messageInput.value = DOM.messageInput.value.replace(":o","😮")

    DOM.messageInput.value = DOM.messageInput.value.replace(":-p","😛")
    DOM.messageInput.value = DOM.messageInput.value.replace(":p","😛")
    DOM.messageInput.value = DOM.messageInput.value.replace(":-P","😛")
    DOM.messageInput.value = DOM.messageInput.value.replace(":P","😛")
    
    DOM.messageInput.value = DOM.messageInput.value.replace(":bikini","👙")
    DOM.messageInput.value = DOM.messageInput.value.replace(":devil","😈")
    DOM.messageInput.value = DOM.messageInput.value.replace(":lips","💋")
    DOM.messageInput.value = DOM.messageInput.value.replace(":kiss","💋")
    DOM.messageInput.value = DOM.messageInput.value.replace(":hot","🔥")
    DOM.messageInput.value = DOM.messageInput.value.replace(":banana","🍌")
    DOM.messageInput.value = DOM.messageInput.value.replace(":kela","🍌")
    DOM.messageInput.value = DOM.messageInput.value.replace(":please","🙏")
    DOM.messageInput.value = DOM.messageInput.value.replace(":heart","❤️")
    DOM.messageInput.value = DOM.messageInput.value.replace(":mango","🥭")

	if (e.which == 10 || e.which == 13) {
		inspect_outgoing_and_send();
	}

	clearLockScreenTimer();
	lockTimer = setTimeout(lockScreen,60 * 1000);
});

function reply_to(msg) {
	DOM.messageInput.value = "";
	$("#in-reply-div").html(msg);
	$("#in_reply_to_container_id").removeClass('d-none');
	in_reply_mode = true
	in_reply_to = msg
	$("#input").focus();
}

let hide_reply_to = () => {
	$("#in_reply_to_container_id").addClass('d-none');
	in_reply_mode = false
	in_reply_to = ""
}

let hideWin = () => {
	DOM.messageInput.value = ""
	$("#main-container").addClass('d-none');
	$("#lock-div").removeClass("d-none");
	isLocked=true
	isVisible=false
}

function showWin() {
	DOM.messageInput.value = ""
    clearLockScreenTimer();
    isVisible = true;
    isLocked = false;
	$("#main-container").removeClass('d-none');   
	$("#lock-div").addClass("d-none");	
	document.title = title_str;
	MessageUtils.markAllRead();
	DOM.messages.scrollTop = DOM.messages.scrollHeight - DOM.messages.clientHeight;
}

function focus_fx(event) {
    clearLockScreenTimer();
    isVisible = true;
    if (!isLocked) {
		document.title = title_str;		
		MessageUtils.markAllRead();
    } else {
		lockTimer = setTimeout(lockScreen,60 * 1000);
	}
}

function blur_fx(event) {
	clearLockScreenTimer();
    lockTimer = setTimeout(lockScreen,60 * 1000);
    isVisible = false;
}

function clearLockScreenTimer() {
    if (lockTimer != undefined) {
        clearTimeout(lockTimer);
        lockTimer = undefined
    }
}

function lockScreen() {
    clearLockScreenTimer();
    if (!isLocked) {
        hideWin()
		set_locked_status();
		$("#lock-div").removeClass("d-none");
		salt = undefined
		//salt = " "
	}
	isLocked = true
	//null s
	generateMessageArea()
	//null s
}

function unlockMe() {
	let input_var = $("#input-lock").val()
	$("#input-lock").val("")
	salt = input_var
	if (decryptMe(p_key) == input_var) {
		isLocked = false;
		showWin();
		incorrect_count=0
		//null s
		lock_message_store.forEach((msg) => inspect_incoming_and_add(msg, msg.time));
		lock_message_store = [];
		generateMessageArea();
		//null s
	} else {
		alert("This works!")
		incorrect_count++;
	}

	if (incorrect_count > 2)
		window.top.close();
}

function set_locked_status() {
	let unread_count = lock_message_store.length + MessageUtils.getUnreadCount();
	//console.log("unread count: " + unread_count)
	//console.log("lock count : " + lock_message_store.length)
	//console.log("m unread : " + MessageUtils.getUnreadCount())

	var set_text = last_status

	if (unread_count !=0 ) {
		set_text += " [" + unread_count + "]";
		if (isLocked || !isVisible)
			document.title = "[" + unread_count + "]";
		else 
			document.title = title_str;
	} else {
		document.title=title_str;
	}
	$("#l-status").html(set_text)
}

$("#input-lock").keypress(function(e) {  
	if (e.which == 10 || e.which == 13) {
		unlockMe();
	}
});

function erase_msgs() {
	
	MessageUtils.deleteOldMessages();
	generateMessageArea()

	try {
		mqClient.publish('scx/'+status_room_name,"Online",{retain:true});
	} finally {

	}
}

$("#in_reply_to_container_id").addClass('d-none');
$("#lock-div").addClass("d-none");

window.addEventListener("focus", focus_fx);
window.addEventListener("blur", blur_fx);

if (eindex == -1) {
	hideWin()
} else {
	init();
	generateMessageArea()
	eraseTimer = setInterval(erase_msgs,60*1000);
}
$(document).mousemove(function(event){
	if (!isLocked) {
		clearLockScreenTimer();
		lockTimer = setTimeout(lockScreen,60 * 1000);
	}
});
