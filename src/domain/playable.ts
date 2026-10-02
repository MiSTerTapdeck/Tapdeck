import type {Game} from '../data/library';

// Zaparoo is the source of truth for whether a media record can launch. Never
// infer that from an extension: a .cue, .m3u, VHD, or a new future format can
// be the sole launch entry for its platform.
export function isPlayableGame(game:Game){
 const title=game.title.trim();
 const path=game.remoteFilePath??'';
 const compact=(title+' '+path).toLowerCase().replace(/[^a-z0-9]/g,'');
 if(compact.includes('240ptestsuite'))return false;
 if(/^boot(?:\d+)?(?:\.[a-z0-9]+)?$/i.test(title))return false;
 const value=`${title} ${path}`.toLowerCase();
 if(/(^|[\\/ _.-])(boot\d*|bios|readme|manual|license|240p|288p|test suite)([\\/ _.-]|$)/i.test(value))return false;
 const isAmigaVision=game.remoteSystemId?.trim().toLowerCase()==='amiga'&&/\/games\/amiga\/(games|demos)\//i.test(path);
 if(isAmigaVision){
  if(/\/games\/amiga\/demos\//i.test(path))return false;
  const language=title.match(/\[([^\]]+)\]\s*$/)?.[1]??path.match(/\[([^\]]+)\]\s*$/)?.[1]??'';
  if(!/(^|[,+ _-])en($|[,+ _-])/i.test(language))return false;
 }
 return true;
}
