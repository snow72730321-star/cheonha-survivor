"use strict";
function pdown(e){if(state!=="playing")return;if(e.clientX>W*.68&&e.clientY<95)return;e.preventDefault();initAudio();pointer.active=true;pointer.id=e.pointerId;pointer.ox=pointer.x=e.clientX;pointer.oy=pointer.y=e.clientY;ui.joystick.style.left=pointer.ox+"px";ui.joystick.style.top=pointer.oy+"px";ui.joystick.style.display="block";try{canvas.setPointerCapture(e.pointerId)}catch(_){}}
function pmove(e){if(!pointer.active||e.pointerId!==pointer.id)return;e.preventDefault();pointer.x=e.clientX;pointer.y=e.clientY}
function pup(e){if(!pointer.active||e.pointerId!==pointer.id)return;pointer.active=false;pointer.id=null;move.x=move.y=0;ui.joystick.style.display="none";ui.stick.style.transform="translate(-50%,-50%)"}
