
let user = {
	id: 0,
	name: "X",
};

// message status - 0:sent, 1:delivered, 2:read

let messages = [];

let MessageUtils = {
	getByGroupId: (groupId) => {
		return messages.filter(msg => msg.recvIsGroup && msg.recvId === groupId);
	},
	getByContactId: (contactId) => {
		return messages.filter(msg => {
			return !msg.recvIsGroup && ((msg.sender === user.id && msg.recvId === contactId) || (msg.sender === contactId && msg.recvId === user.id));
		});
	},
	getMessages: () => {
		return messages;
	},
	changeStatusById: (options) => {
		messages = messages.map((msg) => {
			if (options.isGroup) {
				if (msg.recvIsGroup && msg.recvId === options.id) msg.status = 2;
			} else {
				if (!msg.recvIsGroup && msg.sender === options.id && msg.recvId === user.id) msg.status = 2;
			}
			return msg;
		});
	},
	addMessage: (msg) => {
		msg.id = messages.length + 1;

		messages.push(msg);
	},
	getUnreadCount: () => {
		let unread_count = 0
		current_time = mDate().toString();

		messages.forEach(msg => {
			if (msg.dtime == "" || msg.dtime == undefined)
				unread_count++;
		});
		return unread_count;
	},
	markAllRead: () => {	
		current_time = mDate().toString()
		messages.forEach(msg => {
			if (msg.dtime == undefined || msg.dtime == "")
				msg.dtime = current_time
		})

		/*messages = messages.map(msg => {
			msg.dtime = current_time
		});*/
	},
	deleteOldMessages: () => {
		let now = mDate()
		messages = messages.filter(msg => {
			if (msg.dtime == undefined || msg.dtime == "")
			  return msg;
			if (now.subtract(mDate(msg.dtime)) <  60 * 60 * 1000) { 
				return msg;
			} 
			
		})
	},
	deleteAllMessages: () => {
		messages = [];
	}
};