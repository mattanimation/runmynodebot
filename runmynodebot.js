#!/usr/bin/env node
/*
	Author:
	Project:
	Description:
*/
const colors = require('colors/safe');
const argv = require('./cli-args');

const config = argv.configuration;

//Load plugins.
let plugins = {};
if (config.plugins){
	let names = Object.keys(config.plugins);
	names.forEach((name)=>{
		let conf = config.plugins[name];
		let mpath = conf.path;
		let module;
		if (mpath) {
			module = require(config.getFile(mpath));
		} else {
			module = require('./plugins/' + name);
		}
		plugins[name] = {
				name: name,
				module: module,
				config: conf
		};
		console.log(colors.green('Plugin loaded:'), colors.white(name+(mpath?' ('+mpath+')':'')));
	});
}

let robot;

if (!argv['no-connect']){
	// Server connection setup
	const io = require('./RobotIO');
	//console.log("ARGV")
	//console.log(argv)
	robot = new io({
		robotID: argv._[1],
		cameraID: argv.video,
		env: argv.env
		});
} else {
	// If the no-connect flag was set, just have robot be a dud event emitter that can be used for debugging.
	const EventEmitter = require('events');
	robot = new EventEmitter();
}

let drive_man, video, devices;

const drive_mode = require('./drive_modes/'+config.driving.mode);

const hw = require('./hardware/config');
hw(config, argv.repl).then((hardware)=>{
	if(hardware != null){
		devices = hardware;

		// Initializing drive manager with selected drive mode.
		let drive_opts = {};
		// Command line arguments overwrite config values.
		let drive_args = ['bias', 'speed', 'turn-time', 'straight-time', 'turn-speed'].reduce((acc, key) => {
			if (argv[key]){
				acc[key] = argv[key];
			}
			return acc;
		}, {});
		Object.assign(drive_opts, config.driving, drive_args);
		drive_man = new drive_mode(drive_opts, config.getFile, devices, robot);

		//Initialize plugins.
		Object.keys(plugins).forEach(name =>{
			let plugin = plugins[name];
			plugin.instance = new plugin.module(plugin.config.options, config.getFile, devices, robot);
		});
	}

	//init video stream and start
	if (argv.video){
		const ffmpeg = require('./video_drivers/FFMPEG');
		console.log("adding video");
		video = new ffmpeg(robot, config.video, config.getFile); // TODO add opts.
		video.start();
	}

	//init hardware and connect
	if (argv.repl){
		hardware.repl.inject({robot: robot, plugins: plugins, drive_man: drive_man});
		if (argv.video){
			hardware.repl.inject({video: video});
		}
	}
});

// If verbose, output command data.
if (argv.verbose) robot.on('command_to_robot', console.log);

//Setting up tts
const say = require('./tts_drivers/'+argv['tts-driver']);

const urlfilter = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/i; //Regex url string.

//add chat event handler for tts? why here?
robot.on('chat_message_with_name', data => {
	if (data.message.search(urlfilter)===-1 && (!data.anonymous || argv['allow-anon-tts'])) { //If no urls and not anonymous (or anon tts enabled)
		say(data.message.slice(data.message.indexOf(']')+2));
	}
});