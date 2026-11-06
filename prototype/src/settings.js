export const SETTINGS_KEY = 'astrea.settings.v1';
export const DEFAULT_SETTINGS = Object.freeze({
  quality:'low', targetFps:40, resolutionScale:85, shadows:false, foliageDensity:60,
  joystickSize:100, buttonSize:100, cameraSensitivity:60, cameraFollow:true,
  masterVolume:70, musicVolume:60, effectsVolume:75, voiceVolume:80,
  language:'fr', subtitles:true, damageNumbers:true, questMarkers:true,
  uiScale:100, reduceMotion:false, highContrast:false
});
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
export function validateSettings(input={}){
 const out={...DEFAULT_SETTINGS}; const errors=[];
 if(!input||typeof input!=='object'||Array.isArray(input))return {settings:out,errors:['Format invalide']};
 for(const [key,def] of Object.entries(DEFAULT_SETTINGS)){
  if(!(key in input))continue; const value=input[key];
  if(typeof def==='boolean'){if(typeof value!=='boolean'){errors.push(key);continue;}out[key]=value;}
  else if(typeof def==='number'){if(!Number.isFinite(Number(value))){errors.push(key);continue;}const bounds={targetFps:[30,60],resolutionScale:[50,100],joystickSize:[70,140],buttonSize:[70,140],cameraSensitivity:[10,100],masterVolume:[0,100],musicVolume:[0,100],effectsVolume:[0,100],voiceVolume:[0,100],uiScale:[85,125]};const [min,max]=bounds[key]||[0,100];out[key]=clamp(value,min,max);}
  else if(key==='quality'&&['low','medium','high'].includes(value))out[key]=value;
  else if(key==='language'&&['fr','en'].includes(value))out[key]=value;
  else {errors.push(key);}
 }
 return {settings:out,errors};
}
export function loadSettings(){try{return validateSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')).settings;}catch{return {...DEFAULT_SETTINGS};}}
export function saveSettings(settings){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(validateSettings(settings).settings));}catch{}}
