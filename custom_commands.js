/*
	Author:
	Project:
	Description:
*/

const { removeUsername } = require('./util');

class CustomCommands{
	constructor(_robot){
		const _this = this;
		this.robot = _robot;

		//place any custom commands here and how to hadnle them
		this.chatCommands = {
			'.poop':(_arg)=>{ console.log("ferp....ploosh! "+ _arg);},
			'.play':(_arg)=>{ console.log("play some youtube link? "+ _arg);}
		};

		this.robotCommands = {
			"F":()=>{console.log("ferp");},
			"stop":()=>{console.log("halt");}
		}

		//custom chat commands
		this.robot.on('chat_message_with_name', data=>{
			/*
			{ name: 'mattanimation',
			  message: '[testbot] .poop',
			  robot_id: '32606353',
			  room: 'mattanimation',
			  non_global: true,
			  username_color: '#F3Eb48',
			  anonymous: false,
			  _id: '5a39f2b7fd753d632fbdd2c2' }
			*/
			_this.chatCommandParser(removeUsername(data.message));
		});

		//custom robot commands
		this.robot.on('command_to_robot', data=>{
			/*
			{
				command: 'F',
				robot_id: '32606353',
				key_position: '',
				user: 'mattanimation',
				anonymous: false
			}
			*/
			_this.robotCommandParser(data);
		});

		let tmp = { name: 'mattanimation',
			  message: '[testbot] .poop face',
			  robot_id: '32606353',
			  room: 'mattanimation',
			  non_global: true,
			  username_color: '#F3Eb48',
			  anonymous: false,
			  _id: '5a39f2b7fd753d632fbdd2c2' }
		this.chatCommandParser(removeUsername(tmp.message));
	
	}

	chatCommandParser(_cmd){
		let dotInd = _cmd.indexOf('.');
		if(dotInd === 0){
			let cCmd = _cmd.substr(0, _cmd.indexOf(' '));
			console.log(cCmd);
			const splt = _cmd.split(cCmd);
			console.log(splt);
			if(splt.length > 1)
				this.chatCommands[cCmd](splt[1]);
			else
				this.chatCommands[_cmd]();
		}
	}

	robotCommandParser(data){
		if (data.key_position !== 'up' && data.command in this.robotCommands){
			this.robotCommands[data.command]();
		}
	}
}

module.exports = CustomCommands
