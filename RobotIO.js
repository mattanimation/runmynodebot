/*
	Author:
	Project:
	Description: Connect to LetsRobot.tv 
*/

const io = require('socket.io-client');
const EventEmitter = require('events');
const { format } = require('util');
const { jsonGrab } = require('./util');

const server = 'letsrobot.tv';
const port = {
		prod: 8022,
		dev: 8122
}

/*
RobotIO: 
*/
class RobotIO extends EventEmitter {

	constructor(opts={}){
		super();
		this.robotID = opts.robotID;
		this.cameraID = opts.cameraID;
		this.env = opts.env;

		this.controlSocket = null;
		this.chatSocket = null;
		
		//get chat and control ports first
		/*
		this.getControlHostPort()
		.then((controlHostPort) => {this.setupControlSocket(controlHostPort, this);})
		.catch((e)=>{console.log(e)});
		*/
		
		//get chat socket connection
		this.getChatHostPort()
		.then((chatHostPort) => {this.setupChatSocket(chatHostPort, this);})
		.catch((e)=>{console.log(e)});

		/*
		this.socket = io.connect(`http://${server}:${port[this.env]}`, {reconnect: true});

		if (this.robotID) {
			this.socket.on('connect', ()=>{
				this.socket.emit('identify_robot_id', this.robotID);
			});
		}

		this.socket.on('command_to_robot', data => {
			if (data.robot_id===this.robotID || !this.robotID){
				this.emit('command_to_robot', data);
			}
		});
		this.socket.on('exclusive_control', data => {
			if (data.robot_id===this.robotID || !this.robotID){
				this.emit('exclusive_control', data);
			}
		});
		this.socket.on('chat_message_with_name', data => {
			if (data.robot_id===this.robotID || !this.robotID){
				this.emit('chat_message_with_name', data);
			}
		});
		
		this.send = this.socket.emit.bind(this.socket);
		*/


	}

	identifyRobotID(_sock){
		console.log("identifying robot id");
		_sock.emit('identify_robot_id', this.robotID);
	}

	setupControlSocket(controlHostPort, _this){
		console.log("got control host port");
		if(_this.robotID){
			console.log("i have a robot id: "+this.robotID);
			let _wsUrl = `http://${controlHostPort.host}:${controlHostPort.port}/${_this.robotID}`;
			console.log(_wsUrl);
			_this.controlSocket = io.connect(_wsUrl, {reconnect: true});

			//add connection events
			_this.controlSocket.on('connect', ()=>{
				console.log("control did connect! ");
				_this.identifyRobotID(_this.controlSocket);
			});

			_this.controlSocket.on('reconnect', ()=>{
				console.log("control did reconnect! ");
				//so whatever here
				_this.identifyRobotID(_this.controlSocket);
			});

			_this.controlSocket.on('disconnect', ()=>{
				console.log("control did disconnect! ");
				//so whatever here
			});

			_this.controlSocket.on('command_to_robot', data => {
				if (data.robot_id===_this.robotID || !_this.robotID){
					_this.emit('command_to_robot', data);
				}
			});

			_this.controlSocket.on('exclusive_control', data => {
				if (data.robot_id===_this.robotID || !_this.robotID){
					_this.emit('exclusive_control', data);
				}
			});
			
			_this.sendControl = _this.controlSocket.emit.bind(_this.controlSocket);

		}
		else
			console.log("no robot id...");
	}


	setupChatSocket(chatHostPort, _this){
		console.log("got chat host port");
		if(_this.robotID){
			let _wsUrl = `http://${chatHostPort.host}:${chatHostPort.port}/${_this.robotID}`;
			console.log(_wsUrl);
			_this.chatSocket = io.connect(_wsUrl, {reconnect: true});

			_this.chatSocket.on('connect', ()=>{
				console.log("chat did connect! ");
				_this.identifyRobotID(_this.chatSocket);
			});

			_this.chatSocket.on('reconnect', ()=>{
				console.log("chat did reconnect! ");
				_this.identifyRobotID(_this.chatSocket);
			});

			_this.chatSocket.on('disconnect', ()=>{
				console.log("chat did disconnect! ");
				//do whatever here
			});

			_this.chatSocket.on('chat_message_with_name', data => {
				if (data.robot_id===_this.robotID || !_this.robotID){
					_this.emit('chat_message_with_name', data);
				}
			});

			_this.sendChat = _this.chatSocket.emit.bind(_this.chatSocket);
		}
		else
			console.log("no robot id...");
	}

	getOwnerDetails(username){
		return jsonGrab(`https://api.letsrobot.tv/api/v1/accounts/${username}`);
	}

	getControlHostPort(){
		let _url = `https://${server}/get_control_host_port/${this.robotID}`;
		console.log(`control host url: ${_url}`)
		return jsonGrab(_url);
	}

	getChatHostPort(){
		let _url = `https://${server}/get_chat_host_port/${this.robotID}`;
		console.log(`chat host url: ${_url}`)
		return jsonGrab(_url)
	}

	getAudioPort(){
		return jsonGrab(`https://${server}/get_audio_port/${this.cameraID}`);
	}

	getVideoPort(){
		return jsonGrab(`https://${server}/get_video_port/${this.cameraID}`);
	}

}

module.exports = RobotIO;