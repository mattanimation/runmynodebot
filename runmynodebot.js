#!/usr/bin/env node
/*
	Author:
	Project:
	Description:
*/
const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');
//const argv = require('./cli-args'); //TODO, come back to this
const yaml = require('js-yaml');

const urlfilter = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:/~+#-]*[\w@?^=%&/~+#-])?/i; //Regex url string.
const child = require('child_process');
/*
child.exec('flite -lv', {}, (err, stdout, stderr) => {
	if (err) {
    	console.error(`exec error: ${err}`);
    	return;
  	}
	console.log(`stdout: ${stdout}`);
	console.log(`stderr: ${stderr}`);
});
*/
/*
const bat = child.spawn('flite', ['--version']);

bat.stdout.on('data', (data) => {
  console.log(data.toString());
});

bat.stderr.on('data', (data) => {
  console.log(data.toString());
});

bat.on('exit', (code) => {
  console.log(`Child exited with code ${code}`);
});
*/



//const config = argv.configuration;
let config = {};
let indentedJson={};
//load config from yml file
// ref: http://thisdavej.com/getting-started-with-yaml-in-node-js-using-js-yaml/

//this will override any argv
try {
    config = yaml.safeLoad(fs.readFileSync('config.yml', 'utf8'));
    //set caster url
    config.robocasterURL = `https://letsrobot.tv/robocaster/${config.robot.owner}/robot/${config.robot.robot_id}`;
    indentedJson = JSON.stringify(config, null, 4);
    console.log("config successfully loaded");
    //console.log(indentedJson);
} catch (e) {
    console.log(e);
}

let robot;
let plugins = {};
let drive_man, video, devices;
const drive_mode = require(`./drive_modes/${config.driving.mode}.js`);
const hw = require('./hardware/config');
const tts = require(`./tts_drivers/${config.tts.type}.js`);//argv['tts-driver']);
tts.init(config); 

//Load plugins.
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
    console.log(colors.green('Plugin loaded:'), colors.white(name + (mpath ? ' (' + mpath + ')' : '')));
  });
}

//connect to letsrobot.tv or not


//if (!argv['no-connect']){
	// Server connection setup
	const rbtIO = require('./RobotIO');
	//console.log("ARGV")
	//console.log(argv)
	robot = new rbtIO(config.robot);
//} else {
	// If the no-connect flag was set, just have robot be a dud event emitter that can be used for debugging.
//	const EventEmitter = require('events');
//	robot = new EventEmitter();
//}


//load hardware config and setup
let fpath = path.resolve(__dirname, 'hardware', 'defaults.yml');
const hardwareConfig = yaml.safeLoad(fs.readFileSync(fpath), 'utf8');
//console.log(hardwareConfig)
//argv.repl
hw(hardwareConfig, false).then((hardware)=>{
	if(hardware != null){
		devices = hardware;
		// Initializing drive manager with selected drive mode.
		let drive_opts = {};
		// Command line arguments overwrite config values.
		
		//let drive_args = ['bias', 'speed', 'turn-time', 'straight-time', 'turn-speed'].reduce((acc, key) => {
		//	if (argv[key]){
		//		acc[key] = argv[key];
		//	}
		//	return acc;
		//}, {});
		//Object.assign(drive_opts, config.driving, drive_args);
		
		drive_man = new drive_mode(drive_opts, config.getFile, devices, robot);

		//Initialize plugins.
		Object.keys(plugins).forEach(name =>{
			let plugin = plugins[name];
			plugin.instance = new plugin.module(plugin.config.options, config.getFile, devices, robot);
		});
	}

	//init video stream and start
	//if (argv.video){
		const ffmpeg = require('./video_drivers/FFMPEG');
		console.log("adding video");
		video = new ffmpeg(robot, config, config.getFile); // TODO add opts.
		video.start();
	//}

	//init hardware and connect
	//if (argv.repl){
		hardware.repl.inject({robot: robot, plugins: plugins, drive_man: drive_man});
		//if (argv.video){
			hardware.repl.inject({video: video});
		//}
	//}
});

// If verbose, output command data.
//if (argv.verbose) robot.on('command_to_robot', console.log);

//Setting up tts
//add chat event handler for tts? why here?
robot.on('chat_message_with_name', data => {
	//If no urls and not anonymous (or anon tts enabled)
	if (data.message.search(urlfilter)===-1 && (!data.anonymous || this.config.tts.anon-tts)) {
		let msgWoutBotname = data.message.slice(data.message.indexOf(']')+2)
		tts.say(msgWoutBotname);
	}
});

//setup handler for custom controls
const cc = require(path.join(__dirname, 'custom_commands'));
const customCommands = new cc(robot);

//tell server we are starting
robot.setOnlineStatus(true);



//console.log(`YOU SHOULD BE UP AND RUNNING AT: https://letsrobot.tv/robocaster/${config.robot.owner}/robot/${config.robot.robot_id}`);

//end

// ======= handle any script closures ========
//ref: http://stackoverflow.com/questions/14031763/doing-a-cleanup-action-just-before-node-js-exits

process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {

	//send stop streaming when quit
	if(robot != undefined || robot != null){
		robot.setOnlineStatus(false);
		video.kill_processes();
	}

    if (options.cleanup) console.log('clean');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

