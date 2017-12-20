/*
	Author:
	Project:
	Description:
*/
const { format } = require('util');
const { exec } = require('child_process');
const os = require('os');

//https://gist.github.com/r3n33/acaa8110c9c11b2a7d865e62ef29a320
const filters = {
  dynoverlay: (opts, getFile)=>{
    let build = 'dynoverlay=overlayfile=';
    build += getFile(opts.file);
    if (opts.check_interval){
      build += ':check_interval=' + opts.check_interval;
    }
    if (opts.x){
      build += ':x=' + opts.x;
    }
    if (opts.y){
      build += ':y=' + opts.y;
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

/*
FFMPEG: 
*/
class FFMPEG {

	constructor(robot, config, getFile, opts={}){
		this.os = os.type(); //this needs to go somwhere else
		console.log("OS IS: " + this.os)
		this.config = config || {};
		this.robot = robot;
		this.getFile = getFile;
		this.audio = null;
		this.video = null;

		this.onlineStatusInt = null;
		this.checkAVInt = null;
	}

	start(){
		const _this =this;

		this.checkAVInt = setInterval(() => {
			if (!_this.audio){
				this.startAudio();
			}
			if (!_this.video){
				_this.startVideo();
			}
		}, 5000); // Check every 5 seconds.

		//check in for server to show online
		this.onlineStatusInt = setInterval(() => {
			_this.robot.setOnlineStatus(true);
		}, 60000); // Send every minute.
	}

	/*
	make sure this fails gracefully and the streams don't stay on
	*/
	kill_processes(){
		clearInterval(this.onlineStatusInt);
		clearInterval(this.checkAVInt);
		if(this.audio)
			this.audio.kill();
		if(this.video)
			this.video.kill();
	}

	startAudio(){
		if (this.audio){
			this.audio.kill();
		}
		this.robot.getAudioPort()
		.then(({ audio_stream_port }) => {
			let cmdString = ``;
			if(this.os == 'Darwin')
				cmdString = `${cmd} -f avfoundation -i ":${this.config.audio.deviceNumber}" -f mpegts -codec:a mp2 -b:a ${this.config.audio.kbps}k -muxdelay 0.001 http://${this.config.letsrobot.host}:${audio_stream_port}/${this.config.letsrobot.stream_key}/640/480/`;
			else
				cmdString = `${cmd} -f alsa -ar 44100 -ac ${this.config.micChannels} -i hw:${this.config.audioDeviceNumber} -f mpegts -codec:a mp2 -b:a 32k -muxdelay 0.001 http://${this.config.letsrobot.host}:${audio_stream_port}/${this.config.letsrobot.stream_key}/640/480/`;
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
			let cmdString = ``;
			if(this.os == 'Darwin')
				cmdString = `${cmd} -f avfoundation -video_size ${this.config.video.size_x}x${this.config.video.size_y} -framerate 30.0 -i "${this.config.video.deviceNumber}:" -f mpegts -vcodec mpeg1video -b:v ${this.config.video.kbps}k -s 640x480 http://${this.config.letsrobot.host}:${mpeg_stream_port}/${this.config.letsrobot.stream_key}/640/480/`;
			else
				cmdString = `${cmd} -f v4l2 -video_size 640x480 -i /dev/video${this.config.videoDeviceNumber} -f mpegts -r 30 -codec:v mpeg1video -s 640x480 -b:v ${this.config.video.kbps}k -bf 0 -muxdelay 0.001 ${buildFilterCli(this.config, this.getFile)} http://${server}:${mpeg_stream_port}/${streamkey}/640/480/`;
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
