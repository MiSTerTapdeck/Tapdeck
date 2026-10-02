export type RemoteMediaPresence={isMissing?:boolean|number;missing?:boolean|number;path?:string;name?:string};

// Tapdeck launches through MiSTer Remote from `path`; Zaparoo's ZapScript is
// catalogue data, not a launch prerequisite. Keep any non-missing media item
// so a newly configured MiSTer core cannot disappear at import time.
export function isVisibleRemoteMedia(game:RemoteMediaPresence){
 return !(game.isMissing===true||game.missing===true||game.isMissing===1||game.missing===1||!game.path||!game.name);
}
