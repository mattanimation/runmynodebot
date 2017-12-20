/*
	Author:
	Project:
	Description: Connect to LetsRobot.tv 
*/

const io = require('socket.io-client');
const EventEmitter = require('events');
const { format } = require('util');
const { jsonGrab } = require('./util');
const ip = require("ip"); //https://github.com/indutny/node-ip


const server = 'letsrobot.tv';
const port ={
	prod: 8022,
	dev: 8122
}
/*
RobotIO: 
*/
class RobotIO extends EventEmitter {

	constructor(opts={}){
		super();
		this.robotID = opts.robot_id.toString();
		this.cameraID = opts.camera_id.toString();
		this.owner = opts.owner;

		this.appSocket = null;
		this.controlSocket = null;
		this.chatSocket = null;
		
		//setup app socket first
		this.setupAppServerSocket();
		
		//setup control host
		this.getControlHostPort()
		.then((controlHostPort) => {this.setupControlSocket(controlHostPort, this);})
		.catch((e)=>{console.log(e)});
		
		//setup chat 
		this.getChatHostPort()
		.then((chatHostPort) => {this.setupChatSocket(chatHostPort, this);})
		.catch((e)=>{console.log(e)});

	}

	identifyRobotID(_sock){
		console.log(`identifying robot id: ${this.robotID}`);
		const _this = this;
		_sock.emit('identify_robot_id', this.robotID);

		_this.delayedExec(()=>{
			_sock.emit('ip_information', {'ip': ip.address(), 'robot_id': _this.robotID})
		});
	}

	setupAppServerSocket(){
		const _this = this;
		console.log("connecting to app server");
		let _wsUrl = `http://${server}:${port.prod}`;
		console.log(_wsUrl);
		this.appServerSocket = io.connect(_wsUrl, {reconnect: true});

		//add connection events
		this.appServerSocket.on('connect', ()=>{
			console.log("app server did connect! ");
			_this.identifyRobotID(_this.appServerSocket);
			
			console.log("you should be up and running at: ");
			console.log(`https://letsrobot.tv/robocaster/${_this.owner}/robot/${_this.robotID}`);
		});

		this.appServerSocket.on('reconnect', ()=>{
			console.log("app server did reconnect! ");
			//so whatever here
			_this.identifyRobotID(_this.appServerSocket);
		});

		this.appServerSocket.on('disconnect', ()=>{
			console.log("app server did disconnect! ");
			//so whatever here
		});

		this.appServerSocket.on('exclusive_control', data => {
			if (data.robot_id===_this.robotID || !_this.robotID){
				_this.emit('exclusive_control', data); //this sends to control in ?
			}
		});

		this.sendApp = this.emit.bind(this.appServerSocket);
	}

	setupControlSocket(controlHostPort, _this){
		console.log("got control host port");
		if(_this.robotID){
			console.log("i have a robot id: "+this.robotID);
			let _wsUrl = `http://${controlHostPort.host}:${controlHostPort.port}`; //${_this.robotID}`;
			console.log("control host: " + _wsUrl);
			_this.controlSocket = io.connect(_wsUrl, {reconnect: true});

			_this.controlSocket.on('command_to_robot', data => {
				//console.log(`COMMMAND TO ROBOT!!! ${data}`);
				//console.log(data)
				if (data.robot_id ===_this.robotID || !_this.robotID){
					_this.emit('command_to_robot', data);
				}
			});
			
			_this.sendControl = _this.emit.bind(_this.controlSocket);

		}
		else
			console.log("no robot id...");
	}


	setupChatSocket(chatHostPort, _this){
		console.log("got chat host port");
		if(_this.robotID){
			let _wsUrl = `http://${chatHostPort.host}:${chatHostPort.port}`;
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
				console.log(data)
				if (data.robot_id === _this.robotID){
					_this.emit('chat_message_with_name', data); //this sends up to tts in runmyrobot.js
				}
			});

			_this.sendChat = _this.emit.bind(_this.chatSocket);
		}
		else
			console.log("no robot id...");
	}

	delayedExec(func){
		setTimeout(()=>{
			func();
		}, 150);
	}

	sendChargeState(charging){
		let chargeState = {robot_id: this.robotID, charging: charging}
    	this.appServerSocket.emit('charge_state', chargeState);
    	console.log(`charge state: ${chargeState}`);
	}

	getOwnerDetails(){
		return jsonGrab(`https://api.letsrobot.tv/api/v1/accounts/${this.owner}`);
	}

	getControlHostPort(){
		let _url = `https://${server}/get_control_host_port/${this.robotID}`;
		console.log(`getting control host port from: ${_url}`);
		return jsonGrab(_url);
	}

	getChatHostPort(){
		let _url = `https://${server}/get_chat_host_port/${this.robotID}`;
		console.log(`getting chat host port from: ${_url}`);
		return jsonGrab(_url)
	}

	getAudioPort(){
		return jsonGrab(`https://${server}/get_audio_port/${this.cameraID}`);
	}

	getVideoPort(){
		return jsonGrab(`https://${server}/get_video_port/${this.cameraID}`);
	}

	//call this periodically to let server know the stream is active
	setOnlineStatus(_onOff){
		console.log("sending online status");
		//Tell the server we are online
		this.appServerSocket.emit('send_video_status', {
			"send_video_process_exists": _onOff,
			ffmpeg_process_exists: _onOff,
			camera_id: this.cameraID
		});
	}

}

module.exports = RobotIO;