/*
	Author:
	Project:
	Description:
*/
const { format } = require('util');
const { exec } = require('child_process');

//https://gist.github.com/r3n33/acaa8110c9c11b2a7d865e62ef29a320
const filters = {
		dynoverlay: (opts, getFile)=>{
			let build = 'dynoverlay=overlayfile=';
			build += getFile(opts.file);
			if (opts.check_interval){
				build += ':check_interval='+opts.check_interval;
			}
			if (opts.x){
				build += ':x='+opts.x;
			}
			if (opts.y){
				build += ':y='+opts.y;
			}
			return build;
		}, flip: ()=>'transpose=2,transpose=2'
}

/*
@param {Object} config
@param {} getFile
*/
function buildFilterCli(config, getFile){
	let build = '';
	if (config.filters && config.filters.length){
		build += '-vf ';
		let filist = [];
		config.filters.forEach((filter) => {
			filist.push(filters[filter.type](filter, getFile));
		});
		build += filist.join(',');
		build += ' ';
	}
	return build;
}

const cmd = '/usr/local/bin/ffmpeg';
const server = "letsrobot.tv";//"runmyrobot.com";
const streamkey = 'hello';

/*
FFMPEG: 
*/
class FFMPEG {

	constructor(robot, config, getFile, opts={}){
		this.os = 'osx'; //this needs to go somwhere else
		this.robot = robot;
		this.config = { //These are just defaults.
				videoDeviceNumber: 0,
				micChannels: 1,
				audioDeviceNumber: 1,
				kbps: 350
		}
		Object.assign(this.config, config, opts);
		this.getFile = getFile;
	}

	start(){
		setInterval(() => {
			if (!this.audio){
				//this.startAudio();
			}
			if (!this.video){
				this.startVideo();
			}
		}, 5000); // Check every 5 seconds.

		setInterval(() => {
			this.robot.send('send_video_status', {
				send_video_process_exists: true,
                ffmpeg_process_exists: true,
                camera_id: this.robot.cameraID
			});
		}, 60000); // Send every minute.
	}

	startAudio(){
		if (this.audio){
			this.audio.kill();
		}
		this.robot.getAudioPort()
		.then(({ audio_stream_port }) => {
			let cmdString = ``;
			if(this.os == 'osx')
				cmdString = `?`;
			else
				cmdString = `${cmd} -f alsa -ar 44100 -ac ${this.config.micChannels} -i hw:${this.config.audioDeviceNumber} -f mpegts -codec:a mp2 -b:a 32k -muxdelay 0.001 http://${server}:${audio_stream_port}/${streamkey}/640/480/`;
			this.audio = exec(cmdString,
					{shell: '/bin/bash'},
					(err, stdout, stderr) => {
						if (err){
							console.log(err);
						}
						this.audio = undefined;
					});
		});
	}

	startVideo(){
		if (this.video){
			this.video.kill();
		}
		this.robot.getVideoPort()
		.then(({ mpeg_stream_port }) => {
			console.log("GOT SREAM PORT: ", mpeg_stream_port)
			let cmdString = ``;
			if(this.os == 'osx')
				cmdString = `${cmd} -f avfoundation -video_size 640x480 -framerate 30.0 -i "0:0" -f mpegts -vcodec mpeg1video -s 640x480 http://${server}:${mpeg_stream_port}/${streamkey}/640/480/`;
			else if(this.os == 'linux')
				cmdString = `${cmd} -f v4l2 -video_size 640x480 -i /dev/video${this.config.videoDeviceNumber} -f mpegts -r 30 -codec:v mpeg1video -s 640x480 -b:v ${this.config.kbps}k -bf 0 -muxdelay 0.001 ${buildFilterCli(this.config, this.getFile)} http://${server}:${mpeg_stream_port}/${streamkey}/640/480/`;
			console.log("video cmd string: " + cmdString);
			this.video = exec(cmdString, 
					{shell: '/bin/bash'},
					(err, stdout, stderr) => {
						if (err){
							console.log(err);
						}
						this.video = undefined;
					});
		});
	}

}
module.exports = FFMPEG;
