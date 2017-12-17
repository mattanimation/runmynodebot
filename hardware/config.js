/*
	Author:
	Project:
	Description:
*/
const five = require('johnny-five');

<<<<<<< HEAD
/*
@param {Object} conf
@param {Boolean} repl
@return {Promise}
*/
function setupHardware(conf, repl=false){
	console.log("WTF")
	let boardsconf = conf.boards;
	let partsconf = conf.parts;
	return new Promise((resolve) => {
		let devicemap = {};
		let board_opts = readBoards(boardsconf, repl);
		//dont load board if none set
		if(board_opts.real[0].id == "None") {
			resolve(null);
			return;
		}

		const boards = new five.Boards(board_opts.real);
		boards.on('ready', ()=>{
			boards.forEach((board) => {
				devicemap[board.id] = board;
			});
			board_opts.virtual.forEach((vboard)=>{
				devicemap[vboard.id] = new five.Board.Virtual(new five.Expander(vboard));
			});
			partsconf.forEach((partcfg)=>{
				initPart(partcfg, devicemap);
			});
			if (repl){
				boards.repl.inject({
					devices: devicemap
				});
				devicemap.repl = boards.repl;
			}
			resolve(devicemap);
		});
	});
}

const defineBoard = require('./boardDef');
/*
@param {Object} boardsConf
@param {Boolean} repl
@return {Object}
*/
function readBoards(boardsConf, repl=false){
	let real = [];
	let virt = [];
	boardsConf.forEach((boardcfg)=>{
		let opts = defineBoard(boardcfg);
		opts.repl = repl;
		if (opts.custom && opts.custom.virtual){
			virt.push(opts);
		} else {
			real.push(opts);
		}
	});
	return {
		real: real,
		virtual: virt
	};
=======
function setupHardware(conf, repl = false){
  let boardsconf = conf.boards;
  let partsconf = conf.parts;
  return new Promise((resolve) => {
    var devicemap = {};
    let board_opts = readBoards(boardsconf, repl);
    var boards = new five.Boards(board_opts.real);
    boards.on('ready', ()=>{
      boards.forEach((board) => {
        devicemap[board.id] = board;
      });
      board_opts.virtual.forEach((vboard)=>{
        devicemap[vboard.id] = new five.Board.Virtual(new five.Expander(vboard));
      });
      partsconf.forEach((partcfg)=>{
        initPart(partcfg, devicemap);
      });
      if (repl){
        boards.repl.inject({
          devices: devicemap
        });
        devicemap.repl = boards.repl;
      }
      resolve(devicemap);
    });
  });
}

const defineBoard = require('./boardDef');
function readBoards(boardsConf, repl = false){
  let real = [];
  let virt = [];
  boardsConf.forEach((boardcfg)=>{
    let opts = defineBoard(boardcfg);
    opts.repl = repl;
    if (opts.custom && opts.custom.virtual){
      virt.push(opts);
    } else {
      real.push(opts);
    }
  });
  return {
    real: real,
    virtual: virt
  };
>>>>>>> b7a502ca8e3cdf4f4a652962386c85f67d8faa47
}

const findPreset = require('./part_presets');
const { dive } = require('../util');
/*
@param {Object} partconf
@param {Object} devicemap
@return null
*/
function initPart(partconf, devicemap){
  let opts = {id: partconf.id || partconf.type};
  if (partconf.preset){
    Object.assign(opts, findPreset(partconf));
  }
  if (partconf.options) {
    Object.assign(opts, partconf.options);
  }
  if (opts.board && opts.board in devicemap){
    opts.board = devicemap[opts.board];
  }
  // Find the part type by literally calling it from the defined type.
  let partClass = dive(five, partconf.type);
  devicemap[opts.id] = new partClass(opts);
}

module.exports = setupHardware;