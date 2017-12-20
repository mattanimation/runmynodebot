/*
	Author:
	Project:
	Description:
*/
const os = require('os');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const prefix = os.tmpdir() + path.sep + 'voice_';
let queue = [];
let running = false;
let config = {};

let speech = undefined;

function init(config){
	setInterval(()=>{
		if (!(queue.length===0 || running)){
			running = true;
			let file = prefix + Math.random().toString();
			fs.writeFile(file, queue.shift(), (err)=>{
				if (err) throw err;
				speech = exec('cat ' + file + ' | espeak --stdout | aplay -D plughw:2,0', {shell: '/bin/bash'}, ()=>{
					running = false;
				});
			});
		}
	}, config.tts.update_interval);// Try again every half a second.
}

setInterval(()=>{
  if (!(queue.length === 0 || running)){
    running = true;
    let file = prefix + Math.random().toString();
    fs.writeFile(file, queue.shift(), (err)=>{
      if (err) throw err;
      speech = exec('cat ' + file + ' | espeak --stdout | aplay -D plughw:2,0', {shell: '/bin/bash'}, ()=>{
        running = false;
      });
    });
  }
}, 500);// Try again every half a second.


module.exports = {
	init: init,
	say:(str) => {queue.push(str);},
	kill_processes:()=>{speech.kill();}
}